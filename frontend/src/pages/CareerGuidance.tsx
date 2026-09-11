import { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import { useAuth } from "../context/AuthContext";
import {
  getCareerGuidance,
  getTopicQuizResults,
  getAssessmentResults,
  type CareerGuidance as CareerGuidanceType,
} from "../api/client";

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

function Section({
  title,
  items,
  icon,
}: {
  title: string;
  items: string[];
  icon: string;
}) {
  if (!items || items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
      <h3 className="font-semibold mb-3">
        {icon} {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li
            key={i}
            className="text-sm text-slate-300 flex items-start gap-2"
          >
            <span className="text-indigo-400 mt-1">•</span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CareerGuidance() {
  const { user } = useAuth();
  const roadmaps = loadRoadmaps();

  const [careerGoal, setCareerGoal] = useState(user?.careerGoal || "");
  const [roadmapTitle, setRoadmapTitle] = useState(roadmaps[0]?.roadmap || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [guidance, setGuidance] = useState<CareerGuidanceType | null>(null);

  useEffect(() => {
    if (user?.careerGoal) setCareerGoal(user.careerGoal);
  }, [user]);

  async function handleGenerate(e: React.FormEvent) {
    e.preventDefault();

    if (!careerGoal.trim()) {
      setError("Please enter your target career goal.");
      return;
    }

    setLoading(true);
    setError("");
    setGuidance(null);

    try {
      const topicQuizResults = getTopicQuizResults();
      const assessmentResults = getAssessmentResults();
      const firstAssessment = Object.values(assessmentResults)[0] || null;

      const result = await getCareerGuidance({
        careerGoal: careerGoal.trim(),
        roadmapTitle,
        skillLevel: user?.skillLevel,
        topicQuizResults,
        assessmentResult: firstAssessment,
      });

      setGuidance(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate guidance."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <Navbar />

      <main className="max-w-4xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            AI Career Guidance 🎯
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Skill-gap analysis, project ideas, certifications, and interview
            prep tailored to your target role.
          </p>
        </div>

        <form
          onSubmit={handleGenerate}
          className="rounded-2xl border border-white/5 bg-[#0b1020] p-5 mb-8 space-y-4"
        >
          <div>
            <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
              Target career
            </label>
            <input
              value={careerGoal}
              onChange={(e) => setCareerGoal(e.target.value)}
              placeholder="e.g. AI/ML Engineer"
              className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {roadmaps.length > 0 && (
            <div>
              <label className="block text-xs uppercase tracking-wide text-slate-500 mb-1">
                Reference roadmap (optional)
              </label>
              <select
                value={roadmapTitle}
                onChange={(e) => setRoadmapTitle(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-slate-900 border border-white/10 text-white"
              >
                {roadmaps.map((r) => (
                  <option key={r.id} value={r.roadmap}>
                    {r.roadmap}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-4 py-2">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 font-semibold transition"
          >
            {loading ? "Analyzing…" : "Generate Guidance 🚀"}
          </button>
        </form>

        {guidance && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-5">
              <h3 className="font-semibold mb-2">📌 Skill-gap summary</h3>
              <p className="text-sm text-slate-300">
                {guidance.skillGapSummary}
              </p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <Section
                title="Priority skills"
                icon="🧩"
                items={guidance.prioritySkills}
              />
              <Section
                title="Recommended projects"
                icon="🛠️"
                items={guidance.recommendedProjects}
              />
              <Section
                title="Certifications"
                icon="📜"
                items={guidance.certifications}
              />
              <Section
                title="Interview prep topics"
                icon="🗣️"
                items={guidance.interviewPrepTopics}
              />
            </div>

            <Section
              title="Your next steps"
              icon="✅"
              items={guidance.nextSteps}
            />
          </div>
        )}
      </main>
    </div>
  );
}

export default CareerGuidance;
