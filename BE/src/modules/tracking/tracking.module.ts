import { Module } from '@nestjs/common';
import { TrackingService } from './tracking.service';
import { TrackingController } from './tracking.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Tracking, TrackingSchema } from './schemas/tracking.schemas';
import { Shipment, ShipmentSchema } from '../shipments/schemas/shipment.schema';
import { Branch, BranchSchema } from '../branches/schemas/branch.schemas';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Tracking.name, schema: TrackingSchema },
      { name: Shipment.name, schema: ShipmentSchema },
      { name: Branch.name, schema: BranchSchema },
    ]),
  ],
  controllers: [TrackingController],
  providers: [TrackingService],
  exports: [MongooseModule],
})
export class TrackingModule {}
