export interface PatientHistory {
  diabetes: boolean;
  bp: boolean;
  previousPregnancy: boolean;
  abortions: number;
}

export interface PatientData {
  id?: string;
  name: string;
  age: number;
  month: number;
  patientPhone: string;
  husbandPhone: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  hospitalId: string;
  hospitalName: string;
  bandId: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  history: PatientHistory;
  expectedDelivery: string;
  lastBandData?: {
    heartRate: number;
    temperature: number;
    faintDetected: boolean;
    timestamp: string;
  };
}

export interface TriageResult {
  risk: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  whatsappReply: string;
  triggerAlert: boolean;
  alertMessage?: string;
}

export interface Alert {
  id?: string;
  patientId: string;
  patientName: string;
  risk: "LOW" | "MEDIUM" | "HIGH";
  summary: string;
  message: string;
  timestamp: string;
  handled: boolean;
}

export interface Message {
  id?: string;
  patientId: string;
  text: string;
  sender: "patient" | "system";
  timestamp: string;
}
