import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type OrderDocument = HydratedDocument<Order>;

export enum OrderStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  SHIPPING = 'SHIPPING',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true })
export class Order {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  userId: Types.ObjectId;

  @Prop({ required: true }) senderName: string;

  @Prop({ required: true }) receiverName: string;

  @Prop({ required: true }) receiverPhone: string;

  @Prop({ required: false }) email: string;

  // dùng Address chuẩn hoá
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true,
  })
  pickupAddressId: Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Address',
    required: true,
  })
  deliveryAddressId: Types.ObjectId;

  @Prop({ required: true, min: 0 }) totalPrice: number;

  @Prop({ type: String, enum: OrderStatus, default: OrderStatus.PENDING })
  status: OrderStatus;

  // soft delete fields (plugin sẽ quản lý)
  @Prop({ default: false }) isDeleted: boolean;
  @Prop() deletedAt?: Date;
  @Prop({ type: Object }) deletedBy?: { _id: Types.ObjectId; email: string };

  @Prop({ required: true, min: 0 })
  codValue: number;

  @Prop({ required: true, min: 0 })
  shippingFee: number;

  @Prop({ default: 'STD' })
  serviceCode: 'STD' | 'EXP';

  @Prop({ required: true, min: 0.01 })
  weightKg: number;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false,
  })
  branchId: Types.ObjectId;

  @Prop({
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    match: /^[A-Z]{2}[0-9]{9}[A-Z]{2}$/,
  })
  waybill: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ waybill: 1 });
OrderSchema.index({ userId: 1, createdAt: -1 });
OrderSchema.index({ status: 1, isDeleted: 1 });
OrderSchema.index({ branchId: 1, createdAt: -1 });
OrderSchema.index({ branchId: 1, status: 1 });
OrderSchema.plugin(softDeletePlugin);
