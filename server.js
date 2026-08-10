const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const port = Number(process.env.PORT || 5174);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ply": "application/octet-stream",
  ".splat": "application/octet-stream",
  ".ksplat": "application/octet-stream",
  ".wasm": "application/wasm"
};

const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(req.url.split("?")[0]);
  const safePath = path.normalize(requested === "/" ? "/index.html" : requested).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(root, safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404);
      res.end("Not found");
      return;
    }

    res.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`PinchGS running at http://localhost:${port}`);
});
