"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

interface PublicDeck {
    id: string;
    name: string;
    description: string | null;
    author_name: string | null;
    card_count: number;
    share_token: string;
    is_builtin: boolean;
}

export default function LibraryPage() {
    const { user } = useAuth();
    const router = useRouter();
    const [decks, setDecks] = useState<PublicDeck[]>([]);
    const [fetching, setFetching] = useState(true);
    const [forking, setForking] = useState<string | null>(null);

    useEffect(() => {
        fetch("/api/library")
            .then(r => r.json())
            .then(data => { setDecks(data); setFetching(false); });
    }, []);

    const handleFork = async (deckId: string) => {
        if (!user) { router.push("/login"); return; }
        setForking(deckId);
        const res = await fetch(`/api/decks/${deckId}/fork`, { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            router.push(`/decks/${data.id}`);
        }
        setForking(null);
    };

    return (
        <div className="page">
            <div className="page-header">
                <h1>词库</h1>
                <p style={{ marginTop: 4 }}>浏览公开词书，Fork 一份到你的账户</p>
            </div>

            {fetching ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                    <div className="spinner" style={{ width: 32, height: 32 }} />
                </div>
            ) : decks.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🏛️</div>
                    <h3>词库暂时为空</h3>
                    <p>内置词库将陆续上线</p>
                </div>
            ) : (
                <div className="deck-grid">
                    {decks.map((deck) => (
                        <div key={deck.id} className="card animate-fadein" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                            <div>
                                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                                    {deck.is_builtin && <span className="badge badge-accent">内置</span>}
                                    <span className="badge badge-muted">📇 {deck.card_count} 张</span>
                                </div>
                                <h3 style={{ marginBottom: 4 }}>{deck.name}</h3>
                                {deck.description && (
                                    <p style={{ fontSize: "0.8125rem", lineHeight: 1.5, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                                        {deck.description}
                                    </p>
                                )}
                                {deck.author_name && (
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                                        by {deck.author_name}
                                    </p>
                                )}
                            </div>

                            <div className="divider" style={{ margin: "4px 0" }} />

                            <div style={{ display: "flex", gap: 8 }}>
                                <Link href={`/share/${deck.share_token}`} className="btn btn-secondary btn-sm" style={{ flex: 1 }}>
                                    预览
                                </Link>
                                <button
                                    className="btn btn-primary btn-sm"
                                    style={{ flex: 1 }}
                                    onClick={() => handleFork(deck.id)}
                                    disabled={forking === deck.id}
                                    id={`fork-${deck.id}`}
                                >
                                    {forking === deck.id ? <span className="spinner" /> : "Fork 到我的账户"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
