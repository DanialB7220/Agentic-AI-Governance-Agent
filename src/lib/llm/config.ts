export function openaiConfigured() {
  return Boolean(process.env.OPENAI_API_KEY);
}

export function openaiChatModel() {
  return process.env.OPENAI_MODEL || "gpt-4o";
}

export function openaiEmbeddingModel() {
  return process.env.OPENAI_EMBEDDING_MODEL || "text-embedding-3-small";
}
