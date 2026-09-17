"use client";
import { useEffect, useMemo, useState } from "react";
import type { ClinicConfig, PatientToken, QueueSummary } from "@/lib/types";

type DashboardData = { date: string; config: ClinicConfig; queue: QueueSummary; tokens: PatientToken[] };

export default function DoctorDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [settings, setSettings] = useState<ClinicConfig | null>(null);
  const [walkInName, setWalkInName] = useState("");
  const [walkInPhone, setWalkInPhone] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function load() {
    const response = await fetch("/api/doctor/dashboard", { cache: "no-store" });
    if (response.status === 401) { window.location.href = "/doctor/login"; return; }
    if (!response.ok) return;
    const body: DashboardData = await response.json();
    setData(body);
    setSettings(prev => prev ?? body.config);
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 5000);
    return () => window.clearInterval(id);
  }, []);

  async function queueAction(action: string) {
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/doctor/queue/action", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) { setError(body.error || "Action failed."); return; }
    await load();
  }

  async function addWalkIn(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/doctor/walkin", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientName: walkInName, patientPhone: walkInPhone })
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) { setError(body.error || "Could not add walk-in."); return; }
    setWalkInName(""); setWalkInPhone(""); setMessage(`Walk-in added as token #${body.tokenNumber}.`); await load();
  }

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    if (!settings) return;
    setBusy(true); setError(""); setMessage("");
    const response = await fetch("/api/doctor/settings", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(settings)
    });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) { setError(body.error || "Could not save settings."); return; }
    setMessage("Clinic settings saved."); setSettings(body); await load();
  }

  const current = useMemo(() => data?.tokens.find(t => t.status === "SERVING") || null, [data]);
  const waiting = useMemo(() => data?.tokens.filter(t => t.status === "WAITING") || [], [data]);
  const finished = useMemo(() => data?.tokens.filter(t => ["COMPLETED", "NO_SHOW", "CANCELLED"].includes(t.status)) || [], [data]);

  if (!data || !settings) return <div className="card"><p>Loading clinic dashboard…</p></div>;

  return <div className="dashboard-stack">
    <section className="dashboard-head">
      <div><div className="eyebrow">{data.config.clinicName}</div><h1>Today&apos;s token queue</h1><p className="muted">{data.config.doctorName} · {data.date}</p></div>
      <form action="/api/doctor/logout" method="post"><button className="btn btn-secondary">Logout</button></form>
    </section>

    <section className="doctor-grid">
      <div className="card current-card">
        <div className="card-title-row"><h2>Currently serving</h2><span className={`pill ${data.queue.paused ? "pill-paused" : "pill-open"}`}>{data.queue.paused ? "Paused" : "Live"}</span></div>
        <div className="current-token">{current ? `#${current.tokenNumber}` : "—"}</div>
        <div className="current-name">{current?.patientName || "No patient called yet"}</div>
        {current?.patientPhone && current.patientPhone !== "0000000" && <div className="muted">{current.patientPhone}</div>}
        <div className="action-grid">
          <button className="btn btn-primary" disabled={busy || data.queue.paused} onClick={() => queueAction("NEXT")}>{current ? "Complete & call next" : "Call first patient"}</button>
          <button className="btn btn-danger" disabled={busy || !current || data.queue.paused} onClick={() => queueAction("NO_SHOW")}>No show & next</button>
        </div>
      </div>

      <div className="card queue-control-card">
        <h2>Queue controls</h2>
        <div className="mini-stats"><div><span>Waiting</span><strong>{data.queue.waitingCount}</strong></div><div><span>Next token</span><strong>#{data.queue.nextTokenNumber}</strong></div></div>
        <button className={`btn btn-wide ${data.queue.bookingOpen ? "btn-secondary" : "btn-primary"}`} disabled={busy} onClick={() => queueAction(data.queue.bookingOpen ? "CLOSE_BOOKINGS" : "OPEN_BOOKINGS")}>{data.queue.bookingOpen ? "Stop new bookings" : "Open bookings"}</button>
        <button className="btn btn-secondary btn-wide" disabled={busy} onClick={() => queueAction(data.queue.paused ? "RESUME" : "PAUSE")}>{data.queue.paused ? "Resume queue" : "Pause queue"}</button>
        <p className="hint">Pausing stops calling patients. Closing bookings prevents new online and walk-in tokens.</p>
      </div>
    </section>

    {(message || error) && <div className={`alert ${error ? "alert-error" : "alert-success"}`}>{error || message}</div>}

    <section className="doctor-grid wide-left">
      <div className="card">
        <div className="card-title-row"><h2>Waiting patients</h2><span className="count-badge">{waiting.length}</span></div>
        {waiting.length === 0 ? <div className="empty">No patients are waiting.</div> : <div className="patient-list">{waiting.map(token => <div className="patient-row" key={token.id}>
          <div className="token-circle">#{token.tokenNumber}</div>
          <div className="patient-main"><strong>{token.patientName}</strong><span>{token.patientPhone === "0000000" ? "No phone" : token.patientPhone}</span></div>
          <span className={`source source-${token.source.toLowerCase()}`}>{token.source === "WALK_IN" ? "Walk-in" : "Online"}</span>
        </div>)}</div>}
      </div>

      <div className="card">
        <h2>Add walk-in</h2>
        <p className="muted">Add patients who arrive directly at reception to the same queue.</p>
        <form onSubmit={addWalkIn}>
          <label className="field"><span>Patient name</span><input required maxLength={80} value={walkInName} onChange={e => setWalkInName(e.target.value)} placeholder="Patient name" /></label>
          <label className="field"><span>Phone (optional)</span><input inputMode="tel" value={walkInPhone} onChange={e => setWalkInPhone(e.target.value)} placeholder="9876543210" /></label>
          <button className="btn btn-primary btn-wide" disabled={busy || !data.queue.bookingOpen}>Add walk-in token</button>
        </form>
      </div>
    </section>

    <section className="card settings-card">
      <details>
        <summary>Clinic & schedule settings</summary>
        <form className="settings-grid" onSubmit={saveSettings}>
          <label className="field"><span>Clinic name</span><input value={settings.clinicName} onChange={e => setSettings({ ...settings, clinicName: e.target.value })} /></label>
          <label className="field"><span>Doctor name</span><input value={settings.doctorName} onChange={e => setSettings({ ...settings, doctorName: e.target.value })} /></label>
          <label className="field"><span>Specialization</span><input value={settings.specialization} onChange={e => setSettings({ ...settings, specialization: e.target.value })} /></label>
          <label className="field"><span>Start time</span><input type="time" value={settings.startTime} onChange={e => setSettings({ ...settings, startTime: e.target.value })} /></label>
          <label className="field"><span>End time</span><input type="time" value={settings.endTime} onChange={e => setSettings({ ...settings, endTime: e.target.value })} /></label>
          <label className="field"><span>Average consultation (minutes)</span><input type="number" min="1" max="60" value={settings.avgConsultationMinutes} onChange={e => setSettings({ ...settings, avgConsultationMinutes: Number(e.target.value) })} /></label>
          <label className="field"><span>Maximum tokens / day</span><input type="number" min="1" max="200" value={settings.maxTokens} onChange={e => setSettings({ ...settings, maxTokens: Number(e.target.value) })} /></label>
          <div className="settings-action"><button className="btn btn-primary" disabled={busy}>Save settings</button></div>
        </form>
      </details>
    </section>

    {finished.length > 0 && <section className="card">
      <details><summary>Completed / skipped today ({finished.length})</summary><div className="patient-list compact-list">{finished.map(token => <div className="patient-row" key={token.id}><div className="token-circle">#{token.tokenNumber}</div><div className="patient-main"><strong>{token.patientName}</strong><span>{token.status}</span></div></div>)}</div></details>
    </section>}
  </div>;
}
