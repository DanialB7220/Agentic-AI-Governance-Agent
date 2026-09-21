export function Markdown({ text }: { text: string }) {
  const blocks = parse(text);
  return (
    <div className="prose-aegis text-sm">
      {blocks.map((block, i) => {
        if (block.type === "h1") return <h1 key={i}>{inline(block.text)}</h1>;
        if (block.type === "h2") return <h2 key={i}>{inline(block.text)}</h2>;
        if (block.type === "h3") return <h3 key={i}>{inline(block.text)}</h3>;
        if (block.type === "quote")
          return <blockquote key={i}>{inline(block.text)}</blockquote>;
        if (block.type === "ul")
          return (
            <ul key={i}>
              {block.items.map((item, j) => (
                <li key={j}>{inline(item)}</li>
              ))}
            </ul>
          );
        return (
          <p key={i} className="mb-3">
            {inline(block.text)}
          </p>
        );
      })}
    </div>
  );
}

type Block =
  | { type: "h1" | "h2" | "h3" | "quote" | "p"; text: string }
  | { type: "ul"; items: string[] };

function parse(text: string): Block[] {
  const lines = text.replace(/\r/g, "").split("\n");
  const out: Block[] = [];
  let list: string[] = [];
  const flushList = () => {
    if (list.length) {
      out.push({ type: "ul", items: list });
      list = [];
    }
  };
  for (const line of lines) {
    if (line.startsWith("- ")) {
      list.push(line.slice(2));
      continue;
    }
    flushList();
    if (!line.trim()) continue;
    if (line.startsWith("# ")) out.push({ type: "h1", text: line.slice(2) });
    else if (line.startsWith("## ")) out.push({ type: "h2", text: line.slice(3) });
    else if (line.startsWith("### ")) out.push({ type: "h3", text: line.slice(4) });
    else if (line.startsWith("> ")) out.push({ type: "quote", text: line.slice(2) });
    else out.push({ type: "p", text: line });
  }
  flushList();
  return out;
}

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}
