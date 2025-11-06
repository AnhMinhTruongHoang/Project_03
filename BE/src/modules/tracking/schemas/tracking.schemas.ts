import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

export type TrackingDocument = HydratedDocument<Tracking>;

export enum TrackingStatus {
  CREATED = 'CREATED',
  ACCEPTED = 'ACCEPTED',
  IN_TRANSIT = 'IN_TRANSIT',
  OUT_FOR_DELIVERY = 'OUT_FOR_DELIVERY',
  DELIVERED = 'DELIVERED',
  FAILED = 'FAILED',
  RETURNED = 'RETURNED',
  CANCELED = 'CANCELED',
}

@Schema({ timestamps: true })
export class Tracking {
  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Shipment',
    required: true,
  })
  shipmentId: Types.ObjectId;

  @Prop({ required: true, enum: TrackingStatus })
  status: TrackingStatus;

  @Prop() location?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' })
  branchId?: Types.ObjectId;

  @Prop({ required: true })
  timestamp: Date;

  @Prop() note?: string;

  @Prop({ type: Object })
  createdBy: { _id: Types.ObjectId; email: string };

  // soft-delete fields
  @Prop({ default: false }) isDeleted: boolean;
  @Prop() deletedAt?: Date;
  @Prop({ type: Object }) deletedBy?: { _id: Types.ObjectId; email: string };
}

export const TrackingSchema = SchemaFactory.createForClass(Tracking);
TrackingSchema.index({ shipmentId: 1, timestamp: 1 });
TrackingSchema.index({ status: 1, isDeleted: 1 });
TrackingSchema.plugin(softDeletePlugin);
