import dotenv from "dotenv";
import yargs from "yargs-parser";
import logger from "./logger.js";
import { spawn } from "child_process";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

const tail = spawn("tail", ["-f", "path/to/your/log/file"]);

tail.stdout.on("data", async (data) => {
  const lines = data.toString().split("\n");
  for (const line of lines) {
    try {
      if (line.includes("error")) {
        const suggestion = await handleErrors(line);
        if (suggestion) {
          const term = spawn("gnome-terminal");
          term.stdin.write(suggestion);
        }
      }
    } catch (error) {
      console.error(error);
    }
  }
});

async function handleErrors(logData) {
  const errorMessage = logData.trim();
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

export { handleErrors };
