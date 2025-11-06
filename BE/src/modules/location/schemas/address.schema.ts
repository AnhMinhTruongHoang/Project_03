import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';
import { Province } from './province.schema';
import { District } from './district.schema';

@Schema({ timestamps: true })
export class Address {
  @Prop({ type: Types.ObjectId, ref: Province.name, required: true })
  provinceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: District.name, required: true })
  districtId: Types.ObjectId;

  @Prop({ type: String })
  address?: string;
}
export type AddressDocument = HydratedDocument<Address>;
export const AddressSchema = SchemaFactory.createForClass(Address);
