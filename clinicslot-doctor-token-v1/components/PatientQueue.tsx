"use client";
import { useEffect, useState } from "react";
import type { QueueSummary } from "@/lib/types";

export default function PatientQueue() {
  const [queue, setQueue] = useState<QueueSummary | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    const response = await fetch("/api/public/queue", { cache: "no-store" });
    if (response.ok) setQueue(await response.json());
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 10000);
    return () => window.clearInterval(id);
  }, []);

  async function book(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    const response = await fetch("/api/public/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName: name, patientPhone: phone })
    });
    const body = await response.json();
    setLoading(false);
    if (!response.ok) {
      setError(body.error || "Could not create token.");
      await load();
      return;
    }
    window.location.href = `/token/${body.publicId}`;
  }

  if (!queue) return <div className="card"><p>Loading clinic queue…</p></div>;
  const { config } = queue;

  return <div className="patient-layout">
    <section className="card patient-hero-card">
      <div className="eyebrow">{config.clinicName}</div>
      <h1>{config.doctorName}</h1>
      <p className="muted">{config.specialization}</p>
      <div className="schedule-line">Today · {config.startTime}–{config.endTime}</div>
      <div className="status-row">
        <span className={`pill ${queue.bookingOpen ? "pill-open" : "pill-closed"}`}>{queue.bookingOpen ? "Bookings open" : "Bookings closed"}</span>
        {queue.paused && <span className="pill pill-paused">Queue paused</span>}
      </div>
      <div className="queue-stats">
        <div><span>Currently serving</span><strong>{queue.currentTokenNumber ? `#${queue.currentTokenNumber}` : "—"}</strong></div>
        <div><span>Waiting</span><strong>{queue.waitingCount}</strong></div>
        <div><span>Approx. queue</span><strong>{queue.estimatedWaitMinutes ? `~${queue.estimatedWaitMinutes} min` : "No wait"}</strong></div>
      </div>
      <p className="hint">Times are estimates. Your live token page will tell you how many patients are ahead.</p>
    </section>

    <section className="card booking-card">
      <h2>Get today&apos;s token</h2>
      <p className="muted">No account needed. Enter your details and keep the token page open on your phone.</p>
      <form onSubmit={book}>
        <label className="field"><span>Patient name</span><input autoComplete="name" required maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Your name" /></label>
        <label className="field"><span>Phone number</span><input autoComplete="tel" inputMode="tel" required value={phone} onChange={e => setPhone(e.target.value)} placeholder="9876543210" /></label>
        <button className="btn btn-primary btn-wide" disabled={!queue.bookingOpen || loading}>{loading ? "Creating token…" : queue.bookingOpen ? "Get token" : "Bookings closed"}</button>
      </form>
      {error && <div className="alert alert-error">{error}</div>}
    </section>
  </div>;
}
