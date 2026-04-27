import { PipeTransform, BadRequestException } from "@nestjs/common";
import type { ZodSchema } from "zod";

/**
 * Usage: `@Body(new ZodPipe(RegisterInput)) body: RegisterInput`
 * Zod errors are caught by the global filter and turned into field-level
 * details for the client.
 */
export class ZodPipe<T> implements PipeTransform<unknown, T> {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: "validation_error",
        message: "Input tidak valid.",
        details: result.error.issues.map((i) => ({
          path: i.path.join("."),
          message: i.message,
        })),
      });
    }
    return result.data;
  }
}
