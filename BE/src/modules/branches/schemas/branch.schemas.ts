import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';

export type BranchDocument = HydratedDocument<Branch> & {
  createdAt: Date;
  updatedAt: Date;
};

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, unique: true })
  code: string;

  @Prop({ required: true })
  name: string;

  @Prop({ required: true })
  address: string;

  @Prop()
  phone: string;

  @Prop({ required: false })
  postalCode?: string;

  @Prop({ required: false })
  city?: string;

  @Prop({ required: false })
  province?: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: false })
  managerId?: mongoose.Types.ObjectId;

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

export const BranchSchema = SchemaFactory.createForClass(Branch);
