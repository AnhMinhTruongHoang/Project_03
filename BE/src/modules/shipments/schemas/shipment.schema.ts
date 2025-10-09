import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ShipmentDocument = HydratedDocument<Shipment> & {
  createdAt: Date;
  updatedAt: Date;
};

export enum ShipmentStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true })
export class Shipment {
  @Prop({ required: true, unique: true })
  trackingNumber: string;

  @Prop({ required: true })
  senderName: string;

  @Prop({ required: true })
  senderPhone: string;

  @Prop({ required: true })
  senderAddress: string;

  @Prop({ required: true })
  receiverName: string;

  @Prop({ required: true })
  receiverPhone: string;

  @Prop({ required: true })
  receiverAddress: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true })
  originBranchId: mongoose.Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true })
  destinationBranchId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  weight: number; // gram hoặc kg

  @Prop({ required: true })
  serviceType: string; // VD: "Chuyển phát nhanh", "Tiết kiệm", ...

  @Prop({ required: true })
  shippingFee: number;

  @Prop({ type: String, enum: ShipmentStatus, default: ShipmentStatus.PENDING })
  status: ShipmentStatus;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: mongoose.Types.ObjectId;

  @Prop()
  deliveredAt: Date;

  @Prop()
  failedReason?: string;

  @Prop({
    type: [
      {
        status: String,
        timestamp: Date,
        note: String,
      },
    ],
    default: [],
  })
  timeline: Array<{
    status: string;
    timestamp: Date;
    note?: string;
  }>;

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

export const ShipmentSchema = SchemaFactory.createForClass(Shipment);
