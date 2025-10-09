import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import aqp from 'api-query-params';
import { IUser } from 'src/types/user.interface';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Pricing, PricingDocument } from './schemas/pricing.schemas';
import mongoose from 'mongoose';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(Pricing.name)
    private pricingModel: SoftDeleteModel<PricingDocument>,
  ) {}

  async create(createPricingDto: CreatePricingDto) {
    return this.pricingModel.create(createPricingDto);
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.pricingModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const results = await this.pricingModel
      .find(filter)
      .skip(offset)
      .limit(limit)
      .sort(sort as any)
      .populate('serviceId')
      .populate(population)
      .exec();

    return {
      meta: {
        current: currentPage,
        pageSize: limit,
        pages: totalPages,
        total: totalItems,
      },
      results,
    };
  }

  async findOne(id: string) {
    const pricing = await this.pricingModel.findById(id).populate('serviceId');
    if (!pricing) throw new NotFoundException('Pricing not found');
    return pricing;
  }

  async update(id: string, updatePricingDto: UpdatePricingDto) {
    const pricing = await this.pricingModel.findByIdAndUpdate(
      id,
      updatePricingDto,
      { new: true },
    );
    if (!pricing) throw new NotFoundException('Pricing not found');
    return pricing;
  }

  async remove(id: string, user: IUser) {
    const pricing = await this.pricingModel.findById(id);
    if (!pricing) throw new NotFoundException('Pricing not found');

    pricing.isDeleted = true;
    pricing.deletedAt = new Date();
    pricing.deletedBy = {
      _id: new mongoose.Types.ObjectId(user._id),
      email: user.email,
    };

    await pricing.save();
    return { message: 'Pricing deleted' };
  }

  //  Hàm tính giá tự động theo trọng lượng, zone và service
  async calculate(serviceId: string, weight: number, zone: string) {
    const pricing = await this.pricingModel.findOne({
      serviceId,
      zone,
      minWeight: { $lte: weight },
      maxWeight: { $gte: weight },
      isActive: true,
      isDeleted: false,
    });

    if (!pricing)
      throw new NotFoundException('No pricing found for weight range');
    return pricing.price;
  }
}
