import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { ClinicConfig, LocalStore, PatientToken, QueueDay, QueueSummary, TokenSource, TokenStatus } from "./types";

const filePath = path.join(process.cwd(), "data", "store.json");
const useDb = Boolean(process.env.DATABASE_URL);
let schemaPromise: Promise<void> | null = null;
let fileWriteChain: Promise<unknown> = Promise.resolve();

function nowIso() {
  return new Date().toISOString();
}

async function readLocal(): Promise<LocalStore> {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

async function writeLocal(store: LocalStore) {
  await fs.writeFile(filePath, JSON.stringify(store, null, 2));
}

async function withLocalWrite<T>(fn: (store: LocalStore) => Promise<T> | T): Promise<T> {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => {
    resolveResult = resolve;
    rejectResult = reject;
  });
  fileWriteChain = fileWriteChain.then(async () => {
    try {
      const store = await readLocal();
      const value = await fn(store);
      await writeLocal(store);
      resolveResult(value);
    } catch (error) {
      rejectResult(error);
    }
  });
  await fileWriteChain.catch(() => undefined);
  return result;
}

function defaultQueue(date: string): QueueDay {
  return { date, bookingOpen: true, paused: false, nextTokenNumber: 1 };
}

function mapToken(row: any): PatientToken {
  return {
    id: String(row.id),
    publicId: String(row.public_id),
    patientName: String(row.patient_name),
    patientPhone: String(row.patient_phone),
    date: String(row.token_date),
    tokenNumber: Number(row.token_number),
    source: row.source as TokenSource,
    status: row.status as TokenStatus,
    createdAt: String(row.created_at),
    calledAt: row.called_at ? String(row.called_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null
  };
}

export async function ensureSchema() {
  if (!useDb) return;
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const sql = neon(process.env.DATABASE_URL!);
      await sql`CREATE TABLE IF NOT EXISTS clinic_config (
        id INTEGER PRIMARY KEY DEFAULT 1,
        clinic_name TEXT NOT NULL,
        doctor_name TEXT NOT NULL,
        specialization TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        avg_consultation_minutes INTEGER NOT NULL,
        max_tokens INTEGER NOT NULL
      )`;
      await sql`CREATE TABLE IF NOT EXISTS queue_days (
        queue_date TEXT PRIMARY KEY,
        booking_open BOOLEAN NOT NULL DEFAULT TRUE,
        paused BOOLEAN NOT NULL DEFAULT FALSE,
        next_token_number INTEGER NOT NULL DEFAULT 1
      )`;
      await sql`CREATE TABLE IF NOT EXISTS tokens (
        id TEXT PRIMARY KEY,
        public_id TEXT NOT NULL UNIQUE,
        patient_name TEXT NOT NULL,
        patient_phone TEXT NOT NULL,
        token_date TEXT NOT NULL,
        token_number INTEGER NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TEXT NOT NULL,
        called_at TEXT,
        completed_at TEXT,
        UNIQUE(token_date, token_number)
      )`;
      await sql`CREATE INDEX IF NOT EXISTS idx_tokens_date_status ON tokens(token_date, status, token_number)`;
      await sql`INSERT INTO clinic_config(
        id, clinic_name, doctor_name, specialization, start_time, end_time, avg_consultation_minutes, max_tokens
      ) VALUES (1, 'Sri Sai Clinic', 'Dr. Ravi Kumar', 'General Physician', '17:00', '20:00', 10, 30)
      ON CONFLICT (id) DO NOTHING`;
    })().catch(error => {
      schemaPromise = null;
      throw error;
    });
  }
  await schemaPromise;
}

