import { Module } from '@nestjs/common';
import { PricingService } from './pricing.service';
import { PricingController } from './pricing.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Pricing, PricingSchema } from './schemas/pricing.schemas';
import { Service, ServiceSchema } from '../services/schemas/service.schemas';
import { Branch, BranchSchema } from '../branches/schemas/branch.schemas';
import { Province, ProvinceSchema } from '../location/schemas/province.schema';
import { Commune, CommuneSchema } from '../location/schemas/Commune.schema';
import { Address, AddressSchema } from '../location/schemas/address.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Pricing.name, schema: PricingSchema },
      { name: Service.name, schema: ServiceSchema },
      { name: Branch.name, schema: BranchSchema },
      { name: Province.name, schema: ProvinceSchema },
      { name: Commune.name, schema: CommuneSchema },
      { name: Address.name, schema: AddressSchema },
    ]),
  ],
  controllers: [PricingController],
  providers: [PricingService],
  exports: [MongooseModule, PricingService],
})
export class PricingModule {}
