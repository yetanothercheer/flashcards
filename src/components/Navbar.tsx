"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

export default function Navbar() {
    const { user, loading, logout } = useAuth();
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await logout();
        router.push("/");
    };

    const isActive = (href: string) => pathname === href ? "navbar-link active" : "navbar-link";

    return (
        <nav className="navbar">
            <Link href="/" className="navbar-brand">
                Lexio<span className="dot">.</span>
            </Link>

            {user && (
                <div className="navbar-links">
                    <Link href="/dashboard" className={isActive("/dashboard")}>词书</Link>
                    <Link href="/library" className={isActive("/library")}>词库</Link>
                </div>
            )}

            <div className="navbar-spacer" />

            <div className="navbar-actions">
                {loading ? (
                    <div className="spinner" style={{ width: 16, height: 16 }} />
                ) : user ? (
                    <>
                        <span style={{ fontSize: "0.875rem", color: "var(--text-secondary)" }}>
                            {user.display_name ?? user.email}
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={handleLogout}>
                            退出
                        </button>
                    </>
                ) : (
                    <>
                        <Link href="/login" className="btn btn-ghost btn-sm">登录</Link>
                        <Link href="/register" className="btn btn-primary btn-sm">注册</Link>
                    </>
                )}
            </div>
        </nav>
    );
}
