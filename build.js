import { cp, mkdir, rm } from "node:fs/promises";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/server", { recursive: true });
await mkdir("dist/assets", { recursive: true });
for (const file of ["index.html", "article.html", "admin.html", "style.css", "app.js", "data.json"]) {
  await cp(file, `dist/assets/${file}`);
}
await cp("server.js", "dist/server/index.js");
