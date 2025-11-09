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
  async getStatistics(month?: number, year?: number) {
    const filter: any = { isDeleted: false };

    // Nếu có year hoặc month thì lọc theo createdAt
    if (year) {
      const start = new Date(year, month ? month - 1 : 0, 1);
      const end = new Date(year, month ? month : 12, 0, 23, 59, 59, 999);
      filter.createdAt = { $gte: start, $lte: end };
    }

    const orders = await this.orderModel.find(filter).lean();

    // Phần còn lại giữ nguyên
    const statusKeys = Object.values(OrderStatus);
    const statusCounts: Record<OrderStatus, number> = statusKeys.reduce(
      (acc, k) => {
        acc[k as OrderStatus] = 0;
        return acc;
      },
      {} as Record<OrderStatus, number>,
    );

    let totalOrders = 0;
    let estimatedRevenue = 0;

    for (const o of orders) {
      const st = o.status as OrderStatus;
      if (st && statusCounts[st] !== undefined) statusCounts[st]++;
      totalOrders++;
      if (st === OrderStatus.COMPLETED)
        estimatedRevenue += Number((o as any).totalPrice || 0);
    }

    const initDayBucket = () =>
      statusKeys.reduce((acc, k) => {
        (acc as any)[k] = 0;
        return acc;
      }, {} as Record<OrderStatus, number>);

    const ordersByDay = {
      T2: initDayBucket(),
      T3: initDayBucket(),
      T4: initDayBucket(),
      T5: initDayBucket(),
      T6: initDayBucket(),
      T7: initDayBucket(),
      CN: initDayBucket(),
    };

    for (const o of orders) {
      const created = new Date((o as any).createdAt);
      const day = created.getDay(); // 0=CN,1=T2,...
      const key = (
        day === 0 ? 'CN' : `T${day + 1}`
      ) as keyof typeof ordersByDay;
      const st = o.status as OrderStatus;
      (ordersByDay[key] as any)[st] = ((ordersByDay[key] as any)[st] || 0) + 1;
    }

    const productCount: Record<string, number> = {};
    for (const o of orders) {
      if (!(o as any).items) continue;
      for (const it of (o as any).items) {
        productCount[it.productName] =
          (productCount[it.productName] || 0) + it.quantity;
      }
    }
    const topProducts = Object.entries(productCount)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    return {
      totalOrders,
      estimatedRevenue,
      statusCounts,
      statusDistribution: statusCounts,
      ordersByDay,
      delivered: statusCounts[OrderStatus.COMPLETED],
      returned: statusCounts[OrderStatus.CANCELED],
      topProducts,
    };
  }
}