export async function getConfig(): Promise<ClinicConfig> {
  if (!useDb) return (await readLocal()).config;
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM clinic_config WHERE id=1`;
  const row: any = rows[0];
  return {
    clinicName: row.clinic_name,
    doctorName: row.doctor_name,
    specialization: row.specialization,
    startTime: row.start_time,
    endTime: row.end_time,
    avgConsultationMinutes: Number(row.avg_consultation_minutes),
    maxTokens: Number(row.max_tokens)
  };
}

export async function updateConfig(config: ClinicConfig): Promise<ClinicConfig> {
  if (!useDb) {
    return withLocalWrite(store => {
      store.config = config;
      return config;
    });
  }
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  await sql`UPDATE clinic_config SET
    clinic_name=${config.clinicName}, doctor_name=${config.doctorName}, specialization=${config.specialization},
    start_time=${config.startTime}, end_time=${config.endTime},
    avg_consultation_minutes=${config.avgConsultationMinutes}, max_tokens=${config.maxTokens}
    WHERE id=1`;
  return config;
}

async function ensureQueueDay(date: string): Promise<QueueDay> {
  if (!useDb) {
    const store = await readLocal();
    return store.queues[date] || defaultQueue(date);
  }
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO queue_days(queue_date, booking_open, paused, next_token_number)
    VALUES (${date}, TRUE, FALSE, 1) ON CONFLICT (queue_date) DO NOTHING`;
  const rows = await sql`SELECT * FROM queue_days WHERE queue_date=${date}`;
  const row: any = rows[0];
  return { date: row.queue_date, bookingOpen: Boolean(row.booking_open), paused: Boolean(row.paused), nextTokenNumber: Number(row.next_token_number) };
}

export async function listTokens(date: string): Promise<PatientToken[]> {
  if (!useDb) {
    return (await readLocal()).tokens.filter(t => t.date === date).sort((a, b) => a.tokenNumber - b.tokenNumber);
  }
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  const rows = await sql`SELECT * FROM tokens WHERE token_date=${date} ORDER BY token_number`;
  return rows.map(mapToken);
}

export async function getQueueSummary(date: string): Promise<QueueSummary> {
  const [config, queue, tokens] = await Promise.all([getConfig(), ensureQueueDay(date), listTokens(date)]);
  const serving = tokens.find(t => t.status === "SERVING");
  const waitingCount = tokens.filter(t => t.status === "WAITING").length;
  return {
    date,
    bookingOpen: queue.bookingOpen && queue.nextTokenNumber <= config.maxTokens,
    paused: queue.paused,
    currentTokenNumber: serving?.tokenNumber ?? null,
    waitingCount,
    nextTokenNumber: queue.nextTokenNumber,
    estimatedWaitMinutes: (waitingCount + (serving ? 1 : 0)) * config.avgConsultationMinutes,
    config
  };
}

