import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Order, OrderSchema } from './schemas/order.schemas';
import { Address, AddressSchema } from '../location/schemas/address.schema';
import { District, DistrictSchema } from '../location/schemas/district.schema';
import { Province, ProvinceSchema } from '../location/schemas/province.schema';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';


@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Address.name, schema: AddressSchema },
      { name: District.name, schema: DistrictSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [MongooseModule],
})
export class OrdersModule {}
