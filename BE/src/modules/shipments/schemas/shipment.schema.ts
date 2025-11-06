import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type ShipmentDocument = HydratedDocument<Shipment> & {
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  deletedBy?: { _id: Types.ObjectId; email: string };
};

export enum ShipmentStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true })
export class Shipment {
  @Prop({ required: true, unique: true })
  trackingNumber: string;

  // Người gửi/nhận (giữ lại để hiển thị nhanh)
  @Prop({ required: true }) senderName: string;
  @Prop({ required: true }) senderPhone: string;
  @Prop({ required: true }) receiverName: string;
  @Prop({ required: true }) receiverPhone: string;

  // Địa chỉ chuẩn hoá (ref Address)
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

  // Kho/bưu cục
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true })
  originBranchId: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true })
  destinationBranchId: Types.ObjectId;

  // Dịch vụ
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: true,
  })
  serviceId: Types.ObjectId;

  // Khối lượng/kích thước
  @Prop({ required: true, min: 0 }) weightKg: number;
  @Prop() lengthCm?: number;
  @Prop() widthCm?: number;
  @Prop() heightCm?: number;

  // Thông tin tính phí (snapshot)
  @Prop() volumetricWeightKg?: number;
  @Prop() chargeableWeightKg?: number;
  @Prop() distanceKm?: number;

  @Prop({ required: true, min: 0 })
  shippingFee: number;

  @Prop({ type: String, enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop() deliveredAt?: Date;
  @Prop() failedReason?: string;

  @Prop({
    type: [{ status: String, timestamp: Date, note: String }],
    default: [],
  })
  timeline: Array<{ status: string; timestamp: Date; note?: string }>;

  // soft delete fields (plugin)
  @Prop({ default: false }) isDeleted: boolean;
  @Prop() deletedAt?: Date;
  @Prop({ type: Object }) deletedBy?: { _id: Types.ObjectId; email: string };
}

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
ShipmentSchema.index({ trackingNumber: 1 }, { unique: true });
ShipmentSchema.index({ status: 1, createdAt: -1 });

ShipmentSchema.plugin(softDeletePlugin);
