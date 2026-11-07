import { Fragment } from "react";
import { isAllowedUrl } from "@/lib/untrusted";

/*
 * Safe renderer for Belle's answers: **bold**, "- " bullets, "1. " numbered lists, paragraphs and
 * plain http(s) links. Everything becomes React elements; no HTML string is ever injected.
 * Only links to the retailers Belle searches (and Open Beauty Facts) become clickable: a web page read
 * during a search could try to slip a phishing link into an answer, so any other URL stays plain text.
 */

const URL_RE = /(https?:\/\/[^\s)]+[^\s).,;:!?»"'])/g;

function inline(text: string, key: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length > 4)
      return (
        <strong key={`${key}-${i}`} className="font-semibold text-ink">
          {part.slice(2, -2)}
        </strong>
      );
    return (
      <Fragment key={`${key}-${i}`}>
        {part.split(URL_RE).map((bit, j) =>
          j % 2 && isAllowedUrl(bit) ? (
            <a
              key={j}
              href={bit}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="font-semibold text-brand underline underline-offset-2 [overflow-wrap:anywhere]"
            >
              {bit.replace(/^https?:\/\/(www\.)?/, "")}
            </a>
          ) : (
            bit
          ),
        )}
      </Fragment>
    );
  });
}

type Block = { kind: "p"; lines: string[] } | { kind: "ul" | "ol"; items: string[] };

function blocks(text: string): Block[] {
  const out: Block[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•*]\s+(.*)$/.exec(line);
    const num = /^\s*\d+[.)]\s+(.*)$/.exec(line);
    const last = out[out.length - 1];
    if (!line.trim()) {
      out.push({ kind: "p", lines: [] }); // paragraph break
    } else if (bullet) {
      if (last?.kind === "ul") last.items.push(bullet[1]);
      else out.push({ kind: "ul", items: [bullet[1]] });
    } else if (num) {
      if (last?.kind === "ol") last.items.push(num[1]);
      else out.push({ kind: "ol", items: [num[1]] });
    } else if (last?.kind === "p" && last.lines.length) {
      last.lines.push(line);
    } else {
      out.push({ kind: "p", lines: [line] });
    }
  }
  return out.filter((b) => (b.kind === "p" ? b.lines.length > 0 : true));
}

export function Formatted({ text }: { text: string }) {
  return (
    <div className="space-y-3 break-words [overflow-wrap:anywhere]">
      {blocks(text).map((b, i) => {
        if (b.kind === "p")
          return (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  {inline(l, `${i}-${j}`)}
                </Fragment>
              ))}
            </p>
          );
        const List = b.kind === "ul" ? "ul" : "ol";
        return (
          <List key={i} className="space-y-1.5">
            {b.items.map((item, j) => (
              <li key={j} className="flex gap-2.5">
                {b.kind === "ul" ? (
                  <span aria-hidden="true" className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                ) : (
                  <span aria-hidden="true" className="w-5 shrink-0 font-display italic text-brand">
                    {j + 1}.
                  </span>
                )}
                <span className="min-w-0">{inline(item, `${i}-${j}`)}</span>
              </li>
            ))}
          </List>
        );
      })}
    </div>
  );
}
