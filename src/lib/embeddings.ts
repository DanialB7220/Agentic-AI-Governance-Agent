import { awsConfigured, knowledgeBaseId } from "./aws/config";
import { azureConfigured } from "./azure/config";
import { embedWithTitan } from "./aws/embeddings";
import { openaiConfigured } from "./llm/config";
import { embedWithOpenAIOrAzure } from "./llm/openai";

export type RagProvider = "titan" | "openai" | "azure" | "keyword";

/** Who will actually produce vectors right now (AWS first, then OpenAI, then Azure). */
export function ragProvider(): RagProvider {
  if (awsConfigured()) return "titan";
  if (openaiConfigured()) return "openai";
  if (azureConfigured()) return "azure";
  return "keyword";
}

/** Titan if AWS RAG is on; else OpenAI API (this project) or Azure (J&J). */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (texts.length === 0) return null;
  if (awsConfigured()) {
    try {
      const titan = await embedWithTitan(texts);
      if (titan?.length === texts.length) return titan;
    } catch (err) {
      console.error("Titan embeddings failed, falling through", err);
    }
  }
  return embedWithOpenAIOrAzure(texts);
}
