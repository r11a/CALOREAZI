import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const source = await readFile(new URL("../app/offline-queue.ts", import.meta.url), "utf8");
const code = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText;
const queue = await import("data:text/javascript;base64," + Buffer.from(code).toString("base64"));

// Emulates request success followed by transaction commit/abort, which are distinct IDB events.
function memoryDatabase() {
  const stores = new Map([["meal-captures", new Map()], ["mutations", new Map()]]);
  let abortNext = false;
  const db = {
    close() {},
    transaction(name) {
      const tx = { error: null, objectStore() {
        const records = stores.get(name);
        return {
          getAll() { const request = {}; queueMicrotask(() => { request.result = structuredClone([...records.values()]); request.onsuccess?.(); }); return request; },
          put(value) {
            queueMicrotask(() => {
              if (abortNext) { abortNext = false; tx.error = new Error("quota exceeded"); tx.onabort?.(); return; }
              records.set(value.clientId || value.id, structuredClone(value)); tx.oncomplete?.();
            });
          },
          delete(key) { queueMicrotask(() => { records.delete(key); tx.oncomplete?.(); }); },
        };
      } };
      return tx;
    },
  };
  return { stores, abort() { abortNext = true; }, open() { const request = {}; queueMicrotask(() => { request.result = db; request.onsuccess?.(); }); return request; } };
}

test("offline ownership, durable review, retry and transaction failure", async (t) => {
  const previous = globalThis.indexedDB;
  const db = memoryDatabase();
  globalThis.indexedDB = db;
  try {
    await t.test("a different account cannot list or send another account's operations", async () => {
      queue.setOfflineUser("alice");
      await queue.queueOfflineMutation({ id: "a1", url: "/api/water", method: "POST", body: "{}", createdAt: "2026-01-01" });
      queue.setOfflineUser("bob");
      assert.equal((await queue.listOfflineQueue()).length, 0);
      assert.equal(await queue.flushOfflineMutations(() => { throw new Error("must not send"); }), 0);
      queue.setOfflineUser("alice");
      const sent = [];
      await queue.flushOfflineMutations(async record => sent.push(record.userId));
      assert.deepEqual(sent, ["alice"]);
    });
    await t.test("unowned legacy data is retained and never adopted", async () => {
      db.stores.get("mutations").set("legacy", { id: "legacy", createdAt: "2025-01-01" });
      assert.equal((await queue.listOfflineQueue()).length, 0);
      assert.equal(db.stores.get("mutations").has("legacy"), true);
    });
    await t.test("every analyzed photo stays available until explicitly acknowledged", async () => {
      for (const clientId of ["photo1", "photo2"]) await queue.queueOfflineCapture({ clientId, imageDataUrl: "data:image/jpeg;base64,x", createdAt: "2026-01-01" });
      assert.equal(await queue.flushOfflineCaptures(async record => ({ name: record.clientId, items: [{ name: "food" }] })), 2);
      assert.equal((await queue.listOfflineQueue()).filter(item => item.ready).length, 2);
      assert.equal(await queue.flushOfflineCaptures(async () => { throw new Error("must not reanalyze"); }), 0);
      await queue.discardOfflineItem({ id: "photo1", kind: "capture" });
      assert.equal((await queue.getOfflineCapture("photo2")).analysis.name, "photo2");
    });
    await t.test("pending analysis does not consume the failure retry allowance", async () => {
      await queue.queueOfflineCapture({ clientId: "pending", imageDataUrl: "x", createdAt: "2026-01-02" });
      for (let i = 0; i < 4; i++) await queue.flushOfflineCaptures(async () => ({ pendingJobId: "job1" }));
      const record = await queue.getOfflineCapture("pending");
      assert.equal(record.attempts, 0); assert.equal(record.analysisJobId, "job1"); assert.equal(record.analysis, undefined);
    });
    await t.test("a failed transaction never reports a successful local save", async () => {
      db.abort();
      await assert.rejects(queue.queueOfflineCapture({ clientId: "quota", imageDataUrl: "x", createdAt: "2026-01-02" }), /quota/);
      assert.equal(await queue.getOfflineCapture("quota"), undefined);
    });
    await t.test("changing accounts during a flush stops subsequent requests", async () => {
      for (const id of ["switch1", "switch2"]) await queue.queueOfflineMutation({ id, url: "/api/water", method: "POST", body: "{}", createdAt: "2026-01-01" });
      let calls = 0;
      await queue.flushOfflineMutations(async () => { calls++; queue.setOfflineUser("bob"); });
      assert.equal(calls, 1);
      queue.setOfflineUser("alice");
      assert.equal((await queue.listOfflineQueue()).filter(item => item.kind === "mutation").length, 1);
    });
  } finally { queue.setOfflineUser(""); if (previous === undefined) delete globalThis.indexedDB; else globalThis.indexedDB = previous; }
});
