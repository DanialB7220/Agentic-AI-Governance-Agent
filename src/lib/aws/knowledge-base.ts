import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";
import type { Chunk, DocumentKind, RetrievedChunk } from "../types";
import { DOCUMENT_KINDS } from "../types";
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
    const metaKind = item.metadata?.kind;
    const kind: DocumentKind =
      typeof metaKind === "string" &&
      (DOCUMENT_KINDS as readonly string[]).includes(metaKind)
        ? (metaKind as DocumentKind)
        : "policy";
    const chunk: Chunk = {
      id: `kb_${i}`,
      documentId: item.location?.s3Location?.uri || "knowledge-base",
      text,
      metadata: {
        title:
          (typeof item.metadata?.title === "string" && item.metadata.title) ||
          item.location?.s3Location?.uri ||
          "Knowledge Base",
        kind,
      },
    };
    return [{ chunk, score: item.score ?? 0.5 }];
  });
}
