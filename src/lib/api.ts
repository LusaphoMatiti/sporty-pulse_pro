import * as SecureStore from "expo-secure-store";
import type { SessionScreenProps } from "../types/session";

// ─── Config ───────────────────────────────────────────────────────────────────

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL!;

// ─── Session token helpers ────────────────────────────────────────────────────

const SESSION_KEY = "sp_session_token";

export async function storeSessionToken(token: string) {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function getSessionToken(): Promise<string | null> {
  return SecureStore.getItemAsync(SESSION_KEY);
}

export async function clearSessionToken() {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

// ─── Core fetch wrapper ───────────────────────────────────────────────────────

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: Record<string, unknown>;
  headers?: Record<string, string>;
}

async function request<T = unknown>(
  path: string,
  { method = "GET", body, headers = {} }: RequestOptions = {},
): Promise<T | null> {
  const token = await getSessionToken();

  console.log("=== API REQUEST ===");
  console.log("URL:", `${API_BASE_URL}${path}`);
  console.log("Token:", token ? `${token.slice(0, 20)}...` : "NO TOKEN");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  console.log("=== API RESPONSE ===");
  console.log("Status:", response.status);
  const responseText = await response.text();
  console.log("Body:", responseText.slice(0, 300));

  if (!response.ok) {
    throw new Error(
      `API ${method} ${path} → ${response.status}: ${responseText}`,
    );
  }

  return responseText ? JSON.parse(responseText) : null;
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const api = {
  get: <T>(path: string) => request<T>(path, { method: "GET" }),
  post: <T>(path: string, body: Record<string, unknown>) =>
    request<T>(path, { method: "POST", body }),
  put: <T>(path: string, body: Record<string, unknown>) =>
    request<T>(path, { method: "PUT", body }),
  patch: <T>(path: string, body: Record<string, unknown>) =>
    request<T>(path, { method: "PATCH", body }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

// ─── Typed endpoint helpers ───────────────────────────────────────────────────

import type { SessionDraft } from "../types/session";

/** Save or clear a session draft */
export function saveDraft(instanceId: string, draft: SessionDraft | null) {
  return api.post(`/api/session/draft`, { instanceId, draft });
}

export function getEquipment() {
  return api.get<{
    equipment: { id: string; name: string; category: string }[];
  }>("/api/equipment");
}

export type SessionStartData = SessionScreenProps;

/** Complete a session */
export function completeSession(payload: {
  instanceId: string;
  sessionNumber: number;
  durationSeconds: number;
  completed: boolean;
  logs: {
    plannedExerciseId: string;
    actualSets: number;
    actualReps: number;
    weightKg?: number;
  }[];
}) {
  const { instanceId, ...rest } = payload;
  return api.post(`/api/training/session/${instanceId}/complete`, rest);
}

export function getSessionStart(
  instanceId: string,
  sessionNumber: number,
): Promise<{ success: boolean; data: SessionStartData } | null> {
  return api.get(
    `/api/training/session/${instanceId}/start?sessionNumber=${sessionNumber}`,
  );
}

/** Get user profile */
export function getUserProfile() {
  return api.get("/api/user/profile");
}

export function checkPurchasedEquipment() {
  return api.get<{
    purchasedEquipment: { id: string; name: string }[];
    showModal: boolean;
  }>("/api/onboarding/check-purchases");
}

/** Activate a program — calls /api/programs/activate via resolveProgram */
export function activateProgram(
  planId: string,
  level: "BEGINNER" | "INTERMEDIATE" | "ADVANCED",
) {
  return api.post("/api/programs/activate", { planId, level });
}

export function logRecovery(payload: {
  sleepHours?: number;
  sleepQuality: number; // 1–5
  muscleSoreness: number; // 1–5
  stressLevel: number; // 1–5
}) {
  return api.post<{ recoveryPct: number }>("/api/recovery/log", payload);
}

export interface RecoveryLog {
  sleepHours?: number;
  sleepQuality: number; // 1–5
  muscleSoreness: number; // 1–5
  stressLevel: number; // 1–5
}
