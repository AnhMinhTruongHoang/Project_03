import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import mongoose from 'mongoose';
import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Branch, BranchDocument } from '../branches/schemas/branch.schemas';
import { Service, ServiceDocument } from '../services/schemas/service.schemas';
import {
  Shipment,
  ShipmentDocument,
} from '../shipments/schemas/shipment.schema';
import { Payment, PaymentDocument } from '../payments/schema/payment.schema';
import {
  Tracking,
  TrackingDocument,
} from '../tracking/schemas/tracking.schemas';
import {
  Notification,
  NotificationDocument,
  NotificationType,
} from '../notifications/schemas/notification.schemas';
import { Pricing, PricingDocument } from '../pricing/schemas/pricing.schemas';
import { Order, OrderDocument } from '../orders/schemas/order.schemas';

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: SoftDeleteModel<UserDocument>,
    @InjectModel(Branch.name)
    private readonly branchModel: SoftDeleteModel<BranchDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: SoftDeleteModel<ServiceDocument>,
    @InjectModel(Shipment.name)
    private readonly shipmentModel: SoftDeleteModel<ShipmentDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: SoftDeleteModel<PaymentDocument>,
    @InjectModel(Tracking.name)
    private readonly trackingModel: SoftDeleteModel<TrackingDocument>,
    @InjectModel(Notification.name)
    private readonly notificationModel: SoftDeleteModel<NotificationDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(Pricing.name)
    private readonly pricingModel: SoftDeleteModel<PricingDocument>,
    private readonly configService: ConfigService,
    private readonly userService: UsersService,
  ) {}

  async onModuleInit() {
    const shouldInit = this.configService.get<string>('SHOULD_INIT');
    if (!shouldInit || shouldInit === 'false') return;

    await this.seedUsers();
    await this.seedBranches();
    await this.seedServices();
    await this.seedOrders();
    await this.seedShipmentsAndPayments();
    await this.seedTracking();
    await this.seedNotifications();
    await this.seedPricing();

    this.logger.log('✅ DATABASE SEEDING COMPLETED');
  }

  // 🧑 USERS
  private async seedUsers() {
    const count = await this.userModel.countDocuments();
    if (count > 0) return;

    const hash = this.userService.getHashPassword(
      this.configService.get<string>('INIT_PASSWORD'),
    );

    await this.userModel.insertMany([
      {
        name: 'Admin User',
        email: 'admin@gmail.com',
        password: hash,
        role: 'ADMIN',
        isActive: true,
      },
      {
        name: 'User',
        email: 'user@gmail.com',
        password: hash,
        role: 'USER',
        isActive: true,
      },
      {
        name: 'Post Staff',
        email: 'staff@gmail.vn',
        password: hash,
        role: 'STAFF',
        isActive: true,
      },
      {
        name: 'Courier Guy',
        email: 'courier@gmail.vn',
        password: hash,
        role: 'COURIER',
        isActive: true,
      },
      {
        name: 'Customer Test',
        email: 'customer@post.vn',
        password: hash,
        role: 'CUSTOMER',
        isActive: true,
      },
    ]);

    this.logger.log('>>> INIT USERS DONE...');
  }

  // 🏢 BRANCHES
  private async seedBranches() {
    const count = await this.branchModel.countDocuments();
    if (count > 0) return;

    await this.branchModel.insertMany([
      {
        code: 'HN01',
        name: 'Hà Nội Center',
        address: '123 Hoàn Kiếm, Hà Nội',
        city: 'Hà Nội',
        province: 'Hà Nội',
        postalCode: '10000',
        phone: '0123456789',
        email: 'hn@post.vn',
        geo: { lat: 21.0278, lng: 105.8342 },
      },
      {
        code: 'HCM01',
        name: 'HCM Center',
        address: '456 Quận 1, TP.HCM',
        city: 'Hồ Chí Minh',
        province: 'Hồ Chí Minh',
        postalCode: '70000',
        phone: '0987654321',
        email: 'hcm@post.vn',
        geo: { lat: 10.7769, lng: 106.7009 },
      },
    ]);

    this.logger.log('>>> INIT BRANCHES DONE...');
  }

  // 🚚 SERVICES
  private async seedServices() {
    const count = await this.serviceModel.countDocuments();
    if (count > 0) return;

    await this.serviceModel.insertMany([
      {
        code: 'STD',
        name: 'Tiêu chuẩn',
        description: 'Giao hàng trong 3-5 ngày',
        basePrice: 20000,
        pricePerKg: 5000,
        estimatedDays: 5,
        codFeePercent: 2,
        isActive: true,
      },
      {
        code: 'EXP',
        name: 'Nhanh',
        description: 'Giao hàng trong 1-2 ngày',
        basePrice: 40000,
        pricePerKg: 8000,
        estimatedDays: 2,
        codFeePercent: 2,
        isActive: true,
      },
    ]);

    this.logger.log('>>> INIT SERVICES DONE...');
  }

  // 📦 SHIPMENTS + PAYMENTS
  private async seedShipmentsAndPayments() {
    const count = await this.shipmentModel.countDocuments();
    if (count > 0) return;

    const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
    const branches = await this.branchModel.find();
    const service = await this.serviceModel.findOne({ code: 'STD' });

    if (!customer || branches.length < 2 || !service) return;

    const shipment = await this.shipmentModel.create({
      trackingNumber: 'TEST001',
      senderName: 'Test Sender',
      senderPhone: '0909090909',
      senderAddress: branches[0].address,
      receiverName: 'Test Receiver',
      receiverPhone: '0909090909',
      receiverAddress: branches[1].address,
      originBranchId: branches[0]._id,
      destinationBranchId: branches[1]._id,
      weight: 2,
      serviceType: service.code,
      shippingFee: 30000,
      status: 'PENDING',
      createdBy: customer._id,
      timeline: [
        {
          status: 'PENDING',
          timestamp: new Date(),
          note: 'Đơn hàng được khởi tạo',
        },
      ],
    });

    await this.paymentModel.create({
      orderId: new mongoose.Types.ObjectId(),
      shipmentId: shipment._id,
      userId: customer._id,
      method: 'COD',
      amount: 30000,
      status: 'pending',
      provider: 'manual',
    });

    this.logger.log('>>> INIT SHIPMENTS & PAYMENTS DONE...');
  }

  // 📍 TRACKINGS
  private async seedTracking() {
    const count = await this.trackingModel.countDocuments();
    if (count > 0) return;

    const shipment = await this.shipmentModel.findOne();
    if (!shipment) return;

    await this.trackingModel.insertMany([
      {
        shipmentId: shipment._id,
        status: 'CREATED',
        location: 'Hà Nội Center',
        note: 'Khởi tạo đơn hàng',
        branchId: shipment.originBranchId,
        timestamp: new Date(),
        createdBy: {
          _id: new mongoose.Types.ObjectId(),
          email: 'system@post.vn',
        },
      },
      {
        shipmentId: shipment._id,
        status: 'IN_TRANSIT',
        location: 'Kho trung chuyển',
        note: 'Đang trên đường vận chuyển',
        branchId: shipment.originBranchId,
        timestamp: new Date(),
        createdBy: {
          _id: new mongoose.Types.ObjectId(),
          email: 'system@post.vn',
        },
      },
    ]);

    this.logger.log('>>> INIT TRACKING DONE...');
  }

  // 🔔 NOTIFICATIONS
  private async seedNotifications() {
    const count = await this.notificationModel.countDocuments();
    if (count > 0) return;

    const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
    if (!customer) return;

    await this.notificationModel.insertMany([
      {
        recipient: customer.email,
        title: 'Chào mừng đến với hệ thống bưu chính',
        message: 'Tài khoản của bạn đã được kích hoạt thành công!',
        type: NotificationType.EMAIL,
        status: 'SENT',
        sentAt: new Date(),
      },
      {
        recipient: customer.email,
        title: 'Thông báo đơn hàng',
        message: 'Đơn hàng TEST001 đang được vận chuyển.',
        type: NotificationType.EMAIL,
        status: 'PENDING',
      },
    ]);

    this.logger.log('>>> INIT NOTIFICATIONS DONE...');
  }

  // 💰 PRICING
  private async seedPricing() {
    const count = await this.pricingModel.countDocuments();
    if (count > 0) return;

    const service = await this.serviceModel.findOne();
    if (!service) return;

    await this.pricingModel.insertMany([
      {
        serviceId: service._id,
        zone: 'LOCAL',
        minWeight: 0,
        maxWeight: 5,
        price: 20000,
      },
      {
        serviceId: service._id,
        zone: 'REGIONAL',
        minWeight: 5,
        maxWeight: 10,
        price: 40000,
      },
      {
        serviceId: service._id,
        zone: 'NATIONAL',
        minWeight: 10,
        maxWeight: 20,
        price: 60000,
      },
    ]);

    this.logger.log('>>> INIT PRICING DONE...');
  }

  // 🛍 ORDERS
  private async seedOrders() {
    const count = await this.orderModel.countDocuments();
    if (count > 0) return;

    const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
    if (!customer) {
      this.logger.warn('❌ No customer found for order seeding');
      return;
    }

    const orders = await this.orderModel.insertMany([
      {
        userId: customer._id,
        senderName: 'Nguyễn Văn A',
        receiverName: 'Trần Thị B',
        receiverPhone: '0912345678',
        pickupAddress: '123 Hà Nội',
        deliveryAddress: '456 TP.HCM',
        totalPrice: 200000,
        status: 'PENDING',
      },
      {
        userId: customer._id,
        senderName: 'Công ty X',
        receiverName: 'Lê Văn C',
        receiverPhone: '0987654321',
        pickupAddress: '789 Đà Nẵng',
        deliveryAddress: '654 Cần Thơ',
        totalPrice: 350000,
        status: 'CONFIRMED',
      },
    ]);

    this.logger.log(`>>> INIT ${orders.length} ORDERS DONE...`);

    // 💰 Tạo luôn Payment tương ứng với Order
    for (const order of orders) {
      await this.paymentModel.create({
        orderId: order._id,
        userId: customer._id,
        method: 'COD',
        amount: order.totalPrice,
        status: 'pending',
        provider: 'manual',
      });
    }

    this.logger.log('>>> INIT PAYMENTS for ORDERS DONE...');
  }
}
