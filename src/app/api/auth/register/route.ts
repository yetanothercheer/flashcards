import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken, setAuthCookie, unauthorized } from "@/lib/auth";
import { z } from "zod";

const RegisterSchema = z.object({
    email: z.string().email(),
    password: z.string().min(8, "密码至少 8 位"),
    display_name: z.string().optional(),
});

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parsed = RegisterSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password, display_name } = parsed.data;

    // Check email uniqueness
    const existing = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (existing.rowCount && existing.rowCount > 0) {
        return Response.json({ error: "邮箱已被注册" }, { status: 409 });
    }

    const password_hash = await bcrypt.hash(password, 12);

    const result = await query<{ id: string; email: string }>(
        `INSERT INTO users (email, password_hash, display_name)
     VALUES ($1, $2, $3)
     RETURNING id, email, display_name`,
        [email, password_hash, display_name ?? null]
    );

    const user = result.rows[0];
    const token = signToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return Response.json({ user }, { status: 201 });
}
