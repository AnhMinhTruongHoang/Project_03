import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Province } from './schemas/province.schema';
import { District } from './schemas/district.schema';
import { Ward } from './schemas/ward.schema';
import { Address } from './schemas/address.schema';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Province.name) private provinceModel: Model<Province>,
    @InjectModel(District.name) private districtModel: Model<District>,
    @InjectModel(Ward.name) private wardModel: Model<Ward>,
    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

  async getProvinces() {
    return this.provinceModel.find({ isActive: true }).sort({ name: 1 });
  }

  async getDistricts(provinceId: string) {
    return this.districtModel
      .find({ provinceId, isActive: true })
      .sort({ name: 1 });
  }

  async getWards(districtId: string) {
    return this.wardModel
      .find({ districtId, isActive: true })
      .sort({ name: 1 });
  }

  async createAddress(dto: any) {
    const address = new this.addressModel(dto);
    return address.save();
  }

  async getAddressById(id: string) {
    return this.addressModel
      .findById(id)
      .populate(['provinceId', 'districtId', 'wardId']);
  }
}
