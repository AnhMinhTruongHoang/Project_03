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
import { Commune, CommuneDocument } from '../location/schemas/commune.schema';
import {
  Province,
  ProvinceDocument,
} from '../location/schemas/province.schema';
import { PricingService } from '../pricing/pricing.service';
import { ProvinceCode } from 'src/types/location.type';

@Injectable()
export class OrdersService {
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(Address.name)
    private readonly addressModel: SoftDeleteModel<AddressDocument>,
    @InjectModel(Commune.name)
    private readonly communeModel: SoftDeleteModel<CommuneDocument>,
    @InjectModel(Province.name)
    private readonly provinceModel: SoftDeleteModel<ProvinceDocument>,
    private pricingService: PricingService,
  ) {}

  // orders.service.ts
  async create(dto: CreateOrderDto, user: IUser) {
    // 1. Lấy province + code
    const originProv = await this.provinceModel
      .findById(dto.pickupAddress.provinceId)
      .lean();
    const destProv = await this.provinceModel
      .findById(dto.deliveryAddress.provinceId)
      .lean();

    if (!originProv?.code || !destProv?.code) {
      throw new BadRequestException('Tỉnh/thành phố không hợp lệ');
    }

    // 2. Tính phí vận chuyển
    const calcResult = await this.pricingService.calculateShipping(
      originProv.code as ProvinceCode,
      destProv.code as ProvinceCode,
      dto.serviceCode || 'STD',
      dto.weightKg,
      originProv.code === destProv.code,
    );

    const shippingFee =
      typeof calcResult.totalPrice === 'number' ? calcResult.totalPrice : 0;
    const totalPrice = dto.codValue + shippingFee;

    // 3. Tạo địa chỉ
    const pickupAddr = await this.addressModel.create(dto.pickupAddress);
    const deliveryAddr = await this.addressModel.create(dto.deliveryAddress);

    // ===================================================================
    // 4. XỬ LÝ BRANCHID – CHỈ BẮT BUỘC VỚI STAFF, ADMIN & USER ĐƯỢC QUA
    // ===================================================================
    let branchId: Types.ObjectId | null | undefined = undefined;

    // Lấy branchId từ mọi nguồn có thể có (do JWT đôi khi đổi tên field)
    const rawBranchId =
      user.branchId ??
      (user as any).branchId ??
      user.BranchId ??
      (user as any).BranchId ??
      null;

    if (user.role === 'STAFF') {
      // STAFF bắt buộc phải có branchId
      if (!rawBranchId) {
        throw new BadRequestException(
          'Nhân viên chưa được gắn bưu cục. Vui lòng liên hệ quản trị viên.',
        );
      }
      branchId = new Types.ObjectId(rawBranchId);
    } else if (user.role === 'ADMIN') {
      branchId = rawBranchId ? new Types.ObjectId(rawBranchId) : null;
    } else {
      // USER (khách hàng): không cần branchId
      branchId = undefined;
    }

    // 5. Tạo đơn hàng
    return this.orderModel.create({
      ...dto,
      pickupAddressId: pickupAddr._id,
      deliveryAddressId: deliveryAddr._id,
      userId: new Types.ObjectId(user._id),

      branchId, // ← giờ đã xử lý hoàn hảo cho mọi role

      codValue: dto.codValue,
      shippingFee,
      totalPrice,
      serviceCode: dto.serviceCode || 'STD',
      weightKg: dto.weightKg,
    });
  }

  async findAll(user: IUser, currentPage = 1, limit = 10, queryObj: any = {}) {
    const { filter, sort } = aqp(queryObj);

    // Loại bỏ params không cần thiết
    delete (filter as any).current;
    delete (filter as any).pageSize;

    // Luôn loại bỏ các đơn đã xóa
    filter.isDeleted = false;

    // Ép filter theo user
    if (user?.role !== 'ADMIN') {
      filter.userId = new Types.ObjectId(user._id);
    }

    if (filter.userId) {
      filter.userId = new Types.ObjectId(filter.userId);
    }

    // --- Filter nâng cao ---

    // Trạng thái: hỗ trợ multi-status
    if (filter.status) {
      if (typeof filter.status === 'string' && filter.status.includes(',')) {
        filter.status = { $in: filter.status.split(',') };
      }
    }

    // Ngày tạo
    if (filter.fromDate || filter.toDate) {
      filter.createdAt = {};
      if (filter.fromDate) filter.createdAt.$gte = new Date(filter.fromDate);
      if (filter.toDate) filter.createdAt.$lte = new Date(filter.toDate);
    }

    // Khoảng giá
    if (filter.minPrice || filter.maxPrice) {
      filter.totalPrice = {};
      if (filter.minPrice) filter.totalPrice.$gte = Number(filter.minPrice);
      if (filter.maxPrice) filter.totalPrice.$lte = Number(filter.maxPrice);
    }

    // Người gửi
    if (filter.senderName)
      filter.senderName = new RegExp(filter.senderName, 'i');

    // Người nhận
    if (filter.receiverName)
      filter.receiverName = new RegExp(filter.receiverName, 'i');

    // Số điện thoại người nhận
    if (filter.receiverPhone)
      filter.receiverPhone = new RegExp(filter.receiverPhone, 'i');

    // Tên sản phẩm
    if (filter.productName)
      filter['items.productName'] = new RegExp(filter.productName, 'i');

    // Search tổng hợp
    if (filter.search) {
      const regex = new RegExp(filter.search, 'i');
      filter.$or = [
        { _id: regex },
        { receiverName: regex },
        { receiverPhone: regex },
        { senderName: regex },
        { 'items.productName': regex },
      ];
    }

    // --- Pagination ---
    const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
    const size = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (page - 1) * size;

    // --- Tổng số và phân trang ---
    const total = await this.orderModel.countDocuments(filter);
    const pages = Math.ceil(total / size);

    // --- Truy vấn chính ---
    const results = await this.orderModel
      .find(filter)
      .sort((sort as any) || { createdAt: -1 }) // default: mới nhất trước
      .skip(skip)
      .limit(size)
      .populate({
        path: 'pickupAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'communeId', model: Commune.name },
        ],
      })
      .populate({
        path: 'deliveryAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'communeId', model: Commune.name },
        ],
      })
      .exec();

    return { meta: { current: page, pageSize: size, pages, total }, results };
  }

  async findOne(id: string) {
    const order = await this.orderModel
      .findById(id)
      .populate({
        path: 'pickupAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'communeId', model: Commune.name },
        ],
      })
      .populate({
        path: 'deliveryAddressId',
        model: Address.name,
        populate: [
          { path: 'provinceId', model: Province.name },
          { path: 'communeId', model: Commune.name },
        ],
      });

    if (!order || order.isDeleted)
      throw new NotFoundException('Order not found');
    return order;
  }
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.orderModel.findById(id);
    if (!order || order.isDeleted)
      throw new NotFoundException('Order not found');

    if (dto.status) order.status = dto.status;

    // Update pickup address
    if (dto.pickupAddress) {
      await this.addressModel.findByIdAndUpdate(order.pickupAddressId, {
        provinceId: dto.pickupAddress.provinceId,
        communeId: dto.pickupAddress.communeId,
        address: dto.pickupAddress.address,
      });
    }

    // Update delivery address
    if (dto.deliveryAddress) {
      await this.addressModel.findByIdAndUpdate(order.deliveryAddressId, {
        provinceId: dto.deliveryAddress.provinceId,
        communeId: dto.deliveryAddress.communeId,
        address: dto.deliveryAddress.address,
      });
    }

    // Update order fields (không bao gồm address)
    const updateData = { ...dto };
    delete (updateData as any).pickupAddress;
    delete (updateData as any).deliveryAddress;

    const updatedOrder = await this.orderModel.findByIdAndUpdate(
      id,
      updateData,
      {
        new: true,
      },
    );

    return updatedOrder;
  }

  async remove(id: string, user: IUser) {
    const order = await this.orderModel.findById(id);
    if (!order || order.isDeleted)
      throw new NotFoundException('Order not found');

    // Gọi softDelete chỉ với _id
    await this.orderModel.softDelete({ _id: id });

    // Nếu muốn lưu thông tin deletedBy
    order.deletedBy = { _id: new Types.ObjectId(user._id), email: user.email };
    await order.save();

    return { message: 'Order soft-deleted' };
  }

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
  async getStatistics(month?: number, year?: number, user?: IUser | null) {
    const filter: any = { isDeleted: false };

    if (user?._id) {
      filter.userId = new Types.ObjectId(user._id);
    }

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
