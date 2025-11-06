import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type PricingDocument = HydratedDocument<Pricing> & {
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: { _id: Types.ObjectId; email: string };
};

@Schema({ timestamps: true })
export class Pricing {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  serviceId: Types.ObjectId;

  // --- Slab theo cân nặng (kg)
  @Prop({ required: true, min: 0 })
  minWeightKg: number;

  @Prop({ required: true, min: 0 })
  maxWeightKg: number;

  // --- Slab theo khoảng cách (km)
  @Prop({ required: true, min: 0 })
  minKm: number;

  @Prop({ required: true, min: 0 })
  maxKm: number;

  // --- Công thức tính phí
  @Prop({ default: 0 })
  baseFee: number;

  @Prop({ default: 0 })
  perKm: number;

  @Prop({ default: 0 })
  perKg: number;

  @Prop()
  flatFee?: number; // nếu có, ưu tiên dùng fixed giá

  // --- Quản trị & hiệu lực
  @Prop({ default: true })
  isActive: boolean;

  @Prop({ required: true, default: () => new Date() })
  effectiveFrom: Date;

  @Prop()
  effectiveTo?: Date;

  // soft delete fields (plugin quản lý)
  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Object })
  deletedBy?: { _id: Types.ObjectId; email: string };
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);

// Index gợi ý
PricingSchema.index(
  {
    serviceId: 1,
    minWeightKg: 1,
    maxWeightKg: 1,
    minKm: 1,
    maxKm: 1,
    effectiveFrom: 1,
  },
  { unique: true },
);
PricingSchema.index({ serviceId: 1, isActive: 1, isDeleted: 1 });
PricingSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Bật plugin soft delete
PricingSchema.plugin(softDeletePlugin);
