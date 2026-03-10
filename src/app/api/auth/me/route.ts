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
