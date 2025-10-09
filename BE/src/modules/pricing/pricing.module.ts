import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Pricing, PricingSchema } from './schemas/pricing.schemas';
import { Service, ServiceSchema } from '../services/schemas/service.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pricing.name, schema: PricingSchema },
      { name: Service.name, schema: ServiceSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [MongooseModule],
})
export class PricingModule {}
