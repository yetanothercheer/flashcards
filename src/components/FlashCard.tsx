"use client";

import { useState } from "react";

interface FlashCardProps {
    front: string;
    back: string;
    example?: string | null;
    phonetic?: string | null;
    partOfSpeech?: string | null;
    onRate?: (rating: 0 | 1 | 2) => void;
    /** Estimated next review intervals for display */
    intervals?: [string, string, string];
}

export default function FlashCard({
    front,
    back,
    example,
    phonetic,
    partOfSpeech,
    onRate,
    intervals = ["1天后", "3天后", "10天后"],
}: FlashCardProps) {
    const [flipped, setFlipped] = useState(false);

    const handleRate = (rating: 0 | 1 | 2) => {
        onRate?.(rating);
    };

    return (
        <div>
            <div className="flashcard-scene" style={{ height: 320 }}>
                <div
                    className={`flashcard ${flipped ? "flipped" : ""}`}
                    style={{ height: "100%" }}
                    onClick={() => setFlipped((f) => !f)}
                >
                    {/* Front */}
                    <div className="flashcard-face">
                        {partOfSpeech && (
                            <span className="badge badge-accent" style={{ marginBottom: 12 }}>
                                {partOfSpeech}
                            </span>
                        )}
                        <div className="flashcard-word">{front}</div>
                        {phonetic && <div className="flashcard-phonetic">{phonetic}</div>}
                        <div className="flashcard-hint">点击查看释义</div>
                    </div>

                    {/* Back */}
                    <div className="flashcard-face back">
                        <div className="flashcard-definition">{back}</div>
                        {example && (
                            <div className="flashcard-example">&ldquo;{example}&rdquo;</div>
                        )}
                        <div className="flashcard-hint">点击翻回正面</div>
                    </div>
                </div>
            </div>

            {/* Rating buttons — only show after flip */}
            {onRate && (
                <div className="rating-buttons" style={{ opacity: flipped ? 1 : 0, transition: "opacity 0.3s", pointerEvents: flipped ? "auto" : "none" }}>
                    <button className="rating-btn rating-btn-0" onClick={() => handleRate(0)}>
                        不认识
                        <span className="rating-interval">{intervals[0]}</span>
                    </button>
                    <button className="rating-btn rating-btn-1" onClick={() => handleRate(1)}>
                        模糊
                        <span className="rating-interval">{intervals[1]}</span>
                    </button>
                    <button className="rating-btn rating-btn-2" onClick={() => handleRate(2)}>
                        认识 ✓
                        <span className="rating-interval">{intervals[2]}</span>
                    </button>
                </div>
            )}
        </div>
    );
}
