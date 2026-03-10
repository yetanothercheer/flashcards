import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ deckId: string }> };

// Helper: assert deck belongs to user
async function assertOwner(deckId: string, userId: string) {
    const r = await query("SELECT id FROM decks WHERE id = $1 AND user_id = $2", [
        deckId,
        userId,
    ]);
    return (r.rowCount ?? 0) > 0;
}

// GET /api/decks/[deckId]
export async function GET(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;

    const result = await query(
        `SELECT d.*, COUNT(c.id)::int AS card_count
     FROM decks d
     LEFT JOIN cards c ON c.deck_id = d.id
     WHERE d.id = $1 AND d.user_id = $2
     GROUP BY d.id`,
        [deckId, auth.userId]
    );

    if (!result.rows[0]) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    return Response.json(result.rows[0]);
}

// PATCH /api/decks/[deckId]
const PatchDeckSchema = z.object({
    name: z.string().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    is_public: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    if (!(await assertOwner(deckId, auth.userId))) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = PatchDeckSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    if (parsed.data.name !== undefined) {
        fields.push(`name = $${idx++}`);
        values.push(parsed.data.name);
    }
    if (parsed.data.description !== undefined) {
        fields.push(`description = $${idx++}`);
        values.push(parsed.data.description);
    }
    if (parsed.data.is_public !== undefined) {
        fields.push(`is_public = $${idx++}`);
        values.push(parsed.data.is_public);
    }

    if (fields.length === 0) {
        return Response.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    values.push(deckId);

    const result = await query(
        `UPDATE decks SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
    );

    return Response.json(result.rows[0]);
}

// DELETE /api/decks/[deckId]
export async function DELETE(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    if (!(await assertOwner(deckId, auth.userId))) {
        return Response.json({ error: "词书不存在" }, { status: 404 });
    }

    await query("DELETE FROM decks WHERE id = $1", [deckId]);
    return Response.json({ ok: true });
}
