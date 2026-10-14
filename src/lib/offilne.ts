/**
 * offline.ts
 *
 * Lets the app work without a connection:
 *   1. Session cache — each workout's start data is saved on the phone the
 *      last time it loaded, so it can be opened offline.
 *   2. Completion queue — finished workouts are saved on the phone FIRST and
 *      then uploaded. They are only removed from the queue once the server
 *      accepts them, so nothing is lost if there is no signal.
 *
 * Call startOfflineSync() once from the root layout so queued workouts upload
 * when the app opens, comes back to the foreground, or every minute.
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import { AppState } from "react-native";
import { ApiRequestError, completeSession, type SessionStartData } from "./api";

// ─── Types ────────────────────────────────────────────────────────────────────

export type CompletePayload = Parameters<typeof completeSession>[0];

type QueueItem = {
  id: string;
  payload: CompletePayload;
  createdAt: number;
};

type FailedItem = QueueItem & { reason: string; failedAt: number };

export type FlushResult = {
  synced: number;
  pending: number;
  rejected: string[]; // server messages for workouts it refused
};

const QUEUE_KEY = "sp_offline_queue_v1";
const FAILED_KEY = "sp_offline_failed_v1";
const SESSION_CACHE_KEY = (instanceId: string, sessionNumber: number) =>
  `sp_session_start_v1_${instanceId}_${sessionNumber}`;

// ─── Session cache ────────────────────────────────────────────────────────────

export async function cacheSessionStart(
  instanceId: string,
  sessionNumber: number,
  data: SessionStartData,
) {
  try {
    await AsyncStorage.setItem(
      SESSION_CACHE_KEY(instanceId, sessionNumber),
      JSON.stringify(data),
    );
  } catch {
    // non-critical
  }
}

export async function getCachedSessionStart(
  instanceId: string,
  sessionNumber: number,
): Promise<SessionStartData | null> {
  try {
    const raw = await AsyncStorage.getItem(
      SESSION_CACHE_KEY(instanceId, sessionNumber),
    );
    return raw ? (JSON.parse(raw) as SessionStartData) : null;
  } catch {
    return null;
  }
}

// ─── Queue storage (serialised so reads/writes never interleave) ──────────────

let lock: Promise<unknown> = Promise.resolve();
function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = lock.then(fn, fn);
  lock = run.catch(() => {});
  return run;
}

async function readList<T>(key: string): Promise<T[]> {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

async function writeList<T>(key: string, list: T[]) {
  await AsyncStorage.setItem(key, JSON.stringify(list));
}

// ─── Queue API ────────────────────────────────────────────────────────────────

/** Save a finished workout on the phone. Always call this before uploading. */
export function enqueueCompletion(payload: CompletePayload) {
  return withLock(async () => {
    const queue = await readList<QueueItem>(QUEUE_KEY);
    queue.push({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
      payload,
      createdAt: Date.now(),
    });
    await writeList(QUEUE_KEY, queue);
  });
}

export async function getPendingCount(): Promise<number> {
  return (await readList<QueueItem>(QUEUE_KEY)).length;
}

/** Workouts the server refused (kept so they are never silently lost). */
export function getFailedCompletions() {
  return readList<FailedItem>(FAILED_KEY);
}

// The server answered and said no — retrying the same request won't help.
function isPermanentRejection(e: unknown): e is ApiRequestError {
  return (
    e instanceof ApiRequestError &&
    e.status >= 400 &&
    e.status < 500 &&
    e.status !== 401 && // token problem — keep, retry after sign-in
    e.status !== 408 &&
    e.status !== 429
  );
}

let flushing: Promise<FlushResult> | null = null;

/** Upload queued workouts, oldest first. Stops at the first network failure. */
export function flushQueue(): Promise<FlushResult> {
  if (!flushing) {
    flushing = doFlush().finally(() => {
      flushing = null;
    });
  }
  return flushing;
}

async function doFlush(): Promise<FlushResult> {
  let synced = 0;
  const rejected: string[] = [];

  for (;;) {
    const queue = await readList<QueueItem>(QUEUE_KEY);
    const item = queue[0];
    if (!item) break;

    try {
      await completeSession(item.payload);
      await withLock(async () => {
        const q = await readList<QueueItem>(QUEUE_KEY);
        await writeList(
          QUEUE_KEY,
          q.filter((x) => x.id !== item.id),
        );
      });
      synced++;
    } catch (e) {
      if (isPermanentRejection(e)) {
        await withLock(async () => {
          const q = await readList<QueueItem>(QUEUE_KEY);
          await writeList(
            QUEUE_KEY,
            q.filter((x) => x.id !== item.id),
          );
          const failed = await readList<FailedItem>(FAILED_KEY);
          failed.push({ ...item, reason: e.message, failedAt: Date.now() });
          await writeList(FAILED_KEY, failed);
        });
        rejected.push(e.message);
        continue;
      }
      break; // no signal / server down — keep it and try again later
    }
  }

  const pending = (await readList<QueueItem>(QUEUE_KEY)).length;
  return { synced, pending, rejected };
}

// ─── Background sync ──────────────────────────────────────────────────────────

/** Call once from the root layout. Returns a cleanup function. */
export function startOfflineSync() {
  const run = () => {
    flushQueue().catch(() => {});
  };
  run();
  const sub = AppState.addEventListener("change", (state) => {
    if (state === "active") run();
  });
  const timer = setInterval(run, 60_000);
  return () => {
    sub.remove();
    clearInterval(timer);
  };
}
