import { NextRequest } from "next/server";
import { clearAuthCookie } from "@/lib/auth";

export async function POST(_req: NextRequest) {
    await clearAuthCookie();
    return Response.json({ ok: true });
}
