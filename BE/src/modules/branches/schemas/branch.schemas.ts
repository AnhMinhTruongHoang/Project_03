import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';

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

  @Prop()
  provinceName?: string;

  @Prop()
  communeName?: string;

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

BranchSchema.plugin(softDeletePlugin);
BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ name: 1 });
BranchSchema.index({ isDeleted: 1 });
