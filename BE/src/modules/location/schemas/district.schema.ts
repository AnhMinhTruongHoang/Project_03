import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Province } from './province.schema';

export type DistrictDocument = HydratedDocument<District>;

@Schema({ timestamps: true })
export class District {
  @Prop({ required: true, unique: true })
  code: string; // Mã quận/huyện (VD: '760')

  @Prop({ required: true })
  name: string; // Tên quận/huyện

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Province.name,
    required: true,
  })
  provinceId: mongoose.Types.ObjectId; // FK -> Province

  @Prop({ default: true })
  isActive: boolean;
}

export const DistrictSchema = SchemaFactory.createForClass(District);
