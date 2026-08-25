import test from "node:test";
import assert from "node:assert/strict";
import { applyExplicitCalorieFacts, explicitCalorieFacts } from "../server/explicit-nutrition.js";

test("extracts exact per-unit calories from a user's explicit statement", () => {
  const facts = explicitCalorieFacts("5 פריכיות של 24 קלוריות, ומעדן פרו 108 קלוריות");
  assert.deepEqual(facts.map(({ quantity, kcalPerUnit }) => ({ quantity, kcalPerUnit })), [
    { quantity: 5, kcalPerUnit: 24 },
    { quantity: 1, kcalPerUnit: 108 },
  ]);
});

test("explicit user calories override estimates unless verification was requested", () => {
  const items = [{ name: "פריכיות", grams: 8, quantity: 4, kcalPer100: 380 }];
  const exact = applyExplicitCalorieFacts("5 פריכיות של 24 קלוריות", items);
  assert.equal(exact.items[0].quantity, 5);
  assert.equal(exact.items[0].kcalPerUnit, 24);
  assert.equal(exact.enforced, true);
  const verify = applyExplicitCalorieFacts("5 פריכיות של 24 קלוריות, תבדוק", items);
  assert.equal(verify.items[0].kcalPerUnit, undefined);
  assert.equal(verify.enforced, false);
});

test("spoken Hebrew quantity words remain exact", () => {
  const facts = explicitCalorieFacts("שתי פריכיות שכל אחת 24 קלוריות");
  assert.equal(facts[0].quantity, 2);
  assert.equal(facts[0].kcalPerUnit, 24);
});
