import fs from "fs";
import path from "path";

// =====================================================
// SIMPLE JSON-FILE DATA STORE
// =====================================================
//
// NovaPath ships without an external database so the
// project runs anywhere with zero infrastructure setup.
// This module persists Users + platform stats to JSON
// files on disk under backend/data/.
//
// For a production deployment this would be swapped for
// PostgreSQL (see README "Scaling this project").
// =====================================================

const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const STATS_FILE = path.join(DATA_DIR, "stats.json");

export type Role = "student" | "admin";

export type User = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: Role;
  careerGoal?: string;
  skillLevel?: string;
  createdAt: string;
};

export type PublicUser = Omit<User, "passwordHash">;

export type Stats = {
  roadmapsGenerated: number;
  learningPlansGenerated: number;
  topicQuizzesGenerated: number;
  dailyQuizzesGenerated: number;
  mentorMessages: number;
  careerGuidanceRuns: number;
};

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readJson<T>(file: string, fallback: T): T {
  ensureDataDir();

  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(fallback, null, 2));
    return fallback;
  }

  try {
    const raw = fs.readFileSync(file, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, data: T) {
  ensureDataDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// =====================================================
// USERS
// =====================================================

export function getUsers(): User[] {
  return readJson<User[]>(USERS_FILE, []);
}

export function saveUsers(users: User[]) {
  writeJson(USERS_FILE, users);
}

export function findUserByEmail(email: string): User | undefined {
  return getUsers().find(
    (u) => u.email.toLowerCase() === email.toLowerCase()
  );
}

export function findUserById(id: string): User | undefined {
  return getUsers().find((u) => u.id === id);
}

export function createUser(user: User): User {
  const users = getUsers();
  users.push(user);
  saveUsers(users);
  return user;
}

export function updateUser(id: string, patch: Partial<User>): User | undefined {
  const users = getUsers();
  const index = users.findIndex((u) => u.id === id);

  if (index === -1) return undefined;

  users[index] = { ...users[index], ...patch };
  saveUsers(users);
  return users[index];
}

export function deleteUser(id: string): boolean {
  const users = getUsers();
  const next = users.filter((u) => u.id !== id);

  if (next.length === users.length) return false;

  saveUsers(next);
  return true;
}

export function toPublicUser(user: User): PublicUser {
  const { passwordHash, ...rest } = user;
  return rest;
}

// =====================================================
// STATS
// =====================================================

const DEFAULT_STATS: Stats = {
  roadmapsGenerated: 0,
  learningPlansGenerated: 0,
  topicQuizzesGenerated: 0,
  dailyQuizzesGenerated: 0,
  mentorMessages: 0,
  careerGuidanceRuns: 0,
};

export function getStats(): Stats {
  return readJson<Stats>(STATS_FILE, DEFAULT_STATS);
}

export function bumpStat(key: keyof Stats, amount = 1) {
  const stats = getStats();
  stats[key] = (stats[key] || 0) + amount;
  writeJson(STATS_FILE, stats);
}
