import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Address, AddressSchema } from '../location/schemas/address.schema';
import { Commune, CommuneSchema } from './schemas/Commune.schema';
import { Province, ProvinceSchema } from '../location/schemas/province.schema';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Address.name, schema: AddressSchema },
      { name: Commune.name, schema: CommuneSchema },
      { name: Province.name, schema: ProvinceSchema },
    ]),
  ],
  controllers: [LocationController],
  providers: [LocationService],
  exports: [MongooseModule, LocationService],
})
export class LocationModule {}
