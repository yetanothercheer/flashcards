"use client";

import { useState, FormEvent } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
    const { login } = useAuth();
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err) {
            setError(err instanceof Error ? err.message : "登录失败");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-sm" style={{ paddingTop: 80 }}>
            <div className="animate-slideup">
                <h1 style={{ marginBottom: 8, fontSize: "1.75rem" }}>欢迎回来</h1>
                <p style={{ marginBottom: 32, color: "var(--text-secondary)" }}>
                    登录后继续你的学习
                </p>

                <form onSubmit={handleSubmit} className="card-elevated" style={{
                    padding: 32, borderRadius: "var(--radius-xl)",
                    background: "var(--bg-surface)", border: "1px solid var(--border)"
                }}>
                    {error && <div className="alert alert-error">{error}</div>}

                    <div className="field" style={{ marginBottom: 16 }}>
                        <label className="label" htmlFor="email">邮箱</label>
                        <input
                            id="email"
                            type="email"
                            className="input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="field" style={{ marginBottom: 24 }}>
                        <label className="label" htmlFor="password">密码</label>
                        <input
                            id="password"
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
                        id="login-submit"
                        className={`btn btn-primary ${loading ? "btn-loading" : ""}`}
                        style={{ width: "100%", height: 48 }}
                        disabled={loading}
                    >
                        {loading ? <span className="spinner" /> : "登录"}
                    </button>
                </form>

                <p style={{ textAlign: "center", marginTop: 20, fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                    没有账号？{" "}
                    <Link href="/register" style={{ color: "var(--accent)", fontWeight: 600 }}>
                        立即注册
                    </Link>
                </p>
            </div>
        </div>
    );
}
