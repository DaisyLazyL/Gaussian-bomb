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

const defaultRoom = "default";
const maxSceneSize = 260 * 1024 * 1024;
const rooms = new Map([[defaultRoom, { scores: [], scene: null }]]);

const server = http.createServer((req, res) => {
  const requested = decodeURIComponent(req.url.split("?")[0]);

  if (requested === "/api/scores") {
    handleScores(req, res, new URL(req.url, `http://${req.headers.host}`).searchParams.get("room") || defaultRoom);
    return;
  }

  if (requested === "/api/rooms" && req.method === "POST") {
    const roomId = createRoomId();
    rooms.set(roomId, { scores: [], scene: null });
    sendJson(res, { roomId });
    return;
  }

  const sceneMatch = requested.match(/^\/api\/rooms\/([a-z0-9-]+)\/scene$/);
  if (sceneMatch) {
    handleRoomScene(req, res, sceneMatch[1]);
    return;
  }

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
      "Cache-Control": "no-store",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    });
    res.end(data);
  });
});

function handleScores(req, res, roomId) {
  const room = getRoom(roomId);
  if (req.method === "GET") {
    sendJson(res, { scores: topScores(room) });
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  let body = "";
  req.on("data", chunk => {
    body += chunk;
    if (body.length > 12000) req.destroy();
  });

  req.on("end", () => {
    try {
      const payload = JSON.parse(body || "{}");
      const entry = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        name: sanitizeName(payload.name),
        score: clampNumber(payload.score, 0, 999999),
        coverage: clampNumber(payload.coverage, 0, 999999),
        variety: clampNumber(payload.variety, 0, 999999),
        rhythm: clampNumber(payload.rhythm, 0, 999999),
        submittedAt: new Date().toISOString()
      };
      const existingIndex = room.scores.findIndex(score => score.name.toLowerCase() === entry.name.toLowerCase());
      if (existingIndex >= 0) {
        if (entry.score > room.scores[existingIndex].score) room.scores[existingIndex] = entry;
      } else {
        room.scores.push(entry);
      }
      room.scores.sort((a, b) => b.score - a.score);
      room.scores.splice(50);
      sendJson(res, { scores: topScores(room), entry });
    } catch (error) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid score payload" }));
    }
  });
}

function handleRoomScene(req, res, roomId) {
  const room = getRoom(roomId);

  if (req.method === "GET") {
    if (!room.scene) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "No scene uploaded" }));
      return;
    }
    res.writeHead(200, {
      "Content-Type": "application/octet-stream",
      "X-Scene-Name": encodeURIComponent(room.scene.name),
      "Cache-Control": "no-store"
    });
    res.end(room.scene.buffer);
    return;
  }

  if (req.method !== "POST") {
    res.writeHead(405, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Method not allowed" }));
    return;
  }

  const chunks = [];
  let size = 0;
  req.on("data", chunk => {
    size += chunk.length;
    if (size > maxSceneSize) req.destroy();
    chunks.push(chunk);
  });
  req.on("end", () => {
    room.scene = {
      name: decodeURIComponent(req.headers["x-scene-name"] || "scene.ply"),
      buffer: Buffer.concat(chunks)
    };
    room.scores = [];
    sendJson(res, { ok: true, roomId, name: room.scene.name, size: room.scene.buffer.length });
  });
}

function getRoom(roomId) {
  if (!rooms.has(roomId)) rooms.set(roomId, { scores: [], scene: null });
  return rooms.get(roomId);
}

function createRoomId() {
  return Math.random().toString(36).slice(2, 8);
}

function topScores(room) {
  return room.scores.slice(0, 10);
}

function sendJson(res, payload) {
  res.writeHead(200, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store"
  });
  res.end(JSON.stringify(payload));
}

function sanitizeName(value) {
  const name = String(value || "Anonymous").trim().replace(/[<>]/g, "").slice(0, 18);
  return name || "Anonymous";
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

server.listen(port, () => {
  console.log(`PinchGS running at http://localhost:${port}`);
});
