import { afterEach, describe, expect, it, vi } from "vitest";

/* The real route handler, with the Anthropic stream, the guard and the catalog replaced by fakes. */

const { stream, recordUsage, release } = vi.hoisted(() => ({ stream: vi.fn(), recordUsage: vi.fn(async () => {}), release: vi.fn(async () => {}) }));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/claude", () => ({
  anthropic: { beta: { messages: { stream } } },
  MODEL: "claude-opus-5-5",
  FALLBACK: {},
  hasApiKey: () => true,
  profileSummary: () => "",
}));
vi.mock("@/lib/guard", () => ({ guard: async () => null, overBudget: async () => false, recordUsage, release }));
vi.mock("@/lib/catalog", async () => ({ ProfileSchema: (await import("@/lib/schemas")).ProfileSchema, searchAndScore: vi.fn() }));

const { POST } = await import("./route");

/** Mimics the SDK's BetaMessageStream: async-iterable events, abort(), currentMessage, finalMessage(). */
function fakeTurn(chunks: string[], delayMs = 10) {
  let aborted = false;
  const usage = { input_tokens: 1200, output_tokens: 40 };
  return {
    abort: vi.fn(() => {
      aborted = true;
    }),
    get currentMessage() {
      return { usage, model: "claude-opus-5-5" };
    },
    finalMessage: vi.fn(async () => ({ content: [{ type: "text", text: chunks.join("") }], stop_reason: "end_turn", usage, model: "claude-opus-5-5" })),
    async *[Symbol.asyncIterator]() {
      for (const text of chunks) {
        await new Promise((r) => setTimeout(r, delayMs));
        if (aborted) throw new Error("Request was aborted."); // what the SDK's APIUserAbortError says
        yield { type: "content_block_delta", delta: { type: "text_delta", text } };
      }
    },
  };
}

const chatRequest = () =>
  new Request("http://test/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: null, messages: [{ role: "user", content: "Bonjour" }] }) });

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("POST /api/chat stream", () => {
  it("streams the answer as NDJSON text events and records the turn's usage", async () => {
    const turn = fakeTurn(["Bon", "jour !"]);
    stream.mockReturnValue(turn);

    const res = await POST(chatRequest());
    const lines = (await res.text()).trim().split("\n").map((l) => JSON.parse(l));

    expect(lines).toEqual([
      { type: "text", text: "Bon" },
      { type: "text", text: "jour !" },
    ]);
    expect(recordUsage).toHaveBeenCalledWith(expect.objectContaining({ stop_reason: "end_turn" }), "chat");
    expect(release).toHaveBeenCalledExactlyOnceWith("chat"); // budget reservation given back (audit M-5)
  });

  it("when the visitor leaves mid-answer: aborts generation, still records the usage, logs no error", async () => {
    const turn = fakeTurn(["Un", " long", " conseil", " qui", " continue"], 15);
    stream.mockReturnValue(turn);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    const res = await POST(chatRequest());
    const reader = res.body!.getReader();
    await reader.read(); // first chunk arrives
    await reader.cancel(); // tab closed
    await new Promise((r) => setTimeout(r, 100));

    expect(turn.abort).toHaveBeenCalled();
    expect(recordUsage).toHaveBeenCalledWith(turn.currentMessage, "chat (client left)");
    expect(turn.finalMessage).not.toHaveBeenCalled();
    expect(errors).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledExactlyOnceWith("chat"); // even when the visitor leaves
  });

  it("rejects an oversized history with 400 before any model call (audit S-01)", async () => {
    const big = Array.from({ length: 12 }, (_, i) => ({ role: i % 2 ? "assistant" : "user", content: "x".repeat(3_000) }));
    const res = await POST(new Request("http://test/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ profile: null, messages: big }) }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "Conversation trop longue : commencez une nouvelle conversation." });
    expect(stream).not.toHaveBeenCalled();
  });

  it("caps the model output per turn (max_tokens 2048, was 64000)", async () => {
    stream.mockReturnValue(fakeTurn(["ok"]));
    await (await POST(chatRequest())).text();
    expect(stream).toHaveBeenCalledWith(expect.objectContaining({ max_tokens: 2048 }));
  });
});
