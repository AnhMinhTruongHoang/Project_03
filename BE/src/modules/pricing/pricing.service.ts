
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Types } from 'mongoose';
import { IUser } from 'src/types/user.interface';
import { Pricing, PricingDocument } from './schemas/pricing.schemas';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(Pricing.name)
    private pricingModel: SoftDeleteModel<PricingDocument>,
  ) {}

  create(dto: any) {
    return this.pricingModel.create({
      ...dto,
      effectiveFrom: dto.effectiveFrom ?? new Date(),
    });
  }

  async findAll(currentPage = 1, limit = 10, queryObj: any = {}) {
    const { filter, sort, population } = aqp(queryObj);
    delete (filter as any).current;
    delete (filter as any).pageSize;

    if (filter.isDeleted === undefined) (filter as any).isDeleted = false;

    const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
    const size = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (page - 1) * size;

    const total = await this.pricingModel.countDocuments(filter);
    const pages = Math.ceil(total / size);

    const q = this.pricingModel
      .find(filter)
      .sort(sort as any)
      .skip(skip)
      .limit(size);
    if (population) q.populate(population as any);
    const results = await q.exec();

    return { meta: { current: page, pageSize: size, pages, total }, results };
  }

  async findOne(id: string) {
    const doc = await this.pricingModel.findById(id);
    if (!doc || doc.isDeleted) throw new NotFoundException('Pricing not found');
    return doc;
  }

  async update(id: string, dto: any) {
    const doc = await this.pricingModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!doc || doc.isDeleted) throw new NotFoundException('Pricing not found');
    return doc;
  }

  // Soft delete đúng chuẩn plugin
  async remove(id: string, user?: IUser) {
    const res = await this.pricingModel.softDelete({
      _id: id,
      deletedBy: user?._id
        ? { _id: new Types.ObjectId(user._id), email: user.email }
        : undefined,
    } as any);
    if (!res || (res as any).modifiedCount === 0)
      throw new NotFoundException('Pricing not found');
    return { message: 'Pricing soft-deleted' };
  }

  // Tính phí theo km + cân nặng
  async calculate(serviceId: string, km: number, weightKg: number) {
    const now = new Date();

    const slab = await this.pricingModel.findOne({
      serviceId,
      isActive: true,
      isDeleted: false,
      minWeightKg: { $lte: weightKg },
      maxWeightKg: { $gte: weightKg },
      minKm: { $lte: km },
      maxKm: { $gte: km },
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $exists: false } },
        { effectiveTo: { $gte: now } },
      ],
    });

    if (!slab)
      throw new NotFoundException(
        'No pricing slab found for given km & weight',
      );

    if (slab.flatFee != null) return slab.flatFee;

    const fee =
      (slab.baseFee ?? 0) +
      (slab.perKm ?? 0) * km +
      (slab.perKg ?? 0) * weightKg;
    // nếu cần làm tròn:
    return Math.round(fee);
  }
}
