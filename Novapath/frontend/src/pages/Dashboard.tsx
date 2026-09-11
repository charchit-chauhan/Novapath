import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

type Topic = {
  id: string;
  title: string;
  description?: string;
  day?: number;
  tasks?: string[];
  estimatedHours?: number;
  expectedOutcome?: string;
};

type Roadmap = {
  id: string;
  source: string;
  roadmap: string;
  hours: string;
  fileName: string;
  fileData?: string;
  progress: number;
  currentDay: number;
  completedTopics: string[];
  topics: Topic[];
  aiRoadmap?: string;
};

function Dashboard() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [roadmaps, setRoadmaps] = useState<Roadmap[]>([]);
  const [search, setSearch] = useState("");

  const [filter, setFilter] = useState<
    "all" | "active" | "completed"
  >("all");

  // Daily goal
  const [dailyGoal, setDailyGoal] = useState(2);

  // Demo study progress for UI
  const [todayHours] = useState(1.5);

  // =====================================================
  // LOAD ROADMAPS
  // =====================================================

  const loadRoadmaps = () => {
    try {
      const saved = localStorage.getItem("novapath_roadmaps");

      if (!saved) {
        setRoadmaps([]);
        return;
      }

      const parsed = JSON.parse(saved);

      if (!Array.isArray(parsed)) {
        setRoadmaps([]);
        return;
      }

      const normalized: Roadmap[] = parsed.map(
        (item: Partial<Roadmap>, index: number) => ({
          id: String(item.id || `${Date.now()}-${index}`),

          source: item.source || "roadmap.sh",

          roadmap: item.roadmap || "My Roadmap",

          hours: String(item.hours || "2"),

          fileName: item.fileName || "",

          fileData: item.fileData || "",

          progress: Number(item.progress || 0),

          currentDay: Number(item.currentDay || 1),

          completedTopics: Array.isArray(item.completedTopics)
            ? item.completedTopics
            : [],

          topics: Array.isArray(item.topics) ? item.topics : [],

          aiRoadmap:
            typeof item.aiRoadmap === "string"
              ? item.aiRoadmap
              : "",
        })
      );

      setRoadmaps(normalized);
    } catch (error) {
      console.error("Failed to load roadmaps:", error);
      setRoadmaps([]);
    }
  };

  // =====================================================
  // PAGE LOAD / STORAGE SYNC
  // =====================================================

  useEffect(() => {
    loadRoadmaps();

    const handleStorage = () => {
      loadRoadmaps();
    };

    const handleFocus = () => {
      loadRoadmaps();
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  // =====================================================
  // ROADMAP CALCULATIONS
  // =====================================================

  const getProgress = (roadmap: Roadmap) => {
    const total = roadmap.topics?.length || 0;

    const completed = roadmap.completedTopics?.length || 0;

    if (total === 0) {
      return Number(roadmap.progress || 0);
    }

    return Math.min(
      100,
      Math.round((completed / total) * 100)
    );
  };

  const totalTopics = useMemo(() => {
    return roadmaps.reduce(
      (total, roadmap) =>
        total + (roadmap.topics?.length || 0),
      0
    );
  }, [roadmaps]);

  const totalCompleted = useMemo(() => {
    return roadmaps.reduce(
      (total, roadmap) =>
        total + (roadmap.completedTopics?.length || 0),
      0
    );
  }, [roadmaps]);

  const overallProgress = useMemo(() => {
    if (totalTopics === 0) return 0;

    return Math.round(
      (totalCompleted / totalTopics) * 100
    );
  }, [totalTopics, totalCompleted]);

  const completedRoadmaps = useMemo(() => {
    return roadmaps.filter(
      (roadmap) => getProgress(roadmap) >= 100
    ).length;
  }, [roadmaps]);

  const activeRoadmaps =
    roadmaps.length - completedRoadmaps;

  // =====================================================
  // CURRENT ROADMAP
  // =====================================================

  const currentRoadmap = useMemo(() => {
    if (roadmaps.length === 0) return null;

    const active = roadmaps
      .filter((item) => getProgress(item) < 100)
      .sort(
        (a, b) =>
          getProgress(a) - getProgress(b)
      );

    return active[0] || roadmaps[0];
  }, [roadmaps]);

  // =====================================================
  // FILTERED ROADMAPS
  // =====================================================

  const filteredRoadmaps = useMemo(() => {
    return roadmaps.filter((item) => {
      const progress = getProgress(item);

      const searchText = search.toLowerCase().trim();

      const matchesSearch =
        item.roadmap
          .toLowerCase()
          .includes(searchText) ||
        item.fileName
          ?.toLowerCase()
          .includes(searchText);

      const matchesFilter =
        filter === "all" ||
        (filter === "active" && progress < 100) ||
        (filter === "completed" && progress >= 100);

      return matchesSearch && matchesFilter;
    });
  }, [roadmaps, search, filter]);

  // =====================================================
  // PERSONALIZED LEARNING
  // =====================================================

  const personalizeRoadmap = (id?: string) => {
    if (id) {
      const exists = roadmaps.find(
        (item) =>
          String(item.id) === String(id)
      );

      if (!exists) {
        alert("Roadmap could not be found.");
        return;
      }

      // Save selected roadmap
      localStorage.setItem(
        "novapath_selected_roadmap",
        String(id)
      );
    }

    navigate("/personalized-learning");
  };

  // =====================================================
  // DELETE ROADMAP
  // =====================================================

  const handleDeleteRoadmap = (id: string) => {
    const roadmapToDelete = roadmaps.find(
      (item) =>
        String(item.id) === String(id)
    );

    if (!roadmapToDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${roadmapToDelete.roadmap}"?\n\nThis will permanently remove its progress and tasks.`
    );

    if (!confirmed) return;

    const updatedRoadmaps = roadmaps.filter(
      (item) =>
        String(item.id) !== String(id)
    );

    localStorage.setItem(
      "novapath_roadmaps",
      JSON.stringify(updatedRoadmaps)
    );

    setRoadmaps(updatedRoadmaps);
  };

  // =====================================================
  // ROADMAP ICON
  // =====================================================

  const getRoadmapIcon = (roadmap: string) => {
    const name = roadmap.toLowerCase();

    if (name.includes("ai")) return "🤖";
    if (name.includes("machine")) return "🧠";
    if (name.includes("data")) return "📊";
    if (name.includes("python")) return "🐍";
    if (name.includes("sql")) return "🗄️";
    if (name.includes("full")) return "💻";
    if (name.includes("devops")) return "⚙️";
    if (name.includes("cloud")) return "☁️";
    if (name.includes("cyber")) return "🔐";

    return "🗺️";
  };

  // =====================================================
  // PROGRESS MESSAGE
  // =====================================================

  const getProgressMessage = (progress: number) => {
    if (progress === 0) return "Ready to personalize";
    if (progress < 25) return "Getting started";
    if (progress < 50) return "Making progress";
    if (progress < 75) return "Great momentum";
    if (progress < 100) return "Almost there";

    return "Completed 🎉";
  };

  // =====================================================
  // DAILY GOAL
  // =====================================================

  const dailyProgress = Math.min(
    100,
    Math.round(
      (todayHours / dailyGoal) * 100
    )
  );

  // =====================================================
  // ACHIEVEMENTS
  // =====================================================

  const achievements = [
    {
      icon: "🌱",
      title: "First Step",
      description: "Create your first roadmap",
      unlocked: roadmaps.length >= 1,
    },

    {
      icon: "🎯",
      title: "Getting Started",
      description: "Complete 5 topics",
      unlocked: totalCompleted >= 5,
    },

    {
      icon: "🔥",
      title: "On Fire",
      description: "Complete 10 topics",
      unlocked: totalCompleted >= 10,
    },

    {
      icon: "🏆",
      title: "Path Master",
      description: "Complete a roadmap",
      unlocked: completedRoadmaps >= 1,
    },
  ];

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="min-h-screen bg-[#070b14] text-white">

      {/* =================================================
          NAVBAR
      ================================================= */}

      <nav className="sticky top-0 z-50 border-b border-white/5 bg-[#070b14]/90 backdrop-blur-xl">

        <div className="max-w-7xl mx-auto px-5 sm:px-6 py-4">

          <div className="flex items-center justify-between">

            {/* LOGO */}

            <button
              onClick={() =>
                navigate("/dashboard")
              }
              className="flex items-center gap-3"
            >

              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                🚀
              </div>

              <div className="text-left">

                <h1 className="font-bold text-lg tracking-tight">
                  NovaPath
                </h1>

                <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  AI Learning
                </p>

              </div>

            </button>

            {/* NAV */}

            <div className="hidden lg:flex items-center gap-1">
              <button
                onClick={() => navigate("/analytics")}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition"
              >
                📊 Analytics
              </button>
              <button
                onClick={() => navigate("/revision")}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition"
              >
                🧠 Revision
              </button>
              <button
                onClick={() => navigate("/mentor")}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition"
              >
                💬 AI Mentor
              </button>
              <button
                onClick={() => navigate("/career-guidance")}
                className="px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-white/5 transition"
              >
                🎯 Career
              </button>
            </div>

            <div className="flex items-center gap-2 sm:gap-4">

              <button
                onClick={() =>
                  navigate("/add-roadmap")
                }
                className="hidden sm:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-medium text-sm"
              >
                <span>+</span>
                Add Roadmap
              </button>

              {user?.role === "admin" && (
                <button
                  onClick={() => navigate("/admin")}
                  className="hidden sm:flex px-3 py-2 rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/50 transition text-sm text-slate-300"
                >
                  🛡️ Admin
                </button>
              )}

              <button
                onClick={() =>
                  navigate("/profile")
                }
                className="w-10 h-10 rounded-xl bg-slate-900 border border-white/5 hover:border-indigo-500/50 transition flex items-center justify-center"
              >
                👤
              </button>

              <button
                onClick={() => {
                  logout();
                  navigate("/login");
                }}
                className="hidden sm:flex px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition text-sm text-slate-300"
              >
                Logout
              </button>

            </div>

          </div>

        </div>

      </nav>

      {/* =================================================
          MAIN
      ================================================= */}

      <main className="max-w-7xl mx-auto px-5 sm:px-6 py-8 sm:py-12">

        {/* =================================================
            HERO
        ================================================= */}

        <section className="relative overflow-hidden rounded-3xl border border-white/5 bg-gradient-to-br from-indigo-950/70 via-slate-900 to-[#0b1020] p-6 sm:p-10 mb-8">

          <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />

          <div className="absolute -bottom-32 -left-20 w-72 h-72 rounded-full bg-violet-600/10 blur-3xl" />

          <div className="relative">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-8">

              <div>

                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium mb-5">

                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />

                  Your AI learning workspace

                </div>

                <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight">

                  Keep moving

                  <span className="text-indigo-400">
                    {" "}forward.
                  </span>

                </h2>

                <p className="text-slate-400 mt-4 max-w-xl text-sm sm:text-base leading-relaxed">

                  Build skills, follow personalized
                  learning plans, and turn your
                  learning goals into real progress.

                </p>

              </div>

              {/* OVERALL */}

              {roadmaps.length > 0 && (

                <div className="w-full lg:w-72 bg-black/20 border border-white/5 rounded-2xl p-5">

                  <div className="flex items-center justify-between mb-3">

                    <span className="text-sm text-slate-400">
                      Overall Progress
                    </span>

                    <span className="text-xl font-bold">
                      {overallProgress}%
                    </span>

                  </div>

                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">

                    <div
                      className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-700"
                      style={{
                        width: `${overallProgress}%`,
                      }}
                    />

                  </div>

                  <p className="text-xs text-slate-500 mt-3">

                    {totalCompleted} of{" "}
                    {totalTopics} topics completed

                  </p>

                </div>

              )}

            </div>

          </div>

        </section>

        {/* =================================================
            STAT CARDS
        ================================================= */}

        <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">

          <div className="group bg-slate-900/70 border border-white/5 rounded-2xl p-5 hover:border-indigo-500/30 transition">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg">
                🗺️
              </div>

              <span className="text-xs text-slate-600">
                TOTAL
              </span>

            </div>

            <p className="text-slate-400 text-sm mt-5">
              My Roadmaps
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {roadmaps.length}
            </p>

          </div>

          <div className="group bg-slate-900/70 border border-white/5 rounded-2xl p-5 hover:border-emerald-500/30 transition">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-lg">
                ✓
              </div>

              <span className="text-xs text-slate-600">
                DONE
              </span>

            </div>

            <p className="text-slate-400 text-sm mt-5">
              Topics Completed
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {totalCompleted}
            </p>

          </div>

          <div className="group bg-slate-900/70 border border-white/5 rounded-2xl p-5 hover:border-orange-500/30 transition">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center text-lg">
                🔥
              </div>

              <span className="text-xs text-slate-600">
                ACTIVE
              </span>

            </div>

            <p className="text-slate-400 text-sm mt-5">
              Active Paths
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {activeRoadmaps}
            </p>

          </div>

          <div className="group bg-slate-900/70 border border-white/5 rounded-2xl p-5 hover:border-violet-500/30 transition">

            <div className="flex items-center justify-between">

              <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-lg">
                🏆
              </div>

              <span className="text-xs text-slate-600">
                FINISHED
              </span>

            </div>

            <p className="text-slate-400 text-sm mt-5">
              Completed Paths
            </p>

            <p className="text-2xl sm:text-3xl font-bold mt-1">
              {completedRoadmaps}
            </p>

          </div>

        </section>

        {/* =================================================
            PERSONALIZED LEARNING SECTION
        ================================================= */}

        {roadmaps.length > 0 &&
          currentRoadmap && (

            <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-10">

              {/* MAIN PERSONALIZED CARD */}

              <div className="lg:col-span-2 relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/30 via-slate-900/80 to-indigo-950/30 p-6">

                <div className="absolute -top-20 -right-20 w-56 h-56 rounded-full bg-violet-600/10 blur-3xl" />

                <div className="absolute -bottom-24 -left-20 w-56 h-56 rounded-full bg-indigo-600/10 blur-3xl" />

                <div className="relative">

                  <div className="flex items-start justify-between gap-5">

                    <div>

                      <p className="text-xs uppercase tracking-widest text-violet-400 font-semibold">
                        Personalized Learning
                      </p>

                      <h3 className="text-2xl sm:text-3xl font-bold mt-2">
                        Your learning plan is ready.
                      </h3>

                      <p className="text-slate-400 mt-3 max-w-xl text-sm leading-relaxed">

                        NovaPath creates a learning plan
                        based on your goals, available
                        study time, skill level, and
                        progress.

                      </p>

                    </div>

                    <span className="text-4xl hidden sm:block">
                      🎯
                    </span>

                  </div>

                  {/* CURRENT ROADMAP */}

                  <div className="mt-6 flex items-center gap-4 bg-black/20 border border-white/5 rounded-xl p-4">

                    <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-2xl">

                      {getRoadmapIcon(
                        currentRoadmap.roadmap
                      )}

                    </div>

                    <div className="min-w-0">

                      <p className="text-xs uppercase tracking-wider text-slate-500">
                        Current Roadmap
                      </p>

                      <p className="text-indigo-300 font-semibold mt-1 truncate">
                        {currentRoadmap.roadmap}
                      </p>

                      <p className="text-xs text-slate-500 mt-1">

                        {getProgress(
                          currentRoadmap
                        )}% completed

                      </p>

                    </div>

                  </div>

                  {/* BENEFITS */}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-5">

                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">

                      <p className="text-lg">
                        📖
                      </p>

                      <p className="text-xs font-medium mt-2">
                        Notes & Resources
                      </p>

                    </div>

                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">

                      <p className="text-lg">
                        💻
                      </p>

                      <p className="text-xs font-medium mt-2">
                        Practice Tasks
                      </p>

                    </div>

                    <div className="bg-slate-950/40 border border-white/5 rounded-xl p-3">

                      <p className="text-lg">
                        🧠
                      </p>

                      <p className="text-xs font-medium mt-2">
                        Topic & Daily Quizzes
                      </p>

                    </div>

                  </div>

                  {/* CTA */}

                  <button
                    onClick={() =>
                      personalizeRoadmap(
                        currentRoadmap.id
                      )
                    }
                    className="w-full mt-5 py-3.5 rounded-xl bg-violet-600 hover:bg-violet-500 transition font-semibold shadow-lg shadow-violet-600/20 flex items-center justify-center gap-2"
                  >

                    🎯 Open Personalized Learning

                    <span>→</span>

                  </button>

                </div>

              </div>

              {/* DAILY GOAL */}

              <div className="rounded-2xl border border-white/5 bg-slate-900/70 p-6">

                <div className="flex items-center justify-between">

                  <div>

                    <p className="text-xs uppercase tracking-widest text-slate-500">
                      Daily Goal
                    </p>

                    <h3 className="text-xl font-bold mt-1">
                      Study time
                    </h3>

                  </div>

                  <span className="text-2xl">
                    ⏱️
                  </span>

                </div>

                <div className="flex items-end gap-2 mt-8">

                  <span className="text-4xl font-bold">
                    {todayHours}
                  </span>

                  <span className="text-slate-500 mb-1">
                    / {dailyGoal}h
                  </span>

                </div>

                <div className="h-2 bg-slate-800 rounded-full mt-5 overflow-hidden">

                  <div
                    className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                    style={{
                      width: `${dailyProgress}%`,
                    }}
                  />

                </div>

                <p className="text-xs text-slate-500 mt-3">

                  {dailyProgress >= 100
                    ? "Daily goal completed 🎉"
                    : `${Math.max(
                        dailyGoal - todayHours,
                        0
                      ).toFixed(1)}h remaining today`}

                </p>

                <div className="flex gap-2 mt-6">

                  {[1, 2, 3, 4].map(
                    (hour) => (

                      <button
                        key={hour}
                        onClick={() =>
                          setDailyGoal(hour)
                        }
                        className={`flex-1 py-2 rounded-lg text-xs transition ${
                          dailyGoal === hour
                            ? "bg-indigo-600 text-white"
                            : "bg-slate-800 text-slate-400 hover:bg-slate-700"
                        }`}
                      >
                        {hour}h
                      </button>

                    )
                  )}

                </div>

              </div>

            </section>

          )}

        {/* =================================================
            INSIGHTS + STREAK
        ================================================= */}

        {roadmaps.length > 0 && (

          <section className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-10">

            {/* AI INSIGHT */}

            <div className="relative overflow-hidden rounded-2xl border border-indigo-500/10 bg-gradient-to-br from-indigo-950/40 to-slate-900/70 p-6">

              <div className="absolute -right-10 -top-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

              <div className="relative">

                <div className="flex items-center gap-3">

                  <div className="w-11 h-11 rounded-xl bg-indigo-500/10 flex items-center justify-center text-xl">
                    🤖
                  </div>

                  <div>

                    <p className="text-xs uppercase tracking-widest text-indigo-400">
                      Nova AI Insight
                    </p>

                    <h3 className="font-semibold mt-1">
                      Your learning snapshot
                    </h3>

                  </div>

                </div>

                <p className="text-slate-400 text-sm leading-relaxed mt-5">

                  {overallProgress === 0
                    ? "You're ready to begin. Open Personalized Learning to let NovaPath build your first AI-powered learning plan."
                    : overallProgress < 50
                    ? `You're ${overallProgress}% through your learning journey. Keep showing up consistently.`
                    : overallProgress < 100
                    ? `Great momentum! You've completed ${totalCompleted} topics. Keep following your personalized plan.`
                    : "Amazing work! You've completed your current learning paths. Time to explore a new skill."}

                </p>

              </div>

            </div>

            {/* STREAK */}

            <div className="rounded-2xl border border-orange-500/10 bg-gradient-to-br from-orange-950/20 to-slate-900/70 p-6">

              <div className="flex items-center justify-between">

                <div>

                  <p className="text-xs uppercase tracking-widest text-orange-400">
                    Learning Streak
                  </p>

                  <h3 className="text-3xl font-bold mt-2">
                    7 days 🔥
                  </h3>

                </div>

                <div className="text-5xl">
                  🔥
                </div>

              </div>

              <p className="text-sm text-slate-500 mt-4">
                Keep your streak alive by completing
                today's personalized learning plan.
              </p>

              <div className="flex gap-2 mt-5">

                {[
                  "M",
                  "T",
                  "W",
                  "T",
                  "F",
                  "S",
                  "S",
                ].map(
                  (day, index) => (

                    <div
                      key={`${day}-${index}`}
                      className="flex-1 text-center text-orange-400"
                    >

                      <div className="text-[10px] mb-2">
                        {day}
                      </div>

                      <div className="h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-xs">
                        ✓
                      </div>

                    </div>

                  )
                )}

              </div>

            </div>

          </section>

        )}

        {/* =================================================
            ROADMAP HEADER
        ================================================= */}

        <section>

          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5 mb-6">

            <div>

              <div className="flex items-center gap-3">

                <h3 className="text-2xl sm:text-3xl font-bold">
                  Your Learning Paths
                </h3>

                {roadmaps.length > 0 && (

                  <span className="px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 text-xs">
                    {roadmaps.length}
                  </span>

                )}

              </div>

              <p className="text-slate-500 mt-2 text-sm">
                Choose a roadmap to build its personalized learning plan.
              </p>

            </div>

            {roadmaps.length > 0 && (

              <div className="flex flex-col sm:flex-row gap-3">

                {/* SEARCH */}

                <div className="relative">

                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
                    🔍
                  </span>

                  <input
                    value={search}
                    onChange={(e) =>
                      setSearch(e.target.value)
                    }
                    placeholder="Search roadmaps..."
                    className="w-full sm:w-56 pl-10 pr-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-sm text-white placeholder:text-slate-600 outline-none focus:border-indigo-500/50"
                  />

                </div>

                {/* FILTER */}

                <select
                  value={filter}
                  onChange={(e) =>
                    setFilter(
                      e.target.value as
                        | "all"
                        | "active"
                        | "completed"
                    )
                  }
                  className="px-4 py-2.5 rounded-xl bg-slate-900 border border-white/5 text-sm text-slate-300 outline-none"
                >

                  <option value="all">
                    All roadmaps
                  </option>

                  <option value="active">
                    In progress
                  </option>

                  <option value="completed">
                    Completed
                  </option>

                </select>

              </div>

            )}

          </div>

        </section>

        {/* =================================================
            EMPTY STATE
        ================================================= */}

        {roadmaps.length === 0 && (

          <div className="relative overflow-hidden bg-slate-900/70 border border-white/5 rounded-3xl p-10 sm:p-16 text-center">

            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-72 h-40 bg-indigo-600/10 blur-3xl" />

            <div className="relative">

              <div className="mx-auto w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-4xl mb-6">
                🗺️
              </div>

              <h3 className="text-2xl font-bold">
                Your learning journey starts here
              </h3>

              <p className="text-slate-500 mt-3 max-w-md mx-auto">
                Add a roadmap from roadmap.sh or
                upload your own roadmap and let
                NovaPath turn it into an actionable
                personalized learning plan.
              </p>

              <button
                onClick={() =>
                  navigate("/add-roadmap")
                }
                className="mt-7 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 transition font-semibold shadow-lg shadow-indigo-600/20"
              >
                Create Your First Roadmap 🚀
              </button>

            </div>

          </div>

        )}

        {/* =================================================
            NO SEARCH RESULTS
        ================================================= */}

        {roadmaps.length > 0 &&
          filteredRoadmaps.length === 0 && (

            <div className="bg-slate-900/70 border border-white/5 rounded-3xl p-12 text-center">

              <div className="text-4xl mb-4">
                🔎
              </div>

              <h3 className="text-lg font-semibold">
                No roadmaps found
              </h3>

              <p className="text-slate-500 mt-2">
                Try changing your search or filter.
              </p>

            </div>

          )}

        {/* =================================================
            ROADMAP CARDS
        ================================================= */}

        {filteredRoadmaps.length > 0 && (

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

            {filteredRoadmaps.map((item) => {

              const completed =
                item.completedTopics?.length || 0;

              const total =
                item.topics?.length || 0;

              const progress =
                getProgress(item);

              const isCompleted =
                progress >= 100;

              const remaining =
                Math.max(
                  total - completed,
                  0
                );

              return (

                <article
                  key={item.id}
                  className="group relative bg-slate-900/70 border border-white/5 rounded-2xl p-5 sm:p-6 hover:border-indigo-500/30 hover:bg-slate-900 transition-all duration-300"
                >

                  {/* TOP GLOW */}

                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-indigo-500/40 to-transparent opacity-0 group-hover:opacity-100 transition" />

                  {/* HEADER */}

                  <div className="flex items-start justify-between gap-4">

                    <div className="flex items-center gap-4 min-w-0">

                      <div className="w-12 h-12 shrink-0 rounded-2xl bg-indigo-500/10 border border-indigo-500/10 flex items-center justify-center text-2xl">

                        {getRoadmapIcon(
                          item.roadmap
                        )}

                      </div>

                      <div className="min-w-0">

                        <div className="flex items-center gap-2">

                          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">

                            {item.source === "custom"
                              ? "Custom Roadmap"
                              : "Roadmap.sh"}

                          </span>

                          {isCompleted && (

                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                              Completed
                            </span>

                          )}

                        </div>

                        <h4 className="text-xl font-semibold mt-1 truncate">
                          {item.roadmap}
                        </h4>

                      </div>

                    </div>

                    {/* DELETE */}

                    <button
                      onClick={() =>
                        handleDeleteRoadmap(
                          item.id
                        )
                      }
                      className="shrink-0 w-9 h-9 rounded-lg text-slate-600 hover:text-red-400 hover:bg-red-500/10 transition"
                      title="Delete roadmap"
                    >
                      🗑️
                    </button>

                  </div>

                  {/* FILE */}

                  {item.fileName && (

                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 bg-slate-950/50 rounded-lg px-3 py-2">

                      <span>📎</span>

                      <span className="truncate">
                        {item.fileName}
                      </span>

                    </div>

                  )}

                  {/* STATS */}

                  <div className="grid grid-cols-3 gap-2 mt-5">

                    <div className="bg-slate-950/60 rounded-xl px-3 py-3">

                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Study
                      </p>

                      <p className="text-sm font-semibold mt-1">
                        ⏱️ {item.hours}h/day
                      </p>

                    </div>

                    <div className="bg-slate-950/60 rounded-xl px-3 py-3">

                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Topics
                      </p>

                      <p className="text-sm font-semibold mt-1">
                        📚 {total}
                      </p>

                    </div>

                    <div className="bg-slate-950/60 rounded-xl px-3 py-3">

                      <p className="text-[10px] uppercase tracking-wider text-slate-600">
                        Current
                      </p>

                      <p className="text-sm font-semibold mt-1">
                        Day {item.currentDay || 1}
                      </p>

                    </div>

                  </div>

                  {/* PROGRESS */}

                  <div className="mt-6">

                    <div className="flex items-center justify-between mb-2">

                      <span className="text-sm text-slate-400">
                        {getProgressMessage(
                          progress
                        )}
                      </span>

                      <span className="text-sm font-bold">
                        {progress}%
                      </span>

                    </div>

                    <div className="h-2 bg-slate-800 rounded-full overflow-hidden">

                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          isCompleted
                            ? "bg-emerald-500"
                            : "bg-gradient-to-r from-indigo-500 to-violet-500"
                        }`}
                        style={{
                          width: `${progress}%`,
                        }}
                      />

                    </div>

                    <div className="flex justify-between mt-2 text-xs text-slate-600">

                      <span>
                        {completed} completed
                      </span>

                      <span>
                        {remaining} remaining
                      </span>

                    </div>

                  </div>

                  {/* MAIN PERSONALIZED LEARNING BUTTON */}

                  <button
                    onClick={() =>
                      personalizeRoadmap(
                        item.id
                      )
                    }
                    className={`w-full mt-6 py-3 rounded-xl font-semibold transition flex items-center justify-center gap-2 ${
                      isCompleted
                        ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-600/20"
                        : "bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/10"
                    }`}
                  >

                    {isCompleted
                      ? "Review Personalized Plan"
                      : progress === 0
                      ? "Open Personalized Learning"
                      : "Continue Personalized Learning"}

                    <span>→</span>

                  </button>

                </article>

              );
            })}

          </div>

        )}

        {/* =================================================
            ACHIEVEMENTS
        ================================================= */}

        {roadmaps.length > 0 && (

          <section className="mt-10">

            <div className="mb-5">

              <h3 className="text-2xl font-bold">
                Achievements 🏆
              </h3>

              <p className="text-slate-500 text-sm mt-1">
                Keep learning to unlock new milestones.
              </p>

            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

              {achievements.map(
                (achievement) => (

                  <div
                    key={achievement.title}
                    className={`rounded-2xl border p-5 transition ${
                      achievement.unlocked
                        ? "bg-slate-900/70 border-indigo-500/20"
                        : "bg-slate-900/30 border-white/5 opacity-50"
                    }`}
                  >

                    <div className="text-3xl mb-4">
                      {achievement.icon}
                    </div>

                    <h4 className="font-semibold">
                      {achievement.title}
                    </h4>

                    <p className="text-xs text-slate-500 mt-1">
                      {achievement.description}
                    </p>

                    <p
                      className={`text-[10px] uppercase tracking-widest mt-4 ${
                        achievement.unlocked
                          ? "text-emerald-400"
                          : "text-slate-600"
                      }`}
                    >
                      {achievement.unlocked
                        ? "Unlocked"
                        : "Locked"}
                    </p>

                  </div>

                )
              )}

            </div>

          </section>

        )}

        {/* =================================================
            BOTTOM CTA
        ================================================= */}

        {roadmaps.length > 0 && (

          <section className="mt-10 relative overflow-hidden rounded-2xl border border-white/5 bg-gradient-to-r from-slate-900 to-indigo-950/30 p-6 sm:p-8">

            <div className="relative flex flex-col sm:flex-row sm:items-center sm:justify-between gap-5">

              <div>

                <div className="flex items-center gap-2">

                  <span className="text-xl">
                    ✨
                  </span>

                  <h3 className="font-semibold">
                    Ready for another skill?
                  </h3>

                </div>

                <p className="text-sm text-slate-500 mt-2">
                  Add another roadmap and create a new personalized learning journey.
                </p>

              </div>

              <div className="flex gap-2">

                <button
                  onClick={() =>
                    personalizeRoadmap()
                  }
                  className="shrink-0 px-5 py-3 rounded-xl border border-violet-500/30 text-violet-300 hover:bg-violet-500/10 transition font-medium"
                >
                  🎯 Personalized Learning
                </button>

                <button
                  onClick={() =>
                    navigate("/add-roadmap")
                  }
                  className="shrink-0 px-5 py-3 rounded-xl border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/10 transition font-medium"
                >
                  + Add Roadmap
                </button>

              </div>

            </div>

          </section>

        )}

      </main>

      {/* =================================================
          MOBILE ADD BUTTON
      ================================================= */}

      <button
        onClick={() =>
          navigate("/add-roadmap")
        }
        className="sm:hidden fixed bottom-5 right-5 z-40 w-14 h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 shadow-xl shadow-indigo-600/30 flex items-center justify-center text-2xl"
        title="Add roadmap"
      >
        +
      </button>

    </div>
  );
}

export default Dashboard;