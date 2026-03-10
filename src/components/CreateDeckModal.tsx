"use client";

import { useState, FormEvent } from "react";

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

interface Props {
    onClose: () => void;
    onCreated: (deck: Deck) => void;
}

export default function CreateDeckModal({ onClose, onCreated }: Props) {
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [isPublic, setIsPublic] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setLoading(true);
        setError("");
        try {
            const res = await fetch("/api/decks", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: name.trim(), description: description.trim() || undefined, is_public: isPublic }),
            });
            if (!res.ok) {
                const data = await res.json();
                throw new Error(data.error ?? "创建失败");
            }
            const deck = await res.json();
            onCreated({ ...deck, card_count: 0, due_count: 0 });
        } catch (err) {
            setError(err instanceof Error ? err.message : "创建失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
            <div className="modal">
                <h2 className="modal-title">新建词书</h2>
                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleSubmit}>
                    <div className="field" style={{ marginBottom: 16 }}>
                        <label className="label" htmlFor="deck-name">词书名称</label>
                        <input
                            id="deck-name"
                            className="input"
                            placeholder="例如：GRE 核心词汇"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="field" style={{ marginBottom: 16 }}>
                        <label className="label" htmlFor="deck-desc">描述（可选）</label>
                        <textarea
                            id="deck-desc"
                            className="input"
                            placeholder="简短介绍这个词书的内容..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            rows={3}
                        />
                    </div>

                    <div style={{ marginBottom: 24 }}>
                        <label className="toggle">
                            <input
                                type="checkbox"
                                checked={isPublic}
                                onChange={(e) => setIsPublic(e.target.checked)}
                                id="deck-public"
                            />
                            <div className="toggle-track" />
                            <div className="toggle-thumb" />
                            <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                                公开词书（其他人可以查看和 Fork）
                            </span>
                        </label>
                    </div>

                    <div style={{ display: "flex", gap: 10 }}>
                        <button type="button" className="btn btn-secondary" style={{ flex: 1 }} onClick={onClose}>
                            取消
                        </button>
                        <button
                            type="submit"
                            id="create-deck-submit"
                            className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
                            style={{ flex: 1 }}
                            disabled={loading}
                        >
                            {loading ? <span className="spinner" /> : "创建"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
