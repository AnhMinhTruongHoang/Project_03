import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import mongoose, { HydratedDocument, Types } from 'mongoose';
import { softDeletePlugin } from 'soft-delete-plugin-mongoose';
import { Province } from './province.schema';
import { Commune } from './Commune.schema';

@Schema({
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
})
export class Address {
  @Prop({ type: Types.ObjectId, ref: Province.name, required: true })
  provinceId: Types.ObjectId;

  @Prop({ type: Types.ObjectId, ref: Commune.name, required: true })
  communeId: Types.ObjectId;

  /** Trường lưu trữ thực tế trong DB */
  @Prop({ type: String, required: false })
  address?: string;

  /** Các trường seeder đang dùng */
  @Prop({ type: Number }) lat?: number;
  @Prop({ type: Number }) lng?: number;
  @Prop({ type: String }) contactName?: string;
  @Prop({ type: String }) contactPhone?: string;
  @Prop({ type: Boolean, default: true }) isActive?: boolean;

  /** Soft delete cho phù hợp SoftDeleteModel */
  @Prop({ default: false }) isDeleted?: boolean;
  @Prop() deletedAt?: Date;
  @Prop({ type: Object }) deletedBy?: { _id: Types.ObjectId; email: string };

  /** ---- Virtual alias ----
   *  line1 <-> address (để seeder xài line1 mà vẫn lưu vào address)
   */
  // Khai báo type để TS không báo lỗi khi truy cập .line1
  line1?: string;
}

export type AddressDocument = HydratedDocument<Address>;
export const AddressSchema = SchemaFactory.createForClass(Address);

/** Virtual getter/setter cho line1 */
AddressSchema.virtual('line1')
  .get(function (this: any) {
    return this.address;
  })
  .set(function (this: any, v: string) {
    this.address = v;
  });

/** Index gợi ý */
AddressSchema.index({ provinceId: 1, communeId: 1, isDeleted: 1 });
AddressSchema.index({ contactName: 1, isDeleted: 1 });

/** Soft-delete plugin */
AddressSchema.plugin(softDeletePlugin);
