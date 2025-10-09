import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schema/payment.schema';
import { Order, OrderDocument } from '../orders/schemas/order.schemas';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) {}

  async create(orderId: string, method: string) {
    const order = await this.orderModel.findById(orderId);
    if (!order) throw new NotFoundException('Order not found');

    const payment = new this.paymentModel({
      orderId: order._id,
      amount: order.totalPrice,
      method,
      status: 'pending',
    });
    return payment.save();
  }

  async findAll() {
    return this.paymentModel.find().populate('orderId').exec();
  }

  async findOne(id: string) {
    const payment = await this.paymentModel.findById(id).populate('orderId');
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }

  async updateStatus(id: string, status: string) {
    const payment = await this.paymentModel.findByIdAndUpdate(
      id,
      { status },
      { new: true },
    );
    if (!payment) throw new NotFoundException('Payment not found');
    return payment;
  }
}
