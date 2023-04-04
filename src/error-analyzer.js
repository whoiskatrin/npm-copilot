import dotenv from "dotenv";

dotenv.config();

const openaiApiKey = process.env.OPENAI_API_KEY;
const OPENAI_ENDPOINT = "https://api.openai.com/v1/completions";

async function handleErrors(logData) {
  const errorPattern = /Error:([\s\S]+?)\n\n/;

  const errorMatch = logData.match(errorPattern);
  if (!errorMatch) {
    return undefined;
  }

  const errorMessage = errorMatch[1].trim();

  const options = {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openaiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      prompt: `Fix the following error:\n\n${errorMessage}\n\nSuggested fix:`,
      model: "text-davinci-003",
      temperature: 0.5,
      max_tokens: 147,
      top_p: 1,
      stop: "\\n",
      best_of: 2,
      frequency_penalty: 0,
      presence_penalty: 0,
    }),
  };

  console.log("msg to API: " + errorMessage);
  const response = await fetch(OPENAI_ENDPOINT, options);
  const data = await response.json();
  console.log("response " + data);

  if (!response.ok) {
    throw new Error(data.error || "Error fetching a fix.");
  }

  return data.choices[0].text.trim();
}

export { handleErrors };
