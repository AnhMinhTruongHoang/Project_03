import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Model, Types } from 'mongoose';
import { IUser } from 'src/types/user.interface';
import { Pricing, PricingDocument } from './schemas/pricing.schemas';
import { Branch, BranchDocument } from '../branches/schemas/branch.schemas';
import { Province } from '../location/schemas/province.schema';
import { Commune } from '../location/schemas/Commune.schema';
import { Address } from '../location/schemas/address.schema';

@Injectable()
export class PricingService {
  constructor(
    @InjectModel(Pricing.name)
    private pricingModel: SoftDeleteModel<PricingDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>,
    @InjectModel(Province.name) private provinceModel: Model<Province>,
    @InjectModel(Commune.name) private communeModel: Model<Commune>,
    @InjectModel(Address.name) private addressModel: Model<Address>,
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

  ///cal

  async calculateShipping(
    originRegion: 'North' | 'Central' | 'South',
    destRegion: 'North' | 'Central' | 'South',
    serviceCode: 'STD' | 'EXP',
    weightKg: number,
    isLocal: boolean,
  ) {
    // 1) Nội thành + gần kho => free ship
    if (isLocal) {
      return {
        totalPrice: 0,
        description: 'Free ship (nội thành/gần kho)',
      };
    }

    // 2) Giá base theo loại dịch vụ
    const SERVICE_BASE_PRICE: Record<'STD' | 'EXP', number> = {
      STD: 20000,
      EXP: 40000,
    };

    const baseServicePrice = SERVICE_BASE_PRICE[serviceCode];
    if (baseServicePrice == null) {
      throw new NotFoundException('Service code không hợp lệ');
    }

    // 3) Phụ phí theo vùng
    let regionFee = 0;
    const pair = new Set([originRegion, destRegion]);

    // North <-> Central
    if (pair.has('North') && pair.has('Central')) {
      regionFee = 10000;
    }
    // North <-> South
    else if (pair.has('North') && pair.has('South')) {
      regionFee = 15000;
    }
    // South <-> Central
    else if (pair.has('South') && pair.has('Central')) {
      regionFee = 10000;
    }
    // Cùng vùng: theo công thức hiện tại = 0
    // (nếu sau này bạn cần thêm nội vùng thì cộng ở đây)

    // 4) Phụ phí quá 5kg
    const overweightFee = weightKg > 5 ? 5000 : 0;

    const totalPrice = baseServicePrice + regionFee + overweightFee;

    return {
      totalPrice,
      breakdown: {
        serviceCode,
        baseServicePrice,
        regionFee,
        overweightFee,
        originRegion,
        destRegion,
        isLocal,
      },
    };
  }
}
