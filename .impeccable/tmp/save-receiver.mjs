import http from "node:http";
import fs from "node:fs";
import path from "node:path";
const dir = "C:/Users/valen/Desktop/control-gastos/apps/web/public";
const allowed = new Set(["icon-512.png","icon-192.png","icon-maskable-512.png","apple-touch-icon.png","favicon-32.png","badge-96.png"]);
http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  if (req.method === "OPTIONS") return res.writeHead(204).end();
  const name = new URL(req.url, "http://x").searchParams.get("name");
  if (!allowed.has(name)) return res.writeHead(400).end("bad name");
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    const buf = Buffer.from(Buffer.concat(chunks).toString(), "base64");
    fs.writeFileSync(path.join(dir, name), buf);
    res.writeHead(200).end(String(buf.length));
  });
}).listen(4001, () => console.log("receiver on 4001"));
