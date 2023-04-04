import dotenv from "dotenv";
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
      if (typeof line !== "string") {
        continue;
      }
      const suggestion = await handleErrors(line);
      if (suggestion) {
        const term = spawn("gnome-terminal");
        term.stdin.write(suggestion);
      }
    } catch (error) {
      console.error(error);
    }
  }
});

async function handleErrors(logData) {
  console.log(logData);
  try {
    if (typeof logData !== "string" || !logData.trim()) {
      console.log("log data is undefined");
      return undefined;
    }

    const errorMessage = logData.trim();
    const match = errorMessage.match(/^error\s-\s(.*$)/i);

    if (!match) {
      return undefined;
    }

    const { 1: message } = match;
    const options = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        prompt: `Fix the following error:\n\n${message}\n\nSuggested fix:`,
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
  } catch (error) {
    logger.error(error.message);
  }
}

export { handleErrors };
