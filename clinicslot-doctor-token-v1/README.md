# ClinicSlot V1 — Live Clinic Token Queue

ClinicSlot is a small, deployable token-queue product for a single clinic/doctor pilot.

It is intentionally **not** a hospital-management system. The V1 does one job: replace the manual token queue with a simple shared online + walk-in queue.

## What works

### Patient
- Opens `/clinic` on a phone or from a QR code.
- Sees clinic/doctor details, today's schedule, current token and approximate queue.
- Gets a sequential token without creating an account.
- Receives a private token-status URL.
- Token page automatically refreshes every 10 seconds and shows patients ahead + estimated wait.

### Doctor / receptionist
- Protected staff login at `/doctor/login`.
- Sees today's live queue and patient contact details.
- Adds walk-in patients into the same queue as online patients.
- Calls the first/next patient.
- Completes the current patient and calls the next with one action.
- Marks a current patient as no-show and moves on.
- Pauses/resumes the queue.
- Opens/closes new bookings.
- Edits clinic name, doctor name, specialization, hours, average consultation time and daily token limit.

### Technical
- Next.js 15 + React 19 + TypeScript.
- Works locally with `data/store.json` (no database required).
- Uses PostgreSQL/Neon automatically when `DATABASE_URL` is configured.
- Atomic PostgreSQL token allocation prevents two patients from receiving the same token number.
- Staff APIs require an HTTP-only signed session cookie.
- Dates use the `Asia/Kolkata` clinic timezone.
- Separate patient/staff PWA manifests + a service worker are included, so both sides can be installed from supported mobile browsers while sharing one codebase.

---

## 1. Requirements

Install Node.js 20.9+ (Node 22 LTS recommended) and Git.

Verify:

```bash
node -v
npm -v
git --version
```

## 2. Run locally

From the project folder:

```bash
npm install
```

Create your local environment file:

Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

macOS/Linux:

```bash
cp .env.example .env.local
```

For local testing you can leave `DATABASE_URL` blank. The included defaults are:

```env
CLINIC_ADMIN_PIN=2468
AUTH_SECRET=change-this-to-a-long-random-secret
```

Start:

```bash
npm run dev
```

Open:

- Home: http://localhost:3000
- Patient: http://localhost:3000/clinic
- Clinic login: http://localhost:3000/doctor/login
- Clinic dashboard: http://localhost:3000/doctor/dashboard

Local staff PIN: **2468** (change it in `.env.local`).

## 3. Demo the complete flow

1. Open `/doctor/login` and login with the clinic PIN.
2. Keep the dashboard open on one phone/browser.
3. Open `/clinic` on a second phone/browser.
4. Book a patient token.
5. Add a walk-in from the dashboard.
6. On the dashboard press **Call first patient**.
7. Watch the patient's private token page update automatically.
8. Press **Complete & call next** and watch the queue move.
9. Test **No show**, **Pause queue** and **Stop new bookings**.

## 4. Production database (recommended before deployment)

Create a PostgreSQL database. Neon is a simple option.

Set in your deployment environment:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require
AUTH_SECRET=USE_A_LONG_RANDOM_SECRET_HERE
CLINIC_ADMIN_PIN=USE_A_PRIVATE_PIN_HERE
```

The application creates the V1 tables automatically on first use. The reference SQL is also in `db/schema.sql`.

**Do not deploy using `data/store.json` as production persistence.** Server/container filesystems can be ephemeral. Use PostgreSQL.

## 5. Build before pushing to GitHub

Run:

```bash
npm run typecheck
npm run build
```

Then start the production build locally:

```bash
npm start
```

## 6. Push to a new GitHub repository

```bash
git init
git add .
git commit -m "ClinicSlot live token queue V1"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

## 7. Deployment checklist (do this after local testing)

Before deploying to Render/Vercel/etc.:

- [ ] Local patient booking works.
- [ ] Walk-in receives the next token number.
- [ ] Doctor can call the first patient.
- [ ] Next/no-show updates the patient's live page.
- [ ] Bookings can be closed and reopened.
- [ ] Clinic settings save correctly.
- [ ] `npm run typecheck` passes.
- [ ] `npm run build` passes.
- [ ] PostgreSQL `DATABASE_URL` is ready.
- [ ] Production `AUTH_SECRET` is long/random.
- [ ] Production clinic PIN is changed from `2468`.

## Current V1 boundaries

This ZIP is deliberately a **single-clinic / single-doctor pilot**. It does not yet include multiple clinics, multiple doctors, SMS/WhatsApp, payments, medical records, prescriptions, patient accounts or app-store-native binaries. Those should come after a real clinic validates the token workflow.

For patients and clinic staff, this version exposes separate installable PWA identities (ClinicSlot Patient and ClinicSlot Staff) using one codebase. Native Play Store / App Store packaging can be added after the pilot proves useful.
