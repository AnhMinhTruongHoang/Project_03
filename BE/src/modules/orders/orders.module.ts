import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { Order, OrderSchema } from './schemas/order.schemas';
import { Province, ProvinceSchema } from '../location/schemas/province.schema';
import { LocationModule } from '../location/location.module';
import { PricingModule } from '../pricing/pricing.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    LocationModule,
    PricingModule
  ],
  controllers: [OrdersController],
  providers: [OrdersService],

  exports: [MongooseModule, OrdersService],
})
export class OrdersModule {}
