import { NextRequest } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/auth";
import { query } from "@/lib/db";

/**
 * GET /api/study/stats
 * Returns learning statistics for the current user.
 */
export async function GET(req: NextRequest) {
    const auth = getAuthUser(req);
    if (!auth) return unauthorized();

    const [totalResult, todayResult, dueResult, streakResult] = await Promise.all([
        // Total cards ever reviewed
        query<{ count: number }>(
            "SELECT COUNT(*)::int AS count FROM study_records WHERE user_id = $1",
            [auth.userId]
        ),

        // Reviewed today
        query<{ count: number }>(
            `SELECT COUNT(*)::int AS count FROM study_records
       WHERE user_id = $1 AND last_reviewed_at >= CURRENT_DATE`,
            [auth.userId]
        ),

        // Due now (across all decks)
        query<{ count: number }>(
            `SELECT COUNT(*)::int AS count FROM study_records
       WHERE user_id = $1 AND next_review_at <= NOW()`,
            [auth.userId]
        ),

        // Daily review counts for the last 30 days (for heatmap etc.)
        query<{ date: string; count: number }>(
            `SELECT
         DATE(last_reviewed_at)::text AS date,
         COUNT(*)::int AS count
       FROM study_records
       WHERE user_id = $1
         AND last_reviewed_at >= NOW() - INTERVAL '30 days'
       GROUP BY DATE(last_reviewed_at)
       ORDER BY date ASC`,
            [auth.userId]
        ),
    ]);

    return Response.json({
        total_reviewed: totalResult.rows[0].count,
        reviewed_today: todayResult.rows[0].count,
        due_now: dueResult.rows[0].count,
        daily_counts: streakResult.rows, // [{date, count}, ...]
    });
}
