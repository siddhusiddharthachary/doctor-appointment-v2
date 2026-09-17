export type TokenStatus = "WAITING" | "SERVING" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
export type TokenSource = "ONLINE" | "WALK_IN";

export type ClinicConfig = {
  clinicName: string;
  doctorName: string;
  specialization: string;
  startTime: string;
  endTime: string;
  avgConsultationMinutes: number;
  maxTokens: number;
};

export type QueueDay = {
  date: string;
  bookingOpen: boolean;
  paused: boolean;
  nextTokenNumber: number;
};

export type PatientToken = {
  id: string;
  publicId: string;
  patientName: string;
  patientPhone: string;
  date: string;
  tokenNumber: number;
  source: TokenSource;
  status: TokenStatus;
  createdAt: string;
  calledAt: string | null;
  completedAt: string | null;
};

export type LocalStore = {
  config: ClinicConfig;
  queues: Record<string, QueueDay>;
  tokens: PatientToken[];
};

export type QueueSummary = {
  date: string;
  bookingOpen: boolean;
  paused: boolean;
  currentTokenNumber: number | null;
  waitingCount: number;
  nextTokenNumber: number;
  estimatedWaitMinutes: number;
  config: ClinicConfig;
};
