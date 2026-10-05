import OpenAI from "openai";
import { azureConfigured } from "../azure/config";
import {
  completeChat as azureChat,
  embedTexts as azureEmbed,
} from "../azure/openai";
import {
  openaiChatModel,
  openaiConfigured,
  openaiEmbeddingModel,
} from "./config";

let client: OpenAI | null = null;

function openai() {
  if (!client) {
    client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return client;
}

/** This repo: OpenAI API. J&J production: Azure OpenAI (same function names). */
export async function completeChat(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  if (openaiConfigured()) {
    const res = await openai().chat.completions.create({
      model: openaiChatModel(),
      temperature: 0.2,
      max_tokens: opts.maxTokens ?? 1400,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    });
    return res.choices[0]?.message?.content?.trim() || null;
  }
  if (azureConfigured()) return azureChat(opts);
  return null;
}

export async function embedWithOpenAI(
  texts: string[],
): Promise<number[][] | null> {
  if (!openaiConfigured() || texts.length === 0) return null;
  const out: number[][] = [];
  const batch = 32;
  for (let i = 0; i < texts.length; i += batch) {
    const slice = texts.slice(i, i + batch);
    const res = await openai().embeddings.create({
      model: openaiEmbeddingModel(),
      input: slice.map((t) => t.slice(0, 8000)),
    });
    const rows = res.data
      .sort((a, b) => a.index - b.index)
      .map((row) => row.embedding);
    out.push(...rows);
  }
  return out;
}

export async function embedWithOpenAIOrAzure(texts: string[]) {
  const fromOpenAI = await embedWithOpenAI(texts);
  if (fromOpenAI) return fromOpenAI;
  return azureEmbed(texts);
}
