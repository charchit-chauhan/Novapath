import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { findUserById, toPublicUser, type PublicUser } from "./store";

const JWT_SECRET = process.env.JWT_SECRET || "novapath-dev-secret-change-me";
const TOKEN_EXPIRY = "7d";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(userId: string): string {
  return jwt.sign({ sub: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
}

export function verifyToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { sub: string };
  } catch {
    return null;
  }
}

export interface AuthedRequest extends Request {
  user?: PublicUser;
}

// =====================================================
// MIDDLEWARE: require a valid Bearer token
// =====================================================

export function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please log in.",
    });
  }

  const payload = verifyToken(token);

  if (!payload) {
    return res.status(401).json({
      success: false,
      error: "Your session has expired. Please log in again.",
    });
  }

  const user = findUserById(payload.sub);

  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Account not found.",
    });
  }

  req.user = toPublicUser(user);
  next();
}

// =====================================================
// MIDDLEWARE: require admin role (chain after requireAuth)
// =====================================================

export function requireAdmin(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Admin access required.",
    });
  }

  next();
}
