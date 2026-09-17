import { promises as fs } from "fs";
import path from "path";
import { neon } from "@neondatabase/serverless";
import type { ClinicConfig, LocalStore, PatientToken, PaymentRequest, QueueDay, QueueSummary, TokenSource, TokenStatus } from "./types";

const filePath = path.join(process.cwd(), "data", "store.json");
const useDb = Boolean(process.env.DATABASE_URL);
let schemaPromise: Promise<void> | null = null;
let fileWriteChain: Promise<unknown> = Promise.resolve();
const nowIso = () => new Date().toISOString();

async function readLocal(): Promise<LocalStore> {
  const value = JSON.parse(await fs.readFile(filePath, "utf8"));
  value.payments ||= [];
  value.config.upiId ||= "doctor@upi";
  value.config.tokenPriceRupees ||= 100;
  return value;
}
async function writeLocal(store: LocalStore) { await fs.writeFile(filePath, JSON.stringify(store, null, 2)); }
async function withLocalWrite<T>(fn: (store: LocalStore) => Promise<T> | T): Promise<T> {
  let resolveResult!: (value: T) => void;
  let rejectResult!: (reason?: unknown) => void;
  const result = new Promise<T>((resolve, reject) => { resolveResult = resolve; rejectResult = reject; });
  fileWriteChain = fileWriteChain.then(async () => {
    try { const store = await readLocal(); const value = await fn(store); await writeLocal(store); resolveResult(value); }
    catch (error) { rejectResult(error); }
  });
  await fileWriteChain.catch(() => undefined);
  return result;
}

function defaultQueue(date: string): QueueDay { return { date, bookingOpen: true, paused: false, nextTokenNumber: 1 }; }
function mapToken(row: any): PatientToken {
  return { id:String(row.id), publicId:String(row.public_id), patientName:String(row.patient_name), patientPhone:String(row.patient_phone), date:String(row.token_date), tokenNumber:Number(row.token_number), source:row.source as TokenSource, status:row.status as TokenStatus, createdAt:String(row.created_at), calledAt:row.called_at ? String(row.called_at) : null, completedAt:row.completed_at ? String(row.completed_at) : null };
}
function mapPayment(row: any): PaymentRequest {
  return { id:String(row.id), publicId:String(row.public_id), date:String(row.payment_date), patientNames:JSON.parse(String(row.patient_names_json)), patientPhone:String(row.patient_phone), patientCount:Number(row.patient_count), unitPriceRupees:Number(row.unit_price_rupees), totalAmountRupees:Number(row.total_amount_rupees), upiId:String(row.upi_id), status:row.status, utr:row.utr ? String(row.utr) : null, tokenPublicIds:JSON.parse(String(row.token_public_ids_json || "[]")), createdAt:String(row.created_at), submittedAt:row.submitted_at ? String(row.submitted_at) : null, verifiedAt:row.verified_at ? String(row.verified_at) : null };
}

