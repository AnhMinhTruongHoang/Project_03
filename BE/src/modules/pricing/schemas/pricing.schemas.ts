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

  /**
   * Base price cho service (nếu muốn override giá trong Service)
   * Ví dụ: STD = 20000, EXP = 40000
   */
  @Prop({ required: true, min: 0 })
  basePrice: number;

  /**
   * Ngưỡng quá cân (kg) – ví dụ > 5kg thì tính phụ phí
   */
  @Prop({ required: true, min: 0, default: 5 })
  overweightThresholdKg: number;

  /**
   * Phụ phí khi vượt ngưỡng cân
   * Ví dụ: 5000
   */
  @Prop({ required: true, min: 0, default: 5000 })
  overweightFee: number;

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

// Index gợi ý: mỗi service chỉ có 1 giá active theo thời gian
PricingSchema.index(
  {
    serviceId: 1,
    effectiveFrom: 1,
  },
  { unique: false },
);
PricingSchema.index({ serviceId: 1, isActive: 1, isDeleted: 1 });
PricingSchema.index({ effectiveFrom: 1, effectiveTo: 1 });

// Bật plugin soft delete
PricingSchema.plugin(softDeletePlugin);
