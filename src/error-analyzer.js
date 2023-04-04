import dotenv from "dotenv";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

async function handleErrors(logData) {
  console.log("logData: " + logData);
  const errorLines = logData
    .toString()
    .split("\n")
    .filter((line) => line.trim().startsWith("Error:"));

  console.log("errorLines: " + errorLines);
  if (errorLines.length === 0) {
    return undefined;
  }

  const errorMessages = errorLines.map((line) => {
    const message = line.trim().substring("Error:".length).trim();
    const match = message.match(/^(.*)\s+\((.*):(\d+):(\d+)\)/);
    if (match) {
      const [_, errorMessage, fileName, lineNumber, columnNumber] = match;
      return { errorMessage, fileName, lineNumber, columnNumber };
    } else {
      return { errorMessage: message };
    }
  });

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `Fix the following error:\n\n${errorMessages[0].errorMessage}\n\nSuggested fix:`,
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
  console.log("response " + data);

  if (!response.ok) {
    throw new Error(data.error || "Error fetching a fix.");
  }

  return data.choices[0].text.trim();
}

export { handleErrors };
