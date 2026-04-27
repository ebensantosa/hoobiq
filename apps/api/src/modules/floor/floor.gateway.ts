import { OnModuleInit } from "@nestjs/common";
import { WebSocketGateway, WebSocketServer } from "@nestjs/websockets";
import type { Server } from "socket.io";
import { FloorService, type FloorPill } from "./floor.service";
import { env } from "../../config/env";

/**
 * Broadcasts floor-price updates to anyone connected on the shared
 * Socket.IO path. The ticker is public — no per-user rooms — so we just
 * fan out to the default namespace whenever the service recomputes.
 */
@WebSocketGateway({
  cors: { origin: [env.WEB_ORIGIN.split(",")[0]], credentials: true },
  path: "/api/v1/socket.io",
  serveClient: false,
})
export class FloorGateway implements OnModuleInit {
  @WebSocketServer()
  server!: Server;

  constructor(private readonly svc: FloorService) {}

  onModuleInit() {
    // On (re)connect we don't push a snapshot from here — clients fetch the
    // initial state via REST. Server-driven updates only.
    this.svc.subscribe((pills: FloorPill[]) => {
      this.server.emit("floor:update", { pills });
    });
  }
}