export async function ensureSchema() {
  if (!useDb) return;
  if (!schemaPromise) schemaPromise = (async () => {
    const sql = neon(process.env.DATABASE_URL!);
    await sql`CREATE TABLE IF NOT EXISTS clinic_config (id INTEGER PRIMARY KEY DEFAULT 1, clinic_name TEXT NOT NULL, doctor_name TEXT NOT NULL, specialization TEXT NOT NULL, start_time TEXT NOT NULL, end_time TEXT NOT NULL, avg_consultation_minutes INTEGER NOT NULL, max_tokens INTEGER NOT NULL, upi_id TEXT NOT NULL DEFAULT 'doctor@upi', token_price_rupees INTEGER NOT NULL DEFAULT 100)`;
    await sql`ALTER TABLE clinic_config ADD COLUMN IF NOT EXISTS upi_id TEXT NOT NULL DEFAULT 'doctor@upi'`;
    await sql`ALTER TABLE clinic_config ADD COLUMN IF NOT EXISTS token_price_rupees INTEGER NOT NULL DEFAULT 100`;
    await sql`CREATE TABLE IF NOT EXISTS queue_days (queue_date TEXT PRIMARY KEY, booking_open BOOLEAN NOT NULL DEFAULT TRUE, paused BOOLEAN NOT NULL DEFAULT FALSE, next_token_number INTEGER NOT NULL DEFAULT 1)`;
    await sql`CREATE TABLE IF NOT EXISTS tokens (id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, patient_name TEXT NOT NULL, patient_phone TEXT NOT NULL, token_date TEXT NOT NULL, token_number INTEGER NOT NULL, source TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL, called_at TEXT, completed_at TEXT, UNIQUE(token_date, token_number))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_tokens_date_status ON tokens(token_date, status, token_number)`;
    await sql`CREATE TABLE IF NOT EXISTS payment_requests (id TEXT PRIMARY KEY, public_id TEXT NOT NULL UNIQUE, payment_date TEXT NOT NULL, patient_names_json TEXT NOT NULL, patient_phone TEXT NOT NULL, patient_count INTEGER NOT NULL, unit_price_rupees INTEGER NOT NULL, total_amount_rupees INTEGER NOT NULL, upi_id TEXT NOT NULL, status TEXT NOT NULL, utr TEXT, token_public_ids_json TEXT NOT NULL DEFAULT '[]', created_at TEXT NOT NULL, submitted_at TEXT, verified_at TEXT)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_payment_date_status ON payment_requests(payment_date, status, created_at)`;
    await sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_utr_unique ON payment_requests(utr) WHERE utr IS NOT NULL`;
    await sql`INSERT INTO clinic_config(id, clinic_name, doctor_name, specialization, start_time, end_time, avg_consultation_minutes, max_tokens, upi_id, token_price_rupees) VALUES (1,'Sri Sai Clinic','Dr. Ravi Kumar','General Physician','17:00','20:00',10,30,'doctor@upi',100) ON CONFLICT (id) DO NOTHING`;
  })().catch(error => { schemaPromise = null; throw error; });
  await schemaPromise;
}

export async function getConfig(): Promise<ClinicConfig> {
  if (!useDb) return (await readLocal()).config;
  await ensureSchema(); const sql = neon(process.env.DATABASE_URL!); const rows = await sql`SELECT * FROM clinic_config WHERE id=1`; const row:any = rows[0];
  return { clinicName:row.clinic_name, doctorName:row.doctor_name, specialization:row.specialization, startTime:row.start_time, endTime:row.end_time, avgConsultationMinutes:Number(row.avg_consultation_minutes), maxTokens:Number(row.max_tokens), upiId:row.upi_id, tokenPriceRupees:Number(row.token_price_rupees) };
}

export async function updateConfig(config: ClinicConfig): Promise<ClinicConfig> {
  if (!useDb) return withLocalWrite(store => { store.config = config; return config; });
  await ensureSchema(); const sql = neon(process.env.DATABASE_URL!);
  await sql`UPDATE clinic_config SET clinic_name=${config.clinicName},doctor_name=${config.doctorName},specialization=${config.specialization},start_time=${config.startTime},end_time=${config.endTime},avg_consultation_minutes=${config.avgConsultationMinutes},max_tokens=${config.maxTokens},upi_id=${config.upiId},token_price_rupees=${config.tokenPriceRupees} WHERE id=1`;
  return config;
}

export async function updateUpiId(upiId: string) {
  if (!useDb) return withLocalWrite(store => { store.config.upiId = upiId; return store.config; });
  await ensureSchema(); const sql = neon(process.env.DATABASE_URL!); await sql`UPDATE clinic_config SET upi_id=${upiId} WHERE id=1`; return getConfig();
}

async function ensureQueueDay(date: string): Promise<QueueDay> {
  if (!useDb) { const store = await readLocal(); return store.queues[date] || defaultQueue(date); }
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!);
  await sql`INSERT INTO queue_days(queue_date,booking_open,paused,next_token_number) VALUES (${date},TRUE,FALSE,1) ON CONFLICT(queue_date) DO NOTHING`;
  const rows=await sql`SELECT * FROM queue_days WHERE queue_date=${date}`; const row:any=rows[0]; return {date:row.queue_date,bookingOpen:Boolean(row.booking_open),paused:Boolean(row.paused),nextTokenNumber:Number(row.next_token_number)};
}

export async function listTokens(date:string):Promise<PatientToken[]> {
  if(!useDb) return (await readLocal()).tokens.filter(t=>t.date===date).sort((a,b)=>a.tokenNumber-b.tokenNumber);
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); return (await sql`SELECT * FROM tokens WHERE token_date=${date} ORDER BY token_number`).map(mapToken);
}

export async function getQueueSummary(date:string):Promise<QueueSummary> {
  const [config,queue,tokens]=await Promise.all([getConfig(),ensureQueueDay(date),listTokens(date)]); const serving=tokens.find(t=>t.status==="SERVING"); const waitingCount=tokens.filter(t=>t.status==="WAITING").length;
  return {date,bookingOpen:queue.bookingOpen&&queue.nextTokenNumber<=config.maxTokens,paused:queue.paused,currentTokenNumber:serving?.tokenNumber??null,waitingCount,nextTokenNumber:queue.nextTokenNumber,estimatedWaitMinutes:(waitingCount+(serving?1:0))*config.avgConsultationMinutes,config};
}

async function createTokenLocal(store: LocalStore, input:{patientName:string;patientPhone:string;date:string;source:TokenSource}):Promise<PatientToken> {
  const queue=store.queues[input.date]||defaultQueue(input.date); store.queues[input.date]=queue;
  if(!queue.bookingOpen) throw new Error("BOOKINGS_CLOSED"); if(queue.nextTokenNumber>store.config.maxTokens) throw new Error("QUEUE_FULL");
  const token:PatientToken={id:crypto.randomUUID(),publicId:crypto.randomUUID().replaceAll("-","").slice(0,20),patientName:input.patientName,patientPhone:input.patientPhone,date:input.date,tokenNumber:queue.nextTokenNumber++,source:input.source,status:"WAITING",createdAt:nowIso(),calledAt:null,completedAt:null}; store.tokens.push(token); return token;
}

export async function createToken(input:{patientName:string;patientPhone:string;date:string;source:TokenSource}):Promise<PatientToken> {
  if(!useDb) return withLocalWrite(store=>createTokenLocal(store,input));
  const tokens=await createTokensBatch({patientNames:[input.patientName],patientPhone:input.patientPhone,date:input.date,source:input.source}); return tokens[0];
}

export async function createTokensBatch(input:{patientNames:string[];patientPhone:string;date:string;source:TokenSource}):Promise<PatientToken[]> {
  if(input.patientNames.length<1) throw new Error("INVALID_COUNT");
  if(!useDb) return withLocalWrite(async store=>{ const result:PatientToken[]=[]; if((store.queues[input.date]?.nextTokenNumber||1)+input.patientNames.length-1>store.config.maxTokens) throw new Error("QUEUE_FULL"); for(const name of input.patientNames) result.push(await createTokenLocal(store,{patientName:name,patientPhone:input.patientPhone,date:input.date,source:input.source})); return result; });
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); const count=input.patientNames.length;
  await sql`INSERT INTO queue_days(queue_date,booking_open,paused,next_token_number) VALUES (${input.date},TRUE,FALSE,1) ON CONFLICT(queue_date) DO NOTHING`;
  const numbers=await sql`UPDATE queue_days SET next_token_number=next_token_number+${count} WHERE queue_date=${input.date} AND booking_open=TRUE AND next_token_number+${count}-1 <= (SELECT max_tokens FROM clinic_config WHERE id=1) RETURNING next_token_number-${count} AS start_number`;
  if(!numbers[0]) { const state=await sql`SELECT booking_open FROM queue_days WHERE queue_date=${input.date}`; if(state[0]&&!state[0].booking_open) throw new Error("BOOKINGS_CLOSED"); throw new Error("QUEUE_FULL"); }
  const start=Number((numbers[0] as any).start_number); const result:PatientToken[]=[];
  for(let i=0;i<count;i++){ const token={id:crypto.randomUUID(),publicId:crypto.randomUUID().replaceAll("-","").slice(0,20),patientName:input.patientNames[i],patientPhone:input.patientPhone,date:input.date,tokenNumber:start+i,source:input.source,status:"WAITING" as const,createdAt:nowIso(),calledAt:null,completedAt:null}; const rows=await sql`INSERT INTO tokens(id,public_id,patient_name,patient_phone,token_date,token_number,source,status,created_at,called_at,completed_at) VALUES (${token.id},${token.publicId},${token.patientName},${token.patientPhone},${token.date},${token.tokenNumber},${token.source},'WAITING',${token.createdAt},NULL,NULL) RETURNING *`; result.push(mapToken(rows[0])); }
  return result;
}

export async function createPaymentRequest(input:{patientNames:string[];patientPhone:string;date:string}):Promise<PaymentRequest>{
  const config=await getConfig(); const queue=await ensureQueueDay(input.date); const count=input.patientNames.length;
  if(!queue.bookingOpen) throw new Error("BOOKINGS_CLOSED"); if(count<1||count>5) throw new Error("INVALID_COUNT"); if(queue.nextTokenNumber+count-1>config.maxTokens) throw new Error("QUEUE_FULL");
  const payment:PaymentRequest={id:crypto.randomUUID(),publicId:crypto.randomUUID().replaceAll("-","").slice(0,24),date:input.date,patientNames:input.patientNames,patientPhone:input.patientPhone,patientCount:count,unitPriceRupees:config.tokenPriceRupees,totalAmountRupees:config.tokenPriceRupees*count,upiId:config.upiId,status:"PENDING",utr:null,tokenPublicIds:[],createdAt:nowIso(),submittedAt:null,verifiedAt:null};
  if(!useDb) return withLocalWrite(store=>{store.payments.push(payment);return payment;});
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); const rows=await sql`INSERT INTO payment_requests(id,public_id,payment_date,patient_names_json,patient_phone,patient_count,unit_price_rupees,total_amount_rupees,upi_id,status,utr,token_public_ids_json,created_at,submitted_at,verified_at) VALUES (${payment.id},${payment.publicId},${payment.date},${JSON.stringify(payment.patientNames)},${payment.patientPhone},${payment.patientCount},${payment.unitPriceRupees},${payment.totalAmountRupees},${payment.upiId},'PENDING',NULL,'[]',${payment.createdAt},NULL,NULL) RETURNING *`; return mapPayment(rows[0]);
}

export async function getPaymentRequest(publicId:string):Promise<PaymentRequest|null>{
  if(!useDb) return (await readLocal()).payments.find(p=>p.publicId===publicId)||null;
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); const rows=await sql`SELECT * FROM payment_requests WHERE public_id=${publicId} LIMIT 1`; return rows[0]?mapPayment(rows[0]):null;
}

export async function submitPaymentReference(publicId:string,utr:string):Promise<PaymentRequest|null>{
  const submittedAt=nowIso(); if(!useDb) return withLocalWrite(store=>{const p=store.payments.find(x=>x.publicId===publicId); if(!p||p.status==="VERIFIED"||p.status==="REJECTED") return p||null; const duplicate=store.payments.find(x=>x.utr===utr&&x.publicId!==publicId); if(duplicate) throw new Error("UTR_ALREADY_USED"); p.utr=utr;p.status="SUBMITTED";p.submittedAt=submittedAt;return p;});
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); const duplicate=await sql`SELECT id FROM payment_requests WHERE utr=${utr} AND public_id<>${publicId} LIMIT 1`; if(duplicate[0]) throw new Error("UTR_ALREADY_USED"); const rows=await sql`UPDATE payment_requests SET utr=${utr},status='SUBMITTED',submitted_at=${submittedAt} WHERE public_id=${publicId} AND status IN ('PENDING','SUBMITTED') RETURNING *`; if(rows[0]) return mapPayment(rows[0]); return getPaymentRequest(publicId);
}

export async function listPayments(date:string):Promise<PaymentRequest[]>{
  if(!useDb) return (await readLocal()).payments.filter(p=>p.date===date).sort((a,b)=>b.createdAt.localeCompare(a.createdAt));
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); return (await sql`SELECT * FROM payment_requests WHERE payment_date=${date} ORDER BY created_at DESC`).map(mapPayment);
}

export async function rejectPayment(id:string):Promise<PaymentRequest|null>{
  if(!useDb) return withLocalWrite(store=>{const p=store.payments.find(x=>x.id===id);if(!p||p.status==="VERIFIED")return p||null;p.status="REJECTED";return p;});
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); const rows=await sql`UPDATE payment_requests SET status='REJECTED' WHERE id=${id} AND status<>'VERIFIED' RETURNING *`; return rows[0]?mapPayment(rows[0]):null;
}

export async function confirmPayment(id:string):Promise<{payment:PaymentRequest;tokens:PatientToken[]}|null>{
  if(!useDb) return withLocalWrite(async store=>{const p=store.payments.find(x=>x.id===id);if(!p)return null;if(p.status==="VERIFIED")return {payment:p,tokens:store.tokens.filter(t=>p.tokenPublicIds.includes(t.publicId))};if(p.status!=="SUBMITTED")throw new Error("PAYMENT_NOT_SUBMITTED");const queue=store.queues[p.date]||defaultQueue(p.date);store.queues[p.date]=queue;if(!queue.bookingOpen)throw new Error("BOOKINGS_CLOSED");if(queue.nextTokenNumber+p.patientCount-1>store.config.maxTokens)throw new Error("QUEUE_FULL");const tokens:PatientToken[]=[];for(const name of p.patientNames)tokens.push(await createTokenLocal(store,{patientName:name,patientPhone:p.patientPhone,date:p.date,source:"ONLINE"}));p.status="VERIFIED";p.verifiedAt=nowIso();p.tokenPublicIds=tokens.map(t=>t.publicId);return {payment:p,tokens};});
  await ensureSchema(); const sql=neon(process.env.DATABASE_URL!); const locked=await sql`UPDATE payment_requests SET status='PROCESSING' WHERE id=${id} AND status='SUBMITTED' RETURNING *`;
  if(!locked[0]){const rows=await sql`SELECT * FROM payment_requests WHERE id=${id}`;if(!rows[0])return null;const existing=mapPayment(rows[0]);if(existing.status==="VERIFIED"){const tokens:PatientToken[]=[];for(const pid of existing.tokenPublicIds){const tr=await sql`SELECT * FROM tokens WHERE public_id=${pid}`;if(tr[0])tokens.push(mapToken(tr[0]));}return {payment:existing,tokens};}throw new Error("PAYMENT_NOT_SUBMITTED");}
  const p=mapPayment(locked[0]); try{const tokens=await createTokensBatch({patientNames:p.patientNames,patientPhone:p.patientPhone,date:p.date,source:"ONLINE"});const verifiedAt=nowIso();const rows=await sql`UPDATE payment_requests SET status='VERIFIED',verified_at=${verifiedAt},token_public_ids_json=${JSON.stringify(tokens.map(t=>t.publicId))} WHERE id=${id} RETURNING *`;return {payment:mapPayment(rows[0]),tokens};}catch(error){await sql`UPDATE payment_requests SET status='SUBMITTED' WHERE id=${id} AND status='PROCESSING'`;throw error;}
}

export async function getPublicToken(publicId:string){let token:PatientToken|undefined;if(!useDb){token=(await readLocal()).tokens.find(t=>t.publicId===publicId);}else{await ensureSchema();const sql=neon(process.env.DATABASE_URL!);const rows=await sql`SELECT * FROM tokens WHERE public_id=${publicId} LIMIT 1`;if(rows[0])token=mapToken(rows[0]);}if(!token)return null;const[config,tokens]=await Promise.all([getConfig(),listTokens(token.date)]);const activeAhead=tokens.filter(t=>t.tokenNumber<token!.tokenNumber&&(t.status==="WAITING"||t.status==="SERVING")).length;const serving=tokens.find(t=>t.status==="SERVING");return{publicId:token.publicId,patientName:token.patientName,date:token.date,tokenNumber:token.tokenNumber,status:token.status,currentTokenNumber:serving?.tokenNumber??null,peopleAhead:token.status==="WAITING"?activeAhead:0,estimatedWaitMinutes:token.status==="WAITING"?activeAhead*config.avgConsultationMinutes:0,clinicName:config.clinicName,doctorName:config.doctorName};}

export async function advanceQueue(date:string,currentOutcome:"COMPLETED"|"NO_SHOW"="COMPLETED"){const timestamp=nowIso();if(!useDb)return withLocalWrite(store=>{const tokens=store.tokens.filter(t=>t.date===date).sort((a,b)=>a.tokenNumber-b.tokenNumber);const current=tokens.find(t=>t.status==="SERVING");if(current){current.status=currentOutcome;current.completedAt=timestamp;}const next=tokens.find(t=>t.status==="WAITING");if(next){next.status="SERVING";next.calledAt=timestamp;}return next||null;});await ensureSchema();const sql=neon(process.env.DATABASE_URL!);const rows=await sql`WITH finished AS (UPDATE tokens SET status=${currentOutcome},completed_at=${timestamp} WHERE token_date=${date} AND status='SERVING' RETURNING id), next_row AS (SELECT id FROM tokens WHERE token_date=${date} AND status='WAITING' ORDER BY token_number LIMIT 1) UPDATE tokens SET status='SERVING',called_at=${timestamp} WHERE id=(SELECT id FROM next_row) RETURNING *`;return rows[0]?mapToken(rows[0]):null;}
export async function setBookingOpen(date:string,open:boolean){if(!useDb)return withLocalWrite(store=>{const q=store.queues[date]||defaultQueue(date);q.bookingOpen=open;store.queues[date]=q;return q;});await ensureSchema();const sql=neon(process.env.DATABASE_URL!);await sql`INSERT INTO queue_days(queue_date,booking_open,paused,next_token_number) VALUES (${date},${open},FALSE,1) ON CONFLICT(queue_date) DO UPDATE SET booking_open=${open}`;return ensureQueueDay(date);}
export async function setQueuePaused(date:string,paused:boolean){if(!useDb)return withLocalWrite(store=>{const q=store.queues[date]||defaultQueue(date);q.paused=paused;store.queues[date]=q;return q;});await ensureSchema();const sql=neon(process.env.DATABASE_URL!);await sql`INSERT INTO queue_days(queue_date,booking_open,paused,next_token_number) VALUES (${date},TRUE,${paused},1) ON CONFLICT(queue_date) DO UPDATE SET paused=${paused}`;return ensureQueueDay(date);}
