import { getTopicQuizResults, type TopicQuizResult } from "../api/client";

// =====================================================
// SMART REVISION (SPACED REPETITION)
// =====================================================
//
// Any topic quiz scored below 70% enters a revision queue.
// Each time it's revised the next interval doubles
// (1 -> 2 -> 4 -> 8 days); a low score resets it to 1 day.
// State lives in its own localStorage key so it survives
// across sessions without touching existing quiz data.
// =====================================================

const REVISION_STATE_KEY = "novapath_revision_state";
const WEAK_THRESHOLD = 70;

export type RevisionState = {
  topicId: string;
  topicTitle: string;
  roadmapId?: string;
  intervalDays: number;
  lastReviewedAt: string;
  nextDueAt: string;
  timesRevised: number;
};

function readState(): Record<string, RevisionState> {
  try {
    const raw = localStorage.getItem(REVISION_STATE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeState(state: Record<string, RevisionState>) {
  localStorage.setItem(REVISION_STATE_KEY, JSON.stringify(state));
}

function addDays(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

// Call this whenever a fresh set of topic quiz results is available
// (e.g. on the Revision page load) to keep the schedule current.
export function syncRevisionQueue(): RevisionState[] {
  const results = getTopicQuizResults();
  const state = readState();

  const latestByTopic = new Map<string, TopicQuizResult>();
  for (const r of results) {
    latestByTopic.set(String(r.topicId), r);
  }

  for (const [topicId, result] of latestByTopic) {
    const isWeak = Number(result.percentage) < WEAK_THRESHOLD;
    const existing = state[topicId];

    if (!isWeak) {
      // Mastered — remove from the active revision queue if present.
      if (existing) delete state[topicId];
      continue;
    }

    if (!existing) {
      state[topicId] = {
        topicId,
        topicTitle: result.topicTitle,
        intervalDays: 1,
        lastReviewedAt: result.completedAt,
        nextDueAt: addDays(new Date(result.completedAt), 1),
        timesRevised: 0,
      };
    }
  }

  writeState(state);
  return Object.values(state);
}

export function markRevised(topicId: string, newPercentage: number) {
  const state = readState();
  const entry = state[topicId];
  if (!entry) return;

  if (newPercentage >= WEAK_THRESHOLD) {
    delete state[topicId];
    writeState(state);
    return;
  }

  const nextInterval = Math.min(entry.intervalDays * 2, 16);

  state[topicId] = {
    ...entry,
    intervalDays: nextInterval,
    lastReviewedAt: new Date().toISOString(),
    nextDueAt: addDays(new Date(), nextInterval),
    timesRevised: entry.timesRevised + 1,
  };

  writeState(state);
}

export function getDueRevisions(): RevisionState[] {
  const all = Object.values(readState());
  const now = new Date();
  return all
    .filter((r) => new Date(r.nextDueAt) <= now)
    .sort(
      (a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime()
    );
}

export function getUpcomingRevisions(): RevisionState[] {
  const all = Object.values(readState());
  const now = new Date();
  return all
    .filter((r) => new Date(r.nextDueAt) > now)
    .sort(
      (a, b) => new Date(a.nextDueAt).getTime() - new Date(b.nextDueAt).getTime()
    );
}
