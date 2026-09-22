export function awsConfigured() {
  return Boolean(
    process.env.AWS_ACCESS_KEY_ID ||
      process.env.AWS_PROFILE ||
      process.env.AWS_BEARER_TOKEN_BEDROCK,
  );
}

export function awsRegion() {
  return process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION || "us-east-1";
}

export function embeddingModelId() {
  return (
    process.env.BEDROCK_EMBEDDING_MODEL_ID || "amazon.titan-embed-text-v2:0"
  );
}

export function knowledgeBaseId() {
  return process.env.BEDROCK_KNOWLEDGE_BASE_ID || "";
}
