import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { District } from './district.schema';

export type WardDocument = HydratedDocument<Ward>;

@Schema({ timestamps: true })
export class Ward {
  @Prop({ required: true, unique: true })
  code: string; // Mã phường/xã (VD: '26734')

  @Prop({ required: true })
  name: string; // Tên phường/xã

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: District.name,
    required: true,
  })
  districtId: mongoose.Types.ObjectId; // FK -> District

  @Prop({ default: true })
  isActive: boolean;
}

export const WardSchema = SchemaFactory.createForClass(Ward);
