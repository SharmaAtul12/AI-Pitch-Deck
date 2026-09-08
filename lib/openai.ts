import OpenAI from "openai";

// OpenAI's built-in image models (same API key as the Agent SDK).
// gpt-image-1-mini = cheaper, good for learning
// gpt-image-1.5   = higher quality, costs more
const IMAGE_MODEL = "gpt-image-1-mini";
const IMAGE_SIZE = "1024x1024";

// One shared client for the whole app — we create it once and reuse it.
let openaiClient: OpenAI | null = null;

function getOpenAIClient(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error(
      "Missing OPENAI_API_KEY in .env — create one at https://platform.openai.com/api-keys",
    );
  }

  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey });
  }

  return openaiClient;
}