import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ProvinceDocument = HydratedDocument<Province>;

@Schema({ timestamps: true })
export class Province {
  @Prop({ required: true, unique: true })
  code: string; // Mã tỉnh (VD: '79')

  @Prop({ required: true })
  name: string; // Tên tỉnh/thành phố

  @Prop({ default: true })
  isActive: boolean;
}

export const ProvinceSchema = SchemaFactory.createForClass(Province);
