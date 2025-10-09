import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type PaymentDocument = HydratedDocument<Payment>;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true })
  orderId: mongoose.Types.ObjectId;

  @Prop({ required: true })
  amount: number;

  @Prop({
    required: true,
    enum: ['COD', 'MOMO', 'VNPAY', 'BANK_TRANSFER', 'CREDIT_CARD'],
  })
  method: string;

  @Prop({
    default: 'pending',
    enum: ['pending', 'paid', 'failed', 'refunded'],
  })
  status: string;

  @Prop({ unique: true, sparse: true })
  transactionId?: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop()
  deletedAt?: Date;

  @Prop({ type: Object })
  createdBy?: { _id: mongoose.Types.ObjectId; email: string };

  @Prop({ type: Object })
  updatedBy?: { _id: mongoose.Types.ObjectId; email: string };

  @Prop({ type: Object })
  deletedBy?: { _id: mongoose.Types.ObjectId; email: string };
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
