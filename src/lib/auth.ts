import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { NextRequest } from "next/server";

const JWT_SECRET = process.env.JWT_SECRET!;
const COOKIE_NAME = "fc_token";

export interface JwtPayload {
    userId: string;
    email: string;
}

// ── Sign & set cookie ──────────────────────────────────────────────────────

export function signToken(payload: JwtPayload): string {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function setAuthCookie(token: string) {
    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: "/",
    });
}

export async function clearAuthCookie() {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);
}

// ── Verify token ───────────────────────────────────────────────────────────

export function verifyToken(token: string): JwtPayload | null {
    try {
        return jwt.verify(token, JWT_SECRET) as JwtPayload;
    } catch {
        return null;
    }
}

// ── Get current user from request (for Route Handlers) ────────────────────

export function getAuthUser(req: NextRequest): JwtPayload | null {
    const token = req.cookies.get(COOKIE_NAME)?.value;
    if (!token) return null;
    return verifyToken(token);
}

// ── Response helpers ───────────────────────────────────────────────────────

export function unauthorized(message = "Unauthorized") {
    return Response.json({ error: message }, { status: 401 });
}
