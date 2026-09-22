import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { awsConfigured, awsRegion, embeddingModelId } from "./config";

let runtime: BedrockRuntimeClient | null = null;

function client() {
  if (!runtime) {
    runtime = new BedrockRuntimeClient({
      region: awsRegion(),
      credentials: process.env.AWS_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.AWS_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
            sessionToken: process.env.AWS_SESSION_TOKEN,
          }
        : undefined,
    });
  }
  return runtime;
}

export async function embedWithTitan(
  texts: string[],
): Promise<number[][] | null> {
  if (!awsConfigured() || texts.length === 0) return null;
  const out: number[][] = [];
  for (const text of texts) {
    const res = await client().send(
      new InvokeModelCommand({
        modelId: embeddingModelId(),
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          inputText: text.slice(0, 8000),
          dimensions: 256,
          normalize: true,
        }),
      }),
    );
    const payload = JSON.parse(new TextDecoder().decode(res.body)) as {
      embedding: number[];
    };
    out.push(payload.embedding);
  }
  return out;
}
