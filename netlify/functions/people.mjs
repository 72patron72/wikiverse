import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getStore } from "@netlify/blobs";

const cookieName = "wikiverse_admin";
const store = getStore("wikiverse-catalogue");

function sign(value) {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(value).digest("base64url");
}

function isAuthenticated(event) {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const token = event.headers.cookie?.match(/(?:^|;\s*)wikiverse_admin=([^;]+)/)?.[1];
  if (!token) return false;
  const [value, received] = token.split(".");
  const expected = sign(value || "");
  return value === "admin" && !!received && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}

async function seedPeople() {
  return JSON.parse(await readFile(join(process.cwd(), "data.json"), "utf8"));
}

async function currentPeople() {
  return await store.get("people", { type: "json", consistency: "strong" }) || seedPeople();
}

function json(statusCode, body) {
  return { statusCode, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }, body: JSON.stringify(body) };
}

export async function handler(event) {
  if (event.httpMethod === "GET") return json(200, await currentPeople());
  if (!isAuthenticated(event)) return json(401, { error: "Yetkisiz istek." });
  if (event.httpMethod === "DELETE") {
    await store.delete("people");
    return json(200, await seedPeople());
  }
  if (event.httpMethod === "PUT") {
    const people = JSON.parse(event.body || "[]");
    if (!Array.isArray(people) || people.some(person => !person?.id || !person?.name)) return json(400, { error: "GeÃ§ersiz kiÅŸi verisi." });
    await store.setJSON("people", people);
    return json(200, people);
  }
  return json(405, { error: "YÃ¶nteme izin verilmiyor." });
}

