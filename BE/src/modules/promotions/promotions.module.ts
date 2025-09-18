import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromosService } from './promotions.service';
import { PromosController } from './promotions.controller';
import { Promo, PromoSchema } from './schema/promotion.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Promo.name, schema: PromoSchema }]),
  ],
  controllers: [PromosController],
  providers: [PromosService],
})
export class PromotionsModule {}
