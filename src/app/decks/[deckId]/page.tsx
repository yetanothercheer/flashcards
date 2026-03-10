"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";

interface Card {
    id: string;
    front: string;
    back: string;
    example: string | null;
    phonetic: string | null;
    part_of_speech: string | null;
    position: number;
}

interface Deck {
    id: string;
    name: string;
    description: string | null;
    is_public: boolean;
    card_count: number;
    share_token: string;
}

interface Pagination {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
}

export default function DeckDetailPage() {
    const { user, loading } = useAuth();
    const router = useRouter();
    const params = useParams();
    const deckId = params.deckId as string;

    const [deck, setDeck] = useState<Deck | null>(null);
    const [cards, setCards] = useState<Card[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [page, setPage] = useState(1);
    const [fetching, setFetching] = useState(true);
    const [showAddCard, setShowAddCard] = useState(false);
    const [showImport, setShowImport] = useState(false);
    const [editingCard, setEditingCard] = useState<Card | null>(null);

    useEffect(() => {
        if (!loading && !user) router.push("/login");
    }, [user, loading, router]);

    const fetchCards = useCallback(async () => {
        setFetching(true);
        const [deckRes, cardsRes] = await Promise.all([
            fetch(`/api/decks/${deckId}`),
            fetch(`/api/decks/${deckId}/cards?page=${page}&limit=50`),
        ]);
        if (!deckRes.ok) { router.push("/dashboard"); return; }
        setDeck(await deckRes.json());
        if (cardsRes.ok) {
            const data = await cardsRes.json();
            setCards(data.cards);
            setPagination(data.pagination);
        }
        setFetching(false);
    }, [deckId, page, router]);

    useEffect(() => {
        if (user) fetchCards();
    }, [user, fetchCards]);

    const handleDeleteCard = async (cardId: string) => {
        if (!confirm("确定删除这张卡片？")) return;
        await fetch(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" });
        setCards((prev) => prev.filter((c) => c.id !== cardId));
    };

    if (loading || !user || !deck) {
        return (
            <div style={{ display: "flex", justifyContent: "center", padding: 120 }}>
                <div className="spinner" style={{ width: 32, height: 32 }} />
            </div>
        );
    }

    const shareUrl = `${window.location.origin}/share/${deck.share_token}`;

    return (
        <div className="page">
            {/* Header */}
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 32, gap: 16 }}>
                <div>
                    <Link href="/dashboard" style={{ fontSize: "0.875rem", color: "var(--text-muted)", display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 8 }}>
                        ← 返回词书列表
                    </Link>
                    <h1 style={{ marginBottom: 4 }}>{deck.name}</h1>
                    {deck.description && <p style={{ fontSize: "0.9rem" }}>{deck.description}</p>}
                    <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                        <span className="badge badge-muted">📇 {pagination?.total ?? 0} 张卡片</span>
                        {deck.is_public && <span className="badge badge-accent">公开</span>}
                    </div>
                </div>

                <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <Link href={`/decks/${deckId}/study`} className="btn btn-primary">
                        ▶ 开始学习
                    </Link>
                    <button className="btn btn-secondary" onClick={() => setShowAddCard(true)}>
                        + 添加卡片
                    </button>
                    <button className="btn btn-secondary" onClick={() => setShowImport(true)}>
                        ↑ 导入 CSV
                    </button>
                    <button
                        className="btn btn-ghost"
                        title="复制分享链接"
                        onClick={() => { navigator.clipboard.writeText(shareUrl); alert("分享链接已复制！"); }}
                    >
                        🔗 分享
                    </button>
                </div>
            </div>

            {/* Card list */}
            {fetching ? (
                <div style={{ display: "flex", justifyContent: "center", padding: 80 }}>
                    <div className="spinner" style={{ width: 32, height: 32 }} />
                </div>
            ) : cards.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state-icon">🃏</div>
                    <h3>还没有卡片</h3>
                    <p>手动添加单词，或者导入 CSV</p>
                    <button className="btn btn-primary" onClick={() => setShowAddCard(true)}>
                        添加第一张
                    </button>
                </div>
            ) : (
                <>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {cards.map((card) => (
                            <div key={card.id} className="card" style={{ padding: "16px 20px", display: "flex", alignItems: "center", gap: 16 }}>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
                                        <span style={{ fontWeight: 700, fontSize: "1rem" }}>{card.front}</span>
                                        {card.phonetic && <span style={{ fontSize: "0.8rem", color: "var(--accent)", fontStyle: "italic" }}>{card.phonetic}</span>}
                                        {card.part_of_speech && <span className="badge badge-muted" style={{ fontSize: "0.7rem" }}>{card.part_of_speech}</span>}
                                    </div>
                                    <div style={{ fontSize: "0.875rem", color: "var(--text-secondary)", marginTop: 2 }}>{card.back}</div>
                                    {card.example && <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginTop: 2 }}>{card.example}</div>}
                                </div>
                                <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCard(card)}>编辑</button>
                                    <button className="btn btn-danger btn-sm" onClick={() => handleDeleteCard(card.id)}>删除</button>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Pagination */}
                    {pagination && pagination.total_pages > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
                            <button className="btn btn-secondary btn-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← 上一页</button>
                            <span style={{ padding: "0 16px", lineHeight: "34px", fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                {page} / {pagination.total_pages}
                            </span>
                            <button className="btn btn-secondary btn-sm" disabled={page === pagination.total_pages} onClick={() => setPage(p => p + 1)}>下一页 →</button>
                        </div>
                    )}
                </>
            )}

            {/* Modals */}
            {showAddCard && (
                <AddCardModal
                    deckId={deckId}
                    onClose={() => setShowAddCard(false)}
                    onAdded={(card) => { setCards(prev => [...prev, card]); setShowAddCard(false); }}
                />
            )}
            {showImport && (
                <ImportCSVModal
                    deckId={deckId}
                    onClose={() => setShowImport(false)}
                    onImported={() => { fetchCards(); setShowImport(false); }}
                />
            )}
            {editingCard && (
                <EditCardModal
                    deckId={deckId}
                    card={editingCard}
                    onClose={() => setEditingCard(null)}
                    onUpdated={(updated) => { setCards(prev => prev.map(c => c.id === updated.id ? updated : c)); setEditingCard(null); }}
                />
            )}
        </div>
    );
}