export async function createToken(input: {
  patientName: string;
  patientPhone: string;
  date: string;
  source: TokenSource;
}): Promise<PatientToken> {
  const id = crypto.randomUUID();
  const publicId = crypto.randomUUID().replaceAll("-", "").slice(0, 20);
  const createdAt = nowIso();

  if (!useDb) {
    return withLocalWrite(store => {
      const queue = store.queues[input.date] || defaultQueue(input.date);
      store.queues[input.date] = queue;
      if (!queue.bookingOpen) throw new Error("BOOKINGS_CLOSED");
      if (queue.nextTokenNumber > store.config.maxTokens) throw new Error("QUEUE_FULL");
      const token: PatientToken = {
        id,
        publicId,
        patientName: input.patientName,
        patientPhone: input.patientPhone,
        date: input.date,
        tokenNumber: queue.nextTokenNumber++,
        source: input.source,
        status: "WAITING",
        createdAt,
        calledAt: null,
        completedAt: null
      };
      store.tokens.push(token);
      return token;
    });
  }

  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO queue_days(queue_date, booking_open, paused, next_token_number)
    VALUES (${input.date}, TRUE, FALSE, 1) ON CONFLICT (queue_date) DO NOTHING`;
  const numbers = await sql`UPDATE queue_days
    SET next_token_number = next_token_number + 1
    WHERE queue_date=${input.date}
      AND booking_open=TRUE
      AND next_token_number <= (SELECT max_tokens FROM clinic_config WHERE id=1)
    RETURNING next_token_number - 1 AS token_number`;
  if (!numbers[0]) {
    const state = await sql`SELECT booking_open, next_token_number FROM queue_days WHERE queue_date=${input.date}`;
    const config = await getConfig();
    if (state[0] && !state[0].booking_open) throw new Error("BOOKINGS_CLOSED");
    if (state[0] && Number(state[0].next_token_number) > config.maxTokens) throw new Error("QUEUE_FULL");
    throw new Error("BOOKINGS_CLOSED");
  }
  const tokenNumber = Number((numbers[0] as any).token_number);
  const rows = await sql`INSERT INTO tokens(
    id, public_id, patient_name, patient_phone, token_date, token_number, source, status, created_at, called_at, completed_at
  ) VALUES (
    ${id}, ${publicId}, ${input.patientName}, ${input.patientPhone}, ${input.date}, ${tokenNumber}, ${input.source}, 'WAITING', ${createdAt}, NULL, NULL
  ) RETURNING *`;
  return mapToken(rows[0]);
}

export async function getPublicToken(publicId: string) {
  let token: PatientToken | undefined;
  if (!useDb) {
    token = (await readLocal()).tokens.find(t => t.publicId === publicId);
  } else {
    await ensureSchema();
    const sql = neon(process.env.DATABASE_URL!);
    const rows = await sql`SELECT * FROM tokens WHERE public_id=${publicId} LIMIT 1`;
    if (rows[0]) token = mapToken(rows[0]);
  }
  if (!token) return null;
  const [config, tokens] = await Promise.all([getConfig(), listTokens(token.date)]);
  const activeAhead = tokens.filter(t =>
    t.tokenNumber < token!.tokenNumber && (t.status === "WAITING" || t.status === "SERVING")
  ).length;
  const serving = tokens.find(t => t.status === "SERVING");
  return {
    publicId: token.publicId,
    patientName: token.patientName,
    date: token.date,
    tokenNumber: token.tokenNumber,
    status: token.status,
    currentTokenNumber: serving?.tokenNumber ?? null,
    peopleAhead: token.status === "WAITING" ? activeAhead : 0,
    estimatedWaitMinutes: token.status === "WAITING" ? activeAhead * config.avgConsultationMinutes : 0,
    clinicName: config.clinicName,
    doctorName: config.doctorName
  };
}

export async function advanceQueue(date: string, currentOutcome: "COMPLETED" | "NO_SHOW" = "COMPLETED") {
  const timestamp = nowIso();
  if (!useDb) {
    return withLocalWrite(store => {
      const tokens = store.tokens.filter(t => t.date === date).sort((a, b) => a.tokenNumber - b.tokenNumber);
      const current = tokens.find(t => t.status === "SERVING");
      if (current) {
        current.status = currentOutcome;
        current.completedAt = timestamp;
      }
      const next = tokens.find(t => t.status === "WAITING");
      if (next) {
        next.status = "SERVING";
        next.calledAt = timestamp;
      }
      return next || null;
    });
  }
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  const outcome = currentOutcome;
  const rows = await sql`WITH finished AS (
      UPDATE tokens SET status=${outcome}, completed_at=${timestamp}
      WHERE token_date=${date} AND status='SERVING'
      RETURNING id
    ), next_row AS (
      SELECT id FROM tokens
      WHERE token_date=${date} AND status='WAITING'
      ORDER BY token_number
      LIMIT 1
    )
    UPDATE tokens SET status='SERVING', called_at=${timestamp}
    WHERE id=(SELECT id FROM next_row)
    RETURNING *`;
  return rows[0] ? mapToken(rows[0]) : null;
}

export async function setBookingOpen(date: string, open: boolean) {
  if (!useDb) {
    return withLocalWrite(store => {
      const queue = store.queues[date] || defaultQueue(date);
      queue.bookingOpen = open;
      store.queues[date] = queue;
      return queue;
    });
  }
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO queue_days(queue_date, booking_open, paused, next_token_number)
    VALUES (${date}, ${open}, FALSE, 1)
    ON CONFLICT (queue_date) DO UPDATE SET booking_open=${open}`;
  return ensureQueueDay(date);
}

export async function setQueuePaused(date: string, paused: boolean) {
  if (!useDb) {
    return withLocalWrite(store => {
      const queue = store.queues[date] || defaultQueue(date);
      queue.paused = paused;
      store.queues[date] = queue;
      return queue;
    });
  }
  await ensureSchema();
  const sql = neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO queue_days(queue_date, booking_open, paused, next_token_number)
    VALUES (${date}, TRUE, ${paused}, 1)
    ON CONFLICT (queue_date) DO UPDATE SET paused=${paused}`;
  return ensureQueueDay(date);
}
