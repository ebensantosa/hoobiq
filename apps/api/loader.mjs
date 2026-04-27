// Entry-time loader for `node --watch ... src/main.ts`.
// SWC transpiles TS (with full legacy decorator + metadata support that
// NestJS's DI system needs). Faster than tsc, simpler than ts-node.
import { register } from "node:module";
register("@swc-node/register/esm", import.meta.url);
