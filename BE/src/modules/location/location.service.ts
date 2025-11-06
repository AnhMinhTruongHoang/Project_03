import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Province } from './schemas/province.schema';
import { District } from './schemas/district.schema';
import { Address } from './schemas/address.schema';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Province.name) private provinceModel: Model<Province>,
    @InjectModel(District.name) private districtModel: Model<District>,

    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

  async getProvinces() {
    return this.provinceModel.find({ isActive: true }).sort({ name: 1 });
  }

  async getDistricts(provinceId: string) {
    if (!provinceId) throw new BadRequestException('provinceId is required');
    return this.districtModel
      .find({ provinceId, isActive: true })
      .sort({ name: 1 });
  }

  async createAddress(dto: any) {
    // dto chỉ còn: provinceId, districtId, address (string tuỳ bạn)
    if (!dto?.provinceId || !dto?.districtId) {
      throw new BadRequestException('provinceId and districtId are required');
    }
    const address = new this.addressModel(dto);
    return address.save();
  }

  async getAddressById(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    return this.addressModel
      .findById(id)
      .populate(['provinceId', 'districtId']);
  }
}
