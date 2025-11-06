import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Province } from './province.schema';
import { District } from './district.schema';
import { Ward } from './ward.schema';

export type AddressDocument = HydratedDocument<Address>;

@Schema({ timestamps: true })
export class Address {
  @Prop({ required: true })
  line1: string; // Số nhà, tên đường

  @Prop()
  line2?: string; // Tòa nhà, ghi chú thêm (nếu có)

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Province.name,
    required: true,
  })
  provinceId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: District.name,
    required: true,
  })
  districtId: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Ward.name,
    required: true,
  })
  wardId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  lat: number; // Vĩ độ

  @Prop({ required: true })
  lng: number; // Kinh độ

  @Prop()
  geohash?: string; // Mã hoá vị trí (nếu bạn dùng tìm kho gần nhất)

  @Prop()
  contactName?: string;

  @Prop()
  contactPhone?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;
}

export const AddressSchema = SchemaFactory.createForClass(Address);
AddressSchema.index({ geohash: 1 });
AddressSchema.index({ lat: 1, lng: 1 });
