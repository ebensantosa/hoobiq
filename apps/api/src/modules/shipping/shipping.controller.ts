import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { z } from "zod";
import { Public } from "../../common/decorators/public.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { ShippingService } from "./shipping.service";

const COURIERS = ["jne", "pos", "tiki", "sicepat", "jnt", "anteraja", "ninja", "wahana", "ide"] as const;

const CostInput = z.object({
  originId:      z.number().int().positive(),
  destinationId: z.number().int().positive(),
  weightGrams:   z.number().int().min(100).max(50_000),
  couriers:      z.array(z.enum(COURIERS)).min(1).max(COURIERS.length),
});
type CostInput = z.infer<typeof CostInput>;

@Controller("shipping")
export class ShippingController {
  constructor(private readonly svc: ShippingService) {}

  /** Used by checkout's address picker to look up subdistrict IDs. */
  @Public()
  @Get("destinations")
  search(@Query("q") q?: string, @Query("limit") limitParam?: string) {
    const limit = Math.min(20, Math.max(1, Number(limitParam ?? 10)));
    return this.svc.searchDestinations(q ?? "", limit).then((items) => ({ items }));
  }

  /** Used by checkout to compute the courier service grid. */
  @Public()
  @Post("cost")
  cost(@Body(new ZodPipe(CostInput)) body: CostInput) {
    return this.svc.calculateCost(body.originId, body.destinationId, body.weightGrams, body.couriers).then((items) => ({ items }));
  }

  /** Used by /pesanan/[id] to render tracking timeline. */
  @Public()
  @Get("track/:courier/:awb")
  track(@Param("courier") courier: string, @Param("awb") awb: string) {
    if (!(COURIERS as readonly string[]).includes(courier)) {
      return { delivered: false, events: [] };
    }
    return this.svc.track(awb, courier as (typeof COURIERS)[number]);
  }
}
