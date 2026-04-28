import { BadRequestException, Body, Controller, ForbiddenException, NotFoundException, Post } from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { env } from "../../config/env";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";
import { KomercePaymentService, type ChargeMethod } from "./komerce-payment.service";

const ChargeInput = z.object({
  orderHumanId: z.string().min(1).max(40),
  method: z.enum(["va", "ewallet", "qris"]),
  channel: z.string().min(1).max(40).optional(), // bca/ovo/etc — required for va/ewallet
});
type ChargeInput = z.infer<typeof ChargeInput>;

/**
 * Komerce-backed charge initiation. Buyer hits this after /orders/checkout
 * gives them a humanId — it produces a redirect URL (VA / e-wallet) or a
 * QR string (QRIS) the UI can render.
 *
 * The legacy Midtrans flow stays in /orders/checkout's createCharge call
 * for backward compat; this endpoint is opt-in until we migrate the
 * checkout UX to a method picker.
 */
@Controller("payments/komerce")
export class PaymentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly komerce: KomercePaymentService,
  ) {}

  @Post("charge")
  async charge(
    @CurrentUser() user: SessionUser,
    @Body(new ZodPipe(ChargeInput)) input: ChargeInput,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { humanId: input.orderHumanId },
      select: { id: true, buyerId: true, totalCents: true, status: true,
                buyer: { select: { email: true, name: true, username: true, phone: true } } },
    });
    if (!order) throw new NotFoundException({ code: "not_found", message: "Order tidak ditemukan." });
    if (order.buyerId !== user.id) throw new ForbiddenException({ code: "forbidden", message: "Bukan order kamu." });
    if (order.status !== "pending_payment") {
      throw new BadRequestException({ code: "bad_state", message: "Order sudah terbayar atau dibatalkan." });
    }
    if ((input.method === "va" || input.method === "ewallet") && !input.channel) {
      throw new BadRequestException({ code: "missing_channel", message: "Pilih bank/e-wallet." });
    }

    const notifyUrl = `${(env.PUBLIC_API_BASE ?? "http://localhost:4000").replace(/\/$/, "")}/api/v1/webhooks/komerce`;
    const charge = await this.komerce.createCharge({
      orderId: order.id,
      humanId: input.orderHumanId,
      amountCents: order.totalCents,
      method: input.method as ChargeMethod,
      channel: input.channel,
      customer: {
        email: order.buyer.email,
        name:  order.buyer.name ?? order.buyer.username,
        phone: order.buyer.phone ?? "",
      },
      notifyUrl,
    });

    return {
      method: input.method,
      redirectUrl: charge.redirectUrl ?? null,
      qrString: charge.qrString ?? null,
      qrImageUrl: charge.qrImageUrl ?? null,
      expiresAt: charge.expiresAt,
    };
  }
}
