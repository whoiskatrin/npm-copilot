import ts from "typescript";
import fs from "fs";
import chalk from "chalk";
import path from "path";
import dotenv from "dotenv";
import logger from "./logger.js";
import yargs from "yargs-parser";
const argv = yargs(process.argv.slice(2));

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;

const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

async function handleErrors(logData) {
  const { level, message } = JSON.parse(logData);

  if (level !== "error") {
    return;
  }

  const errorMessage = message;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `Fix the following error:\n\n${errorMessage}\n\nSuggested fix:`,
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
    throw new Error(data.error || "Error fetching a fix.");
  }

  return data.choices[0].text.trim();
}

async function handleErrorsFromFile(filePath) {
  const program = ts.createProgram([filePath], {});
  const result = await ts.getPreEmitDiagnostics(program);
  const syntaxErrors = result.filter(
    (error) => error.category === ts.DiagnosticCategory.Error
  );

  syntaxErrors.forEach((error) => {
    const errorMessage = ts.flattenDiagnosticMessageText(
      error.messageText,
      "\n"
    );
    logger.error(errorMessage);
  });
}

const filePath = String(argv._[0]);
handleErrorsFromFile(filePath);

export { handleErrors };
