import {
  getTopicQuizResults,
  getDailyQuizResults,
  type TopicQuizResult,
  type DailyQuizResult,
} from "../api/client";

// =====================================================
// GAMIFICATION ENGINE
// =====================================================
//
// XP, level, streaks and badges are computed on the fly
// from data NovaPath already stores (quiz results +
// roadmap progress) rather than kept as a separate
// counter. This keeps a single source of truth and means
// stats can never drift out of sync with real activity.
// =====================================================

export type Badge = {
  id: string;
  label: string;
  icon: string;
  earned: boolean;
  description: string;
};

export type GamificationStats = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
  streak: number;
  longestStreak: number;
  totalQuizzes: number;
  averageScore: number;
  badges: Badge[];
};

type Roadmap = {
  progress?: number;
  completedTopics?: string[];
};

const XP_PER_LEVEL = 200;

function getRoadmaps(): Roadmap[] {
  try {
    const raw = localStorage.getItem("novapath_roadmaps");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function uniqueDates(dates: string[]): string[] {
  return Array.from(
    new Set(dates.map((d) => new Date(d).toDateString()))
  ).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
}

function computeStreaks(activityDates: string[]): {
  current: number;
  longest: number;
} {
  const days = uniqueDates(activityDates);

  if (days.length === 0) return { current: 0, longest: 0 };

  let longest = 1;
  let run = 1;

  for (let i = 1; i < days.length; i++) {
    const prev = new Date(days[i - 1]);
    const curr = new Date(days[i]);
    const diffDays = Math.round(
      (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (diffDays === 1) {
      run += 1;
    } else {
      run = 1;
    }

    longest = Math.max(longest, run);
  }

  // Current streak: count backwards from today/yesterday.
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  const lastDay = days[days.length - 1];

  if (lastDay !== today && lastDay !== yesterday) {
    return { current: 0, longest };
  }

  let current = 1;
  for (let i = days.length - 1; i > 0; i--) {
    const diff = Math.round(
      (new Date(days[i]).getTime() - new Date(days[i - 1]).getTime()) /
        (1000 * 60 * 60 * 24)
    );
    if (diff === 1) current += 1;
    else break;
  }

  return { current, longest };
}

export function getGamificationStats(): GamificationStats {
  const topicResults: TopicQuizResult[] = getTopicQuizResults();
  const dailyResults: DailyQuizResult[] = getDailyQuizResults();
  const roadmaps = getRoadmaps();

  // ---- XP ----
  // +10 XP per quiz attempted, +15 bonus for scoring 80%+,
  // +5 XP per completed roadmap topic.
  let xp = 0;

  for (const r of topicResults) {
    xp += 10;
    if (Number(r.percentage) >= 80) xp += 15;
  }

  for (const r of dailyResults) {
    xp += 10;
    if (Number(r.percentage) >= 80) xp += 15;
  }

  const completedTopicsCount = roadmaps.reduce(
    (sum, r) => sum + (r.completedTopics?.length || 0),
    0
  );
  xp += completedTopicsCount * 5;

  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  // ---- Streak ----
  const activityDates = [
    ...topicResults.map((r) => r.completedAt),
    ...dailyResults.map((r) => r.completedAt),
  ].filter(Boolean) as string[];

  const { current, longest } = computeStreaks(activityDates);

  // ---- Averages ----
  const allScores = [
    ...topicResults.map((r) => Number(r.percentage) || 0),
    ...dailyResults.map((r) => Number(r.percentage) || 0),
  ];
  const averageScore = allScores.length
    ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
    : 0;

  const totalQuizzes = topicResults.length + dailyResults.length;

  const anyRoadmapComplete = roadmaps.some((r) => (r.progress || 0) >= 100);
  const anyRoadmapStarted = roadmaps.length > 0;

  const badges: Badge[] = [
    {
      id: "first-steps",
      label: "First Steps",
      icon: "🌱",
      earned: anyRoadmapStarted,
      description: "Started your first roadmap",
    },
    {
      id: "quiz-taker",
      label: "Quiz Taker",
      icon: "📝",
      earned: totalQuizzes >= 1,
      description: "Completed your first quiz",
    },
    {
      id: "sharp-shooter",
      label: "Sharp Shooter",
      icon: "🎯",
      earned: allScores.some((s) => s >= 90),
      description: "Scored 90%+ on a quiz",
    },
    {
      id: "on-fire",
      label: "On Fire",
      icon: "🔥",
      earned: longest >= 3,
      description: "Reached a 3-day learning streak",
    },
    {
      id: "unstoppable",
      label: "Unstoppable",
      icon: "⚡",
      earned: longest >= 7,
      description: "Reached a 7-day learning streak",
    },
    {
      id: "quiz-master",
      label: "Quiz Master",
      icon: "🏆",
      earned: totalQuizzes >= 10,
      description: "Completed 10 quizzes",
    },
    {
      id: "roadmap-graduate",
      label: "Roadmap Graduate",
      icon: "🎓",
      earned: anyRoadmapComplete,
      description: "Completed a full roadmap",
    },
  ];

  return {
    xp,
    level,
    xpIntoLevel,
    xpForNextLevel: XP_PER_LEVEL,
    streak: current,
    longestStreak: longest,
    totalQuizzes,
    averageScore,
    badges,
  };
}
