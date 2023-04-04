import dotenv from "dotenv";
import yargs from "yargs-parser";
import logger from "./logger.js";
import { spawn } from "child_process";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

const argv = yargs(process.argv.slice(2));
const logFilePath = argv.log || "combined.log";
const maxLogs = argv.maxLogs || 1000;
const command = argv._[0];

const tail = spawn("tail", ["-n", maxLogs, "-f", logFilePath]);

tail.stdout.on("data", async (data) => {
  try {
    const suggestion = await handleErrors(data.toString());
    if (suggestion) {
      console.log(suggestion);
    }
  } catch (error) {
    logger.error(error.message);
  }
});

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

if (command) {
  const commandProcess = spawn("npm", ["run", command]);
  commandProcess.stdout.pipe(process.stdout);
  commandProcess.stderr.pipe(process.stderr);
}
