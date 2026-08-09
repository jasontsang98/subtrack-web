"use client";
import Image from "next/image";
import { FormEvent, Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
function LoginForm() {
  const router = useRouter(), searchParams = useSearchParams(); const [password, setPassword] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setBusy(true); setError(""); const response = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); if (!response.ok) { const body = await response.json().catch(() => ({})); setError(body.error || "Unable to sign in"); setBusy(false); return; } const requested = searchParams.get("next"); router.replace(requested?.startsWith("/") && !requested.startsWith("//") ? requested : "/"); router.refresh(); }
  return <section className="login-card"><Image src="/subtrack-icon.png" width={54} height={54} alt="" priority/><em>LOCAL &amp; PRIVATE</em><h1>Welcome back.</h1><p>Enter the admin password for this Subtrack server.</p><form onSubmit={submit}><label>Password<input required type="password" autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)}/></label>{error && <div className="login-error" role="alert">{error}</div>}<button className="primary" disabled={busy}>{busy ? "Signing in…" : "Sign in"}</button></form><small>Your password stays on this server and is never stored in the browser.</small></section>;
}
export default function LoginPage() { return <main className="login-shell"><Suspense><LoginForm/></Suspense></main>; }
