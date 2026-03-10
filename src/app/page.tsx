"use client";

import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push("/dashboard");
  }, [user, loading, router]);

  return (
    <main>
      {/* Hero */}
      <section style={{
        minHeight: "calc(100vh - 60px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px 24px",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
      }}>
        {/* Glow blobs */}
        <div aria-hidden style={{
          position: "absolute", top: "20%", left: "50%",
          transform: "translateX(-50%)",
          width: 600, height: 600, borderRadius: "50%",
          background: "radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        <div className="animate-slideup">
          <div className="badge badge-accent" style={{ marginBottom: 20, fontSize: "0.8rem" }}>
            🎓 间隔重复 · SM-2 算法
          </div>

          <h1 style={{ marginBottom: 20 }}>
            记单词，<span className="gradient-text">该聪明一点了</span>
          </h1>

          <p style={{ fontSize: "1.125rem", maxWidth: 520, margin: "0 auto 40px", lineHeight: 1.7 }}>
            Lexio 用 Anki 同款算法帮你决定「什么时候复习」，
            只在你快忘的时候出现，不浪费一分钟。
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/register" className="btn btn-primary btn-lg">
              免费开始使用 →
            </Link>
            <Link href="/library" className="btn btn-secondary btn-lg">
              浏览词库
            </Link>
          </div>
        </div>

        {/* Feature cards */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 16, maxWidth: 800, width: "100%", marginTop: 80,
        }}>
          {[
            { icon: "🧠", title: "SM-2 间隔重复", desc: "和 Anki 一样的算法，用最少时间记最多单词" },
            { icon: "📚", title: "内置 + 自定义词库", desc: "GRE / IELTS 词库开箱即用，也可以导入 CSV" },
            { icon: "🔗", title: "一键分享 & Fork", desc: "把你的词书分享给朋友，一键 fork 为自己的" },
          ].map((f) => (
            <div key={f.title} className="card" style={{ textAlign: "left" }}>
              <div style={{ fontSize: "1.6rem", marginBottom: 10 }}>{f.icon}</div>
              <h3 style={{ marginBottom: 6 }}>{f.title}</h3>
              <p style={{ fontSize: "0.875rem", lineHeight: 1.6 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
