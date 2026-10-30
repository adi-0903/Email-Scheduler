import { Router, Request, Response } from "express";
import crypto from "crypto";
import prisma from "../db";

const router = Router();

/**
 * Pure Node.js cryptographic password hashing using pbkdf2
 */
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, originalHash] = stored.split(":");
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, "sha512").toString("hex");
  return hash === originalHash;
}

/**
 * Seed or ensure default user on startup
 */
export async function ensureDefaultUser() {
  try {
    const existing = await prisma.user.findUnique({
      where: { email: "singhaladitya611@gmail.com" },
    });
    if (!existing) {
      await prisma.user.create({
        data: {
          name: "Aditya Singhal",
          email: "singhaladitya611@gmail.com",
          password: hashPassword("reachinbox2026!"),
          provider: "credentials",
        },
      });
      console.log("✅ Seeded default user: singhaladitya611@gmail.com");
    }
  } catch (err) {
    console.warn("[Auth] Could not ensure default user:", err);
  }
}

/**
 * POST /api/auth/register
 * Creates a new user in Neon PostgreSQL
 */
router.post("/register", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: "Full name is required" });
      return;
    }

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "A valid email address is required" });
      return;
    }

    if (!password || password.length < 8) {
      res.status(400).json({ error: "Password must be at least 8 characters" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if account already exists
    const existing = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existing) {
      res.status(409).json({
        error: "An account with this email already exists. Please switch to Log In.",
      });
      return;
    }

    // Create user in PostgreSQL
    const user = await prisma.user.create({
      data: {
        name: name.trim(),
        email: normalizedEmail,
        password: hashPassword(password),
        provider: "credentials",
      },
    });

    res.status(201).json({
      message: "Account created successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error("[Auth] Registration error:", err);
    res.status(500).json({ error: "Failed to create account. Please try again." });
  }
});

/**
 * POST /api/auth/login
 * Validates credentials against Neon PostgreSQL
 */
router.post("/login", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: "Email and password are required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Look up user in Neon database
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      res.status(401).json({
        error: "No account found with this email. Please click 'Create account' first.",
      });
      return;
    }

    // If user signed up via Google and has no password
    if (!user.password && user.provider === "google") {
      res.status(400).json({
        error: "This account was created with Google. Please use 'Continue with Google'.",
      });
      return;
    }

    // Verify password hash
    if (!user.password || !verifyPassword(password, user.password)) {
      res.status(401).json({
        error: "Incorrect password. Please verify your password and try again.",
      });
      return;
    }

    res.json({
      message: "Login successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error("[Auth] Login error:", err);
    res.status(500).json({ error: "Failed to sign in. Please try again." });
  }
});

/**
 * POST /api/auth/google
 * Authenticates or registers a Google user
 */
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, name } = req.body;

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      res.status(400).json({ error: "Valid Google email address is required" });
      return;
    }

    const normalizedEmail = email.toLowerCase().trim();
    const resolvedName = name?.trim() || normalizedEmail.split("@")[0];

    // Upsert user in database
    const user = await prisma.user.upsert({
      where: { email: normalizedEmail },
      update: {
        name: resolvedName,
      },
      create: {
        name: resolvedName,
        email: normalizedEmail,
        provider: "google",
      },
    });

    res.json({
      message: "Google sign-in successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (err: any) {
    console.error("[Auth] Google sign-in error:", err);
    res.status(500).json({ error: "Failed to authenticate with Google" });
  }
});

export default router;

