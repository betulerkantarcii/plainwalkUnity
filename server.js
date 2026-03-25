const http = require("http");
const { WebSocketServer, OPEN } = require("ws");

// Unity Port
let PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
  if (req.url === "/") {
    res.writeHead(200, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`🚀 Backend Aktif: Port ${PORT} üzerinden akışa hazır!`);
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocketServer({
  server,
  perMessageDeflate: false,
});

wss.on("connection", (ws) => {
  ws.on("message", (data, isBinary) => {
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === OPEN) {
        client.send(data, { binary: isBinary });
      }
    });
  });
  ws.on("error", console.error);
});

// --- PORT ÇAKIŞMA ÇÖZÜCÜ ---
function startServer(targetPort) {
  server.listen(targetPort, "0.0.0.0", () => {
    PORT = targetPort;
    console.log(`\n✅ Sunucu BAŞARIYLA başlatıldı!`);
    console.log(`🌍 HTTP: http://localhost:${PORT}`);
    console.log(`🔌 WebSocket: ws://localhost:${PORT}\n`);
  });

  server.on("error", (e) => {
    if (e.code === "EADDRINUSE") {
      console.log(
        `⚠️  Port ${targetPort} dolu, ${targetPort + 1} deneniyor...`,
      );
      setTimeout(() => {
        startServer(targetPort + 1);
      }, 100);
    } else {
      console.error("❌ Beklenmedik Sunucu Hatası:", e);
    }
  });
}

startServer(PORT);
