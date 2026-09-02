import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");
const expansion = readFileSync(new URL("../app/expansion.css", import.meta.url), "utf8");

test("mobile camera opens the rear camera and keeps gallery fallback", () => {
  assert.match(page, /accept="image\/\*" capture="environment"/);
  assert.match(page, /accept="image\/jpeg,image\/png,image\/webp"/);
});

test("live barcode scanning is local, automatic and releases the camera", () => {
  assert.match(page, /decodeFromConstraints/);
  assert.match(page, /facingMode: \{ ideal: "environment" \}/);
  assert.match(page, /getTracks\(\)\.forEach\(\(track\) => track\.stop\(\)\)/);
  assert.match(page, /המצלמה מנתחת וידאו מקומית בלבד/);
});

test("voice offers speech recognition and media-recorder fallback", () => {
  assert.match(page, /webkitSpeechRecognition/);
  assert.match(page, /navigator\.mediaDevices\.getUserMedia\(\{ audio: true \}\)/);
  assert.match(page, /MediaRecorder/);
});

test("PWA uses safe-area viewport and persistent mobile navigation", () => {
  assert.match(layout, /viewportFit: "cover"/);
  assert.match(layout, /maximumScale: 1/);
  assert.match(layout, /userScalable: false/);
  assert.match(page, /className="bottom-nav"/);
  assert.match(expansion, /env\(safe-area-inset-bottom\)/);
});

test("mobile PWA stays at device width and scrolls vertically only", () => {
  const styles = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
  assert.match(styles, /Mobile PWA is a fixed-width application surface/);
  assert.match(styles, /overflow-x:clip!important/);
  assert.match(styles, /touch-action:pan-y!important/);
  assert.match(page, /inline: "nearest"/);
});
