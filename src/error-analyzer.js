import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

async function handleErrors(logData, projectType) {
  const errorPatterns = {
    next: /Error:([\s\S]+?)\n\n/,
    react: /Error:([\s\S]+?)\n\n/,
    angular: /ERROR in([\s\S]+?)\n\n/,
    vue: /error[\s\S]+?\n([\s\S]+?)\n\n/,
  };

  const errorPattern = errorPatterns[projectType];
  const errorMatch = logData.match(errorPattern);
  if (!errorMatch) {
    return undefined;
  }

  const errorMessage = errorMatch[1].trim();

  const prompt = `Fix the following ${projectType} error:\n\n${errorMessage}\n\n`;

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: prompt,
      model: "text-davinci-003",
      temperature: 0.5,
      max_tokens: 256,
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
