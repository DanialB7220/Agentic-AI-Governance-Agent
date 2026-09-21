import {
  BedrockRuntimeClient,
  ConverseCommand,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  awsConfigured,
  awsRegion,
  bedrockModelId,
  embeddingModelId,
} from "./config";

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

export async function embedTexts(texts: string[]): Promise<number[][] | null> {
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

export async function converse(opts: {
  system: string;
  user: string;
  maxTokens?: number;
}): Promise<string | null> {
  if (!awsConfigured()) return null;
  const res = await client().send(
    new ConverseCommand({
      modelId: bedrockModelId(),
      system: [{ text: opts.system }],
      messages: [
        {
          role: "user",
          content: [{ text: opts.user }],
        },
      ],
      inferenceConfig: {
        maxTokens: opts.maxTokens ?? 1400,
        temperature: 0.2,
      },
    }),
  );
  const text = res.output?.message?.content
    ?.map((c) => ("text" in c ? c.text : ""))
    .join("")
    .trim();
  return text || null;
}
