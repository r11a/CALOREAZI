import assert from "node:assert/strict";
import test from "node:test";
import { buildNotificationCopy, notificationTestContexts } from "../server/notification-copy.js";

test("notification copy is personal, concise and does not use the application name as a title", () => {
  for (const [type, context] of Object.entries(notificationTestContexts)) {
    const message = buildNotificationCopy(type, "רונן ישראלי", context, "2026-08-23");
    assert.match(message.body, /רונן/);
    assert.doesNotMatch(message.title, /CALOREAZI/i);
    assert.ok(message.title.length <= 24);
    assert.ok(message.body.length <= 130);
  }
});

test("notification wording rotates between days", () => {
  const first = buildNotificationCopy("morning-brief", "רונן", notificationTestContexts["morning-brief"], "2026-08-23");
  const second = buildNotificationCopy("morning-brief", "רונן", notificationTestContexts["morning-brief"], "2026-08-24");
  assert.notEqual(first.body, second.body);
});
