import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";

export async function GET(req: NextRequest) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const result = await query<{
        id: string;
        email: string;
        display_name: string | null;
        avatar_url: string | null;
        created_at: string;
    }>(
        "SELECT id, email, display_name, avatar_url, created_at FROM users WHERE id = $1",
        [auth.userId]
    );

    const user = result.rows[0];
    if (!user) return unauthorized("用户不存在");

    return Response.json({ user });
}

export async function PATCH(req: NextRequest) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const body = await req.json();
    const { display_name, daily_goal } = body;

    // Gracefully handle migration if it hasn't run yet
    try {
        await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS daily_goal INTEGER DEFAULT 20");
    } catch (e) { /* ignore if already exists or fails */ }

    const result = await query(
        `UPDATE users
         SET display_name = COALESCE($1, display_name),
             daily_goal   = COALESCE($2, daily_goal),
             updated_at   = NOW()
         WHERE id = $3
         RETURNING id, email, display_name, daily_goal, avatar_url, created_at`,
        [display_name || null, daily_goal || null, auth.userId]
    );

    return Response.json({ user: result.rows[0] });
}