// ── Add Card Modal ──────────────────────────────────────────────────────────

function AddCardModal({ deckId, onClose, onAdded }: { deckId: string; onClose: () => void; onAdded: (c: Card) => void }) {
    const [front, setFront] = useState("");
    const [back, setBack] = useState("");
    const [example, setExample] = useState("");
    const [phonetic, setPhonetic] = useState("");
    const [pos, setPos] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/decks/${deckId}/cards`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ front, back, example: example || undefined, phonetic: phonetic || undefined, part_of_speech: pos || undefined }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            onAdded(await res.json());
        } catch (err) { setError(err instanceof Error ? err.message : "添加失败"); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h2 className="modal-title">添加卡片</h2>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="field"><label className="label">单词 *</label><input className="input" value={front} onChange={e => setFront(e.target.value)} placeholder="ephemeral" required /></div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div className="field" style={{ flex: 1 }}><label className="label">音标</label><input className="input" value={phonetic} onChange={e => setPhonetic(e.target.value)} placeholder="/ɪˈfem.ər.əl/" /></div>
                        <div className="field" style={{ flex: 1 }}><label className="label">词性</label><input className="input" value={pos} onChange={e => setPos(e.target.value)} placeholder="adj." /></div>
                    </div>
                    <div className="field"><label className="label">释义 *</label><input className="input" value={back} onChange={e => setBack(e.target.value)} placeholder="短暂的；转瞬即逝的" required /></div>
                    <div className="field"><label className="label">例句</label><textarea className="input" value={example} onChange={e => setExample(e.target.value)} placeholder="Fame is ephemeral." rows={2} /></div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>取消</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                            {loading ? <span className="spinner" /> : "添加"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Edit Card Modal ─────────────────────────────────────────────────────────

function EditCardModal({ deckId, card, onClose, onUpdated }: { deckId: string; card: Card; onClose: () => void; onUpdated: (c: Card) => void }) {
    const [front, setFront] = useState(card.front);
    const [back, setBack] = useState(card.back);
    const [example, setExample] = useState(card.example ?? "");
    const [phonetic, setPhonetic] = useState(card.phonetic ?? "");
    const [pos, setPos] = useState(card.part_of_speech ?? "");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await fetch(`/api/decks/${deckId}/cards/${card.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ front, back, example: example || null, phonetic: phonetic || null, part_of_speech: pos || null }),
            });
            if (!res.ok) throw new Error((await res.json()).error);
            onUpdated(await res.json());
        } catch (err) { setError(err instanceof Error ? err.message : "保存失败"); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h2 className="modal-title">编辑卡片</h2>
                {error && <div className="alert alert-error">{error}</div>}
                <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div className="field"><label className="label">单词</label><input className="input" value={front} onChange={e => setFront(e.target.value)} required /></div>
                    <div style={{ display: "flex", gap: 12 }}>
                        <div className="field" style={{ flex: 1 }}><label className="label">音标</label><input className="input" value={phonetic} onChange={e => setPhonetic(e.target.value)} /></div>
                        <div className="field" style={{ flex: 1 }}><label className="label">词性</label><input className="input" value={pos} onChange={e => setPos(e.target.value)} /></div>
                    </div>
                    <div className="field"><label className="label">释义</label><input className="input" value={back} onChange={e => setBack(e.target.value)} required /></div>
                    <div className="field"><label className="label">例句</label><textarea className="input" value={example} onChange={e => setExample(e.target.value)} rows={2} /></div>
                    <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>取消</button>
                        <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>
                            {loading ? <span className="spinner" /> : "保存"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Import CSV Modal ────────────────────────────────────────────────────────

function ImportCSVModal({ deckId, onClose, onImported }: { deckId: string; onClose: () => void; onImported: () => void }) {
    const [file, setFile] = useState<File | null>(null);
    const [result, setResult] = useState<{ imported: number; errors: { row: number; reason: string }[] } | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) return;
        setLoading(true);
        setError("");
        const form = new FormData();
        form.append("file", file);
        try {
            const res = await fetch(`/api/decks/${deckId}/import`, { method: "POST", body: form });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setResult(data);
        } catch (err) { setError(err instanceof Error ? err.message : "导入失败"); }
        finally { setLoading(false); }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h2 className="modal-title">导入 CSV</h2>
                <p style={{ fontSize: "0.875rem", marginBottom: 20, color: "var(--text-secondary)" }}>
                    格式：<code style={{ background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4 }}>单词, 释义, 例句（可选）</code>
                </p>
                {error && <div className="alert alert-error">{error}</div>}
                {result ? (
                    <div>
                        <div className="alert alert-success">成功导入 {result.imported} 张卡片</div>
                        {result.errors.length > 0 && (
                            <div style={{ maxHeight: 200, overflow: "auto" }}>
                                <p style={{ fontSize: "0.8rem", color: "var(--warning)", marginBottom: 8 }}>
                                    {result.errors.length} 行解析失败：
                                </p>
                                {result.errors.map(e => (
                                    <div key={e.row} style={{ fontSize: "0.8rem", color: "var(--text-muted)", padding: "2px 0" }}>
                                        第 {e.row} 行：{e.reason}
                                    </div>
                                ))}
                            </div>
                        )}
                        <button className="btn btn-primary" style={{ width: "100%", marginTop: 16 }} onClick={onImported}>
                            完成
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <div style={{
                            border: "2px dashed var(--border)", borderRadius: "var(--radius-md)",
                            padding: 32, textAlign: "center", marginBottom: 20, cursor: "pointer",
                            transition: "border-color var(--transition)",
                        }}>
                            <input type="file" accept=".csv" id="csv-file" style={{ display: "none" }} onChange={e => setFile(e.target.files?.[0] ?? null)} />
                            <label htmlFor="csv-file" style={{ cursor: "pointer" }}>
                                <div style={{ fontSize: "2rem", marginBottom: 8 }}>📄</div>
                                <div style={{ fontWeight: 600, marginBottom: 4 }}>{file ? file.name : "点击选择 CSV 文件"}</div>
                                <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>支持标准 CSV 格式，含引号转义</div>
                            </label>
                        </div>
                        <div style={{ display: "flex", gap: 10 }}>
                            <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>取消</button>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={!file || loading}>
                                {loading ? <span className="spinner" /> : "开始导入"}
                            </button>
                        </div>
                    </form>
                )}
            </div>
        </div>
    );
}
