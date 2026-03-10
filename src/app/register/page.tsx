"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
    const { register } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [displayName, setDisplayName] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (password.length < 8) { setError("密码至少 8 位"); return; }
        setError("");
        setLoading(true);
        try {
            await register(email, password, displayName || undefined);
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "注册失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-sm" style={{ paddingTop: 80 }}>
            <div className="animate-slideup">
                <h1 style={{ marginBottom: 8, fontSize: "1.75rem" }}>创建账号</h1>
                <p style={{ marginBottom: 32, color: "var(--text-secondary)" }}>
                    免费注册，开始高效记单词
                </p>

                <form onSubmit={handleSubmit} style={{
                    padding: 32, borderRadius: "var(--radius-xl)",
                    background: "var(--bg-surface)", border: "1px solid var(--border)"
                }}>
                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="field" style={{ marginBottom: 16 }}>
                        <label className="label" htmlFor="reg-name">昵称（可选）</label>
                        <input
                            id="reg-name"
                            type="text"
                            className="input"
                            placeholder="你的昵称"
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                        />
                    </div>

                    <div className="field" style={{ marginBottom: 16 }}>
                        <label className="label" htmlFor="reg-email">邮箱</label>
                        <input
                            id="reg-email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="field" style={{ marginBottom: 24 }}>
                        <label className="label" htmlFor="reg-password">密码（至少 8 位）</label>
                        <input
                            id="reg-password"
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        id="register-submit"
                        className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
                        style={{ width: "100%", height: 48 }}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : "注册"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    已有账号？{" "}
                    <Link href="/login" style={{ color: "var(--accent)", fontWeight: 600 }}>
                        直接登录
                    </Link>
                </p>
            </div>
        </div>
    );
}
