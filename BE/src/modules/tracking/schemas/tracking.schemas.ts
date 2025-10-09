import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type TrackingDocument = HydratedDocument<Tracking>;

export enum TrackingStatus {
  CREATED = 'CREATED', // Mới tạo vận đơn
  ACCEPTED = 'ACCEPTED', // Đã tiếp nhận tại bưu cục
  IN_TRANSIT = 'IN_TRANSIT', // Đang trung chuyển
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY', // Đang giao hàng
  DELIVERED = 'DELIVERED', // Giao thành công
  FAILED = 'FAILED', // Giao thất bại
  RETURNED = 'RETURNED', // Hoàn hàng
  CANCELED = 'CANCELED', // Hủy đơn
}

@Schema({ timestamps: true })
export class Tracking {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true,
  })
  shipmentId: mongoose.Types.ObjectId;

  @Prop({ required: true, enum: TrackingStatus })
  status: TrackingStatus;

  @Prop()
  location?: string;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Branch',
    required: false,
  })
  branchId?: mongoose.Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;

  @Prop()
  note?: string;

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Types.ObjectId;
    email: string;
  };

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

export const TrackingSchema = SchemaFactory.createForClass(Tracking);
