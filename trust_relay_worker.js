// ═══════════════════════════════════════════════════════════════
// TRUST WebSocket Relay — Cloudflare Worker
// Deploys free at workers.cloudflare.com (100,000 req/day free)
//
// HOW IT WORKS:
//   Phone opens:      wss://trust-relay.YOUR-NAME.workers.dev/ws
//   Dashboard opens:  wss://trust-relay.YOUR-NAME.workers.dev/ws
//   Any message sent by one client is broadcast to all others.
//   The phone sends sensor data; the dashboard receives it.
//   The dashboard sends sim commands; the phone receives them.
//   No database, no auth, no server to maintain.
// ═══════════════════════════════════════════════════════════════

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/") {
      return new Response("TRUST relay online", { status: 200 });
    }

    // WebSocket upgrade
    if (url.pathname === "/ws") {
      if (request.headers.get("Upgrade") !== "websocket") {
        return new Response("Expected WebSocket", { status: 426 });
      }
      // Route to the Durable Object that holds all connections
      const id = env.RELAY.idFromName("trust-global");
      const stub = env.RELAY.get(id);
      return stub.fetch(request);
    }

    return new Response("Not found", { status: 404 });
  }
};

// ── Durable Object: holds all connected WebSocket clients ────────
export class TrustRelay {
  constructor(state, env) {
    this.state = state;
    this.clients = new Set();
  }

  async fetch(request) {
    const { 0: client, 1: server } = new WebSocketPair();
    server.accept();

    this.clients.add(server);
    console.log(`Client connected. Total: ${this.clients.size}`);

    server.addEventListener("message", event => {
      // Broadcast to all OTHER clients
      let dead = [];
      for (const c of this.clients) {
        if (c === server) continue;
        try {
          c.send(event.data);
        } catch (e) {
          dead.push(c);
        }
      }
      // Clean up disconnected clients
      for (const c of dead) this.clients.delete(c);
    });

    server.addEventListener("close", () => {
      this.clients.delete(server);
      console.log(`Client left. Total: ${this.clients.size}`);
    });

    server.addEventListener("error", () => {
      this.clients.delete(server);
    });

    return new Response(null, { status: 101, webSocket: client });
  }
}
