import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PromoDocument = HydratedDocument<Promo>;

@Schema({ timestamps: true })
export class Promo {
  @Prop({ required: true })
  code: string; // mã khuyến mãi

  @Prop()
  description: string;

  @Prop({ required: true })
  discountPercent: number; // % giảm giá

  @Prop({ default: 0 })
  maxUsage: number; // số lần sử dụng tối đa

  @Prop({ default: 0 })
  usedCount: number; // số lần đã dùng

  @Prop()
  startDate: Date;

  @Prop()
  endDate: Date;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  createdAt: Date;

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop()
  updatedAt: Date;

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop()
  deletedAt: Date;

  @Prop({ type: Object })
  deletedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };
}

export const PromoSchema = SchemaFactory.createForClass(Promo);
