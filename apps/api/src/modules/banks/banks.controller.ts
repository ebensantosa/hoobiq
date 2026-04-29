import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { encryptScalar } from "./encryption";

/**
 * Bank accounts for payout. Numbers are encrypted at rest with
 * AES-256-GCM (see ./encryption.ts) keyed off env.BANK_ENCRYPTION_KEY.
 * The wire response only carries last-4 + holder name + verified flag;
 * the full number never leaves the database except for the ops-side
 * payout flow that explicitly decrypts it.
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
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
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
        numberEnc: encryptScalar(body.number),
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
      data.numberEnc = encryptScalar(body.number);
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
