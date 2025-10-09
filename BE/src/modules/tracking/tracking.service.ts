import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateTrackingDto } from './dto/create-tracking.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import aqp from 'api-query-params';
import { IUser } from 'src/types/user.interface';
import mongoose from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Tracking, TrackingDocument } from './schemas/tracking.schemas';

@Injectable()
export class TrackingService {
  constructor(
    @InjectModel(Tracking.name)
    private trackingModel: SoftDeleteModel<TrackingDocument>,
  ) {}

  async create(createTrackingDto: CreateTrackingDto, user: IUser) {
    const tracking = new this.trackingModel({
      ...createTrackingDto,
      timestamp: new Date(),
      createdBy: {
        _id: new mongoose.Types.ObjectId(user._id),
        email: user.email,
      },
    });
    return tracking.save();
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.trackingModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const results = await this.trackingModel
      .find(filter)
      .skip(offset)
      .limit(limit)
      .sort(sort as any)
      .populate('shipmentId')
      .populate('branchId')
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

  async findByShipment(shipmentId: string) {
    return this.trackingModel
      .find({ shipmentId })
      .sort({ timestamp: 1 })
      .populate('branchId')
      .exec();
  }

  async findOne(id: string) {
    const tracking = await this.trackingModel.findById(id);
    if (!tracking) throw new NotFoundException('Tracking not found');
    return tracking;
  }

  async update(id: string, updateTrackingDto: UpdateTrackingDto) {
    const tracking = await this.trackingModel.findByIdAndUpdate(
      id,
      updateTrackingDto,
      { new: true },
    );
    if (!tracking) throw new NotFoundException('Tracking not found');
    return tracking;
  }

  async remove(id: string, user: IUser) {
    const tracking = await this.trackingModel.findById(id);
    if (!tracking) throw new NotFoundException('Tracking not found');

    tracking.isDeleted = true;
    tracking.deletedAt = new Date();
    tracking.deletedBy = {
      _id: new mongoose.Types.ObjectId(user._id),
      email: user.email,
    };

    await tracking.save();
    return { message: 'Tracking deleted' };
  }
}
