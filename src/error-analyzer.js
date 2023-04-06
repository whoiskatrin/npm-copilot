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
    generic: /error[\s\S]+?\n([\s\S]+?)\n/i,
  };

  const errorPattern = errorPatterns[projectType];
  const errorMatch = logData.match(errorPattern);
  if (!errorMatch) {
    return undefined;
  }

  const errorMessage = errorMatch[1].trim();

  const prompt = `Describe and fix the following ${projectType} error:\n\n${errorMessage}\n\nDescription: {description}\nFix: {fix}\n`;
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

  const resultText = data.choices[0].text.trim();
  const resultMatch = resultText.match(/^(?<description>.*?)\n(?<fix>.*)$/s); // not sure about this tbh

  if (!resultMatch) {
    return undefined;
  }

  return {
    description: resultMatch.groups.description.trim(),
    fix: resultMatch.groups.fix.trim(),
  };
}

export { handleErrors };
