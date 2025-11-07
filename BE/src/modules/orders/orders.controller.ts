import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Types } from 'mongoose';

import { IUser } from 'src/types/user.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

import { Order, OrderDocument, OrderStatus } from './schemas/order.schemas';
import { Address, AddressDocument } from '../location/schemas/address.schema';
import {
  District,
  DistrictDocument,
} from '../location/schemas/district.schema';
import {
  Province,
  ProvinceDocument,
} from '../location/schemas/province.schema';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,

    @InjectModel(Address.name)
    private readonly addressModel: SoftDeleteModel<AddressDocument>,

    @InjectModel(District.name)
    private readonly districtModel: SoftDeleteModel<DistrictDocument>,

    @InjectModel(Province.name)
    private readonly provinceModel: SoftDeleteModel<ProvinceDocument>,
  ) {}

  /* ---------------- CREATE ---------------- */
  async create(dto: CreateOrderDto, user: IUser) {
    if (!dto.pickupAddressId || !dto.deliveryAddressId) {
      throw new BadRequestException(
        'Both pickup and delivery addresses required',
      );
    }
    return this.orderModel.create({
      ...dto,
      userId: new Types.ObjectId(user._id),
    });
  }

  /* ---------------- LIST ---------------- */
  async findAll(currentPage = 1, limit = 10, queryObj: any = {}) {
    const { filter, sort, population } = aqp(queryObj);
    delete (filter as any).current;
    delete (filter as any).pageSize;

    if (filter.isDeleted === undefined) (filter as any).isDeleted = false;

    const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
    const size = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (page - 1) * size;

    const total = await this.orderModel.countDocuments(filter);
    const pages = Math.ceil(total / size);

    const q = this.orderModel
      .find(filter)
      .sort(sort as any)
      .skip(skip)
      .limit(size)
      .populate({
        path: 'pickupAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'districtId', model: District.name },
        ],
      })
      .populate({
        path: 'deliveryAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'districtId', model: District.name },
        ],
      });

    if (population) q.populate(population as any);
    const results = await q.exec();

    return {
      meta: { current: page, pageSize: size, pages, total },
      results,
    };
  }

  /* ---------------- DETAIL ---------------- */
  async findOne(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate({
        path: 'pickupAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'districtId', model: District.name },
        ],
      })
      .populate({
        path: 'deliveryAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'districtId', model: District.name },
        ],
      });

    if (!order || order.isDeleted)
      throw new NotFoundException('Order not found');
    return order;
  }

  /* ---------------- UPDATE ---------------- */
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.orderModel.findByIdAndUpdate(id, dto, {
      new: true,
    });
    if (!order || order.isDeleted)
      throw new NotFoundException('Order not found');
    return order;
  }

  /* ---------------- SOFT DELETE ---------------- */
  async remove(id: string, user: IUser) {
    const res = await this.orderModel.softDelete({
      _id: id,
      deletedBy: { _id: new Types.ObjectId(user._id), email: user.email },
    } as any);

    if (!res || (res as any).modifiedCount === 0)
      throw new NotFoundException('Order not found');

    return { message: 'Order soft-deleted' };
  }

  /* ---------------- STATUS UPDATE ---------------- */
  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!order || order.isDeleted)
      throw new NotFoundException('Order not found');
    return order;
  }
}
