import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const version = JSON.parse(await readFile(new URL("package.json", root), "utf8")).version;
const targets = [
  ["config.yaml", /version: "[^"]+"/, `version: "${version}"`],
  ["Dockerfile", /io\.hass\.version="[^"]+"/, `io.hass.version="${version}"`],
  ["app/health/route.ts", /version: "[^"]+"/, `version: "${version}"`],
  ["app/api/admin/health/route.ts", /CALOREAZI_VERSION \|\| "[^"]+"/, `CALOREAZI_VERSION || "${version}"`],
  ["README.md", /^# CALOREAZI .+$/m, `# CALOREAZI ${version}`],
  ["public/sw.js", /caloreazi-shell-v[^";]+/, `caloreazi-shell-v${version}`],
];
for (const [file, pattern, replacement] of targets) {
  const url = new URL(file, root); const current = await readFile(url, "utf8"); const next = current.replace(pattern, replacement);
  if (next === current && !current.includes(replacement)) throw new Error(`Version marker not found in ${file}`);
  if (process.argv.includes("--check")) { if (!current.includes(replacement)) throw new Error(`${file} is not synchronized to ${version}`); }
  else if (next !== current) await writeFile(url, next);
}
console.log(`CALOREAZI version ${version} is synchronized`);
