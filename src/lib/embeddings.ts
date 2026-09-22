import { embedWithTitan } from "./aws/embeddings";
import { awsConfigured } from "./aws/config";
import { embedTexts as embedWithAzure } from "./azure/openai";

/** Prefer Bedrock Titan when AWS is configured, else Azure OpenAI embeddings. */
export async function embedTexts(texts: string[]): Promise<number[][] | null> {
  if (awsConfigured()) {
    const titan = await embedWithTitan(texts);
    if (titan) return titan;
  }
  return embedWithAzure(texts);
}
