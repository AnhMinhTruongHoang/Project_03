import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PricingDocument = HydratedDocument<Pricing>;

export enum Zone {
  LOCAL = 'LOCAL', // nội tỉnh
  REGIONAL = 'REGIONAL', // nội miền
  NATIONAL = 'NATIONAL', // liên tỉnh
}

@Schema({ timestamps: true })
export class Pricing {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  serviceId: mongoose.Types.ObjectId;

  @Prop({ required: true, enum: Zone })
  zone: Zone;

  @Prop({ required: true })
  minWeight: number; // gram hoặc kg

  @Prop({ required: true })
  maxWeight: number;

  @Prop({ required: true })
  price: number;

  @Prop({ default: true })
  isActive: boolean;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Object })
  deletedBy?: {
    _id: mongoose.Types.ObjectId;
    email: string;
  };
}

export const PricingSchema = SchemaFactory.createForClass(Pricing);
