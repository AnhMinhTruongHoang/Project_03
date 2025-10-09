import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type ServiceDocument = HydratedDocument<Service> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Service {
  @Prop({ required: true, unique: true })
  code: string; // Ví dụ: "EXPRESS", "STANDARD", "SAME_DAY"

  @Prop({ required: true })
  name: string; // Tên dịch vụ

  @Prop()
  description?: string;

  @Prop({ required: true })
  basePrice: number; // Giá cơ bản

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

export const ServiceSchema = SchemaFactory.createForClass(Service);
