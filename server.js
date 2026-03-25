const http = require("http");
const { WebSocketServer, OPEN } = require("ws");

let PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end(
      JSON.stringify({
        status: "ok",
        message: "Unity control backend is running",
        port: PORT,
      }),
    );
    return;
  }

  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
});

const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
});

const clients = new Map(); // ws -> { role, roomId }

function sendJson(ws, obj) {
  if (ws.readyState === OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

function broadcastToRole(roomId, role, payload, exceptWs = null) {
  for (const client of wss.clients) {
    if (client === exceptWs) continue;
    if (client.readyState !== OPEN) continue;

    const meta = clients.get(client);
    if (!meta) continue;
    if (meta.roomId !== roomId) continue;
    if (meta.role !== role) continue;

    sendJson(client, payload);
  }
}

wss.on("connection", (ws, req) => {
  console.log("Yeni bağlantı:", req.socket.remoteAddress);

  clients.set(ws, {
    role: null,
    roomId: "default",
  });

  sendJson(ws, {
    type: "welcome",
    message: "Connected to WebSocket server",
  });

  ws.on("message", (raw) => {
    try {
      const msg = JSON.parse(raw.toString());
      const meta = clients.get(ws) || { role: null, roomId: "default" };

      if (msg.type === "register") {
        const role = msg.role === "unity" ? "unity" : "controller";
        const roomId =
          typeof msg.roomId === "string" && msg.roomId.trim()
            ? msg.roomId.trim()
            : "default";

        clients.set(ws, { role, roomId });

        console.log(`Client registered -> role=${role}, room=${roomId}`);

        sendJson(ws, {
          type: "registered",
          role,
          roomId,
        });

        return;
      }

      if (msg.type === "move") {
        if (meta.role !== "controller") return;

        const payload = {
          type: "move",
          roomId: meta.roomId,
          x: Number(msg.x) || 0,
          y: Number(msg.y) || 0,
          z: Number(msg.z) || 0,
          rotationY: Number(msg.rotationY) || 0,
          timestamp: Date.now(),
        };

        broadcastToRole(meta.roomId, "unity", payload, ws);
        return;
      }

      if (msg.type === "ping") {
        sendJson(ws, { type: "pong", timestamp: Date.now() });
        return;
      }
    } catch (err) {
      console.error("Mesaj işlenemedi:", err.message);
      sendJson(ws, {
        type: "error",
        message: "Invalid JSON message",
      });
    }
  });

  ws.on("close", () => {
    const meta = clients.get(ws);
    console.log("Bağlantı kapandı:", meta);
    clients.delete(ws);
  });

  ws.on("error", (err) => {
    console.error("WebSocket error:", err.message);
  });
});

function startServer(targetPort) {
  server.listen(targetPort, "0.0.0.0", () => {
    PORT = targetPort;
    console.log(`HTTP  : http://0.0.0.0:${PORT}`);
    console.log(`WS    : ws://0.0.0.0:${PORT}`);
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(`Port ${targetPort} dolu, ${targetPort + 1} deneniyor...`);
      setTimeout(() => startServer(targetPort + 1), 100);
    } else {
      console.error("Sunucu hatası:", e);
    }
  });
}

startServer(PORT);