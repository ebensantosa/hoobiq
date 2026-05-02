import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule, ThrottlerGuard } from "@nestjs/throttler";
import { PrismaModule } from "./infrastructure/prisma/prisma.module";
import { RedisModule } from "./infrastructure/redis/redis.module";
import { AuthModule } from "./modules/auth/auth.module";
import { UsersModule } from "./modules/users/users.module";
import { ListingsModule } from "./modules/listings/listings.module";
import { CategoriesModule } from "./modules/categories/categories.module";
import { OrdersModule } from "./modules/orders/orders.module";
import { PaymentsModule } from "./modules/payments/payments.module";
import { WebhooksModule } from "./modules/webhooks/webhooks.module";
import { AdminModule } from "./modules/admin/admin.module";
import { SiteSettingsModule } from "./modules/site-settings/site-settings.module";
import { CsrfMiddlewareModule } from "./common/csrf/csrf.module";
import { WishlistModule } from "./modules/wishlist/wishlist.module";
import { NotificationsModule } from "./modules/notifications/notifications.module";
import { AddressesModule } from "./modules/addresses/addresses.module";
import { PostsModule } from "./modules/posts/posts.module";
import { WalletModule } from "./modules/wallet/wallet.module";
import { DmModule } from "./modules/dm/dm.module";
import { BanksModule } from "./modules/banks/banks.module";
import { FloorModule } from "./modules/floor/floor.module";
import { TradesModule } from "./modules/trades/trades.module";
import { UploadsModule } from "./modules/uploads/uploads.module";
import { ShippingModule } from "./modules/shipping/shipping.module";
import { HealthModule } from "./modules/health/health.module";
import { CartModule } from "./modules/cart/cart.module";
import { EmailModule } from "./modules/email/email.module";
import { BoostModule } from "./modules/boost/boost.module";
import { PayoutsModule } from "./modules/payouts/payouts.module";
import { BannersModule } from "./modules/banners/banners.module";
import { ExpModule } from "./modules/exp/exp.module";
import { MembershipModule } from "./modules/membership/membership.module";

@Module({
  imports: [
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),

    PrismaModule,
    RedisModule,
    CsrfMiddlewareModule,
    ExpModule,
    MembershipModule,

    AuthModule,
    UsersModule,
    ListingsModule,
    CategoriesModule,
    OrdersModule,
    PaymentsModule,
    WebhooksModule,
    AdminModule,
    SiteSettingsModule,
    WishlistModule,
    NotificationsModule,
    AddressesModule,
    PostsModule,
    CartModule,
    EmailModule,
    BoostModule,
    PayoutsModule,
    WalletModule,
    DmModule,
    BanksModule,
    FloorModule,
    TradesModule,
    UploadsModule,
    ShippingModule,
    HealthModule,
    BannersModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
