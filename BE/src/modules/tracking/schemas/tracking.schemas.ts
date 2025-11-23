// tracking.schema.ts - ĐÃ SỬA HOÀN CHỈNH CHO HỆ THỐNG BƯU ĐIỆN

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type TrackingDocument = HydratedDocument<Tracking>;

export enum TrackingStatus {
  CREATED = 'CREATED',           // Đã tạo đơn (người gửi mang đến)
  ACCEPTED = 'ACCEPTED',         // Bưu cục tiếp nhận
  IN_TRANSIT = 'IN_TRANSIT',     // Đang luân chuyển
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', // Phát thành công/neu that bai
  DELIVERED = 'DELIVERED',       // Phát thành công
  FAILED = 'FAILED',             // Phát thất bại
  RETURNED = 'RETURNED',         // Hoàn về bưu cục gốc
  CANCELED = 'CANCELED',         // Hủy đơn
}

@Schema({ timestamps: true })
export class Tracking {
  // ĐỔI TỪ shipmentId → orderId (vì Order chính là vận đơn!)
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',                  // ← Đổi thành Order
    required: true,
  })
  orderId: Types.ObjectId;

  @Prop({ required: true, enum: TrackingStatus })
  status: TrackingStatus;

  @Prop() location?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;

  @Prop() note?: string;

  @Prop({ type: Object })
  createdBy?: { _id: Types.ObjectId; email: string };

  // soft-delete
  @Prop({ default: false }) isDeleted: boolean;
  @Prop() deletedAt?: Date;
  @Prop({ type: Object }) deletedBy?: { _id: Types.ObjectId; email: string };
}

export const TrackingSchema = SchemaFactory.createForClass(Tracking);

// Index tối ưu cho tra cứu
TrackingSchema.index({ orderId: 1, timestamp: -1 });
TrackingSchema.index({ status: 1, isDeleted: 1 });
TrackingSchema.index({ branchId: 1, timestamp: -1 });
TrackingSchema.plugin(softDeletePlugin);