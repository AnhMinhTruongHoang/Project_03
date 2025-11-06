// src/modules/databases/databases.service.ts
import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import { Connection, Types } from 'mongoose';

import { UsersService } from '../users/users.service';
import { User, UserDocument } from '../users/schemas/user.schema';
import { Payment, PaymentDocument } from '../payments/schema/payment.schema';
import { Address, AddressDocument } from '../location/schemas/address.schema';
import { Branch, BranchDocument } from '../branches/schemas/branch.schemas';
import { Service, ServiceDocument } from '../services/schemas/service.schemas';
import { Pricing, PricingDocument } from '../pricing/schemas/pricing.schemas';
import {
  Order,
  OrderDocument,
  OrderStatus,
} from '../orders/schemas/order.schemas';
import {
  Tracking,
  TrackingDocument,
  TrackingStatus,
} from '../tracking/schemas/tracking.schemas';
import {
  Province,
  ProvinceDocument,
} from '../location/schemas/province.schema';
import {
  District,
  DistrictDocument,
} from '../location/schemas/district.schema';
import {
  Shipment,
  ShipmentDocument,
  ShipmentStatus,
} from '../shipments/schemas/shipment.schema';
import {
  NotificationDocument,
  NotificationStatus,
  NotificationType,
} from '../notifications/schemas/notification.schemas';

