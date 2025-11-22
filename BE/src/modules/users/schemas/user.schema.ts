import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ required: false, select: false })
  password?: string;

  @Prop()
  name: string;

  @Prop({ type: String })
  phone: string;

  @Prop({ enum: ['MALE', 'FEMALE', 'OTHER'], required: false })
  gender: string;

  @Prop()
  address: string;

  @Prop({ default: 'LOCAL', enum: ['LOCAL', 'GOOGLE', 'FACEBOOK'] })
  accountType: string;

  @Prop({
    default: 'USER',
    enum: ['USER', 'ADMIN', 'STAFF', 'COURIER', 'CUSTOMER'],
  })
  role: string;

  @Prop()
  avatar: string;

  @Prop({ default: false })
  isDeleted: boolean;

  @Prop({ default: false })
  isActive: boolean;

  @Prop()
  codeId: string;

  @Prop()
  codeExpired: Date;

  @Prop({ type: Object })
  createdBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop({ type: Object })
  updatedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  @Prop()
  deletedAt: Date;

  @Prop({ type: Object })
  deletedBy: {
    _id: mongoose.Schema.Types.ObjectId;
    email: string;
  };

  createdAt: Date;
  updatedAt: Date;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'Branch' })
  branchId: mongoose.Schema.Types.ObjectId;

}

export const UserSchema = SchemaFactory.createForClass(User);
