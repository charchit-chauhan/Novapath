import { getDueRevisions } from "./revision";
import { getGamificationStats } from "./gamification";

// =====================================================
// NOTIFICATIONS
// =====================================================
//
// NovaPath runs without a mail/SMS server, so notifications
// are computed in-app from the same activity data instead
// of being pushed by a background job. This still covers
// the "remind me" scenarios (revision due, streak at risk,
// milestones) without needing Celery/Redis/SMTP.
// =====================================================

export type NotificationItem = {
  id: string;
  type: "revision" | "streak" | "milestone" | "info";
  title: string;
  message: string;
  icon: string;
};

type Roadmap = {
  id: string;
  roadmap: string;
  progress?: number;
};

function getRoadmaps(): Roadmap[] {
  try {
    const raw = localStorage.getItem("novapath_roadmaps");
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getNotifications(): NotificationItem[] {
  const items: NotificationItem[] = [];

  // Revision reminders
  const due = getDueRevisions();
  if (due.length > 0) {
    items.push({
      id: "revision-due",
      type: "revision",
      icon: "🧠",
      title: `${due.length} topic${due.length > 1 ? "s" : ""} due for revision`,
      message: due
        .slice(0, 3)
        .map((d) => d.topicTitle)
        .join(", "),
    });
  }

  // Streak risk
  const gam = getGamificationStats();
  if (gam.streak === 0 && gam.longestStreak > 0) {
    items.push({
      id: "streak-reset",
      type: "streak",
      icon: "💤",
      title: "Your learning streak reset",
      message: "Complete a quiz or task today to start a new streak.",
    });
  } else if (gam.streak >= 1) {
    items.push({
      id: "streak-active",
      type: "streak",
      icon: "🔥",
      title: `${gam.streak}-day streak going`,
      message: "Keep it up — study today to extend it.",
    });
  }

  // Milestones
  for (const roadmap of getRoadmaps()) {
    const progress = roadmap.progress || 0;
    if (progress >= 100) {
      items.push({
        id: `milestone-${roadmap.id}`,
        type: "milestone",
        icon: "🎉",
        title: `Roadmap complete: ${roadmap.roadmap}`,
        message: "Great work! Check Career Guidance for your next move.",
      });
    } else if (progress >= 50 && progress < 55) {
      items.push({
        id: `milestone-half-${roadmap.id}`,
        type: "milestone",
        icon: "🚀",
        title: `Halfway through ${roadmap.roadmap}`,
        message: "You're 50% of the way there — keep going!",
      });
    }
  }

  return items;
}
