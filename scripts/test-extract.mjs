import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const LAWS_TS = join(ROOT, "lib", "laws.ts");
const ts = readFileSync(LAWS_TS, "utf-8");
const laws = [];
const seen = new Set();
const re = /\{\s*id:\s*"([^"]+)",\s*name:\s*"([^"]+)"(?:[^}]*?egov_id:\s*"([^"]+)")?[^}]*\}/g;
for (const m of ts.matchAll(re)) {
  if (!seen.has(m[1])) {
    seen.add(m[1]);
    laws.push({ id: m[1], name: m[2], egov_id: m[3] });
  }
}
console.log("Total:", laws.length);
console.log("minpo:", JSON.stringify(laws.filter(l => l.id.startsWith("minpo")).slice(0,3)));
console.log("with egov:", laws.filter(l => l.egov_id).length);
