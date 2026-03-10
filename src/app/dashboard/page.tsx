"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import CreateDeckModal from "@/components/CreateDeckModal";

interface Deck {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    card_count: number;
    due_count: number;
    source_deck_id: string | null;
    share_token: string;
    created_at: string;
}

interface Stats {
    total_reviewed: number;
    reviewed_today: number;
    due_now: number;
    daily_counts: { date: string; count: number }[];
}

export default function DashboardPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const [decks, setDecks] = useState<Deck[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [fetching, setFetching] = useState(true);
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    const fetchData = useCallback(async () => {
        setFetching(true);
        const [decksRes, statsRes] = await Promise.all([
            fetch("/api/decks"),
            fetch("/api/study/stats"),
        ]);
        if (decksRes.ok) setDecks(await decksRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
        setFetching(false);
    }, []);

    useEffect(() => {
        if (user) fetchData();
    }, [user, fetchData]);

    const handleDeckCreated = (deck: Deck) => {
        setDecks((prev) => [deck, ...prev]);
        setShowCreate(false);
    };

    if (loading || !user) return null;

    const totalDue = decks.reduce((s, d) => s + d.due_count, 0);

    return (
        <div className="page">
            {/* Header */}
            <div className="page-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                    <h1>我的词书</h1>
                    <p style={{ marginTop: 4 }}>
                        {user.display_name ? `嗨，${user.display_name}！` : ""}
                        {totalDue > 0
                            ? <span style={{ color: "var(--accent)", fontWeight: 600 }}>今天有 {totalDue} 张卡片待复习</span>
                            : "今天没有待复习的内容 🎉"}
                    </p>
                </div>
                <button
                    id="create-deck-btn"
                    className="btn btn-primary"
                    onClick={() => setShowCreate(true)}
                >
                    + 新建词书
                </button>
            </div>

            {/* Stats bar */}
            {stats && (
                <div style={{
                    display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
                    gap: 12, marginBottom: 32,
                }}>
                    {[
                        { label: "今日复习", value: stats.reviewed_today, color: "var(--accent)" },
                        { label: "总计复习", value: stats.total_reviewed, color: "var(--success)" },
                        { label: "待复习", value: stats.due_now, color: stats.due_now > 0 ? "var(--warning)" : "var(--text-muted)" },
                    ].map((s) => (
                        <div key={s.label} className="card" style={{ padding: "20px 24px" }}>
                            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="stat-label">{s.label}</div>
                        </div>
                    ))}
                </div>
            )}

            {/* Deck grid */}
            {fetching ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                    <div className="spinner" style={{ width: 32, height: 32 }} />
                </div>
            ) : decks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">📚</div>
                    <h3>还没有词书</h3>
                    <p>新建一个词书，或者去词库浏览并 Fork 一份</p>
                    <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                        <button className="btn btn-primary" onClick={() => setShowCreate(true)}>新建词书</button>
                        <Link href="/library" className="btn btn-secondary">浏览词库</Link>
                    </div>
                </div>
            ) : (
                <div className="deck-grid">
                    {decks.map((deck) => (
                        <DeckCard key={deck.id} deck={deck} />
                    ))}
                </div>
            )}

            {showCreate && (
                <CreateDeckModal
                    onClose={() => setShowCreate(false)}
                    onCreated={handleDeckCreated}
                />
            )}
        </div>
    );
}

function DeckCard({ deck }: { deck: Deck }) {
    const shareUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/share/${deck.share_token}`;

    return (
        <div className="card animate-fadein" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {deck.name}
                    </h3>
                    {deck.description && (
                        <p style={{ fontSize: "0.8125rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                            {deck.description}
                        </p>
                    )}
                </div>
                {deck.due_count > 0 && (
                    <span className="badge badge-warning" style={{ marginLeft: 12, flexShrink: 0 }}>
                        {deck.due_count} 待复习
                    </span>
                )}
            </div>

            <div style={{ display: "flex", gap: 8, fontSize: "0.8125rem", color: "var(--text-muted)" }}>
                <span>📇 {deck.card_count} 张卡片</span>
                {deck.is_public && <span className="badge badge-accent">公开</span>}
                {deck.source_deck_id && <span className="badge badge-muted">Forked</span>}
            </div>

            <div className="divider" style={{ margin: "4px 0" }} />

            <div style={{ display: "flex", gap: 8 }}>
                <Link
                    href={`/decks/${deck.id}/study`}
                    className="btn btn-primary btn-sm"
                    style={{ flex: 1 }}
                >
                    {deck.due_count > 0 ? `学习 (${deck.due_count})` : "开始学习"}
                </Link>
                <Link href={`/decks/${deck.id}`} className="btn btn-secondary btn-sm">
                    管理
                </Link>
                <button
                    className="btn btn-ghost btn-sm"
                    title="复制分享链接"
                    onClick={() => navigator.clipboard.writeText(shareUrl)}
                >
                    🔗
                </button>
            </div>
        </div>
    );
}
