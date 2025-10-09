import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import aqp from 'api-query-params';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Service, ServiceDocument } from './schemas/service.schemas';

@Injectable()
export class ServicesService {
  constructor(
    @InjectModel(Service.name)
    private serviceModel: SoftDeleteModel<ServiceDocument>,
  ) {}

  async create(createServiceDto: CreateServiceDto) {
    return this.serviceModel.create(createServiceDto);
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.serviceModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const results = await this.serviceModel
      .find(filter)
      .skip(offset)
      .limit(limit)
      .sort(sort as any)
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
    const service = await this.serviceModel.findById(id);
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
    return service;
  }

  async update(id: string, updateServiceDto: UpdateServiceDto) {
    const service = await this.serviceModel.findByIdAndUpdate(
      id,
      updateServiceDto,
      { new: true },
    );
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');
    return service;
  }

  async remove(id: string) {
    const service = await this.serviceModel.findById(id);
    if (!service) throw new NotFoundException('Không tìm thấy dịch vụ');

    service.isDeleted = true;
    service.deletedAt = new Date();
    await service.save();

    return { message: 'Đã xóa dịch vụ' };
  }
}
