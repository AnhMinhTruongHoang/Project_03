import { Module } from '@nestjs/common';
import { MembershipsService } from './memberships.service';
import { MembershipsController } from './memberships.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Membership, MembershipSchema } from './schema/membership.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Membership.name, schema: MembershipSchema },
    ]),
  ],
  controllers: [MembershipsController],
  providers: [MembershipsService],
})
export class MembershipsModule {}