type AddressWithCoords = Address & {
  _id: Types.ObjectId;
  line1?: string;
  lat?: number;
  lng?: number;
};

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: SoftDeleteModel<UserDocument>,

    @InjectModel(Province.name)
    private readonly provinceModel: SoftDeleteModel<ProvinceDocument>,
    @InjectModel(District.name)
    private readonly districtModel: SoftDeleteModel<DistrictDocument>,
    @InjectModel(Address.name)
    private readonly addressModel: SoftDeleteModel<AddressDocument>,

    @InjectModel(Branch.name)
    private readonly branchModel: SoftDeleteModel<BranchDocument>,
    @InjectModel(Service.name)
    private readonly serviceModel: SoftDeleteModel<ServiceDocument>,
    @InjectModel(Pricing.name)
    private readonly pricingModel: SoftDeleteModel<PricingDocument>,
    @InjectModel(Order.name)
    private readonly orderModel: SoftDeleteModel<OrderDocument>,
    @InjectModel(Shipment.name)
    private readonly shipmentModel: SoftDeleteModel<ShipmentDocument>,
    @InjectModel(Payment.name)
    private readonly paymentModel: SoftDeleteModel<PaymentDocument>,
    @InjectModel(Tracking.name)
    private readonly trackingModel: SoftDeleteModel<TrackingDocument>,
    @InjectModel('Notification')
    private readonly notificationModel: SoftDeleteModel<NotificationDocument>,

    @InjectConnection() private readonly connection: Connection,
    private readonly config: ConfigService,
    private readonly usersService: UsersService,
  ) {}

  async onModuleInit() {
    if (this.config.get('SHOULD_INIT') !== 'true') return;

    await this.seedUsers();
    const { hn, hcm } = await this.seedLocation32(); // 32 tỉnh + quận/huyện
    const { addrHn1, addrHcm1, addrHn2 } = await this.seedAddresses(hn, hcm); // không dùng ward
    const { branchHN, branchHCM } = await this.seedBranches(addrHn1, addrHcm1);
    const { svcSTD, svcEXP } = await this.seedServices();
    await this.seedPricing(svcSTD._id, svcEXP._id);
    const { order1, customer } = await this.seedOrders(addrHn2, addrHcm1);
    await this.seedShipments(
      order1,
      customer,
      branchHN,
      branchHCM,
      svcSTD,
      addrHn2,
      addrHcm1,
    );
    await this.seedTrackings();
    await this.seedNotifications(customer);

    this.logger.log('✅ DATABASE SEEDING COMPLETED');
  }

  /* ---------------- USERS ---------------- */
  private async seedUsers() {
    if (await this.userModel.countDocuments()) return;

    const hash = this.usersService.getHashPassword(
      this.config.get<string>('INIT_PASSWORD') || '123456',
    );

    await this.userModel.insertMany([
      {
        name: 'Admin',
        email: 'admin@vtpost.local',
        password: hash,
        role: 'ADMIN',
        isActive: true,
      },
      {
        name: 'Staff HN',
        email: 'staff.hn@vtpost.local',
        password: hash,
        role: 'STAFF',
        isActive: true,
      },
      {
        name: 'Courier HCM',
        email: 'courier.hcm@vtpost.local',
        password: hash,
        role: 'COURIER',
        isActive: true,
      },
      {
        name: 'Customer',
        email: 'cus@vtpost.local',
        password: hash,
        role: 'CUSTOMER',
        isActive: true,
      },
    ]);

    this.logger.log('>>> INIT USERS DONE');
  }

  /* ---------------- LOCATION (2 cấp) ---------------- */
  /**
   * Seed 32 Tỉnh/Thành + một số Quận/Huyện trực thuộc (mẫu).
   * Bạn có thể mở rộng thêm districts nếu muốn đầy đủ.
   */
  private async seedLocation32() {
    if ((await this.provinceModel.countDocuments()) >= 32) {
      const hn = await this.provinceModel.findOne({ code: 'HN' }).lean();
      const hcm = await this.provinceModel.findOne({ code: 'HCM' }).lean();
      return { hn, hcm };
    }

    type P = {
      code: string;
      name: string;
      districts: { code: string; name: string }[];
    };

    const PROVINCES_32: P[] = [
      {
        code: 'HN',
        name: 'Hà Nội',
        districts: [
          { code: 'HN-HK', name: 'Hoàn Kiếm' },
          { code: 'HN-BD', name: 'Ba Đình' },
          { code: 'HN-CG', name: 'Cầu Giấy' },
          { code: 'HN-TX', name: 'Thanh Xuân' },
        ],
      },
      {
        code: 'HCM',
        name: 'Hồ Chí Minh',
        districts: [
          { code: 'HCM-Q1', name: 'Quận 1' },
          { code: 'HCM-Q3', name: 'Quận 3' },
          { code: 'HCM-PN', name: 'Phú Nhuận' },
          { code: 'HCM-TD', name: 'Thủ Đức' },
        ],
      },
      {
        code: 'HP',
        name: 'Hải Phòng',
        districts: [
          { code: 'HP-HB', name: 'Hồng Bàng' },
          { code: 'HP-NQ', name: 'Ngô Quyền' },
        ],
      },
      {
        code: 'DN',
        name: 'Đà Nẵng',
        districts: [
          { code: 'DN-HA', name: 'Hải Châu' },
          { code: 'DN-ST', name: 'Sơn Trà' },
        ],
      },
      {
        code: 'CT',
        name: 'Cần Thơ',
        districts: [
          { code: 'CT-NK', name: 'Ninh Kiều' },
          { code: 'CT-BT', name: 'Bình Thuỷ' },
        ],
      },
      {
        code: 'QN',
        name: 'Quảng Ninh',
        districts: [
          { code: 'QN-HA', name: 'Hạ Long' },
          { code: 'QN-UB', name: 'Uông Bí' },
        ],
      },
      {
        code: 'LA',
        name: 'Long An',
        districts: [
          { code: 'LA-TA', name: 'Tân An' },
          { code: 'LA-CD', name: 'Cần Đước' },
        ],
      },
      {
        code: 'BD',
        name: 'Bình Dương',
        districts: [
          { code: 'BD-TDM', name: 'Thủ Dầu Một' },
          { code: 'BD-DA', name: 'Dĩ An' },
        ],
      },
      {
        code: 'BH',
        name: 'Bình Định',
        districts: [
          { code: 'BH-QN', name: 'Quy Nhơn' },
          { code: 'BH-AN', name: 'An Nhơn' },
        ],
      },
      {
        code: 'NT',
        name: 'Ninh Thuận',
        districts: [{ code: 'NT-PR', name: 'Phan Rang - Tháp Chàm' }],
      },
      {
        code: 'BT',
        name: 'Bình Thuận',
        districts: [
          { code: 'BT-PT', name: 'Phan Thiết' },
          { code: 'BT-HTB', name: 'Hàm Thuận Bắc' },
        ],
      },
      {
        code: 'KH',
        name: 'Khánh Hòa',
        districts: [
          { code: 'KH-NT', name: 'Nha Trang' },
          { code: 'KH-CL', name: 'Cam Lâm' },
        ],
      },
      {
        code: 'LD',
        name: 'Lâm Đồng',
        districts: [
          { code: 'LD-DL', name: 'Đà Lạt' },
          { code: 'LD-BL', name: 'Bảo Lộc' },
        ],
      },
      {
        code: 'GL',
        name: 'Gia Lai',
        districts: [{ code: 'GL-PK', name: 'Pleiku' }],
      },
      {
        code: 'DLK',
        name: 'Đắk Lắk',
        districts: [{ code: 'DLK-BMT', name: 'Buôn Ma Thuột' }],
      },
      {
        code: 'DNA',
        name: 'Đồng Nai',
        districts: [
          { code: 'DNA-BH', name: 'Biên Hòa' },
          { code: 'DNA-NT', name: 'Nhơn Trạch' },
        ],
      },
      {
        code: 'VT',
        name: 'Bà Rịa - Vũng Tàu',
        districts: [
          { code: 'VT-VT', name: 'Vũng Tàu' },
          { code: 'VT-BR', name: 'Bà Rịa' },
        ],
      },
      {
        code: 'TG',
        name: 'Tiền Giang',
        districts: [{ code: 'TG-MT', name: 'Mỹ Tho' }],
      },
      {
        code: 'AG',
        name: 'An Giang',
        districts: [{ code: 'AG-LX', name: 'Long Xuyên' }],
      },
      {
        code: 'KG',
        name: 'Kiên Giang',
        districts: [{ code: 'KG-RG', name: 'Rạch Giá' }],
      },
      {
        code: 'ST',
        name: 'Sóc Trăng',
        districts: [{ code: 'ST-ST', name: 'Sóc Trăng' }],
      },
      {
        code: 'TV',
        name: 'Trà Vinh',
        districts: [{ code: 'TV-TV', name: 'Trà Vinh' }],
      },
      {
        code: 'VL',
        name: 'Vĩnh Long',
        districts: [{ code: 'VL-VL', name: 'Vĩnh Long' }],
      },
      {
        code: 'BL',
        name: 'Bạc Liêu',
        districts: [{ code: 'BL-BL', name: 'Bạc Liêu' }],
      },
      {
        code: 'CM',
        name: 'Cà Mau',
        districts: [{ code: 'CM-CM', name: 'Cà Mau' }],
      },
      {
        code: 'TH',
        name: 'Thanh Hóa',
        districts: [
          { code: 'TH-TP', name: 'TP Thanh Hóa' },
          { code: 'TH-SS', name: 'Sầm Sơn' },
        ],
      },
      {
        code: 'NA',
        name: 'Nghệ An',
        districts: [{ code: 'NA-VI', name: 'Vinh' }],
      },
      {
        code: 'HT',
        name: 'Hà Tĩnh',
        districts: [{ code: 'HT-HT', name: 'Hà Tĩnh' }],
      },
      {
        code: 'QB',
        name: 'Quảng Bình',
        districts: [{ code: 'QB-DH', name: 'Đồng Hới' }],
      },
      {
        code: 'TTH',
        name: 'Thừa Thiên Huế',
        districts: [{ code: 'TTH-H', name: 'Huế' }],
      },
      {
        code: 'PY',
        name: 'Phú Yên',
        districts: [{ code: 'PY-TY', name: 'Tuy Hòa' }],
      },
      {
        code: 'BDP',
        name: 'Bình Phước',
        districts: [{ code: 'BDP-ĐD', name: 'Đồng Xoài' }],
      },
    ];

    await this.provinceModel
      .insertMany(
        PROVINCES_32.map((p) => ({
          code: p.code,
          name: p.name,
          isActive: true,
        })),
        { ordered: false },
      )
      .catch(() => []); 

    const allProvinces = await this.provinceModel
      .find({ code: { $in: PROVINCES_32.map((p) => p.code) } })
      .lean();

    const mapId = new Map(
      allProvinces.map((p) => [p.code, p._id as Types.ObjectId]),
    );

    const districts = PROVINCES_32.flatMap((p) =>
      p.districts.map((d) => ({
        code: d.code,
        name: d.name,
        provinceId: mapId.get(p.code)!,
        isActive: true,
      })),
    );

    await this.districtModel
      .insertMany(districts, { ordered: false })
      .catch(() => []);

    const hn = await this.provinceModel.findOne({ code: 'HN' }).lean();
    const hcm = await this.provinceModel.findOne({ code: 'HCM' }).lean();

    this.logger.log(
      `>>> INIT LOCATION 32 PROVINCES DONE (provinces: ${allProvinces.length})`,
    );
    return { hn, hcm };
  }

  /* ---------------- ADDRESSES (không ward) ---------------- */
  private async seedAddresses(
    hn: ProvinceDocument | any,
    hcm: ProvinceDocument | any,
  ) {
    if (await this.addressModel.countDocuments()) {
      const [addrHn1] = await this.addressModel
        .find({ contactName: 'Kho HN' })
        .limit(1)
        .lean<AddressWithCoords[]>();
      const [addrHcm1] = await this.addressModel
        .find({ contactName: 'Kho HCM' })
        .limit(1)
        .lean<AddressWithCoords[]>();
      const [addrHn2] = await this.addressModel
        .find({ contactName: 'Khách HN' })
        .limit(1)
        .lean<AddressWithCoords[]>();
      return { addrHn1, addrHcm1, addrHn2 };
    }

    const qHn = await this.districtModel.findOne({ provinceId: hn._id }).lean();
    const qHcm = await this.districtModel
      .findOne({ provinceId: hcm._id })
      .lean();

    const [addrHn1] = (await this.addressModel.insertMany([
      {
        line1: '123 Tràng Tiền',
        provinceId: hn._id as Types.ObjectId,
        districtId: qHn!._id as Types.ObjectId,
        lat: 21.027763,
        lng: 105.83416,
        contactName: 'Kho HN',
        contactPhone: '0123456789',
      },
    ])) as unknown as AddressWithCoords[];

    const [addrHcm1] = (await this.addressModel.insertMany([
      {
        line1: '45 Lê Lợi',
        provinceId: hcm._id as Types.ObjectId,
        districtId: qHcm!._id as Types.ObjectId,
        lat: 10.776889,
        lng: 106.700806,
        contactName: 'Kho HCM',
        contactPhone: '0987654321',
      },
    ])) as unknown as AddressWithCoords[];

    const [addrHn2] = (await this.addressModel.insertMany([
      {
        line1: '25 Hàng Bài',
        provinceId: hn._id as Types.ObjectId,
        districtId: qHn!._id as Types.ObjectId,
        lat: 21.0245,
        lng: 105.8542,
        contactName: 'Khách HN',
        contactPhone: '0909009009',
      },
    ])) as unknown as AddressWithCoords[];

    this.logger.log('>>> INIT ADDRESSES (no ward) DONE');
    return { addrHn1, addrHcm1, addrHn2 };
  }

  /* ---------------- BRANCHES ---------------- */
  private async seedBranches(
    addrHn: AddressWithCoords,
    addrHcm: AddressWithCoords,
  ) {
    if (await this.branchModel.countDocuments()) {
      const branchHN = await this.branchModel.findOne({ code: 'HN01' });
      const branchHCM = await this.branchModel.findOne({ code: 'HCM01' });
      return { branchHN, branchHCM };
    }

    const [branchHN] = await this.branchModel.insertMany([
      {
        code: 'HN01',
        name: 'Hà Nội Center',
        address: addrHn.line1,
        city: 'Hà Nội',
        province: 'Hà Nội',
        postalCode: '10000',
        phone: '024-000-000',
        isActive: true,
      },
    ]);

    const [branchHCM] = await this.branchModel.insertMany([
      {
        code: 'HCM01',
        name: 'HCM Center',
        address: addrHcm.line1,
        city: 'Hồ Chí Minh',
        province: 'Hồ Chí Minh',
        postalCode: '70000',
        phone: '028-000-000',
        isActive: true,
      },
    ]);

    this.logger.log('>>> INIT BRANCHES DONE');
    return { branchHN, branchHCM };
  }

  /* ---------------- SERVICES ---------------- */
  private async seedServices() {
    if (await this.serviceModel.countDocuments()) {
      const svcSTD = await this.serviceModel.findOne({ code: 'STD' });
      const svcEXP = await this.serviceModel.findOne({ code: 'EXP' });
      return { svcSTD, svcEXP };
    }

    const [svcSTD] = await this.serviceModel.insertMany([
      {
        code: 'STD',
        name: 'Tiêu chuẩn',
        description: '3–5 ngày',
        basePrice: 20000,
        isActive: true,
      },
    ]);

    const [svcEXP] = await this.serviceModel.insertMany([
      {
        code: 'EXP',
        name: 'Nhanh',
        description: '1–2 ngày',
        basePrice: 40000,
        isActive: true,
      },
    ]);

    this.logger.log('>>> INIT SERVICES DONE');
    return { svcSTD, svcEXP };
  }

  /* ---------------- PRICING ---------------- */
  private async seedPricing(
    svcSTDId: Types.ObjectId,
    svcEXPId: Types.ObjectId,
  ) {
    if (await this.pricingModel.countDocuments()) return;

    await this.pricingModel.insertMany([
      // STD
      {
        serviceId: svcSTDId,
        minWeightKg: 0,
        maxWeightKg: 2,
        minKm: 0,
        maxKm: 5,
        baseFee: 15000,
        perKm: 1000,
        perKg: 2000,
      },
      {
        serviceId: svcSTDId,
        minWeightKg: 0,
        maxWeightKg: 2,
        minKm: 5,
        maxKm: 30,
        baseFee: 20000,
        perKm: 1200,
        perKg: 2500,
      },
      {
        serviceId: svcSTDId,
        minWeightKg: 2,
        maxWeightKg: 10,
        minKm: 0,
        maxKm: 30,
        baseFee: 30000,
        perKm: 1500,
        perKg: 2500,
      },
      // EXP
      {
        serviceId: svcEXPId,
        minWeightKg: 0,
        maxWeightKg: 2,
        minKm: 0,
        maxKm: 5,
        baseFee: 25000,
        perKm: 1500,
        perKg: 3000,
      },
      {
        serviceId: svcEXPId,
        minWeightKg: 0,
        maxWeightKg: 2,
        minKm: 5,
        maxKm: 30,
        baseFee: 35000,
        perKm: 1800,
        perKg: 3500,
      },
      {
        serviceId: svcEXPId,
        minWeightKg: 2,
        maxWeightKg: 10,
        minKm: 0,
        maxKm: 30,
        baseFee: 45000,
        perKm: 2000,
        perKg: 3500,
      },
    ]);

    this.logger.log('>>> INIT PRICING DONE');
  }

  /* ---------------- ORDERS ---------------- */
  private async seedOrders(
    pickupAddr: AddressWithCoords,
    deliveryAddr: AddressWithCoords,
  ) {
    if (await this.orderModel.countDocuments()) {
      const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
      const order1 = await this.orderModel.findOne({ userId: customer?._id });
      return { order1, customer };
    }

    const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
    if (!customer) throw new Error('No CUSTOMER user to seed orders');

    const [order1] = await this.orderModel.insertMany([
      {
        userId: customer._id,
        senderName: 'Nguyễn Văn A',
        receiverName: 'Trần Thị B',
        receiverPhone: '0912345678',
        pickupAddressId: pickupAddr._id,
        deliveryAddressId: deliveryAddr._id,
        totalPrice: 120000,
        status: OrderStatus.PENDING,
      },
    ]);

    this.logger.log('>>> INIT ORDERS DONE');
    return { order1, customer };
  }

  /* ---------------- SHIPMENTS ---------------- */
  private async seedShipments(
    order1: OrderDocument,
    customer: UserDocument,
    branchHN: BranchDocument,
    branchHCM: BranchDocument,
    svcSTD: ServiceDocument,
    pickupAddr: AddressWithCoords,
    deliveryAddr: AddressWithCoords,
  ) {
    if (await this.shipmentModel.countDocuments()) return;

    const km = this.haversineKm(
      pickupAddr.lat ?? 0,
      pickupAddr.lng ?? 0,
      deliveryAddr.lat ?? 0,
      deliveryAddr.lng ?? 0,
    );

    const slab = await this.pricingModel
      .findOne({
        serviceId: svcSTD._id,
        isActive: true,
        isDeleted: false,
        minWeightKg: { $lte: 1.5 },
        maxWeightKg: { $gte: 1.5 },
        minKm: { $lte: km },
        maxKm: { $gte: km },
      })
      .lean();

    const fee = slab
      ? Math.round(
          (slab.baseFee ?? 0) +
            (slab.perKm ?? 0) * km +
            (slab.perKg ?? 0) * 1.5,
        )
      : 30000;

    const [shipment] = await this.shipmentModel.insertMany([
      {
        trackingNumber: 'VNSEED001',
        senderName: 'Nguyễn Văn A',
        senderPhone: '0909090909',
        receiverName: 'Trần Thị B',
        receiverPhone: '0911222333',
        pickupAddressId: pickupAddr._id,
        deliveryAddressId: deliveryAddr._id,
        originBranchId: branchHN._id,
        destinationBranchId: branchHCM._id,
        serviceId: svcSTD._id,
        weightKg: 1.5,
        chargeableWeightKg: 1.5,
        distanceKm: km,
        shippingFee: fee,
        status: ShipmentStatus.PENDING,
        createdBy: customer._id as Types.ObjectId,
        timeline: [
          {
            status: ShipmentStatus.PENDING,
            timestamp: new Date(),
            note: 'Đơn tạo (seed)',
          },
        ],
      },
    ]);

    await this.paymentModel.insertMany([
      {
        orderId: order1._id,
        shipmentId: shipment._id,
        userId: customer._id,
        method: 'COD',
        amount: fee,
        status: 'pending',
        provider: 'seed',
      },
    ]);

    this.logger.log('>>> INIT SHIPMENTS & PAYMENTS DONE');
  }

  /* ---------------- TRACKINGS ---------------- */
  private async seedTrackings() {
    if (await this.trackingModel.countDocuments()) return;

    const shipment = await this.shipmentModel.findOne();
    if (!shipment) return;

    await this.trackingModel.insertMany([
      {
        shipmentId: shipment._id,
        status: TrackingStatus.CREATED,
        location: 'Hà Nội Center',
        note: 'Khởi tạo',
        branchId: shipment.originBranchId,
        timestamp: new Date(),
        createdBy: { _id: new Types.ObjectId(), email: 'system@vtpost.local' },
      },
      {
        shipmentId: shipment._id,
        status: TrackingStatus.IN_TRANSIT,
        location: 'Kho trung chuyển',
        note: 'Đang trung chuyển',
        branchId: shipment.originBranchId,
        timestamp: new Date(),
        createdBy: { _id: new Types.ObjectId(), email: 'system@vtpost.local' },
      },
    ]);

    this.logger.log('>>> INIT TRACKINGS DONE');
  }

  /* ---------------- NOTIFICATIONS ---------------- */
  private async seedNotifications(customer: UserDocument) {
    if (await this.notificationModel.countDocuments()) return;

    await this.notificationModel.insertMany([
      {
        recipient: customer.email,
        title: 'Chào mừng',
        message: 'Tài khoản đã kích hoạt.',
        type: NotificationType.EMAIL,
        status: NotificationStatus.SENT,
      },
      {
        recipient: customer.email,
        title: 'Thông báo vận đơn',
        message: 'Vận đơn VNSEED001 đã được khởi tạo.',
        type: NotificationType.EMAIL,
        status: NotificationStatus.PENDING,
      },
    ]);

    this.logger.log('>>> INIT NOTIFICATIONS DONE');
  }

  /* ---------------- helpers ---------------- */
  private haversineKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
}
