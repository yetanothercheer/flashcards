import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { signToken, setAuthCookie } from "@/lib/auth";
import { z } from "zod";

const LoginSchema = z.object({
    email: z.string().email(),
    password: z.string().min(1),
});

export async function POST(req: NextRequest) {
    const body = await req.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password } = parsed.data;

    const result = await query<{
        id: string;
        email: string;
        password_hash: string;
        display_name: string | null;
    }>(
        "SELECT id, email, password_hash, display_name FROM users WHERE email = $1",
        [email]
    );

    const user = result.rows[0];

    if (!user || !(await bcrypt.compare(password, user.password_hash))) {
        return Response.json({ error: "邮箱或密码错误" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email });
    await setAuthCookie(token);

    return Response.json({
        user: { id: user.id, email: user.email, display_name: user.display_name },
    });
}
