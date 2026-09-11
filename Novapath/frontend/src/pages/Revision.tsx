import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import {
  syncRevisionQueue,
  getDueRevisions,
  getUpcomingRevisions,
  type RevisionState,
} from "../lib/revision";

const TOPIC_QUIZ_CONTEXT_KEY = "novapath_topic_quiz_context";

type Roadmap = {
  id: string;
  roadmap: string;
  topics?: { id: string; title: string }[];
};

function loadRoadmaps(): Roadmap[] {
  try {
    const raw = localStorage.getItem("novapath_roadmaps");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function Revision() {
  const navigate = useNavigate();
  const [due, setDue] = useState<RevisionState[]>([]);
  const [upcoming, setUpcoming] = useState<RevisionState[]>([]);

  useEffect(() => {
    syncRevisionQueue();
    setDue(getDueRevisions());
    setUpcoming(getUpcomingRevisions());
  }, []);

  function startRevision(item: RevisionState) {
    const roadmaps = loadRoadmaps();
    const roadmap = roadmaps.find((r) =>
      r.topics?.some((t) => t.id === item.topicId)
    );

    localStorage.setItem(
      TOPIC_QUIZ_CONTEXT_KEY,
      JSON.stringify({
        roadmapId: roadmap?.id || "",
        roadmapTitle: roadmap?.roadmap || "Revision",
        day: 0,
        topicId: item.topicId,
        topicTitle: item.topicTitle,
        completedTasks: [],
      })
    );

    navigate("/topic-quiz");
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <Navbar />

      <main className="max-w-5xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Smart Revision 🧠</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Topics you scored below 70% on come back here on a
            spaced-repetition schedule — 1, 2, 4, 8, then 16 days apart —
            until they're mastered.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-rose-500" /> Due now (
            {due.length})
          </h2>

          {due.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-6 text-center text-slate-500 text-sm">
              Nothing due for revision right now. 🎉
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-4">
              {due.map((item) => (
                <div
                  key={item.topicId}
                  className="rounded-2xl border border-rose-500/20 bg-rose-500/5 p-5 flex flex-col gap-3"
                >
                  <div>
                    <p className="font-medium text-white">
                      {item.topicTitle}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      Due since {formatDate(item.nextDueAt)} · revised{" "}
                      {item.timesRevised}x
                    </p>
                  </div>
                  <button
                    onClick={() => startRevision(item)}
                    className="self-start px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition"
                  >
                    Revise now →
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="font-semibold mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Scheduled (
            {upcoming.length})
          </h2>

          {upcoming.length === 0 ? (
            <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-6 text-center text-slate-500 text-sm">
              No upcoming revisions scheduled.
            </div>
          ) : (
            <div className="rounded-2xl border border-white/5 bg-[#0b1020] divide-y divide-white/5">
              {upcoming.map((item) => (
                <div
                  key={item.topicId}
                  className="p-4 flex items-center justify-between"
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.topicTitle}
                    </p>
                    <p className="text-xs text-slate-500">
                      Every {item.intervalDays} day
                      {item.intervalDays > 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className="text-xs text-slate-400">
                    Due {formatDate(item.nextDueAt)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default Revision;
