import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  Shipment,
  ShipmentDocument,
  ShipmentStatus,
} from './schemas/shipment.schema';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import aqp from 'api-query-params';
import { customAlphabet } from 'nanoid';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name)
    private shipmentModel: SoftDeleteModel<ShipmentDocument>,
  ) {}

  private generateTrackingNumber(): string {
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
    return `VN${nanoid()}`;
  }

  async create(createShipmentDto: CreateShipmentDto, userId: string) {
    const trackingNumber = this.generateTrackingNumber();

    const shipment = await this.shipmentModel.create({
      ...createShipmentDto,
      trackingNumber,
      createdBy: userId,
      timeline: [
        {
          status: ShipmentStatus.PENDING,
          timestamp: new Date(),
          note: 'Đơn hàng được tạo',
        },
      ],
    });

    return shipment;
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (+currentPage - 1) * +limit;
    const totalItems = await this.shipmentModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / +limit);

    const results = await this.shipmentModel
      .find(filter)
      .skip(offset)
      .limit(+limit)
      .sort(sort as any)
      .populate(population)
      .exec();

    return {
      meta: {
        current: +currentPage,
        pageSize: +limit,
        pages: totalPages,
        total: totalItems,
      },
      results,
    };
  }

  async findOne(id: string) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment) throw new NotFoundException('Không tìm thấy vận đơn');
    return shipment;
  }

  async update(
    id: string,
    updateShipmentDto: UpdateShipmentDto,
    userId: string,
  ) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment) throw new NotFoundException('Không tìm thấy vận đơn');

    // Nếu có thay đổi status → ghi log timeline
    if (
      updateShipmentDto.status &&
      updateShipmentDto.status !== shipment.status
    ) {
      shipment.timeline.push({
        status: updateShipmentDto.status,
        timestamp: new Date(),
        note: 'Cập nhật trạng thái vận đơn',
      });

      // Nếu trạng thái là DELIVERED thì set deliveredAt
      if (updateShipmentDto.status === ShipmentStatus.DELIVERED) {
        shipment.deliveredAt = new Date();
      }
    }

    Object.assign(shipment, updateShipmentDto);
    await shipment.save();
    return shipment;
  }

  async remove(id: string, userId: string) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment) throw new NotFoundException('Không tìm thấy vận đơn');

    shipment.isDeleted = true;
    shipment.deletedAt = new Date();
    shipment.deletedBy = { _id: userId as any, email: 'system@local' };

    await shipment.save();
    return { message: 'Đã xóa vận đơn' };
  }
}
