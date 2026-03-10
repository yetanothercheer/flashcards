/**
 * SM-2 Spaced Repetition Algorithm
 *
 * rating: 0 = Again (不认识), 1 = Hard (模糊), 2 = Good (认识)
 *
 * Internally maps to SM-2 quality scores: 0 → 1, 1 → 3, 2 → 5
 */

export type Rating = 0 | 1 | 2;

export interface SM2State {
    easeFactor: number;  // min 1.3, starts at 2.5
    interval: number;    // days until next review
    repetitions: number; // consecutive correct answers
}

const MIN_EASE_FACTOR = 1.3;

/** SM-2 quality score mapping */
const QUALITY: Record<Rating, number> = { 0: 1, 1: 3, 2: 5 };

export function sm2(state: SM2State, rating: Rating): SM2State {
    const q = QUALITY[rating];
    let { easeFactor, interval, repetitions } = state;

    if (q < 3) {
        // Failed — reset streak
        repetitions = 0;
        interval = 1;
    } else {
        // Passed
        if (repetitions === 0) {
            interval = 1;
        } else if (repetitions === 1) {
            interval = 6;
        } else {
            interval = Math.round(interval * easeFactor);
        }
        repetitions += 1;
    }

    // Update ease factor (can go negative on bad answers, clamp at minimum)
    easeFactor = Math.max(
        MIN_EASE_FACTOR,
        easeFactor + 0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)
    );

    return { easeFactor, interval, repetitions };
}

/** Calculate next review date from interval (days) */
export function nextReviewDate(intervalDays: number): Date {
    const d = new Date();
    d.setDate(d.getDate() + intervalDays);
    return d;
}
