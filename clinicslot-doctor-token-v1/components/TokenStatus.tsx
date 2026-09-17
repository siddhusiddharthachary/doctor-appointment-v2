"use client";
import { useEffect, useState } from "react";

type PublicToken = {
  publicId: string;
  patientName: string;
  date: string;
  tokenNumber: number;
  status: "WAITING" | "SERVING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  currentTokenNumber: number | null;
  peopleAhead: number;
  estimatedWaitMinutes: number;
  clinicName: string;
  doctorName: string;
};

export default function TokenStatus({ publicId }: { publicId: string }) {
  const [token, setToken] = useState<PublicToken | null>(null);
  const [missing, setMissing] = useState(false);

  async function load() {
    const response = await fetch(`/api/public/tokens/${encodeURIComponent(publicId)}`, { cache: "no-store" });
    if (response.status === 404) { setMissing(true); return; }
    if (response.ok) setToken(await response.json());
  }

  useEffect(() => {
    load();
    const id = window.setInterval(load, 10000);
    return () => window.clearInterval(id);
  }, [publicId]);

  if (missing) return <div className="card"><h1>Token not found</h1><p className="muted">Check the link or request a new token from the clinic page.</p></div>;
  if (!token) return <div className="card"><p>Loading your token…</p></div>;

  const message = token.status === "SERVING" ? "It is your turn now." :
    token.status === "COMPLETED" ? "Consultation completed." :
    token.status === "NO_SHOW" ? "This token was marked no-show." :
    token.status === "CANCELLED" ? "This token was cancelled." :
    token.peopleAhead === 0 ? "You are next in the queue." : `${token.peopleAhead} patient${token.peopleAhead === 1 ? "" : "s"} ahead of you.`;

  return <div className="token-page">
    <section className="card token-card">
      <div className="eyebrow">{token.clinicName}</div>
      <h1>Your token</h1>
      <div className="big-token">#{token.tokenNumber}</div>
      <span className={`pill status-${token.status.toLowerCase()}`}>{token.status.replace("_", " ")}</span>
      <h2>{message}</h2>
      {token.status === "WAITING" && <div className="token-grid">
        <div><span>Currently serving</span><strong>{token.currentTokenNumber ? `#${token.currentTokenNumber}` : "Not started"}</strong></div>
        <div><span>Estimated wait</span><strong>{token.estimatedWaitMinutes ? `~${token.estimatedWaitMinutes} min` : "Soon"}</strong></div>
      </div>}
      <p className="muted">{token.doctorName} · {token.date}</p>
      <p className="hint">This page refreshes automatically every 10 seconds. Save or bookmark this link until your consultation is complete.</p>
    </section>
  </div>;
}
