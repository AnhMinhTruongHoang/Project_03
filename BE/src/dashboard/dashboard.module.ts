import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { DashboardController } from './dashboard.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from 'src/modules/orders/schemas/order.schemas';
import { User, UserSchema } from 'src/modules/users/schemas/user.schema';
import { Tracking, TrackingSchema } from 'src/modules/tracking/schemas/tracking.schemas';
import { Pricing, PricingSchema } from 'src/modules/pricing/schemas/pricing.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: User.name, schema: UserSchema },
      { name: Tracking.name, schema: TrackingSchema },
      { name: Pricing.name, schema: PricingSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}