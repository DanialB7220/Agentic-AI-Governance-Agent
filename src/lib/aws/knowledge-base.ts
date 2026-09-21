import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import type { Chunk, RetrievedChunk } from "../types";
import { awsConfigured, awsRegion, knowledgeBaseId } from "./config";

let agent: BedrockAgentRuntimeClient | null = null;

function client() {
  if (!agent) {
    agent = new BedrockAgentRuntimeClient({ region: awsRegion() });
  }
  return agent;
}

export async function retrieveFromKnowledgeBase(
  query: string,
  k = 6,
): Promise<RetrievedChunk[] | null> {
  const kb = knowledgeBaseId();
  if (!awsConfigured() || !kb) return null;
  const res = await client().send(
    new RetrieveCommand({
      knowledgeBaseId: kb,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: { numberOfResults: k },
      },
    }),
  );
  return (res.retrievalResults ?? []).flatMap((item, i): RetrievedChunk[] => {
    const text = item.content?.text?.trim();
    if (!text) return [];
    const chunk: Chunk = {
      id: `kb_${i}`,
      documentId: item.location?.s3Location?.uri || "knowledge-base",
      text,
      metadata: {
        title:
          (typeof item.metadata?.title === "string" && item.metadata.title) ||
          item.location?.s3Location?.uri ||
          "Knowledge Base",
        kind: "regulation",
      },
    };
    return [{ chunk, score: item.score ?? 0.5 }];
  });
}
