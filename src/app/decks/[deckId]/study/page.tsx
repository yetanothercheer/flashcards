"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import FlashCard from "@/components/FlashCard";
import { sm2, nextReviewDate } from "@/lib/sm2";

interface DueCard {
    id: string;
    front: string;
    back: string;
    example: string | null;
    phonetic: string | null;
    part_of_speech: string | null;
    ease_factor: number | null;
    interval: number | null;
    repetitions: number | null;
    next_review_at: string | null;
}

export default function StudyPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const deckId = params.deckId as string;

    const [cards, setCards] = useState<DueCard[]>([]);
    const [currentIdx, setCurrentIdx] = useState(0);
    const [done, setDone] = useState(0);
    const [fetching, setFetching] = useState(true);
    const [deckName, setDeckName] = useState("");
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    const fetchDue = useCallback(async () => {
        setFetching(true);
        const [deckRes, dueRes] = await Promise.all([
            fetch(`/api/decks/${deckId}`),
            fetch(`/api/study/${deckId}`),
        ]);
        if (!deckRes.ok) { router.push("/dashboard"); return; }
        const deckData = await deckRes.json();
        setDeckName(deckData.name);
        if (dueRes.ok) {
            const data = await dueRes.json();
            setCards(data.cards);
        }
        setFetching(false);
    }, [deckId, router]);

    useEffect(() => {
        if (user) fetchDue();
    }, [user, fetchDue]);

    const handleRate = async (rating: 0 | 1 | 2) => {
        const card = cards[currentIdx];
        if (!card || submitting) return;
        setSubmitting(true);

        await fetch(`/api/study/${deckId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ card_id: card.id, rating }),
        });

        setDone((d) => d + 1);

        if (currentIdx + 1 >= cards.length) {
            setCurrentIdx(cards.length); // finished
        } else {
            setCurrentIdx((i) => i + 1);
        }
        setSubmitting(false);
    };

    // Preview next-review intervals for current card
    const getIntervals = (card: DueCard): [string, string, string] => {
        const state = {
            easeFactor: card.ease_factor ?? 2.5,
            interval: card.interval ?? 1,
            repetitions: card.repetitions ?? 0,
        };
        const fmt = (days: number) => days === 1 ? "明天" : `${days} 天后`;
        return [
            fmt(sm2(state, 0).interval),
            fmt(sm2(state, 1).interval),
            fmt(sm2(state, 2).interval),
        ];
    };

    if (loading || !user) return null;

    const total = cards.length;
    const current = cards[currentIdx];
    const finished = currentIdx >= total && !fetching;
    const progress = total > 0 ? Math.round((done / total) * 100) : 0;

    return (
        <div className="page" style={{ maxWidth: 720 }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
                <div>
                    <Link href={`/decks/${deckId}`} style={{ fontSize: "0.875rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                        ← {deckName}
                    </Link>
                    <h2>学习中</h2>
                </div>
                <div style={{ textAlign: "right" }}>
                    <div style={{ font: "700 1.5rem/1 var(--font)", color: "var(--accent)" }}>{done}</div>
                    <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>/ {total} 张</div>
                </div>
            </div>

            {/* Progress */}
            <div className="progress-bar" style={{ marginBottom: 40 }}>
                <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>

            {fetching ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                    <div className="spinner" style={{ width: 40, height: 40 }} />
                </div>
            ) : finished ? (
                // All done!
                <div className="empty-state animate-slideup">
                    <div style={{ fontSize: "4rem" }}>🎉</div>
                    <h2>今天的学习完成了！</h2>
                    <p>你复习了 {done} 张卡片，继续保持！</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                        <Link href="/dashboard" className="btn btn-primary">返回首页</Link>
                        <button className="btn btn-secondary" onClick={() => { setCards([]); setCurrentIdx(0); setDone(0); fetchDue(); }}>
                            再来一轮
                        </button>
                    </div>
                </div>
            ) : total === 0 ? (
                <div className="empty-state animate-slideup">
                    <div style={{ fontSize: "3rem" }}>✅</div>
                    <h2>今天没有待复习的卡片</h2>
                    <p>明天再来，或者给词书添加新单词</p>
                    <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
                        <Link href="/dashboard" className="btn btn-primary">返回词书</Link>
                        <Link href={`/decks/${deckId}`} className="btn btn-secondary">管理词书</Link>
                    </div>
                </div>
            ) : current ? (
                <div className="animate-fadein" key={currentIdx}>
                    <FlashCard
                        front={current.front}
                        back={current.back}
                        example={current.example}
                        phonetic={current.phonetic}
                        partOfSpeech={current.part_of_speech}
                        onRate={handleRate}
                        intervals={getIntervals(current)}
                    />
                </div>
            ) : null}
        </div>
    );
}
