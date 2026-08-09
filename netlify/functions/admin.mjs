import { createHmac, timingSafeEqual } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const cookieName = "wikiverse_admin";
const loginHtml = "<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Yonetici girisi | WikiVerse</title><style>body{margin:0;background:#f5f6f8;color:#15202b;font:16px Arial,sans-serif;display:grid;min-height:100vh;place-items:center}.card{width:min(400px,calc(100% - 42px));background:#fff;border:1px solid #e4e8ed;border-radius:18px;padding:30px;box-shadow:0 14px 34px #15202b12}p{color:#687380;line-height:1.6}label{display:grid;gap:7px;font-size:13px;font-weight:700;margin:15px 0}input{padding:11px;border:1px solid #d8dce2;border-radius:9px;font:inherit}button{width:100%;border:0;border-radius:9px;padding:12px;background:#5a4df1;color:white;font-weight:700;font:inherit}.brand{color:#5a4df1;font-weight:800;font-size:20px}</style><main class="card"><div class="brand">WikiVerse</div><h1>Yonetici girisi</h1><p>Bu alan yalnizca yetkili kullanicilar icindir.</p><form method="post" action="/.netlify/functions/admin"><label>Kullanici adi<input required name="username" autocomplete="username"></label><label>Sifre<input required type="password" name="password" autocomplete="current-password"></label><button>Giris yap</button></form></main></html>";
function sign(value) { return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(value).digest("base64url"); }
function authenticated(event) {
  if (!process.env.ADMIN_SESSION_SECRET) return false;
  const token = event.headers.cookie?.match(/(?:^|;\s*)wikiverse_admin=([^;]+)/)?.[1];
  if (!token) return false;
  const [value, received] = token.split(".");
  const expected = sign(value || "");
  return value === "admin" && !!received && received.length === expected.length && timingSafeEqual(Buffer.from(received), Buffer.from(expected));
}
export async function handler(event) {
  const headers = { "Cache-Control": "no-store" };
  if (event.queryStringParameters?.action === "logout") return { statusCode: 303, headers: { ...headers, Location: "/", "Set-Cookie": cookieName + "=; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=0" }, body: "" };
  if (event.httpMethod === "POST") {
    const form = new URLSearchParams(event.body || "");
    if (form.get("username") !== process.env.ADMIN_USERNAME || form.get("password") !== process.env.ADMIN_PASSWORD || !process.env.ADMIN_SESSION_SECRET) return { statusCode: 401, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" }, body: loginHtml };
    const token = "admin." + sign("admin");
    return { statusCode: 303, headers: { ...headers, Location: "/admin.html", "Set-Cookie": cookieName + "=" + token + "; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=28800" }, body: "" };
  }
  if (!authenticated(event)) return { statusCode: 401, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" }, body: loginHtml };
  const page = await readFile(join(process.cwd(), "admin.html"), "utf8");
  return { statusCode: 200, headers: { ...headers, "Content-Type": "text/html; charset=utf-8" }, body: page };
}
