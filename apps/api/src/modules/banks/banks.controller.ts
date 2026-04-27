import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

/**
 * Bank accounts for payout. Numbers are stored encrypted at rest (the
 * `numberEnc` column simulates AES-256 — for MVP we just prefix with `enc:`).
 * Only the last 4 digits are returned over the wire.
 */
const BankInput = z.object({
  bank: z.enum(["BCA", "Mandiri", "BNI", "BRI", "CIMB", "Permata", "BSI"]),
  number: z.string().regex(/^\d{8,20}$/, "Nomor rekening 8-20 digit"),
  holderName: z.string().min(2).max(120),
  primary: z.boolean().default(false),
});
type BankInput = z.infer<typeof BankInput>;

@Controller("bank-accounts")
export class BanksController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.bankAccount.findMany({
      where: { userId: user.id },
      orderBy: [{ primary: "desc" }, { createdAt: "desc" }],
      select: {
        id: true, bank: true, numberLast4: true, holderName: true,
        primary: true, verified: true, createdAt: true,
      },
    });
    return { items: rows };
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: SessionUser, @Body(new ZodPipe(BankInput)) body: BankInput) {
    if (body.primary) {
      await this.prisma.bankAccount.updateMany({
        where: { userId: user.id, primary: true },
        data: { primary: false },
      });
    }
    const created = await this.prisma.bankAccount.create({
      data: {
        userId: user.id,
        bank: body.bank,
        numberEnc: `enc:${body.number}`, // TODO: real AES-256 in prod
        numberLast4: body.number.slice(-4),
        holderName: body.holderName,
        primary: body.primary,
        verified: false,
      },
      select: {
        id: true, bank: true, numberLast4: true, holderName: true,
        primary: true, verified: true,
      },
    });
    return created;
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(BankInput.partial())) body: Partial<BankInput>
  ) {
    const existing = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      throw new BadRequestException({ code: "not_found", message: "Rekening tidak ditemukan." });
    }
    if (body.primary) {
      await this.prisma.bankAccount.updateMany({
        where: { userId: user.id, primary: true, NOT: { id } },
        data: { primary: false },
      });
    }
    const data: Record<string, unknown> = { ...body };
    if (body.number) {
      data.numberEnc = `enc:${body.number}`;
      data.numberLast4 = body.number.slice(-4);
      delete data.number;
    }
    return this.prisma.bankAccount.update({
      where: { id },
      data,
      select: {
        id: true, bank: true, numberLast4: true, holderName: true,
        primary: true, verified: true,
      },
    });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.prisma.bankAccount.deleteMany({ where: { id, userId: user.id } });
  }
}
