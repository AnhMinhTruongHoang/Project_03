import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Province } from './schemas/province.schema';
import { Commune } from './schemas/commune.schema'; // lưu ý tên file/Model
import { Address } from './schemas/address.schema';
import { Public } from 'src/health/decorator/customize';
import { UpdateAddressDto } from './dto/update-location.dto';

@Injectable()
export class LocationService {
  constructor(
    @InjectModel(Province.name) private provinceModel: Model<Province>,
    @InjectModel(Commune.name) private communeModel: Model<Commune>,
    @InjectModel(Address.name) private addressModel: Model<Address>,
  ) {}

  @Public()
  async getProvinces() {
    return this.provinceModel.find({ isActive: true }).sort({ name: 1 });
  }

  @Public()
  async getCommunes(provinceId: string) {
    if (!provinceId) throw new BadRequestException('provinceId is required');
    return this.communeModel
      .find({ provinceId, isActive: true })
      .sort({ name: 1 });
  }

  async listAddresses(current = 1, pageSize = 10, q?: string) {
    const filter: any = {};
    if (q) {
      filter.$or = [
        { address: new RegExp(q, 'i') },
        { contactName: new RegExp(q, 'i') },
      ];
    }

    const skip = (current - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.addressModel.find(filter).skip(skip).limit(pageSize).lean(),
      this.addressModel.countDocuments(filter),
    ]);

    return { current, pageSize, total, items };
  }

  async createAddress(dto: any) {
    if (!dto?.provinceId || !dto?.communeId) {
      throw new BadRequestException('provinceId and communeId are required');
    }
    const address = new this.addressModel(dto);
    return address.save();
  }

  async updateAddress(id: string, dto: UpdateAddressDto) {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundException('Invalid id');

    const allowed: (keyof UpdateAddressDto)[] = [
      'line1',
      'lat',
      'lng',
      'contactName',
      'contactPhone',
      'provinceId',
      'communeId', 
    ];
    const $set: any = {};
    for (const k of allowed) if (dto[k] !== undefined) $set[k] = dto[k];

    const doc = await this.addressModel
      .findByIdAndUpdate(id, { $set }, { new: true, runValidators: true })
      .lean();

    if (!doc) throw new NotFoundException('Address not found');
    return doc;
  }

  async getAddressById(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid id');
    return this.addressModel.findById(id).populate(['provinceId', 'communeId']);
  }
}
