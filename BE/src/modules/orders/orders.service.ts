import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import aqp from 'api-query-params';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Connection, Types } from 'mongoose';
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
import { Tracking } from '../tracking/schemas/tracking.schemas';
import { MailerService } from '@nestjs-modules/mailer';

@Injectable()
export class OrdersService {
  private trackingModel: any;
  constructor(
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(Address.name)
    private readonly addressModel: SoftDeleteModel<AddressDocument>,
    @InjectModel(Commune.name)
    private readonly communeModel: SoftDeleteModel<CommuneDocument>,
    @InjectModel(Province.name)
    private readonly provinceModel: SoftDeleteModel<ProvinceDocument>,
    @InjectConnection() private connection: Connection,
    private pricingService: PricingService,
    private mailerService: MailerService,
  ) {
    this.trackingModel = this.connection.model(Tracking.name);
  }

  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }
  async sendVerificationMailOrder(params: {
    email: string;
    name?: string;
    orderId: string;
    totalPrice: number;
    shippingFee: number;
    codValue: number;
  }) {
    const { email, name, orderId, totalPrice, shippingFee, codValue } = params;

    await this.mailerService.sendMail({
      to: this.normalizeEmail(email),
      subject: 'Xác nhận đơn hàng của bạn',
      template: 'ordersEmail.hbs',
      context: {
        name: name || email,
        orderId,
        totalPrice,
        shippingFee,
        codValue,
      },
    });
  }
  ///
  async create(dto: CreateOrderDto, user: IUser) {
    const waybill = await this.generateUniqueWaybill();

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

    const activePricing = await this.pricingService['getActivePricingByServiceCode'](
      dto.serviceCode || 'STD',
    );

    const shippingFee =
      typeof calcResult.totalPrice === 'number' ? calcResult.totalPrice : 0;
    const totalPrice = dto.codValue + shippingFee;

    // 3. Tạo địa chỉ
    const pickupAddr = await this.addressModel.create(dto.pickupAddress);
    const deliveryAddr = await this.addressModel.create(dto.deliveryAddress);

    // 4. Xử lý branchId – STAFF bắt buộc có, ADMIN optional, USER bỏ qua
    let branchId: Types.ObjectId | null | undefined = undefined;
    const rawBranchId =
      user.branchId ??
      (user as any).branchId ??
      user.BranchId ??
      (user as any).BranchId ??
      null;

    if (user.role === 'STAFF') {
      if (!rawBranchId) {
        throw new BadRequestException(
          'Nhân viên chưa được gắn bưu cục. Vui lòng liên hệ quản trị viên.',
        );
      }
      branchId = new Types.ObjectId(rawBranchId);
    } else if (user.role === 'ADMIN') {
      branchId = rawBranchId ? new Types.ObjectId(rawBranchId) : null;
    } else {
      branchId = undefined; // USER
    }

    // 5. Tạo đơn hàng
    const newOrder = await this.orderModel.create({
      ...dto,
      pickupAddressId: pickupAddr._id,
      deliveryAddressId: deliveryAddr._id,
      userId: new Types.ObjectId(user._id),
      branchId,
      codValue: dto.codValue,
      details: dto.details || null,
      shippingFee,
      totalPrice,
      serviceCode: dto.serviceCode || 'STD',
      weightKg: dto.weightKg,
      waybill,

      snapshotPricingId: activePricing._id,
      snapshotBasePrice: activePricing.basePrice,
      snapshotOverweightFee: calcResult.breakdown.overweightFee || 0,
      snapshotRegionFee: calcResult.breakdown.regionFee || 0,
      snapshotIsLocal: calcResult.breakdown.isLocal,
      snapshotServiceCode: dto.serviceCode || 'STD',
      snapshotWeightKg: dto.weightKg,
      snapshotBreakdown: calcResult.breakdown,

      status: OrderStatus.PENDING,
      createdBy: { _id: new Types.ObjectId(user._id), email: user.email },
    });

    try {
      // Tạo tracking cho order
      await this.trackingModel.create({
        orderId: newOrder._id,
        status: OrderStatus.PENDING,
        timestamp: new Date(),
        location: originProv?.name || 'Khách hàng đặt hàng online',
        note: 'Đơn hàng được tạo thành công',
        createdBy:
          newOrder.createdBy ||
          (user ? { _id: user._id, email: user.email } : null),
        branchId: newOrder.branchId || null,
      });
      console.log('TRACKING ĐÃ TẠO THÀNH CÔNG CHO ORDER:', newOrder._id);
    } catch (error) {
      console.error('Lỗi tạo tracking:', error);
    }

    if (dto.email) {
      try {
        await this.sendVerificationMailOrder({
          email: dto.email,
          name: dto.receiverName || 'Khách hàng',
          orderId: newOrder.waybill || newOrder._id.toString(),
          totalPrice,
          shippingFee,
          codValue: dto.codValue,
        });
        console.log('Đã gửi email xác nhận đến khách:', dto.email);
      } catch (err) {
        console.log('Gửi email đến khách thất bại:', dto.email, err);
        // Không throw lỗi → không làm hỏng việc tạo đơn
      }
    }

    // (Tùy chọn) Vẫn gửi cho nhân viên nếu muốn biết đơn đã tạo
    if (user.email && user.email !== dto.email) {
      try {
        await this.sendVerificationMailOrder({
          email: user.email,
          name: user.name || 'Nhân viên',
          orderId: newOrder.waybill || newOrder._id.toString(),
          totalPrice,
          shippingFee,
          codValue: dto.codValue,
        });
      } catch (err) {
        console.log('Gửi email thông báo nhân viên thất bại:', err);
      }
    }

    // Trả về order cuối cùng
    return newOrder;
  }

  ////

  private async generateUniqueWaybill(): Promise<string> {
    let waybill: string;
    let exists: boolean;

    do {
      const prefix = 'BD';
      const numbers = Math.floor(100000000 + Math.random() * 900000000);
      const suffix = 'VN';
      waybill = `${prefix}${numbers}${suffix}`;

      const found = await this.orderModel.findOne({ waybill });
      exists = !!found;
    } while (exists);

    return waybill;
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
        populate: [
          { path: 'provinceId', model: 'Province' },
          { path: 'communeId', model: 'Commune' },
        ],
      })
      .populate({
        path: 'deliveryAddressId',
        populate: [
          { path: 'provinceId', model: 'Province' },
          { path: 'communeId', model: 'Commune' },
        ],
      })
      .lean();

    if (!order || order.isDeleted) {
      throw new NotFoundException('Order not found');
    }

    // THÊM ĐOẠN NÀY – BẮT BUỘC PHẢI CÓ
    const hasSnapshot = !!order.snapshotPricingId;
    const response: any = {
      ...order,
      pricingLocked: hasSnapshot,
      snapshotShippingFee: order.shippingFee,
      pricingNote: hasSnapshot
        ? 'Phí vận chuyển đã được cố định từ lúc khách đặt hàng'
        : 'Có thể điều chỉnh phí',
    };

    return response;
  }
  // orders.service.ts
  async update(id: string, dto: UpdateOrderDto) {
    const order = await this.orderModel.findById(id);
    if (!order || order.isDeleted) {
      throw new NotFoundException('Order not found');
    }

    const hasSnapshot = !!order.snapshotPricingId;

    let needRecalculateFee = false;
    let newShippingFee = order.shippingFee;

    // Kiểm tra xem có thay đổi gì liên quan đến phí không
    if (
      dto.pickupAddress?.provinceId ||
      dto.deliveryAddress?.provinceId ||
      dto.serviceCode ||
      dto.weightKg !== undefined
    ) {
      needRecalculateFee = true;
    }

    if (!hasSnapshot) {
      if (
        dto.pickupAddress?.provinceId ||
        dto.deliveryAddress?.provinceId ||
        dto.serviceCode ||
        dto.weightKg !== undefined
      ) {
        needRecalculateFee = true;
      }
    }

    // Nếu có thay đổi địa chỉ, dịch vụ, cân nặng → tính lại phí
    if (needRecalculateFee) {
      const pickupProvinceId =
        dto.pickupAddress?.provinceId ||
        (await this.addressModel.findById(order.pickupAddressId).lean())
          .provinceId;
      const deliveryProvinceId =
        dto.deliveryAddress?.provinceId ||
        (await this.addressModel.findById(order.deliveryAddressId).lean())
          .provinceId;

      const originProv = await this.provinceModel
        .findById(pickupProvinceId)
        .lean();
      const destProv = await this.provinceModel
        .findById(deliveryProvinceId)
        .lean();

      if (!originProv?.code || !destProv?.code) {
        throw (newShippingFee = 0);
      } else {
        const calcResult = await this.pricingService.calculateShipping(
          originProv.code as ProvinceCode,
          destProv.code as ProvinceCode,
          dto.serviceCode || order.serviceCode || 'STD',
          dto.weightKg || order.weightKg || 1,
          originProv.code === destProv.code,
        );
        newShippingFee =
          typeof calcResult.totalPrice === 'number' ? calcResult.totalPrice : 0;
      }
    }

    // Cập nhật địa chỉ nếu có
    if (dto.pickupAddress) {
      await this.addressModel.findByIdAndUpdate(order.pickupAddressId, {
        provinceId: dto.pickupAddress.provinceId,
        communeId: dto.pickupAddress.communeId,
        address: dto.pickupAddress.address,
        lat: dto.pickupAddress.lat || null,
        lng: dto.pickupAddress.lng || null,
      });
    }

    if (dto.deliveryAddress) {
      await this.addressModel.findByIdAndUpdate(order.deliveryAddressId, {
        provinceId: dto.deliveryAddress.provinceId,
        communeId: dto.deliveryAddress.communeId,
        address: dto.deliveryAddress.address,
        lat: dto.deliveryAddress.lat || null,
        lng: dto.deliveryAddress.lng || null,
      });
    }

    // Cập nhật các field khác + phí mới
    const updateData: any = {
      ...dto,
      shippingFee: newShippingFee,
      totalPrice: (dto.codValue || order.codValue || 0) + newShippingFee,
    };

    // Xóa các field address để không ghi đè nhầm
    delete updateData.pickupAddress;
    delete updateData.deliveryAddress;

    if (dto.status && dto.status !== order.status) {
      await this.updateStatus(id, dto.status as OrderStatus);
    } else {
      const updatedOrder = await this.orderModel
        .findByIdAndUpdate(id, updateData, {
          new: true,
        })
        .populate({
          path: 'pickupAddressId deliveryAddressId',
          populate: { path: 'provinceId communeId' },
        });
      return updatedOrder;
    }
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

  async updateStatus(id: string, status: OrderStatus, user?: IUser) {
    const order = await this.orderModel
      .findById(id)
      .populate('pickupAddressId deliveryAddressId')
      .lean(); // dùng lean() để lấy dữ liệu nhanh

    if (!order || order.isDeleted) {
      throw new NotFoundException('Order not found');
    }

    // Cập nhật trạng thái (giữ nguyên logic cũ)
    if (user && ['CONFIRMED', 'SHIPPING', 'COMPLETED'].includes(status)) {
      await this.orderModel.updateOne(
        { _id: id },
        { $set: { createdBy: { _id: user._id, email: user.email } } },
      );
    }

    await this.orderModel.updateOne({ _id: id }, { status });

    // === TẠO TRACKING (giữ nguyên) ===
    const display = {
      PENDING: {
        location: 'Đơn hàng đang chờ xác nhận',
        note: 'Khách hàng đã đặt hàng',
      },
      CONFIRMED: {
        location: 'Bưu cục tiếp nhận',
        note: 'Nhân viên đã xác nhận đơn',
      },
      SHIPPING: { location: 'Đang vận chuyển', note: 'Đã giao cho shipper' },
      COMPLETED: {
        location: 'Giao hàng thành công',
        note: 'Khách đã nhận hàng',
      },
      CANCELED: { location: 'Đã hủy', note: 'Đơn hàng bị hủy' },
    };

    const actionPerformer = user
      ? { _id: new Types.ObjectId(user._id), email: user.email }
      : order.createdBy;

    await this.trackingModel.create({
      orderId: order._id,
      status: status,
      timestamp: new Date(),
      location: display[status]?.location || 'Cập nhật trạng thái',
      note: display[status]?.note || '',
      createdBy: actionPerformer || null,
      branchId: order.branchId || null,
    });

    // === MỚI: GỬI EMAIL CHO KHÁCH KHI CẬP NHẬT TRẠNG THÁI ===
    if (order.email) {
      const templates: Record<
        OrderStatus,
        { subject: string; template: string }
      > = {
        PENDING: {
          subject: 'Đơn hàng đã được tạo',
          template: 'status/pending.hbs',
        },
        CONFIRMED: {
          subject: 'Đơn hàng đã được xác nhận ✓',
          template: 'status/confirmed.hbs',
        },
        SHIPPING: {
          subject: 'Đơn hàng đang giao đến bạn',
          template: 'status/shipping.hbs',
        },
        COMPLETED: {
          subject: 'Giao hàng thành công! Cảm ơn bạn',
          template: 'status/completed.hbs',
        },
        CANCELED: {
          subject: 'Đơn hàng đã bị hủy',
          template: 'status/canceled.hbs',
        },
      };

      const config = templates[status];
      if (config) {
        try {
          await this.mailerService.sendMail({
            to: order.email,
            subject: config.subject,
            template: config.template,
            context: {
              name: order.receiverName || 'Khách hàng',
              waybill: order.waybill,
              orderId: order._id.toString(),
              status: display[status]?.note || status,
              trackingUrl: `https://localhost:4200/tracking/${order.waybill}`, // thay domain thật
              totalPrice: order.totalPrice,
              codValue: order.codValue,
            },
          });
          console.log(`Đã gửi email trạng thái ${status} đến: ${order.email}`);
        } catch (err) {
          console.log(`Gửi email trạng thái ${status} thất bại:`, err);
        }
      }
    }

    // Trả về order mới nhất
    return await this.orderModel.findById(id).populate({
      path: 'pickupAddressId deliveryAddressId',
      populate: { path: 'provinceId communeId' },
    });
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

  async getStatusById(id: string) {
    const order = await this.orderModel
      .findById(id)
      .select('_id status isDeleted')
      .lean();

    if (!order || order.isDeleted) {
      throw new NotFoundException('Order not found');
    }

    return {
      id: order._id.toString(),
      status: order.status as OrderStatus,
    };
  }
}
