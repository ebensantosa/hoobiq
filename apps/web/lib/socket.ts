"use client";
import { io, type Socket } from "socket.io-client";

let socket: Socket | null = null;

/**
 * Lazy singleton — first caller initializes, subsequent get same instance.
 * Cookie sent automatically because we set `withCredentials` and the API
 * gateway is on the same origin during dev (proxied via next).
 */
export function getSocket(): Socket {
  if (socket) return socket;
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
  // socket.io-client wants the *origin* (no /api/v1 path); the path is set
  // on the server side at /api/v1/socket.io and we mirror it here.
  const url = new URL(apiUrl);
  socket = io(url.origin, {
    withCredentials: true,
    path: "/api/v1/socket.io",
    autoConnect: true,
    transports: ["websocket"],
  });
  return socket;
}
