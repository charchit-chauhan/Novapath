import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import Navbar from "../components/Navbar";
import { getGamificationStats } from "../lib/gamification";
import {
  getTopicQuizResults,
  getDailyQuizResults,
  type TopicQuizResult,
  type DailyQuizResult,
} from "../api/client";

type Roadmap = {
  id: string;
  roadmap: string;
  progress?: number;
  topics?: { title: string }[];
  completedTopics?: string[];
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

const COLORS = ["#6366f1", "#8b5cf6", "#22c55e", "#f97316", "#ef4444"];

function StatCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: string | number;
  icon: string;
}) {
  return (
    <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-xs text-slate-500 mt-1">{label}</div>
    </div>
  );
}

function Analytics() {
  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [topicResults, setTopicResults] = useState<TopicQuizResult[]>([]);
  const [dailyResults, setDailyResults] = useState<DailyQuizResult[]>([]);

  useEffect(() => {
    setRoadmaps(loadRoadmaps());
    setTopicResults(getTopicQuizResults());
    setDailyResults(getDailyQuizResults());
  }, []);

  const gam = useMemo(() => getGamificationStats(), [topicResults, dailyResults]);

  const scoreTrend = useMemo(() => {
    const combined = [
      ...topicResults.map((r) => ({
        date: r.completedAt,
        score: r.percentage,
        label: r.topicTitle,
      })),
      ...dailyResults.map((r) => ({
        date: r.completedAt,
        score: r.percentage,
        label: `Day ${r.day}`,
      })),
    ]
      .filter((r) => r.date)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map((r, i) => ({
        attempt: i + 1,
        score: Math.round(r.score),
        label: r.label,
      }));

    return combined;
  }, [topicResults, dailyResults]);

  const weakTopics = useMemo(
    () =>
      topicResults
        .filter((r) => r.percentage < 70)
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 6)
        .map((r) => ({ name: r.topicTitle, score: Math.round(r.percentage) })),
    [topicResults]
  );

  const roadmapProgress = roadmaps.map((r) => ({
    name: r.roadmap,
    value: r.progress || 0,
  }));

  const overallCompletion = roadmaps.length
    ? Math.round(
        roadmaps.reduce((sum, r) => sum + (r.progress || 0), 0) /
          roadmaps.length
      )
    : 0;

  const pieData = [
    { name: "Complete", value: overallCompletion },
    { name: "Remaining", value: Math.max(0, 100 - overallCompletion) },
  ];

  return (
    <div className="min-h-screen bg-[#070b14] text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-5 sm:px-6 py-8 sm:py-10">
        <div className="mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">
            Progress & Analytics 📊
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            A live view of your learning activity, quiz performance and
            weak spots.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <StatCard label="XP" value={gam.xp} icon="⭐" />
          <StatCard label="Level" value={gam.level} icon="🏅" />
          <StatCard label="Streak (days)" value={gam.streak} icon="🔥" />
          <StatCard label="Quizzes taken" value={gam.totalQuizzes} icon="📝" />
          <StatCard
            label="Average score"
            value={`${gam.averageScore}%`}
            icon="🎯"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 rounded-2xl border border-white/5 bg-[#0b1020] p-5">
            <h2 className="font-semibold mb-4">Quiz score trend</h2>
            {scoreTrend.length === 0 ? (
              <p className="text-sm text-slate-500">
                Take a few quizzes to see your trend here.
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis
                    dataKey="attempt"
                    stroke="#64748b"
                    fontSize={12}
                    label={{
                      value: "Attempt #",
                      position: "insideBottom",
                      offset: -2,
                      fill: "#64748b",
                      fontSize: 11,
                    }}
                  />
                  <YAxis stroke="#64748b" fontSize={12} domain={[0, 100]} />
                  <Tooltip
                    contentStyle={{
                      background: "#0b1020",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="score"
                    stroke="#6366f1"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
            <h2 className="font-semibold mb-4">Overall completion</h2>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={80}
                  paddingAngle={2}
                >
                  {pieData.map((_, i) => (
                    <Cell key={i} fill={i === 0 ? "#6366f1" : "#1e293b"} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "#0b1020",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <p className="text-center text-2xl font-bold -mt-4">
              {overallCompletion}%
            </p>
            <p className="text-center text-xs text-slate-500">
              average across {roadmaps.length || 0} roadmap
              {roadmaps.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
            <h2 className="font-semibold mb-4">Roadmap progress</h2>
            {roadmapProgress.length === 0 ? (
              <p className="text-sm text-slate-500">No roadmaps yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={roadmapProgress} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    stroke="#64748b"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0b1020",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {roadmapProgress.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
            <h2 className="font-semibold mb-4">Weakest topics</h2>
            {weakTopics.length === 0 ? (
              <p className="text-sm text-slate-500">
                No weak topics detected — nice work!
              </p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={weakTopics} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis type="number" domain={[0, 100]} stroke="#64748b" fontSize={12} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={120}
                    stroke="#64748b"
                    fontSize={11}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "#0b1020",
                      border: "1px solid #1e293b",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="score" fill="#ef4444" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-white/5 bg-[#0b1020] p-5">
          <h2 className="font-semibold mb-4">Badges 🏆</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
            {gam.badges.map((b) => (
              <div
                key={b.id}
                className={`rounded-xl p-3 text-center border ${
                  b.earned
                    ? "border-indigo-500/40 bg-indigo-500/10"
                    : "border-white/5 bg-white/[0.02] opacity-40"
                }`}
                title={b.description}
              >
                <div className="text-2xl">{b.icon}</div>
                <div className="text-[11px] mt-1 text-slate-300">
                  {b.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Analytics;
