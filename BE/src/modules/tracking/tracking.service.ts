import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import mongoose, { Connection, Types } from 'mongoose';
import { CreateTrackingDto } from './dto/create-tracking.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import {
  Tracking,
  TrackingDocument,
  TrackingStatus,
} from './schemas/tracking.schemas';

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(Tracking.name)
    private readonly trackingModel: SoftDeleteModel<TrackingDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  private async touchShipmentTimeline(
    shipmentId: string,
    status: TrackingStatus,
    note?: string,
  ) {
    const ShipmentModel = this.connection.model('Shipment');
    const shipment: any = await ShipmentModel.findById(shipmentId);
    if (!shipment) throw new NotFoundException('Shipment not found');

    // cập nhật status + deliveredAt nếu cần
    shipment.status = status;
    if (status === 'DELIVERED') shipment.deliveredAt = new Date();
    if (status === 'FAILED')
      shipment.failedReason = note ?? shipment.failedReason;

    shipment.timeline.push({ status, timestamp: new Date(), note });
    await shipment.save();
  }

  async create(dto: CreateTrackingDto, user: { _id: string; email: string }) {
    // đảm bảo shipment tồn tại
    const ShipmentModel = this.connection.model('Shipment');
    const shipmentExists = await ShipmentModel.exists({
      _id: dto.shipmentId,
      isDeleted: false,
    });
    if (!shipmentExists) throw new BadRequestException('Shipment không hợp lệ');

    const tracking = await this.trackingModel.create({
      ...dto,
      timestamp: new Date(),
      createdBy: { _id: new Types.ObjectId(user._id), email: user.email },
    });

    // đồng bộ vào Shipment.timeline + status
    await this.touchShipmentTimeline(dto.shipmentId, dto.status, dto.note);

    return tracking;
  }

  async findAll(currentPage = 1, limit = 10, queryObj: any = {}) {
    const { filter, sort, population } = aqp(queryObj);
    delete (filter as any).current;
    delete (filter as any).pageSize;
    if (filter.isDeleted === undefined) (filter as any).isDeleted = false;

    const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
    const size = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (page - 1) * size;

    const total = await this.trackingModel.countDocuments(filter);
    const pages = Math.ceil(total / size);

    const q = this.trackingModel
      .find(filter)
      .sort(sort as any)
      .skip(skip)
      .limit(size)
      .populate('shipmentId')
      .populate('branchId');

    if (population) q.populate(population as any);

    const results = await q.exec();
    return { meta: { current: page, pageSize: size, pages, total }, results };
  }

  async findByShipment(shipmentId: string) {
    return this.trackingModel
      .find({ shipmentId, isDeleted: false })
      .sort({ timestamp: 1 })
      .populate('branchId')
      .exec();
  }

  async findOne(id: string) {
    const tracking = await this.trackingModel.findById(id);
    if (!tracking || tracking.isDeleted)
      throw new NotFoundException('Tracking not found');
    return tracking;
  }

  async update(id: string, dto: UpdateTrackingDto) {
    const tracking = await this.trackingModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!tracking || tracking.isDeleted)
      throw new NotFoundException('Tracking not found');

    // nếu đổi status → cập nhật Shipment
    if (dto.status) {
      await this.touchShipmentTimeline(
        String(tracking.shipmentId),
        dto.status,
        dto.note,
      );
    }
    return tracking;
  }

  // SOFT DELETE
  async remove(id: string, user: { _id: string; email: string }) {
    const res = await this.trackingModel.softDelete({
      _id: id,
      deletedBy: { _id: new Types.ObjectId(user._id), email: user.email },
    } as any);
    if (!res || (res as any).modifiedCount === 0) {
      throw new NotFoundException('Tracking not found');
    }
    return { message: 'Tracking soft-deleted' };
  }

  async restore(id: string) {
    const res = await this.trackingModel.restore({ _id: id } as any);
    if (!res || (res as any).modifiedCount === 0) {
      throw new NotFoundException('Tracking not found or not deleted');
    }
    return { message: 'Tracking restored' };
  }
}
