import { awsConfigured } from "./aws/config";
import { embedWithTitan } from "./aws/embeddings";
import { embedWithOpenAIOrAzure } from "./llm/openai";

/** Titan if AWS RAG is on; else OpenAI API (this project) or Azure (J&J). */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (awsConfigured()) {
    const titan = await embedWithTitan(texts);
    if (titan) return titan;
  }
  return embedWithOpenAIOrAzure(texts);
}
