import { useEffect, useRef, useState } from "react";
import Navbar from "../components/Navbar";
import { sendMentorMessage, type MentorMessage } from "../api/client";

type Roadmap = { id: string; roadmap: string };

function loadRoadmaps(): Roadmap[] {
  try {
    const raw = localStorage.getItem("novapath_roadmaps");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function Mentor() {
  const [roadmaps] = useState<Roadmap[]>(loadRoadmaps());
  const [roadmapTitle, setRoadmapTitle] = useState(
    roadmaps[0]?.roadmap || "General Learning"
  );

  const [messages, setMessages] = useState<MentorMessage[]>([
    {
      role: "mentor",
      content:
        "Hi! I'm your NovaPath AI Mentor 👋 Ask me to explain a concept, review an approach, or suggest a practice exercise.",
    },
  ]);

  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || sending) return;

    setError("");
    const nextMessages: MentorMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const answer = await sendMentorMessage(
        roadmapTitle,
        nextMessages,
        question
      );
      setMessages((prev) => [...prev, { role: "mentor", content: answer }]);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "The mentor couldn't respond."
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold">AI Mentor 💬</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Ask doubts, get explanations, and request practice questions —
            anytime.
          </p>
        </div>

        {roadmaps.length > 0 && (
          <div className="mb-4">
            <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
              Context roadmap
            </label>
            <select
              value={roadmapTitle}
              onChange={(e) => setRoadmapTitle(e.target.value)}
              className="px-3 py-2 rounded-lg bg-slate-900 border border-white/10 text-sm text-white"
            >
              {roadmaps.map((r) => (
                <option key={r.id} value={r.roadmap}>
                  {r.roadmap}
                </option>
              ))}
              <option value="General Learning">General Learning</option>
            </select>
          </div>
        )}

        <div className="rounded-2xl border border-white/5 bg-[#0b1020] flex flex-col h-[60vh]">
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${
                  m.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    m.role === "user"
                      ? "bg-indigo-600 text-white"
                      : "bg-white/5 border border-white/10 text-slate-200"
                  }`}
                >
                  {m.content}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-4 py-3 text-sm bg-white/5 border border-white/10 text-slate-400">
                  Mentor is thinking…
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {error && (
            <div className="px-4 py-2 text-xs text-rose-400 border-t border-white/5">
              {error}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="p-3 sm:p-4 border-t border-white/5 flex items-center gap-2"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask your mentor anything…"
              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-white/10 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed font-medium text-sm transition"
            >
              Send
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}

export default Mentor;
