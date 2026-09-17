"use client";
import { useState } from "react";

export default function DoctorLogin() {
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true); setError("");
    const response = await fetch("/api/doctor/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin })
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) { setError(body.error || "Login failed."); return; }
    window.location.href = "/doctor/dashboard";
  }

  return <div className="login-wrap"><section className="card login-card">
    <div className="eyebrow">Clinic staff</div>
    <h1>Open dashboard</h1>
    <p className="muted">Enter the clinic PIN. For local development the default PIN is <strong>2468</strong>.</p>
    <form onSubmit={submit}>
      <label className="field"><span>Clinic PIN</span><input type="password" inputMode="numeric" autoComplete="current-password" required value={pin} onChange={e => setPin(e.target.value)} placeholder="••••" /></label>
      <button className="btn btn-primary btn-wide" disabled={loading}>{loading ? "Checking…" : "Login"}</button>
    </form>
    {error && <div className="alert alert-error">{error}</div>}
  </section></div>;
}
