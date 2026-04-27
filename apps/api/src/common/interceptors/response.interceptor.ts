import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Observable, map } from "rxjs";

/**
 * Wraps every successful response in `{ ok: true, data }` so client code can
 * handle success vs error uniformly. Errors go through the filter and get
 * `{ ok: false, error }`.
 */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, { ok: true; data: T }> {
  intercept(_ctx: ExecutionContext, next: CallHandler<T>): Observable<{ ok: true; data: T }> {
    return next.handle().pipe(map((data) => ({ ok: true, data })));
  }
}
