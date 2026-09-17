import type { ClinicConfig } from "./types";

export function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ");
  return cleaned.length >= 2 && cleaned.length <= 80 ? cleaned : null;
}

export function cleanPhone(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.replace(/[\s()-]/g, "");
  return /^\+?\d{7,15}$/.test(cleaned) ? cleaned : null;
}

export function cleanUpiId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase();
  return /^[a-z0-9._-]{2,}@[a-z0-9.-]{2,}$/.test(cleaned) ? cleaned : null;
}

export function cleanUtr(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, "");
  return /^[A-Za-z0-9-]{6,40}$/.test(cleaned) ? cleaned : null;
}

function validTime(value: string) { return /^([01]\d|2[0-3]):[0-5]\d$/.test(value); }
function toMinutes(value: string) { const [h, m] = value.split(":").map(Number); return h * 60 + m; }

export function parseConfig(value: any): ClinicConfig | null {
  const clinicName = cleanName(value?.clinicName);
  const doctorName = cleanName(value?.doctorName);
  const specialization = cleanName(value?.specialization);
  const startTime = typeof value?.startTime === "string" ? value.startTime : "";
  const endTime = typeof value?.endTime === "string" ? value.endTime : "";
  const avgConsultationMinutes = Number(value?.avgConsultationMinutes);
  const maxTokens = Number(value?.maxTokens);
  const upiId = cleanUpiId(value?.upiId);
  const tokenPriceRupees = Number(value?.tokenPriceRupees);
  if (!clinicName || !doctorName || !specialization || !upiId) return null;
  if (!validTime(startTime) || !validTime(endTime) || toMinutes(startTime) >= toMinutes(endTime)) return null;
  if (!Number.isInteger(avgConsultationMinutes) || avgConsultationMinutes < 1 || avgConsultationMinutes > 60) return null;
  if (!Number.isInteger(maxTokens) || maxTokens < 1 || maxTokens > 200) return null;
  if (!Number.isInteger(tokenPriceRupees) || tokenPriceRupees < 1 || tokenPriceRupees > 100000) return null;
  return { clinicName, doctorName, specialization, startTime, endTime, avgConsultationMinutes, maxTokens, upiId, tokenPriceRupees };
}
