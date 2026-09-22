export function azureConfigured() {
  return Boolean(
    process.env.AZURE_OPENAI_API_KEY && process.env.AZURE_OPENAI_ENDPOINT,
  );
}

export function azureEndpoint() {
  return (process.env.AZURE_OPENAI_ENDPOINT || "").replace(/\/$/, "");
}

export function azureApiVersion() {
  return process.env.AZURE_OPENAI_API_VERSION || "2024-10-21";
}

export function chatDeployment() {
  return process.env.AZURE_OPENAI_DEPLOYMENT || "gpt-4o";
}

export function embeddingDeployment() {
  return (
    process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || "text-embedding-3-small"
  );
}
