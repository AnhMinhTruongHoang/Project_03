import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument } from 'mongoose';
import { Commune } from 'src/modules/location/schemas/Commune.schema';
import { Province } from 'src/modules/location/schemas/province.schema';

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

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Province.name,
    required: false,
  })
  provinceId?: mongoose.Types.ObjectId;

  @Prop({
    type: mongoose.Schema.Types.ObjectId,
    ref: Commune.name,
    required: false,
  })
  communeId?: mongoose.Types.ObjectId;

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

BranchSchema.index({ code: 1 }, { unique: true });
BranchSchema.index({ name: 1 });
BranchSchema.index({ isDeleted: 1 });
