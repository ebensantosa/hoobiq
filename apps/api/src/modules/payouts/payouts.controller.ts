import { BadRequestException, Body, Controller, ForbiddenException, Get, HttpCode, NotFoundException, Param, Post, Query } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { EmailService } from "../email/email.service";

const CENTS_PER_RUPIAH = 100n;
const MIN_WITHDRAW_IDR = 50_000n;
const MIN_WITHDRAW_CENTS = MIN_WITHDRAW_IDR * CENTS_PER_RUPIAH;

const CreatePayoutInput = z.object({
  bankAccountId: z.string().min(1),
  amountIdr: z.number().int().positive(),
});
const DecideInput = z.object({
  decision: z.enum(["approve", "reject", "mark_paid"]),
  note: z.string().trim().max(500).optional(),
});

/**
 * Seller-facing payout requests. Minimum tarik Rp 50.000 + KTP wajib
 * verified. Admin queue under /admin-panel/payout decides approve /
 * reject / mark-paid. Money is held outside this table (computed live in
 * WalletController) — payout rows just record the manual transfer
 * intent.
 */
@Controller("payouts")
export class PayoutsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly email: EmailService,
  ) {}

  // ----------------------------------------------- seller side

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.payoutRequest.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true, amountCents: true, status: true, opsNote: true,
        createdAt: true, decidedAt: true, paidAt: true,
        bankAccountId: true,
      },
    });
    return {
      items: rows.map((r) => ({
        id: r.id,
        amountIdr: Number(r.amountCents / CENTS_PER_RUPIAH),
        status: r.status,
        opsNote: r.opsNote,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
        paidAt: r.paidAt?.toISOString() ?? null,
      })),
    };
  }

  @Post()
  @Throttle({ default: { ttl: 60_000, limit: 5 } })
  @HttpCode(201)
  async create(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(CreatePayoutInput)) body: z.infer<typeof CreatePayoutInput>,
  ) {
    const u = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { ktpStatus: true, ktpVerified: true },
    });
    if (!u) throw new NotFoundException({ code: "not_found", message: "Pengguna tidak ditemukan." });
    if (!(u.ktpStatus === "verified" || u.ktpVerified)) {
      throw new BadRequestException({ code: "ktp_required", message: "KTP wajib terverifikasi sebelum tarik dana." });
    }

    const amountCents = BigInt(body.amountIdr) * CENTS_PER_RUPIAH;
    if (amountCents < MIN_WITHDRAW_CENTS) {
      throw new BadRequestException({ code: "below_min", message: `Minimum tarik Rp ${Number(MIN_WITHDRAW_IDR).toLocaleString("id-ID")}.` });
    }

    const bank = await this.prisma.bankAccount.findUnique({ where: { id: body.bankAccountId } });
    if (!bank || bank.userId !== user.id) {
      throw new BadRequestException({ code: "invalid_bank", message: "Rekening tidak valid." });
    }

    // Available balance = completed orders − sum of non-rejected payout
    // requests. We subtract approved/paid AND pending so a seller can't
    // double-spend by submitting multiple requests in parallel.
    const [completed, pendingOut] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        where: { sellerId: user.id, status: "completed" },
      }),
      this.prisma.payoutRequest.aggregate({
        _sum: { amountCents: true },
        where: { userId: user.id, status: { in: ["pending", "approved", "paid"] } },
      }),
    ]);
    const available = (completed._sum.totalCents ?? 0n) - (pendingOut._sum.amountCents ?? 0n);
    if (amountCents > available) {
      throw new BadRequestException({ code: "insufficient", message: "Saldo tidak cukup." });
    }

    const created = await this.prisma.payoutRequest.create({
      data: {
        userId: user.id,
        bankAccountId: bank.id,
        amountCents,
      },
      select: { id: true, amountCents: true, status: true, createdAt: true },
    });
    return {
      id: created.id,
      amountIdr: Number(created.amountCents / CENTS_PER_RUPIAH),
      status: created.status,
      createdAt: created.createdAt.toISOString(),
    };
  }

  @Post(":id/cancel")
  @HttpCode(200)
  async cancel(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    const r = await this.prisma.payoutRequest.findUnique({ where: { id } });
    if (!r || r.userId !== user.id) throw new NotFoundException({ code: "not_found", message: "Tidak ditemukan." });
    if (r.status !== "pending") throw new BadRequestException({ code: "invalid_status", message: "Hanya bisa membatalkan saat masih pending." });
    await this.prisma.payoutRequest.update({
      where: { id },
      data: { status: "cancelled", decidedAt: new Date() },
    });
    return { ok: true };
  }

  // ----------------------------------------------- admin side

  @Get("admin")
  async adminList(
    @CurrentUser() admin: SessionUser,
    @Query("status") statusQ?: string,
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin" && admin.role !== "ops") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin." });
    }
    const status = statusQ === "approved" || statusQ === "paid" || statusQ === "rejected" || statusQ === "cancelled"
      ? statusQ : "pending";
    const rows = await this.prisma.payoutRequest.findMany({
      where: { status },
      orderBy: { createdAt: "desc" },
      take: 100,
      include: {
        user: { select: { id: true, username: true, name: true, email: true } },
      },
    });
    // hydrate bank info (without decrypting full number)
    const bankIds = Array.from(new Set(rows.map((r) => r.bankAccountId)));
    const banks = bankIds.length ? await this.prisma.bankAccount.findMany({
      where: { id: { in: bankIds } },
      select: { id: true, bank: true, numberLast4: true, holderName: true },
    }) : [];
    const bankById = new Map(banks.map((b) => [b.id, b]));

    return {
      items: rows.map((r) => ({
        id: r.id,
        amountIdr: Number(r.amountCents / CENTS_PER_RUPIAH),
        status: r.status,
        opsNote: r.opsNote,
        createdAt: r.createdAt.toISOString(),
        decidedAt: r.decidedAt?.toISOString() ?? null,
        paidAt: r.paidAt?.toISOString() ?? null,
        user: r.user,
        bank: bankById.get(r.bankAccountId) ?? null,
      })),
    };
  }

  @Post(":id/decide")
  @HttpCode(200)
  async decide(
    @CurrentUser() admin: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(DecideInput)) body: z.infer<typeof DecideInput>,
  ) {
    if (admin.role !== "admin" && admin.role !== "superadmin") {
      throw new ForbiddenException({ code: "forbidden", message: "Khusus admin/superadmin." });
    }
    const r = await this.prisma.payoutRequest.findUnique({
      where: { id },
      include: { user: { select: { id: true, email: true, name: true, username: true } } },
    });
    if (!r) throw new NotFoundException({ code: "not_found", message: "Tidak ditemukan." });

    const now = new Date();
    let nextStatus = r.status;
    if (body.decision === "approve") {
      if (r.status !== "pending") throw new BadRequestException({ code: "invalid_status", message: "Hanya pending yang bisa di-approve." });
      nextStatus = "approved";
    } else if (body.decision === "reject") {
      if (r.status !== "pending" && r.status !== "approved") throw new BadRequestException({ code: "invalid_status", message: "Tidak bisa direject pada status ini." });
      if (!body.note) throw new BadRequestException({ code: "missing_note", message: "Wajib isi alasan." });
      nextStatus = "rejected";
    } else if (body.decision === "mark_paid") {
      if (r.status !== "approved") throw new BadRequestException({ code: "invalid_status", message: "Harus di-approve dulu." });
      nextStatus = "paid";
    }

    await this.prisma.$transaction([
      this.prisma.payoutRequest.update({
        where: { id },
        data: {
          status: nextStatus,
          opsNote: body.note ?? r.opsNote,
          decidedById: admin.id,
          decidedAt: now,
          paidAt: body.decision === "mark_paid" ? now : r.paidAt,
        },
      }),
      this.prisma.auditEntry.create({
        data: {
          actorId: admin.id,
          action: `payout.${body.decision}`,
          targetRef: `payout:${r.id}`,
          metaJson: JSON.stringify({ amountCents: String(r.amountCents), userId: r.userId, note: body.note ?? null }),
        },
      }),
    ]);

    if (r.user.email) {
      const name = r.user.name ?? r.user.username;
      const amt = Number(r.amountCents / CENTS_PER_RUPIAH).toLocaleString("id-ID");
      const subject =
        body.decision === "approve" ? "Pencairan disetujui" :
        body.decision === "reject"  ? "Pencairan ditolak" :
                                      "Pencairan selesai ditransfer";
      const lines =
        body.decision === "approve" ? `<p>Permintaan tarik <strong>Rp ${amt}</strong> disetujui dan akan ditransfer ke rekening kamu dalam 1×24 jam hari kerja.</p>` :
        body.decision === "reject"  ? `<p>Permintaan tarik <strong>Rp ${amt}</strong> ditolak.</p><p>Catatan: <strong>${escapeHtml(body.note ?? "")}</strong></p>` :
                                      `<p>Pencairan <strong>Rp ${amt}</strong> sudah ditransfer ke rekening kamu.</p>`;
      await this.email.send(
        r.user.email,
        `[Hoobiq] ${subject}`,
        `<div style="font-family:'Nunito',Arial,sans-serif;color:#0F172A;max-width:560px;margin:0 auto;padding:24px">
          <h1 style="font-size:22px;margin:0 0 12px">${escapeHtml(subject)}</h1>
          <p>Halo ${escapeHtml(name)},</p>
          ${lines}
        </div>`,
      );
    }
    await this.prisma.notification.create({
      data: {
        userId: r.userId,
        kind: `payout_${body.decision}`,
        title:
          body.decision === "approve" ? "Pencairan disetujui" :
          body.decision === "reject"  ? "Pencairan ditolak" :
                                        "Pencairan selesai",
        body: body.note ?? "",
        dataJson: JSON.stringify({ payoutId: r.id }),
      },
    }).catch(() => undefined);

    return { ok: true, status: nextStatus };
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
