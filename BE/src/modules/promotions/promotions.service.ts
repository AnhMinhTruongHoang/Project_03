import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { IUser } from 'src/types/user.interface';
import { Promo, PromoDocument } from './schema/promotion.schema';

@Injectable()
export class PromosService {
  constructor(
    @InjectModel(Promo.name)
    private promoModel: SoftDeleteModel<PromoDocument>,
  ) {}

  async create(data: Partial<Promo>, user: IUser): Promise<PromoDocument> {
    const created = new this.promoModel({
      ...data,
      createdBy: { _id: user._id, email: user.email },
    });
    return created.save();
  }

  async findAll(): Promise<PromoDocument[]> {
    return this.promoModel.find().exec();
  }

  async findOne(id: string): Promise<PromoDocument> {
    const promo = await this.promoModel.findById(id).exec();
    if (!promo) throw new NotFoundException('Promo not found');
    return promo;
  }

  async update(
    id: string,
    data: Partial<Promo>,
    user: IUser,
  ): Promise<PromoDocument> {
    const updated = await this.promoModel.findByIdAndUpdate(
      id,
      {
        ...data,
        updatedBy: { _id: user._id, email: user.email },
      },
      { new: true },
    );
    if (!updated) throw new NotFoundException('Promo not found');
    return updated;
  }

  async remove(id: string, user: IUser): Promise<void> {
    const res = await this.promoModel.softDelete({
      _id: id,
      deletedBy: { _id: user._id, email: user.email },
    });
    if (!res || res.deleted === 0)
      throw new NotFoundException('Promo not found');
  }
}
