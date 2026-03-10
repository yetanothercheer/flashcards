import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { z } from "zod";

const SyncCardSchema = z.object({
    front: z.string().min(1),
    back: z.string().min(1),
    example: z.string().optional(),
    phonetic: z.string().optional(),
    part_of_speech: z.string().optional(),
});

const SyncDeckSchema = z.object({
    name: z.string().min(1),
    description: z.string().optional(),
    cards: z.array(SyncCardSchema),
});

const SyncSchema = z.object({
    decks: z.array(SyncDeckSchema),
});

/**
 * POST /api/auth/sync
 * Bulk-imports anonymous (client-side) data into the authenticated user's account.
 * No conflict resolution needed — IDs are always server-generated.
 */
export async function POST(req: NextRequest) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const body = await req.json();
    const parsed = SyncSchema.safeParse(body);
    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { decks } = parsed.data;
    const client = await (await import("@/lib/db")).pool.connect();

    try {
        await client.query("BEGIN");

        const createdDecks: Array<{ id: string; name: string; card_count: number }> = [];

        for (const deck of decks) {
            const deckResult = await client.query<{ id: string }>(
                `INSERT INTO decks (user_id, name, description)
         VALUES ($1, $2, $3)
         RETURNING id`,
                [auth.userId, deck.name, deck.description ?? null]
            );

            const deckId = deckResult.rows[0].id;

            for (let i = 0; i < deck.cards.length; i++) {
                const c = deck.cards[i];
                await client.query(
                    `INSERT INTO cards (deck_id, front, back, example, phonetic, part_of_speech, position)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [deckId, c.front, c.back, c.example ?? null, c.phonetic ?? null, c.part_of_speech ?? null, i]
                );
            }

            createdDecks.push({ id: deckId, name: deck.name, card_count: deck.cards.length });
        }

        await client.query("COMMIT");
        return Response.json({ synced_decks: createdDecks }, { status: 201 });
    } catch (err) {
        await client.query("ROLLBACK");
        console.error("Sync error:", err);
        return Response.json({ error: "同步失败，请重试" }, { status: 500 });
    } finally {
        client.release();
    }
}
