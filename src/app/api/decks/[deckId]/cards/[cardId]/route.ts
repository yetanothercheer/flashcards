import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

type Params = { params: Promise<{ deckId: string; cardId: string }> };

async function assertCardOwner(cardId: string, deckId: string, userId: string) {
    const r = await query(
        `SELECT c.id FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = $1 AND c.deck_id = $2 AND d.user_id = $3`,
        [cardId, deckId, userId]
    );
    return (r.rowCount ?? 0) > 0;
}

// PATCH /api/decks/[deckId]/cards/[cardId]
const PatchCardSchema = z.object({
    front: z.string().min(1).optional(),
    back: z.string().min(1).optional(),
    example: z.string().nullable().optional(),
    phonetic: z.string().nullable().optional(),
    part_of_speech: z.string().nullable().optional(),
});

export async function PATCH(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId, cardId } = await params;
    if (!(await assertCardOwner(cardId, deckId, auth.userId))) {
        return Response.json({ error: "卡片不存在" }, { status: 404 });
    }

    const body = await req.json();
    const parsed = PatchCardSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    for (const [key, value] of Object.entries(parsed.data)) {
        if (value !== undefined) {
            fields.push(`${key} = $${idx++}`);
            values.push(value);
        }
    }

    if (fields.length === 0) {
        return Response.json({ error: "没有可更新的字段" }, { status: 400 });
    }

    fields.push(`updated_at = NOW()`);
    values.push(cardId);

    const result = await query(
        `UPDATE cards SET ${fields.join(", ")} WHERE id = $${idx} RETURNING *`,
        values
    );

    return Response.json(result.rows[0]);
}

// DELETE /api/decks/[deckId]/cards/[cardId]
export async function DELETE(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId, cardId } = await params;
    if (!(await assertCardOwner(cardId, deckId, auth.userId))) {
        return Response.json({ error: "卡片不存在" }, { status: 404 });
    }

    await query("DELETE FROM cards WHERE id = $1", [cardId]);
    return Response.json({ ok: true });
}
