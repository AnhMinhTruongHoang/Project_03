import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import aqp from 'api-query-params';
import { IUser } from 'src/types/user.interface';
import { Order, OrderDocument, OrderStatus } from './schemas/order.schemas';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: SoftDeleteModel<OrderDocument>,
  ) {}

  async create(createOrderDto: CreateOrderDto, user: IUser) {
    return this.orderModel.create({
      ...createOrderDto,
      userId: user._id,
    });
  }

  async findAll(currentPage = 1, limit = 10, qs?: string) {
    const { filter, sort, population } = aqp(qs);
    delete filter.current;
    delete filter.pageSize;

    const offset = (currentPage - 1) * limit;
    const totalItems = await this.orderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / limit);

    const results = await this.orderModel
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
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async update(id: string, updateOrderDto: UpdateOrderDto) {
    const order = await this.orderModel.findByIdAndUpdate(id, updateOrderDto, {
      new: true,
    });
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }

  async remove(id: string, user: IUser) {
    const order = await this.orderModel.findById(id);
    if (!order) throw new NotFoundException('Order not found');

    order.isDeleted = true;
    order.deletedAt = new Date();
    order.deletedBy = {
      _id: user._id,
      email: user.email,
    };
    await order.save();

    return { message: 'Order deleted' };
  }

  async updateStatus(id: string, status: OrderStatus) {
    const order = await this.orderModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!order) throw new NotFoundException('Order not found');
    return order;
  }
}
