/**
 * Serveur de previsualisation, uniquement pour tester en local.
 * En production, public/ est un dossier statique : n'importe quel hebergeur suffit.
 *   node serve.js   ->   http://localhost:8787
 */
import { createServer } from "node:http";
import { createReadStream, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { networkInterfaces } from "node:os";

const ROOT = resolve("public");
const PORT = Number(process.env.PORT || 8787);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".woff2": "font/woff2", ".txt": "text/plain; charset=utf-8"
};

createServer((req, res) => {
  let pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
  if (pathname.endsWith("/")) pathname += "index.html";

  const target = resolve(join(ROOT, normalize(pathname)));
  if (target !== ROOT && !target.startsWith(ROOT + sep)) {
    res.writeHead(403).end("Interdit");
    return;
  }

  let info;
  try {
    info = statSync(target);
    if (info.isDirectory()) throw new Error("dossier");
  } catch {
    // Application a page unique : tout chemin inconnu retombe sur l'index.
    res.writeHead(302, { location: "/" }).end();
    return;
  }

  const ext = extname(target).toLowerCase();
  const volatile = ext === ".html" || ext === ".webmanifest" || pathname === "/sw.js";
  const headers = {
    "content-type": MIME[ext] || "application/octet-stream",
    "content-length": info.size,
    "cache-control": volatile ? "no-cache" : "public, max-age=3600"
  };
  if (pathname === "/sw.js") headers["service-worker-allowed"] = "/";

  res.writeHead(200, headers);
  createReadStream(target).pipe(res);
}).listen(PORT, () => {
  const lan = Object.values(networkInterfaces()).flat()
    .find((i) => i && i.family === "IPv4" && !i.internal)?.address;
  console.log(`Capsule Override — http://localhost:${PORT}`);
  if (lan) console.log(`  depuis le telephone (meme wifi) : http://${lan}:${PORT}`);
});
