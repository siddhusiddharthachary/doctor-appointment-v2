export type TokenStatus = "WAITING" | "SERVING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type TokenSource = "ONLINE" | "WALK_IN";
export type PaymentStatus = "PENDING" | "SUBMITTED" | "PROCESSING" | "VERIFIED" | "REJECTED";

export type ClinicConfig = {
  clinicName: string;
  doctorName: string;
  specialization: string;
  startTime: string;
  endTime: string;
  avgConsultationMinutes: number;
  maxTokens: number;
  upiId: string;
  tokenPriceRupees: number;
};

export type QueueDay = { date: string; bookingOpen: boolean; paused: boolean; nextTokenNumber: number; };
export type PatientToken = {
  id: string; publicId: string; patientName: string; patientPhone: string; date: string;
  tokenNumber: number; source: TokenSource; status: TokenStatus;
  createdAt: string; calledAt: string | null; completedAt: string | null;
};
export type PaymentRequest = {
  id: string; publicId: string; date: string; patientNames: string[]; patientPhone: string;
  patientCount: number; unitPriceRupees: number; totalAmountRupees: number; upiId: string;
  status: PaymentStatus; utr: string | null; tokenPublicIds: string[];
  createdAt: string; submittedAt: string | null; verifiedAt: string | null;
};
export type LocalStore = { config: ClinicConfig; queues: Record<string, QueueDay>; tokens: PatientToken[]; payments: PaymentRequest[]; };
export type QueueSummary = {
  date: string; bookingOpen: boolean; paused: boolean; currentTokenNumber: number | null;
  waitingCount: number; nextTokenNumber: number; estimatedWaitMinutes: number; config: ClinicConfig;
};
