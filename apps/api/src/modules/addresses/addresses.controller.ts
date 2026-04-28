import { BadRequestException, Body, Controller, Delete, Get, HttpCode, Param, Patch, Post } from "@nestjs/common";
import { z } from "zod";
import type { SessionUser } from "@hoobiq/types";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { ZodPipe } from "../../common/pipes/zod.pipe";
import { PrismaService } from "../../infrastructure/prisma/prisma.service";

const AddressInput = z.object({
  label: z.string().min(1).max(32),
  name: z.string().min(2).max(120),
  phone: z.string().min(8).max(32),
  line: z.string().min(5).max(240),
  city: z.string().min(2).max(64),
  province: z.string().min(2).max(64),
  postal: z.string().min(4).max(10),
  // RajaOngkir/Komerce subdistrict id — set by destination picker on frontend.
  // Optional so legacy addresses still validate; checkout will surface a
  // clear error if the buyer tries to use one missing this.
  subdistrictId: z.number().int().positive().nullable().optional(),
  primary: z.boolean().default(false),
});
type AddressInput = z.infer<typeof AddressInput>;

@Controller("addresses")
export class AddressesController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async list(@CurrentUser() user: SessionUser) {
    const rows = await this.prisma.address.findMany({
      where: { userId: user.id },
      orderBy: [{ primary: "desc" }, { createdAt: "desc" }],
    });
    return { items: rows };
  }

  @Post()
  @HttpCode(201)
  async create(@CurrentUser() user: SessionUser, @Body(new ZodPipe(AddressInput)) body: AddressInput) {
    // Hard cap at 3 saved addresses per user. Anti-spam + keeps the
    // checkout selector tidy.
    const existing = await this.prisma.address.count({ where: { userId: user.id } });
    if (existing >= 3) {
      throw new BadRequestException({
        code: "address_limit",
        message: "Maksimum 3 alamat tersimpan. Hapus alamat lama dulu untuk tambah yang baru.",
      });
    }
    if (body.primary) {
      await this.prisma.address.updateMany({
        where: { userId: user.id, primary: true },
        data: { primary: false },
      });
    }
    const a = await this.prisma.address.create({ data: { ...body, userId: user.id } });
    return a;
  }

  @Patch(":id")
  async update(
    @CurrentUser() user: SessionUser,
    @Param("id") id: string,
    @Body(new ZodPipe(AddressInput.partial())) body: Partial<AddressInput>
  ) {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing || existing.userId !== user.id) {
      throw new BadRequestException({ code: "not_found", message: "Alamat tidak ditemukan." });
    }
    if (body.primary) {
      await this.prisma.address.updateMany({
        where: { userId: user.id, primary: true, NOT: { id } },
        data: { primary: false },
      });
    }
    return this.prisma.address.update({ where: { id }, data: body });
  }

  @Delete(":id")
  @HttpCode(204)
  async remove(@CurrentUser() user: SessionUser, @Param("id") id: string) {
    await this.prisma.address.deleteMany({ where: { id, userId: user.id } });
  }
}
