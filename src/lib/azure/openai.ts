import { AzureOpenAI } from "openai";
import {
  azureApiVersion,
  azureConfigured,
  azureEndpoint,
  chatDeployment,
  embeddingDeployment,
} from "./config";

let client: AzureOpenAI | null = null;

function openai() {
  if (!client) {
    client = new AzureOpenAI({
      endpoint: azureEndpoint(),
      apiKey: process.env.AZURE_OPENAI_API_KEY,
      apiVersion: azureApiVersion(),
    });
  }
  return client;
}

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (!azureConfigured() || texts.length === 0) return null;
  const res = await openai().embeddings.create({
    model: embeddingDeployment(),
    input: texts.map((t) => t.slice(0, 8000)),
  });
  return res.data
    .sort((a, b) => a.index - b.index)
    .map((row) => row.embedding);
}

export async function completeChat(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  if (!azureConfigured()) return null;
  const res = await openai().chat.completions.create({
    model: chatDeployment(),
    temperature: 0.2,
    max_tokens: opts.maxTokens ?? 1400,
    messages: [
      { role: "system", content: opts.system },
      { role: "user", content: opts.user },
    ],
  });
  return res.choices[0]?.message?.content?.trim() || null;
}
