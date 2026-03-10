import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";
import { sm2, nextReviewDate, Rating } from "@/lib/sm2";
import { z } from "zod";

type Params = { params: Promise<{ deckId: string }> };

/**
 * GET /api/study/[deckId]/due
 * Returns cards due for review today, including their SM-2 state.
 * Cards with no study_record yet (never studied) are included.
 */
export async function GET(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    const { searchParams } = new URL(req.url);
    const mode = searchParams.get("mode");

    let whereClause = "AND (sr.next_review_at IS NULL OR sr.next_review_at <= NOW())";
    let limitClause = "";

    if (mode === "all") {
        // Fetch cards that are NOT due yet (or all cards) to allow "extra study"
        // We prioritize ones that haven't been reviewed for the longest time
        whereClause = "";
        limitClause = "LIMIT 20";
    }

    const result = await query(
        `SELECT
       c.id, c.front, c.back, c.example, c.phonetic, c.part_of_speech,
       sr.ease_factor, sr.interval, sr.repetitions,
       sr.last_reviewed_at, sr.next_review_at
     FROM cards c
     JOIN decks d ON d.id = c.deck_id
     LEFT JOIN study_records sr ON sr.card_id = c.id AND sr.user_id = $1
     WHERE d.id = $2
       AND d.user_id = $1
       ${whereClause}
     ORDER BY sr.next_review_at ASC NULLS FIRST
     ${limitClause}`,
        [auth.userId, deckId]
    );

    return Response.json({
        cards: result.rows,
        count: result.rowCount,
    });
}

/**
 * POST /api/study/[deckId]/review
 * Submit a review result for one card.
 * Upserts the study_record with updated SM-2 state.
 */
const ReviewSchema = z.object({
    card_id: z.string().uuid(),
    rating: z.union([z.literal(0), z.literal(1), z.literal(2)]),
});

export async function POST(req: NextRequest, { params }: Params) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const { deckId } = await params;
    const body = await req.json();
    const parsed = ReviewSchema.safeParse(body);

    if (!parsed.success) {
        return Response.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const { card_id, rating } = parsed.data;

    // Verify card belongs to deck which belongs to user
    const cardCheck = await query(
        `SELECT c.id FROM cards c
     JOIN decks d ON d.id = c.deck_id
     WHERE c.id = $1 AND d.id = $2 AND d.user_id = $3`,
        [card_id, deckId, auth.userId]
    );

    if ((cardCheck.rowCount ?? 0) === 0) {
        return Response.json({ error: "卡片不存在" }, { status: 404 });
    }

    // Fetch current SM-2 state (if any)
    const existing = await query<{
        ease_factor: number;
        interval: number;
        repetitions: number;
    }>(
        "SELECT ease_factor, interval, repetitions FROM study_records WHERE user_id = $1 AND card_id = $2",
        [auth.userId, card_id]
    );

    const currentState = existing.rows[0]
        ? {
            easeFactor: existing.rows[0].ease_factor,
            interval: existing.rows[0].interval,
            repetitions: existing.rows[0].repetitions,
        }
        : { easeFactor: 2.5, interval: 1, repetitions: 0 };

    const nextState = sm2(currentState, rating as Rating);
    const nextReview = nextReviewDate(nextState.interval);

    // Upsert study record
    const result = await query(
        `INSERT INTO study_records
       (user_id, card_id, ease_factor, interval, repetitions, last_reviewed_at, next_review_at)
     VALUES ($1, $2, $3, $4, $5, NOW(), $6)
     ON CONFLICT (user_id, card_id) DO UPDATE SET
       ease_factor      = EXCLUDED.ease_factor,
       interval         = EXCLUDED.interval,
       repetitions      = EXCLUDED.repetitions,
       last_reviewed_at = NOW(),
       next_review_at   = EXCLUDED.next_review_at,
       updated_at       = NOW()
     RETURNING *`,
        [
            auth.userId,
            card_id,
            nextState.easeFactor,
            nextState.interval,
            nextState.repetitions,
            nextReview,
        ]
    );

    return Response.json(result.rows[0]);
}
