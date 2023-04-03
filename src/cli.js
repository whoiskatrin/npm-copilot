import ts from "typescript";
import fs from "fs";
import chalk from "chalk";
import path from "path";
import dotenv from "dotenv";
import yargs from "yargs-parser";
const argv = yargs(process.argv.slice(2));

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;

const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

const ERROR_CONTEXT_START = "// START-ERROR-CONTEXT";
const ERROR_CONTEXT_END = "// END-ERROR-CONTEXT";

function preprocessCode(code, errorLine) {
  if (!code) {
    return "";
  }

  const codeLines = code.split("\n");
  let startLine = Math.max(errorLine - 5, 0);
  let endLine = Math.min(errorLine + 5, codeLines.length - 1);

  if (startLine < 0) {
    endLine += Math.abs(startLine);
    startLine = 0;
  }

  let foundDefinition = false;
  while (
    !foundDefinition &&
    startLine <= endLine &&
    startLine < codeLines.length
  ) {
    if (
      codeLines[startLine].includes("function ") ||
      codeLines[startLine].includes("class ")
    ) {
      foundDefinition = true;
    } else {
      startLine++;
    }
  }

  foundDefinition = false;
  while (!foundDefinition && startLine <= endLine && endLine >= 0) {
    if (
      codeLines[endLine].includes("}") ||
      codeLines[endLine].includes("return ")
    ) {
      foundDefinition = true;
    } else {
      endLine--;
    }
  }

  let context = "";
  let insideContext = false;

  for (let i = startLine; i <= endLine; i++) {
    if (codeLines[i].includes(ERROR_CONTEXT_START)) {
      insideContext = true;
    }

    if (insideContext) {
      context += codeLines[i] + "\n";
    }

    if (codeLines[i].includes(ERROR_CONTEXT_END)) {
      insideContext = false;
    }
  }

  return context.trim() || code.trim();
}

function getErrorPosition(error) {
  let line, column;
  if (error.loc) {
    line = error.loc.line;
    column = error.loc.column;
  } else {
    const { start, length } = error;
    const source = error.file.text;
    const beforeError = source.substring(0, start);
    const newlinesBeforeError = beforeError.match(/\n/g) || [];
    line = newlinesBeforeError.length + 1;
    column = start - beforeError.lastIndexOf("\n");
  }
  return { line, column };
}

function detectScope(filePath) {
  const fileName = path.basename(filePath);
  const fileExtension = path.extname(filePath);

  if (fileExtension === ".js" || fileExtension === ".ts") {
    if (fileName === "package.json") {
      const packageJson = require(filePath);
      if (packageJson.dependencies && packageJson.dependencies["next"]) {
        return "Next.js";
      }
      if (packageJson.dependencies && packageJson.dependencies["react"]) {
        return "React";
      }
    }
    if (filePath.includes("next.config.js")) {
      return "Next.js";
    }
    if (filePath.includes("gatsby-config.js")) {
      return "Gatsby";
    }
    if (filePath.includes(".storybook")) {
      return "Storybook";
    }
    if (filePath.includes("src/pages")) {
      return "Next.js (pages)";
    }
    if (filePath.includes("src/components")) {
      return "React";
    }
  }
}

async function handleErrors(error, code, filePath) {
  let prompt = "";
  const { line: errorLine } = getErrorPosition(error);

  const context = preprocessCode(code, errorLine);

  const scope = detectScope(filePath);

  const errorMessage = ts.flattenDiagnosticMessageText(error.messageText, "\n");

  if (!scope)
    prompt = `Fix the following error:\n\n${errorMessage}\n\nCode context:\n${context}\n\nSuggested fix:`;
  else
    prompt = `Fix the following error in ${scope}:\n\n${errorMessage}\n\nCode context:\n${context}\n\nSuggested fix:`;

  console.log(prompt);

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      model: "text-davinci-002",
      temperature: 0.5,
      max_tokens: 147,
      top_p: 1,
      stop: "\\n",
      best_of: 2,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  };

  const response = await fetch(OPENAI_ENDPOINT, options);

  const data = await response.json();
  if (!response.ok) {
    console.log(response);
    throw new Error(data.error || "Error fetching a fix.");
  }

  console.log(data);
  const suggestion = data.choices[0].text.trim();
  console.log(suggestion);

  const output =
    chalk.red(errorMessage) +
    "\n\n" +
    chalk.blue(`Code context (${filePath}:${errorLine}):\n`) +
    chalk.gray(context) +
    "\n\n" +
    chalk.green("Suggested fix:\n") +
    chalk.yellow(suggestion);

  console.log(output);
}

async function handleErrorsFromFile(filePath) {
  const program = ts.createProgram([filePath], {});
  const result = await ts.getPreEmitDiagnostics(program);
  const syntaxErrors = result.filter(
    (error) => error.category === ts.DiagnosticCategory.Error
  );

  console.log(`Reading code from file: ${filePath}`);
  const code = fs.readFileSync(filePath, "utf-8");

  await Promise.all(
    syntaxErrors.map(async (error) => {
      await handleErrors(error, code, filePath);
    })
  );
}

const filePath = String(argv._[0]);
handleErrorsFromFile(filePath);

export { handleErrors };
