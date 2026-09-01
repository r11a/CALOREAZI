import test from "node:test";
import assert from "node:assert/strict";
import { cachedImage, categoryArtwork, normalizeFoodImageName, rememberImage } from "../server/food-image-resolver.js";

test("normalizes Hebrew food names and selects a useful local fallback", () => {
  assert.equal(normalizeFoodImageName('סלט (עגבניות-מלפפון)'), "סלט עגבניות מלפפון");
  assert.equal(categoryArtwork(["סלט עגבניות ומלפפון"]), "category-vegetables-v1.png");
  assert.equal(categoryArtwork(["שזיף אדום"]), "category-fruits-v1.png");
  assert.equal(categoryArtwork(["קפה עם חלב"]), "category-drinks-v1.png");
});

test("reuses and bounds the persistent image cache", () => {
  const state = { systemSettings: {} };
  rememberImage(state, ["יוגורט טבעי"], { image: "https://example.test/yogurt.webp", source: "open_food_facts" });
  assert.equal(cachedImage(state, ["יוגורט טבעי"]).image, "https://example.test/yogurt.webp");
  for (let index = 0; index < 510; index += 1) rememberImage(state, [`מוצר ${index}`], { image: `https://example.test/${index}.webp`, source: "test" });
  assert.equal(Object.keys(state.systemSettings.foodImageCache).length, 500);
});
