import { cp, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });

for (const file of ["index.html", "article.html", "admin.html", "style.css", "app.js", "data.json"]) {
  await cp(file, join("dist", "assets", file));
}
