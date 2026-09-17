import Link from "next/link";

export default function Home() {
  return <main className="home">
    <section className="home-hero">
      <div className="eyebrow">ClinicSlot · token queue for small clinics</div>
      <h1>Less waiting. Fewer calls. One simple live queue.</h1>
      <p>Patients get a token from their phone. Reception can add walk-ins. The doctor advances one shared queue with a single button.</p>
      <div className="home-actions"><Link className="btn btn-primary" href="/clinic">Open patient view</Link><Link className="btn btn-secondary" href="/doctor/login">Clinic staff login</Link></div>
    </section>
    <section className="feature-grid">
      <div className="feature"><strong>Patient</strong><span>Get today&apos;s token without calling reception.</span></div>
      <div className="feature"><strong>Reception</strong><span>Add walk-ins into the exact same queue.</span></div>
      <div className="feature"><strong>Doctor</strong><span>Call next, mark no-show, pause or stop bookings.</span></div>
    </section>
  </main>;
}
