export type OfflineCapture = { clientId: string; imageDataUrl: string; createdAt: string; attempts?: number; lastError?: string; userId?: string; analysisJobId?: string; analysis?: Record<string, unknown> };
export type OfflineMutation = { id: string; url: string; method: string; body: string; createdAt: string; attempts: number; lastError?: string; userId?: string };
export type OfflineQueueItem = { id: string; kind: "capture" | "mutation"; label: string; createdAt: string; attempts: number; lastError?: string; ready?: boolean };
const DB = "caloreazi-offline"; const CAPTURES = "meal-captures"; const MUTATIONS = "mutations";
let activeUser = "";
export function setOfflineUser(userId: string) { activeUser = userId || ""; }
function owner() { if (!activeUser) throw new Error("יש להתחבר כדי לשמור במכשיר"); return activeUser; }
function database(): Promise<IDBDatabase> { return new Promise((resolve, reject) => { const request = indexedDB.open(DB, 2); request.onupgradeneeded = () => { const db = request.result; if (!db.objectStoreNames.contains(CAPTURES)) db.createObjectStore(CAPTURES, { keyPath: "clientId" }); if (!db.objectStoreNames.contains(MUTATIONS)) db.createObjectStore(MUTATIONS, { keyPath: "id" }); }; request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
async function write(store: string, value: unknown, key?: string) {
  const db = await database();
  try { await new Promise<void>((resolve, reject) => { const tx = db.transaction(store, "readwrite"); if (key !== undefined) tx.objectStore(store).delete(key); else tx.objectStore(store).put(value); tx.oncomplete = () => resolve(); tx.onerror = () => reject(tx.error); tx.onabort = () => reject(tx.error || new Error("השמירה במכשיר נכשלה")); }); } finally { db.close(); }
}
async function all<T extends { userId?: string }>(store: string, userId = activeUser): Promise<T[]> {
  if (!userId) return [];
  const db = await database();
  try { return await new Promise<T[]>((resolve, reject) => { const request = db.transaction(store).objectStore(store).getAll(); request.onsuccess = () => resolve(request.result.filter((item: T) => item.userId === userId)); request.onerror = () => reject(request.error); }); } finally { db.close(); }
}
// Legacy records without an owner remain stored, but are never assigned to another account.
function mutationLabel(url: string) { if (url.includes("/meals")) return "ארוחה"; if (url.includes("/water")) return "שתייה"; if (url.includes("/measurements")) return "מדידת משקל"; if (url.includes("/activity")) return "פעילות"; if (url.includes("/profile")) return "פרטים אישיים"; return "עדכון"; }
export async function queueOfflineCapture(capture: OfflineCapture) { await write(CAPTURES, { ...capture, userId: owner(), attempts: capture.attempts || 0 }); }
export async function queueOfflineMutation(mutation: Omit<OfflineMutation, "attempts">) { await write(MUTATIONS, { ...mutation, userId: owner(), attempts: 0 }); }
export async function offlineCaptureCount() { return (await all<OfflineCapture>(CAPTURES)).length; }
export async function offlineMutationCount() { return (await all<OfflineMutation>(MUTATIONS)).length; }
export async function offlinePendingCount() { return (await offlineCaptureCount()) + (await offlineMutationCount()); }
export async function listOfflineQueue(): Promise<OfflineQueueItem[]> {
  const userId = activeUser;
  const [captures, mutations] = await Promise.all([all<OfflineCapture>(CAPTURES, userId), all<OfflineMutation>(MUTATIONS, userId)]);
  return [...captures.map(item => ({ id: item.clientId, kind: "capture" as const, label: item.analysis ? "צילום מוכן לאישור" : "צילום ארוחה", createdAt: item.createdAt, attempts: item.attempts || 0, lastError: item.lastError, ready: Boolean(item.analysis) })), ...mutations.map(item => ({ id: item.id, kind: "mutation" as const, label: mutationLabel(item.url), createdAt: item.createdAt, attempts: item.attempts || 0, lastError: item.lastError }))].sort((a,b) => a.createdAt.localeCompare(b.createdAt));
}
export async function getOfflineCapture(id: string) { return (await all<OfflineCapture>(CAPTURES)).find(item => item.clientId === id); }
export async function discardOfflineItem(item: Pick<OfflineQueueItem, "id" | "kind">) {
  const store = item.kind === "capture" ? CAPTURES : MUTATIONS;
  const records = await all<OfflineCapture & OfflineMutation>(store);
  if (records.some(record => (item.kind === "capture" ? record.clientId : record.id) === item.id)) await write(store, null, item.id);
}
export async function retryOfflineItem(item: OfflineQueueItem) {
  const store = item.kind === "capture" ? CAPTURES : MUTATIONS;
  const record = (await all<OfflineCapture & OfflineMutation>(store)).find(entry => (item.kind === "capture" ? entry.clientId : entry.id) === item.id);
  if (record) await write(store, { ...record, analysisJobId: undefined, attempts: 0, lastError: undefined });
}
const flushing = new Set<string>();
async function flush<T extends { userId?: string; attempts?: number }>(store: string, send: (record: T) => Promise<unknown>) {
  const userId = activeUser; const key = store + ":" + userId;
  if (!userId || flushing.has(key)) return 0;
  const run = async () => {
    flushing.add(key); let sent = 0;
    try {
      const records = (await all<T & OfflineCapture & OfflineMutation>(store, userId)).sort((a,b) => a.createdAt.localeCompare(b.createdAt));
      for (const record of records) {
        if (activeUser !== userId) break;
        if (record.analysis || (record.attempts || 0) >= 3) continue;
        try {
          const result = await send(record);
          if (store === CAPTURES) {
            if (!result) throw new Error("הצילום עדיין ממתין לניתוח");
            if ((result as Record<string, unknown>).pendingJobId) { await write(store, { ...record, analysisJobId: (result as Record<string, unknown>).pendingJobId }); continue; }
            await write(store, { ...record, analysis: result, attempts: 0, lastError: undefined });
          } else await write(store, null, record.id);
          sent++;
        } catch (error) {
          await write(store, { ...record, attempts: (record.attempts || 0) + 1, lastError: error instanceof Error ? error.message : "sync failed" });
          break;
        }
      }
      return sent;
    } finally { flushing.delete(key); }
  };
  return typeof navigator !== "undefined" && navigator.locks ? navigator.locks.request("caloreazi:" + key, run) : run();
}
export async function flushOfflineCaptures(send: (capture: OfflineCapture) => Promise<Record<string, unknown>>) { return flush(CAPTURES, send); }
export async function flushOfflineMutations(send: (mutation: OfflineMutation) => Promise<void>) { return flush(MUTATIONS, send); }
