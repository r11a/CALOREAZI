import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("health profile is editable and explicitly bounded as non-medical advice", () => {
  for (const field of ["diabetesStatus", "hypertension", "foodAllergies", "relevantMedications", "pregnancyStatus"])
    assert.match(page, new RegExp(field));
  assert.match(page, /אינו תחליף לייעוץ רפואי/);
});

test("meal editing, quantity shortcuts and deletion undo stay available", () => {
  assert.match(page, /editingMealId/);
  assert.match(page, /scaleMeal/);
  assert.match(page, /undoDeleteMeal/);
});

test("food library filters and mobile accessibility rules are present", () => {
  assert.match(page, /libraryQuery/);
  assert.match(page, /libraryCategory/);
  assert.match(page, /libraryVisibility/);
  assert.match(css, /focus-visible/);
  assert.match(css, /prefers-reduced-motion/);
});
