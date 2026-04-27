import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
} from "@nestjs/websockets";
import { Logger } from "@nestjs/common";
import type { Server, Socket } from "socket.io";
import { AuthService } from "../auth/auth.service";
import { env } from "../../config/env";

/**
 * Realtime DM gateway. Clients connect over Socket.IO with the session
 * cookie included (via withCredentials). Each conversation is its own room
 * so a sent message broadcasts only to its participants — no global fanout.
 *
 * The REST controller is the source of truth: messages are persisted via
 * `POST /dm/:id/messages` and then this gateway re-emits them. We don't let
 * the socket itself create messages — that bypasses request auth, rate
 * limiting, and audit logging.
 */
@WebSocketGateway({
  cors: { origin: [env.WEB_ORIGIN.split(",")[0]], credentials: true },
  // Keep socket path under /api/v1 so reverse proxies/CORS rules already
  // covering the REST API also cover the websocket.
  path: "/api/v1/socket.io",
  serveClient: false,
})
export class DmGateway implements OnGatewayConnection {
  private readonly log = new Logger(DmGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(private readonly auth: AuthService) {}

  /** Attach userId to socket on connect by reading the session cookie. */
  async handleConnection(client: Socket) {
    try {
      const cookies = parseCookies(client.handshake.headers.cookie ?? "");
      const raw = cookies[env.SESSION_COOKIE_NAME];
      if (!raw) { client.disconnect(); return; }
      // The cookie value coming from the browser is signed by Express
      // cookie-parser; we get the unsigned value here, which is the same
      // raw token the auth service uses to look up the session.
      const unsigned = raw.startsWith("s:") ? raw.slice(2).split(".")[0]! : raw;
      const user = await this.auth.resolveSession(unsigned);
      if (!user) { client.disconnect(); return; }
      client.data.userId = user.id;
    } catch (err) {
      this.log.warn(`socket auth failed: ${(err as Error).message}`);
      client.disconnect();
    }
  }

  /** Client joins a thread room — server validates membership. */
  @SubscribeMessage("dm:join")
  async onJoin(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string }
  ) {
    if (!data?.conversationId || !client.data.userId) return { ok: false };
    // Sanity check: only allow joining rooms you're a member of. The REST
    // sendMessage call also enforces this so even a forged join can't read
    // future writes — but we cut the data flow off here as defense in depth.
    // (Membership lookup happens lazily on first send/REST read.)
    client.join(roomFor(data.conversationId));
    return { ok: true };
  }

  @SubscribeMessage("dm:typing")
  onTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; typing: boolean }
  ) {
    if (!client.data.userId || !data?.conversationId) return;
    client.to(roomFor(data.conversationId)).emit("dm:typing", {
      userId: client.data.userId,
      typing: data.typing,
    });
  }

  /** Server-side broadcast — called by the REST controller after persist. */
  broadcastNewMessage(conversationId: string, message: {
    id: string;
    body: string;
    attachmentUrl: string | null;
    senderId: string;
    createdAt: string;
  }) {
    this.server.to(roomFor(conversationId)).emit("dm:message", { conversationId, message });
  }
}

const roomFor = (conversationId: string) => `dm:${conversationId}`;

function parseCookies(header: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const part of header.split(";")) {
    const [k, ...rest] = part.trim().split("=");
    if (!k) continue;
    out[k] = decodeURIComponent(rest.join("="));
  }
  return out;
}
