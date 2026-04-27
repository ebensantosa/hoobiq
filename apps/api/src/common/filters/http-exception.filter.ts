import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ZodError } from "zod";
import type { Request, Response } from "express";

/**
 * Uniform error response. We never leak stack traces or raw errors in
 * production — the client gets `{ code, message }` plus optional `details`
 * that are safe to display (e.g. field validation errors).
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly log = new Logger("HttpExceptionFilter");

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<Request>();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = "internal_error";
    let message = "Terjadi kesalahan tak terduga. Silakan coba lagi.";
    let details: unknown;

    if (exception instanceof ZodError) {
      status = HttpStatus.BAD_REQUEST;
      code = "validation_error";
      message = "Input tidak valid.";
      details = exception.issues.map((i) => ({
        path: i.path.join("."),
        message: i.message,
      }));
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === "string") {
        message = res;
      } else if (typeof res === "object" && res) {
        const r = res as Record<string, unknown>;
        message = (r.message as string) ?? message;
        code = (r.code as string) ?? mapStatusCode(status);
        details = r.details;
      }
      code ??= mapStatusCode(status);
    } else if (exception instanceof Error) {
      this.log.error(exception.message, exception.stack);
    } else {
      this.log.error("Unknown exception", String(exception));
    }

    // Only log server errors; client errors are noise.
    if (status >= 500) {
      this.log.error(`${req.method} ${req.url} → ${status}`, String(exception));
    }

    res.status(status).json({
      ok: false,
      error: { code, message, ...(details !== undefined && { details }) },
    });
  }
}

function mapStatusCode(status: number): string {
  switch (status) {
    case 400: return "bad_request";
    case 401: return "unauthorized";
    case 403: return "forbidden";
    case 404: return "not_found";
    case 409: return "conflict";
    case 422: return "unprocessable";
    case 429: return "rate_limited";
    default:  return "internal_error";
  }
}
