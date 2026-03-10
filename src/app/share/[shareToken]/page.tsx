"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface SharedDeck {
    id: string;
    name: string;
    description: string | null;
    author_name: string | null;
    card_count: number;
    is_public: boolean;
    preview_cards: {
        front: string;
        back: string;
        example: string | null;
        phonetic: string | null;
        part_of_speech: string | null;
    }[];
}

export default function SharePage() {
    const params = useParams();
    const shareToken = params.shareToken as string;
    const { user } = useAuth();
    const router = useRouter();

    const [deck, setDeck] = useState<SharedDeck | null>(null);
    const [fetching, setFetching] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [forking, setForking] = useState(false);

    useEffect(() => {
        fetch(`/api/decks/shared/${shareToken}`)
            .then(async (r) => {
                if (!r.ok) { setNotFound(true); setFetching(false); return; }
                setDeck(await r.json());
                setFetching(false);
            });
    }, [shareToken]);

    const handleFork = async () => {
        if (!user) { router.push("/login"); return; }
        if (!deck) return;
        setForking(true);
        const res = await fetch(`/api/decks/${deck.id}/fork`, { method: "POST" });
        if (res.ok) {
            const data = await res.json();
            router.push(`/decks/${data.id}`);
        }
        setForking(false);
    };

    if (fetching) return (
        <div style={{ display: "flex", justifyContent: "center", padding: 120 }}>
            <div className="spinner" style={{ width: 40, height: 40 }} />
        </div>
    );

    if (notFound || !deck) return (
        <div className="page-sm" style={{ textAlign: "center", paddingTop: 120 }}>
            <div style={{ fontSize: "3rem", marginBottom: 16 }}>😕</div>
            <h2>找不到这个词书</h2>
            <p style={{ marginBottom: 24 }}>链接可能已失效，或者词书已被删除</p>
            <Link href="/" className="btn btn-primary">回到首页</Link>
        </div>
    );

    return (
        <div className="page" style={{ maxWidth: 720 }}>
            <div className="animate-slideup">
                {/* Deck info */}
                <div className="card" style={{ marginBottom: 24, padding: 32 }}>
                    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                        <span className="badge badge-accent">📚 词书分享</span>
                        <span className="badge badge-muted">📇 {deck.card_count} 张卡片</span>
                    </div>
                    <h1 style={{ marginBottom: 8 }}>{deck.name}</h1>
                    {deck.description && <p style={{ marginBottom: 12 }}>{deck.description}</p>}
                    {deck.author_name && (
                        <p style={{ fontSize: "0.875rem", color: "var(--text-muted)" }}>分享者：{deck.author_name}</p>
                    )}

                    <div className="divider" />

                    <button
                        className="btn btn-primary btn-lg"
                        style={{ width: "100%" }}
                        id="fork-btn"
                        onClick={handleFork}
                        disabled={forking}
                    >
                        {forking ? <span className="spinner" /> : user ? "🍴 Fork 到我的账户" : "登录后 Fork 到我的账户"}
                    </button>
                </div>

                {/* Preview cards */}
                {deck.preview_cards.length > 0 && (
                    <div>
                        <h2 style={{ marginBottom: 16 }}>预览（前 {deck.preview_cards.length} 张）</h2>
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {deck.preview_cards.map((card, i) => (
                                <div key={i} className="card" style={{ padding: "14px 20px" }}>
                                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                                        <span style={{ fontWeight: 700, fontSize: "1rem", minWidth: 120 }}>{card.front}</span>
                                        {card.phonetic && <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontStyle: "italic" }}>{card.phonetic}</span>}
                                        {card.part_of_speech && <span className="badge badge-muted" style={{ fontSize: "0.7rem" }}>{card.part_of_speech}</span>}
                                    </div>
                                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: 2 }}>{card.back}</div>
                                    {card.example && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>{card.example}</div>}
                                </div>
                            ))}
                        </div>
                        {deck.card_count > 10 && (
                            <p style={{ textAlign: "center", marginTop: 16, color: "var(--text-muted)", fontSize: "0.875rem" }}>
                                …还有 {deck.card_count - 10} 张，Fork 后查看全部
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
