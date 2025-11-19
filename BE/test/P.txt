import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { Order, OrderDocument } from './Schema/order.schema';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import aqp from 'api-query-params';
import { Product, ProductDocument } from '../products/schema/product.schema';
import { PaymentStatus } from '../payments/schema/payment.schema';
import { VouchersService } from '../voucher/vouchers.service';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name) private orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectConnection() private readonly connection: Connection,
    private readonly vouchersService: VouchersService,
  ) {}

  // CREATE
  async create(data: CreateOrderDto) {
    const {
      userId,
      fullName,
      items,
      phoneNumber,
      shippingAddress,
      status,
      paymentMethod,
      paymentStatus,
      paymentRef,
      voucherCode, // <-- FE truyền vào
    } = data;

    if (!items?.length) {
      throw new BadRequestException('Order items is required');
    }

    // Chuẩn hoá item ids
    const formattedItems = items.map((item) => ({
      ...item,
      productId: new Types.ObjectId(item.productId),
    }));

    // Tính subtotal
    const subtotal = formattedItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );

    // Mặc định không có giảm giá
    let discountAmount = 0;
    let grandTotal = subtotal;
    let appliedVoucherCode: string | null = null;

    // Thử áp dụng voucher nếu có
    if (voucherCode && String(voucherCode).trim()) {
      try {
        const productIds = formattedItems.map((it) => it.productId);
        // Lấy thông tin sp để suy ra categoryIds & brands
        const products = await this.productModel
          .find({ _id: { $in: productIds } })
          .select('_id brand category')
          .lean();

        const categoryIds = Array.from(
          new Set(
            products
              .map((p) => p.category)
              .flat()
              .filter(Boolean)
              .map((id) => String(id)),
          ),
        );

        const brands = Array.from(
          new Set(
            products
              .map((p) => p.brand)
              .filter(Boolean)
              .map((b) => String(b).trim()),
          ),
        );

        const preview = await this.vouchersService.preview({
          code: String(voucherCode).trim(),
          userId:
            userId && Types.ObjectId.isValid(userId)
              ? String(userId)
              : undefined,
          orderSubtotal: subtotal,
          productIds: productIds.map((id) => String(id)),
          categoryIds,
          brands,
        });

        // Tương thích các tên trường trả về
        const discount = Number(
          (preview as any)?.discount ?? (preview as any)?.discountAmount ?? 0,
        );

        discountAmount = Math.max(discount, 0);
        grandTotal = Math.max(subtotal - discountAmount, 0);
        appliedVoucherCode = String(voucherCode).trim();
      } catch (e) {
        // Voucher không hợp lệ -> bỏ qua và không chặn order
        discountAmount = 0;
        grandTotal = subtotal;
        appliedVoucherCode = null;
      }
    }

    // Dữ liệu order
    const orderData: any = {
      fullName,
      items: formattedItems,
      subtotal, // <-- thêm
      discountAmount, // <-- thêm
      totalPrice: grandTotal, // <-- giữ nguyên semantics: tổng cuối
      phoneNumber,
      shippingAddress,
      status: status ?? 'PENDING',
      paymentMethod: paymentMethod ?? 'COD',
      paymentStatus: paymentStatus ?? 'UNPAID',
      paymentRef,
      voucherCode: appliedVoucherCode, // <-- thêm
    };

    // gán userId (nếu hợp lệ)
    if (userId && Types.ObjectId.isValid(userId)) {
      orderData.userId = new Types.ObjectId(userId);
    }

    const created = new this.orderModel(orderData);
    return created.save();
  }

  // FIND ALL with pagination, filtering, sorting
  async findAll(currentPage: number, limit: number, qs: string) {
    const { filter, sort, population } = aqp(qs);
    delete (filter as any).current;
    delete (filter as any).pageSize;

    const page = Math.max(1, +currentPage || 1);
    const defaultLimit = Math.max(1, +limit || 10);
    const offset = (page - 1) * defaultLimit;

    const totalItems = await this.orderModel.countDocuments(filter);
    const totalPages = Math.ceil(totalItems / defaultLimit);

    const result = await this.orderModel
      .find(filter)
      .skip(offset)
      .limit(defaultLimit)
      .sort((sort as any) || { createdAt: -1 })
      .populate(population)
      .exec();

    return {
      meta: {
        current: page,
        pageSize: defaultLimit,
        pages: totalPages,
        total: totalItems,
      },
      result,
    };
  }

  async findOrderByUserId(userId: string) {
    const orders = await this.orderModel
      .find({ userId: new Types.ObjectId(userId), isDeleted: false })
      .populate({
        path: 'items.productId',
        select: '_id name price thumbnail',
      })
      .sort({ createdAt: -1 })
      .exec();

    return orders || [];
  }

  // FIND ONE
  async findOne(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate({
        path: 'items.productId',
        select: '_id name price thumbnail',
      })
      .exec();

    if (!order) throw new NotFoundException(`Order ${id} not found`);
    return order;
  }

  // UPDATE
  async update(id: string, data: UpdateOrderDto) {
    const current = await this.orderModel.findById(id).exec();
    if (!current) throw new NotFoundException('Order not found');

    const updateData: any = { ...data };

    if (data.userId) {
      updateData.userId = new Types.ObjectId(data.userId);
    }
    if (data.items) {
      updateData.items = data.items.map((item) => ({
        ...item,
        productId: new Types.ObjectId(item.productId),
      }));
      const newSubtotal = updateData.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
      // Nếu FE không yêu cầu re-apply voucher ở update, ta chỉ cập nhật tổng thường
      updateData.subtotal = newSubtotal;
      updateData.totalPrice = newSubtotal; // hoặc giữ nguyên discount cũ nếu bạn muốn
    }

    // trạng thái trước & sau
    const prevAdjusted = !!current.inventoryAdjusted;
    const nextStatus = updateData.status ?? current.status;
    const nextPaymentStatus = updateData.paymentStatus ?? current.paymentStatus;

    const willBePaid = nextStatus === 'PAID' || nextPaymentStatus === 'PAID';

    const willBeRefundedOrCanceled =
      nextStatus === 'REFUNDED' ||
      nextPaymentStatus === 'REFUNDED' ||
      nextStatus === 'CANCELED';

    // Không có side-effect kho → update thường
    if (
      (!willBePaid && !willBeRefundedOrCanceled) ||
      (willBePaid && prevAdjusted) ||
      (willBeRefundedOrCanceled && !prevAdjusted)
    ) {
      const updated = await this.orderModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();
      if (!updated) throw new NotFoundException('Order not found');
      return updated;
    }

    // Có side-effect kho → transaction
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const toggle: Partial<Order> = {};
      if (willBePaid && !prevAdjusted) (toggle as any).inventoryAdjusted = true;
      if (willBeRefundedOrCanceled && prevAdjusted)
        (toggle as any).inventoryAdjusted = false;

      const updated = await this.orderModel
        .findByIdAndUpdate(
          id,
          { ...updateData, ...toggle },
          { new: true, session },
        )
        .exec();
      if (!updated) throw new NotFoundException('Order not found');

      if (willBePaid && !prevAdjusted) {
        await this.adjustInventoryForOrder(updated, session);
      }

      if (willBeRefundedOrCanceled && prevAdjusted) {
        for (const it of updated.items) {
          const pid = new Types.ObjectId(String(it.productId));
          const prod = await this.productModel.findById(pid).session(session);
          if (!prod) {
            throw new BadRequestException(`Product ${it.productId} not found`);
          }
          const newSold = Math.max((prod.sold ?? 0) - it.quantity, 0);
          const newStock = (prod.stock ?? 0) + it.quantity;

          await this.productModel.updateOne(
            { _id: pid },
            { $set: { stock: newStock, sold: newSold } },
            { session },
          );
        }
      }

      await session.commitTransaction();
      return updated;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  // SOFT DELETE
  async remove(id: string) {
    const deleted = await this.orderModel
      .findByIdAndUpdate(
        id,
        { isDeleted: true, deletedAt: new Date() },
        { new: true },
      )
      .exec();

    if (!deleted) throw new NotFoundException(`Order ${id} not found`);
    return deleted;
  }

  // UPDATE STATUS by paymentRef
  async updateStatus(paymentRef: string, status: PaymentStatus) {
    const session = await this.connection.startSession();
    session.startTransaction();
    try {
      const order = await this.orderModel
        .findOne({ paymentRef })
        .session(session);
      if (!order)
        throw new NotFoundException(
          `Order with paymentRef ${paymentRef} not found`,
        );

      if (status === PaymentStatus.PAID) {
        order.paymentStatus = 'PAID';
        order.status = 'PAID';
        await order.save({ session });

        if (!order.inventoryAdjusted) {
          await this.adjustInventoryForOrder(order, session);
          await this.orderModel.updateOne(
            { _id: order._id },
            { $set: { inventoryAdjusted: true } },
            { session },
          );
        }
      } else if (status === PaymentStatus.REFUNDED) {
        order.paymentStatus = 'REFUNDED';
        order.status = 'REFUNDED';
        await order.save({ session });

        if (order.inventoryAdjusted) {
          for (const it of order.items) {
            const pid = new Types.ObjectId(String(it.productId));
            const prod = await this.productModel.findById(pid).session(session);
            if (!prod)
              throw new BadRequestException(
                `Product ${it.productId} not found`,
              );
            const newSold = Math.max((prod.sold ?? 0) - it.quantity, 0);
            const newStock = (prod.stock ?? 0) + it.quantity;

            await this.productModel.updateOne(
              { _id: pid },
              { $set: { stock: newStock, sold: newSold } },
              { session },
            );
          }

          await this.orderModel.updateOne(
            { _id: order._id },
            { $set: { inventoryAdjusted: false } },
            { session },
          );
        }
      } else {
        order.paymentStatus = 'UNPAID';
        await order.save({ session });
      }

      await session.commitTransaction();
      return order;
    } catch (e) {
      await session.abortTransaction();
      throw e;
    } finally {
      session.endSession();
    }
  }

  // VNPay callback
  async confirmVNPayPayment(query: any) {
    const { vnp_TxnRef, vnp_ResponseCode } = query;
    const status: PaymentStatus =
      vnp_ResponseCode === '00' ? PaymentStatus.PAID : PaymentStatus.FAILED;

    return this.updateStatus(vnp_TxnRef, status);
  }

  //// Kho: trừ/hoàn
  private async adjustInventoryForOrder(order: OrderDocument, session?: any) {
    for (const it of order.items) {
      const pid = new Types.ObjectId(String(it.productId));
      const updated = await this.productModel
        .findOneAndUpdate(
          {
            _id: pid,
            isDeleted: { $ne: true },
            stock: { $gte: it.quantity },
          },
          { $inc: { stock: -it.quantity, sold: +it.quantity } },
          { new: true, session },
        )
        .exec();

      if (!updated) {
        throw new BadRequestException(
          `Not enough stock for product ${it.productId}`,
        );
      }
    }
  }
}
