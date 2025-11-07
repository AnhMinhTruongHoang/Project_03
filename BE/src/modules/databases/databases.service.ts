import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
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

/** Lean address type dùng trong seed */
type SeedAddress = {
  _id: Types.ObjectId;
  line1: string;
  lat?: number;
  lng?: number;
  provinceId: Types.ObjectId;
  districtId: Types.ObjectId;
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
    const { addrHn1, addrHcm1, addrHn2 } = await this.seedAddresses(hn, hcm); // địa chỉ lean
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

    this.logger.log('DATABASE SEEDING COMPLETED');
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
        name: 'Thành phố Hà Nội',
        districts: [
          { code: 'HN-ST', name: 'Thành phố Sơn Tây' },
          { code: 'HN-SS', name: 'Huyện Sóc Sơn' },
          { code: 'HN-DA', name: 'Huyện Đông Anh' },
          { code: 'HN-GL', name: 'Huyện Gia Lâm' },
          { code: 'HN-TT', name: 'Huyện Thanh Trì' },
          { code: 'HN-ML', name: 'Huyện Mê Linh' },
          { code: 'HN-HĐ', name: 'Huyện Hoài Đức' },
          { code: 'HN-DP', name: 'Huyện Đan Phượng' },
          { code: 'HN-PT', name: 'Huyện Phúc Thọ' },
          { code: 'HN-BV', name: 'Huyện Ba Vì' },
          { code: 'HN-QO', name: 'Huyện Quốc Oai' },
          { code: 'HN-TTH', name: 'Huyện Thạch Thất' },
          { code: 'HN-CM', name: 'Huyện Chương Mỹ' },
          { code: 'HN-TO', name: 'Huyện Thanh Oai' },
          { code: 'HN-TTT', name: 'Huyện Thường Tín' },
          { code: 'HN-PX', name: 'Huyện Phú Xuyên' },
          { code: 'HN-UH', name: 'Huyện Ứng Hòa' },
          { code: 'HN-MD', name: 'Huyện Mỹ Đức' },
          { code: 'HN-BD', name: 'Phường Ba Đình' },
          { code: 'HN-HK', name: 'Phường Hoàn Kiếm' },
          { code: 'HN-HBT', name: 'Phường Hai Bà Trưng' },
          { code: 'HN-DD', name: 'Phường Đống Đa' },
          { code: 'HN-TH', name: 'Phường Tây Hồ' },
          { code: 'HN-CG', name: 'Phường Cầu Giấy' },
          { code: 'HN-TX', name: 'Phường Thanh Xuân' },
          { code: 'HN-HM', name: 'Phường Hoàng Mai' },
          { code: 'HN-LB', name: 'Phường Long Biên' },
          { code: 'HN-HD', name: 'Phường Hà Đông' },
          { code: 'HN-NTL', name: 'Phường Nam Từ Liêm' },
          { code: 'HN-BTL', name: 'Phường Bắc Từ Liêm' },
        ],
      },

      {
        code: 'HCM',
        name: 'Thành phố Hồ Chí Minh',
        districts: [
          { code: 'HCM-BC', name: 'Huyện Bình Chánh' },
          { code: 'HCM-CC', name: 'Huyện Củ Chi' },
          { code: 'HCM-HM', name: 'Huyện Hóc Môn' },
          { code: 'HCM-NB', name: 'Huyện Nhà Bè' },
          { code: 'HCM-CG', name: 'Huyện Cần Giờ' },
          { code: 'HCM-TD', name: 'Thành phố Thủ Đức' },
          { code: 'HCM-BT', name: 'Phường Bình Thạnh' },
          { code: 'HCM-GV', name: 'Phường Gò Vấp' },
          { code: 'HCM-PN', name: 'Phường Phú Nhuận' },
          { code: 'HCM-TB', name: 'Phường Tân Bình' },
          { code: 'HCM-TP', name: 'Phường Tân Phú' },
          { code: 'HCM-BTAN', name: 'Phường Bình Tân' },
          { code: 'HCM-Q1', name: 'Phường Trung tâm (Q1 cũ)' },
          { code: 'HCM-Q3', name: 'Phường Khu Ba (Q3 cũ)' },
          { code: 'HCM-Q4', name: 'Phường Kênh Tẻ (Q4 cũ)' },
          { code: 'HCM-Q5', name: 'Phường Chợ Lớn (Q5 cũ)' },
          { code: 'HCM-Q6', name: 'Phường Bình Phú (Q6 cũ)' },
          { code: 'HCM-Q7', name: 'Phường Nam Sài Gòn (Q7 cũ)' },
          { code: 'HCM-Q8', name: 'Phường Phú Định (Q8 cũ)' },
          { code: 'HCM-Q10', name: 'Phường Nhật Tảo (Q10 cũ)' },
          { code: 'HCM-Q11', name: 'Phường Bình Thới (Q11 cũ)' },
          { code: 'HCM-Q12', name: 'Phường Hiệp Thành (Q12 cũ)' },
        ],
      },

      {
        code: 'HP',
        name: 'Thành phố Hải Phòng',
        districts: [
          { code: 'HP-TN', name: 'Huyện Thủy Nguyên' },
          { code: 'HP-AD', name: 'Huyện An Dương' },
          { code: 'HP-AL', name: 'Huyện An Lão' },
          { code: 'HP-KT', name: 'Huyện Kiến Thụy' },
          { code: 'HP-TL', name: 'Huyện Tiên Lãng' },
          { code: 'HP-VB', name: 'Huyện Vĩnh Bảo' },
          { code: 'HP-CH', name: 'Huyện Cát Hải' },
          { code: 'HP-BLV', name: 'Huyện Bạch Long Vĩ' },

          { code: 'HP-HB', name: 'Phường Hồng Bàng' },
          { code: 'HP-NQ', name: 'Phường Ngô Quyền' },
          { code: 'HP-LC', name: 'Phường Lê Chân' },
          { code: 'HP-HA', name: 'Phường Hải An' },
          { code: 'HP-KA', name: 'Phường Kiến An' },
          { code: 'HP-DS', name: 'Phường Đồ Sơn' },
          { code: 'HP-DK', name: 'Phường Dương Kinh' },
        ],
      },

      {
        code: 'DN',
        name: 'Thành phố Đà Nẵng',
        districts: [
          { code: 'DN-HA', name: 'Phường Hải Châu' },
          { code: 'DN-ST', name: 'Phường Sơn Trà' },
          { code: 'DN-NHS', name: 'Phường Ngũ Hành Sơn' },
          { code: 'DN-LC', name: 'Phường Liên Chiểu' },
          { code: 'DN-TK', name: 'Phường Thanh Khê' },
          { code: 'DN-CL', name: 'Phường Cẩm Lệ' },
          { code: 'DN-HV', name: 'Huyện Hòa Vang' },
          { code: 'DN-HS', name: 'Huyện Hoàng Sa' },
        ],
      },

      {
        code: 'CT',
        name: 'Thành phố Cần Thơ',
        districts: [
          { code: 'CT-NK', name: 'Phường Ninh Kiều' },
          { code: 'CT-BT', name: 'Phường Bình Thủy' },
          { code: 'CT-CR', name: 'Phường Cái Răng' },
          { code: 'CT-OM', name: 'Phường Ô Môn' },
          { code: 'CT-TN', name: 'Phường Thốt Nốt' },
          { code: 'CT-VT', name: 'Huyện Vĩnh Thạnh' },
          { code: 'CT-CD', name: 'Huyện Cờ Đỏ' },
          { code: 'CT-PD', name: 'Huyện Phong Điền' },
          { code: 'CT-TL', name: 'Huyện Thới Lai' },
        ],
      },

      {
        code: 'QN',
        name: 'Quảng Ninh',
        districts: [
          { code: 'QN-HL', name: 'Thành phố Hạ Long' },
          { code: 'QN-MC', name: 'Thành phố Móng Cái' },
          { code: 'QN-CP', name: 'Thành phố Cẩm Phả' },
          { code: 'QN-UB', name: 'Thành phố Uông Bí' },
          { code: 'QN-DT', name: 'Thị xã Đông Triều' },
          { code: 'QN-QY', name: 'Thị xã Quảng Yên' },
          { code: 'QN-BL', name: 'Huyện Bình Liêu' },
          { code: 'QN-TY', name: 'Huyện Tiên Yên' },
          { code: 'QN-DH', name: 'Huyện Đầm Hà' },
          { code: 'QN-HH', name: 'Huyện Hải Hà' },
          { code: 'QN-BC', name: 'Huyện Ba Chẽ' },
          { code: 'QN-VD', name: 'Huyện Vân Đồn' },
          { code: 'QN-CT', name: 'Huyện Cô Tô' },
        ],
      },

      {
        code: 'LA',
        name: 'Long An',
        districts: [
          { code: 'LA-TA', name: 'Thành phố Tân An' },
          { code: 'LA-KT', name: 'Thị xã Kiến Tường' },
          { code: 'LA-TH', name: 'Huyện Tân Hưng' },
          { code: 'LA-VH', name: 'Huyện Vĩnh Hưng' },
          { code: 'LA-MH', name: 'Huyện Mộc Hóa' },
          { code: 'LA-TT', name: 'Huyện Tân Thạnh' },
          { code: 'LA-THO', name: 'Huyện Thạnh Hóa' },
          { code: 'LA-DH', name: 'Huyện Đức Huệ' },
          { code: 'LA-DHOA', name: 'Huyện Đức Hòa' },
          { code: 'LA-BL', name: 'Huyện Bến Lức' },
          { code: 'LA-TTH', name: 'Huyện Thủ Thừa' },
          { code: 'LA-TTR', name: 'Huyện Tân Trụ' },
          { code: 'LA-CD', name: 'Huyện Cần Đước' },
          { code: 'LA-CG', name: 'Huyện Cần Giuộc' },
          { code: 'LA-CT', name: 'Huyện Châu Thành' },
        ],
      },
      {
        code: 'BD',
        name: 'Bình Dương',
        districts: [
          { code: 'BD-TDM', name: 'Thành phố Thủ Dầu Một' },
          { code: 'BD-DA', name: 'Thành phố Dĩ An' },
          { code: 'BD-TA', name: 'Thành phố Thuận An' },
          { code: 'BD-BC', name: 'Thị xã Bến Cát' },
          { code: 'BD-TU', name: 'Thị xã Tân Uyên' },
          { code: 'BD-BB', name: 'Huyện Bàu Bàng' },
          { code: 'BD-DT', name: 'Huyện Dầu Tiếng' },
          { code: 'BD-PG', name: 'Huyện Phú Giáo' },
          { code: 'BD-BTU', name: 'Huyện Bắc Tân Uyên' },
        ],
      },

      {
        code: 'BH',
        name: 'Bình Định',
        districts: [
          { code: 'BH-QN', name: 'Thành phố Quy Nhơn' },
          { code: 'BH-HN', name: 'Thị xã Hoài Nhơn' },
          { code: 'BH-AN', name: 'Thị xã An Nhơn' },
          { code: 'BH-AL', name: 'Huyện An Lão' },
          { code: 'BH-HA', name: 'Huyện Hoài Ân' },
          { code: 'BH-PM', name: 'Huyện Phù Mỹ' },
          { code: 'BH-VT', name: 'Huyện Vĩnh Thạnh' },
          { code: 'BH-TS', name: 'Huyện Tây Sơn' },
          { code: 'BH-PC', name: 'Huyện Phù Cát' },
          { code: 'BH-TP', name: 'Huyện Tuy Phước' },
          { code: 'BH-VC', name: 'Huyện Vân Canh' },
        ],
      },
      {
        code: 'NT',
        name: 'Ninh Thuận',
        districts: [
          { code: 'NT-PR', name: 'Thành phố Phan Rang - Tháp Chàm' },
          { code: 'NT-BA', name: 'Huyện Bác Ái' },
          { code: 'NT-NS', name: 'Huyện Ninh Sơn' },
          { code: 'NT-NH', name: 'Huyện Ninh Hải' },
          { code: 'NT-NP', name: 'Huyện Ninh Phước' },
          { code: 'NT-TB', name: 'Huyện Thuận Bắc' },
          { code: 'NT-TN', name: 'Huyện Thuận Nam' },
        ],
      },

      {
        code: 'BT',
        name: 'Bình Thuận',
        districts: [
          { code: 'BT-PT', name: 'Thành phố Phan Thiết' },
          { code: 'BT-LG', name: 'Thị xã La Gi' },
          { code: 'BT-TP', name: 'Huyện Tuy Phong' },
          { code: 'BT-BB', name: 'Huyện Bắc Bình' },
          { code: 'BT-HTB', name: 'Huyện Hàm Thuận Bắc' },
          { code: 'BT-HTN', name: 'Huyện Hàm Thuận Nam' },
          { code: 'BT-TL', name: 'Huyện Tánh Linh' },
          { code: 'BT-DL', name: 'Huyện Đức Linh' },
          { code: 'BT-HT', name: 'Huyện Hàm Tân' },
          { code: 'BT-PQ', name: 'Huyện Phú Quý' },
        ],
      },
      {
        code: 'KH',
        name: 'Khánh Hòa',
        districts: [
          { code: 'KH-NT', name: 'Thành phố Nha Trang' },
          { code: 'KH-CR', name: 'Thành phố Cam Ranh' },
          { code: 'KH-NH', name: 'Thị xã Ninh Hòa' },
          { code: 'KH-CL', name: 'Huyện Cam Lâm' },
          { code: 'KH-VN', name: 'Huyện Vạn Ninh' },
          { code: 'KH-KV', name: 'Huyện Khánh Vĩnh' },
          { code: 'KH-DK', name: 'Huyện Diên Khánh' },
          { code: 'KH-KS', name: 'Huyện Khánh Sơn' },
          { code: 'KH-TS', name: 'Huyện Trường Sa' },
        ],
      },

      {
        code: 'LD',
        name: 'Lâm Đồng',
        districts: [
          { code: 'LD-DL', name: 'Thành phố Đà Lạt' },
          { code: 'LD-BL', name: 'Thành phố Bảo Lộc' },
          { code: 'LD-DR', name: 'Huyện Đam Rông' },
          { code: 'LD-LD', name: 'Huyện Lạc Dương' },
          { code: 'LD-LH', name: 'Huyện Lâm Hà' },
          { code: 'LD-DD', name: 'Huyện Đơn Dương' },
          { code: 'LD-DT', name: 'Huyện Đức Trọng' },
          { code: 'LD-DL2', name: 'Huyện Di Linh' },
          { code: 'LD-BLM', name: 'Huyện Bảo Lâm' },
          { code: 'LD-DH', name: 'Huyện Đạ Huoai' },
          { code: 'LD-DT2', name: 'Huyện Đạ Tẻh' },
          { code: 'LD-CT', name: 'Huyện Cát Tiên' },
        ],
      },
      {
        code: 'GL',
        name: 'Gia Lai',
        districts: [
          { code: 'GL-PK', name: 'Thành phố Pleiku' },
          { code: 'GL-AK', name: 'Thị xã An Khê' },
          { code: 'GL-AP', name: 'Thị xã Ayun Pa' },
          { code: 'GL-KB', name: 'Huyện KBang' },
          { code: 'GL-DD', name: 'Huyện Đăk Đoa' },
          { code: 'GL-CP', name: 'Huyện Chư Păh' },
          { code: 'GL-IG', name: 'Huyện Ia Grai' },
          { code: 'GL-MY', name: 'Huyện Mang Yang' },
          { code: 'GL-KC', name: 'Huyện Kông Chro' },
          { code: 'GL-DC', name: 'Huyện Đức Cơ' },
          { code: 'GL-CPr', name: 'Huyện Chư Prông' },
          { code: 'GL-CS', name: 'Huyện Chư Sê' },
          { code: 'GL-DP', name: 'Huyện Đăk Pơ' },
          { code: 'GL-IP', name: 'Huyện Ia Pa' },
          { code: 'GL-KP', name: 'Huyện Krông Pa' },
          { code: 'GL-PT', name: 'Huyện Phú Thiện' },
          { code: 'GL-CPu', name: 'Huyện Chư Pưh' },
        ],
      },

      {
        code: 'DLK',
        name: 'Đắk Lắk',
        districts: [
          { code: 'DLK-BMT', name: 'Thành phố Buôn Ma Thuột' },
          { code: 'DLK-BH', name: 'Thị xã Buôn Hồ' },
          { code: 'DLK-EH', name: 'Huyện Ea H’leo' },
          { code: 'DLK-ES', name: 'Huyện Ea Súp' },
          { code: 'DLK-BD', name: 'Huyện Buôn Đôn' },
          { code: 'DLK-CM', name: 'Huyện Cư M’gar' },
          { code: 'DLK-KB', name: 'Huyện Krông Búk' },
          { code: 'DLK-KN', name: 'Huyện Krông Năng' },
          { code: 'DLK-EK', name: 'Huyện Ea Kar' },
          { code: 'DLK-MD', name: 'Huyện M’Đrắk' },
          { code: 'DLK-KBO', name: 'Huyện Krông Bông' },
          { code: 'DLK-KP', name: 'Huyện Krông Pắk' },
          { code: 'DLK-KA', name: 'Huyện Krông Ana' },
          { code: 'DLK-LK', name: 'Huyện Lắk' },
          { code: 'DLK-CK', name: 'Huyện Cư Kuin' },
        ],
      },

      {
        code: 'DNA',
        name: 'Đồng Nai',
        districts: [
          { code: 'DNA-BH', name: 'Thành phố Biên Hòa' },
          { code: 'DNA-LK', name: 'Thành phố Long Khánh' },
          { code: 'DNA-TP', name: 'Huyện Tân Phú' },
          { code: 'DNA-VC', name: 'Huyện Vĩnh Cửu' },
          { code: 'DNA-DQ', name: 'Huyện Định Quán' },
          { code: 'DNA-TB', name: 'Huyện Trảng Bom' },
          { code: 'DNA-TN', name: 'Huyện Thống Nhất' },
          { code: 'DNA-CM', name: 'Huyện Cẩm Mỹ' },
          { code: 'DNA-LT', name: 'Huyện Long Thành' },
          { code: 'DNA-XL', name: 'Huyện Xuân Lộc' },
          { code: 'DNA-NT', name: 'Huyện Nhơn Trạch' },
        ],
      },
      {
        code: 'VT',
        name: 'Bà Rịa - Vũng Tàu',
        districts: [
          { code: 'VT-VT', name: 'Thành phố Vũng Tàu' },
          { code: 'VT-BR', name: 'Thành phố Bà Rịa' },
          { code: 'VT-PM', name: 'Thị xã Phú Mỹ' },
          { code: 'VT-CDU', name: 'Huyện Châu Đức' },
          { code: 'VT-XM', name: 'Huyện Xuyên Mộc' },
          { code: 'VT-LD', name: 'Huyện Long Điền' },
          { code: 'VT-CD', name: 'Huyện Côn Đảo' },
        ],
      },
      {
        code: 'TG',
        name: 'Tiền Giang',
        districts: [
          { code: 'TG-MT', name: 'Thành phố Mỹ Tho' },
          { code: 'TG-GC', name: 'Thị xã Gò Công' },
          { code: 'TG-CL', name: 'Thị xã Cai Lậy' },
          { code: 'TG-TP', name: 'Huyện Tân Phước' },
          { code: 'TG-CB', name: 'Huyện Cái Bè' },
          { code: 'TG-CLH', name: 'Huyện Cai Lậy' },
          { code: 'TG-CT', name: 'Huyện Châu Thành' },
          { code: 'TG-CG', name: 'Huyện Chợ Gạo' },
          { code: 'TG-GT', name: 'Huyện Gò Công Tây' },
          { code: 'TG-GD', name: 'Huyện Gò Công Đông' },
          { code: 'TG-TPO', name: 'Huyện Tân Phú Đông' },
        ],
      },
      {
        code: 'AG',
        name: 'An Giang',
        districts: [
          { code: 'AG-LX', name: 'Thành phố Long Xuyên' },
          { code: 'AG-CD', name: 'Thành phố Châu Đốc' },
          { code: 'AG-TC', name: 'Thị xã Tân Châu' },
          { code: 'AG-AP', name: 'Huyện An Phú' },
          { code: 'AG-PT', name: 'Huyện Phú Tân' },
          { code: 'AG-CP', name: 'Huyện Châu Phú' },
          { code: 'AG-TB', name: 'Huyện Tịnh Biên' },
          { code: 'AG-TT', name: 'Huyện Tri Tôn' },
          { code: 'AG-CT', name: 'Huyện Châu Thành' },
          { code: 'AG-CM', name: 'Huyện Chợ Mới' },
          { code: 'AG-TS', name: 'Huyện Thoại Sơn' },
        ],
      },
      {
        code: 'KG',
        name: 'Kiên Giang',
        districts: [
          { code: 'KG-RG', name: 'Thành phố Rạch Giá' },
          { code: 'KG-HT', name: 'Thành phố Hà Tiên' },
          { code: 'KG-PQ', name: 'Thành phố Phú Quốc' },
          { code: 'KG-KL', name: 'Huyện Kiên Lương' },
          { code: 'KG-HD', name: 'Huyện Hòn Đất' },
          { code: 'KG-TH', name: 'Huyện Tân Hiệp' },
          { code: 'KG-CT', name: 'Huyện Châu Thành' },
          { code: 'KG-GR', name: 'Huyện Giồng Riềng' },
          { code: 'KG-GQ', name: 'Huyện Gò Quao' },
          { code: 'KG-AB', name: 'Huyện An Biên' },
          { code: 'KG-AM', name: 'Huyện An Minh' },
          { code: 'KG-VT', name: 'Huyện Vĩnh Thuận' },
          { code: 'KG-KH', name: 'Huyện Kiên Hải' },
          { code: 'KG-UMT', name: 'Huyện U Minh Thượng' },
          { code: 'KG-GT', name: 'Huyện Giang Thành' },
        ],
      },
      {
        code: 'ST',
        name: 'Sóc Trăng',
        districts: [
          { code: 'ST-ST', name: 'Thành phố Sóc Trăng' },
          { code: 'ST-NN', name: 'Thị xã Ngã Năm' },
          { code: 'ST-VC', name: 'Thị xã Vĩnh Châu' },
          { code: 'ST-CT', name: 'Huyện Châu Thành' },
          { code: 'ST-KS', name: 'Huyện Kế Sách' },
          { code: 'ST-MT', name: 'Huyện Mỹ Tú' },
          { code: 'ST-CLD', name: 'Huyện Cù Lao Dung' },
          { code: 'ST-LP', name: 'Huyện Long Phú' },
          { code: 'ST-MX', name: 'Huyện Mỹ Xuyên' },
          { code: 'ST-TT', name: 'Huyện Thạnh Trị' },
          { code: 'ST-TD', name: 'Huyện Trần Đề' },
        ],
      },
      {
        code: 'TV',
        name: 'Trà Vinh',
        districts: [
          { code: 'TV-TV', name: 'Thành phố Trà Vinh' },
          { code: 'TV-DH', name: 'Thị xã Duyên Hải' },
          { code: 'TV-CL', name: 'Huyện Càng Long' },
          { code: 'TV-CK', name: 'Huyện Cầu Kè' },
          { code: 'TV-TC', name: 'Huyện Tiểu Cần' },
          { code: 'TV-CT', name: 'Huyện Châu Thành' },
          { code: 'TV-CN', name: 'Huyện Cầu Ngang' },
          { code: 'TV-TC2', name: 'Huyện Trà Cú' },
          { code: 'TV-DH2', name: 'Huyện Duyên Hải' },
        ],
      },

      {
        code: 'VLong',
        name: 'Vĩnh Long',
        districts: [
          { code: 'VL-VL', name: 'Thành phố Vĩnh Long' },
          { code: 'VL-BM', name: 'Thành phố Bình Minh' },
          { code: 'VL-LH', name: 'Huyện Long Hồ' },
          { code: 'VL-MT', name: 'Huyện Mang Thít' },
          { code: 'VL-VL2', name: 'Huyện Vũng Liêm' },
          { code: 'VL-TB', name: 'Huyện Tam Bình' },
          { code: 'VL-TO', name: 'Huyện Trà Ôn' },
          { code: 'VL-BT', name: 'Huyện Bình Tân' },
        ],
      },

      {
        code: 'BL',
        name: 'Bạc Liêu',
        districts: [
          { code: 'BL-BL', name: 'Thành phố Bạc Liêu' },
          { code: 'BL-GR', name: 'Thị xã Giá Rai' },
          { code: 'BL-HD', name: 'Huyện Hồng Dân' },
          { code: 'BL-PL', name: 'Huyện Phước Long' },
          { code: 'BL-VL', name: 'Huyện Vĩnh Lợi' },
          { code: 'BL-DH', name: 'Huyện Đông Hải' },
          { code: 'BL-HB', name: 'Huyện Hòa Bình' },
        ],
      },
      {
        code: 'CM',
        name: 'Cà Mau',
        districts: [
          { code: 'CM-CM', name: 'Thành phố Cà Mau' },
          { code: 'CM-UM', name: 'Huyện U Minh' },
          { code: 'CM-TB', name: 'Huyện Thới Bình' },
          { code: 'CM-TVT', name: 'Huyện Trần Văn Thời' },
          { code: 'CM-CN', name: 'Huyện Cái Nước' },
          { code: 'CM-DD', name: 'Huyện Đầm Dơi' },
          { code: 'CM-NC', name: 'Huyện Năm Căn' },
          { code: 'CM-PT', name: 'Huyện Phú Tân' },
          { code: 'CM-NH', name: 'Huyện Ngọc Hiển' },
        ],
      },
      {
        code: 'TH',
        name: 'Thanh Hóa',
        districts: [
          { code: 'TH-TP', name: 'Thành phố Thanh Hóa' },
          { code: 'TH-SS', name: 'Thành phố Sầm Sơn' },
          { code: 'TH-BS', name: 'Thị xã Bỉm Sơn' },
          { code: 'TH-NS', name: 'Thị xã Nghi Sơn' },
          { code: 'TH-ML', name: 'Huyện Mường Lát' },
          { code: 'TH-QH', name: 'Huyện Quan Hóa' },
          { code: 'TH-BT', name: 'Huyện Bá Thước' },
          { code: 'TH-QS', name: 'Huyện Quan Sơn' },
          { code: 'TH-LC', name: 'Huyện Lang Chánh' },
          { code: 'TH-NL', name: 'Huyện Ngọc Lặc' },
          { code: 'TH-CT', name: 'Huyện Cẩm Thủy' },
          { code: 'TH-TT', name: 'Huyện Thạch Thành' },
          { code: 'TH-HT', name: 'Huyện Hà Trung' },
          { code: 'TH-VL', name: 'Huyện Vĩnh Lộc' },
          { code: 'TH-YD', name: 'Huyện Yên Định' },
          { code: 'TH-TX', name: 'Huyện Thọ Xuân' },
          { code: 'TH-TXU', name: 'Huyện Thường Xuân' },
          { code: 'TH-TS', name: 'Huyện Triệu Sơn' },
          { code: 'TH-TH', name: 'Huyện Thiệu Hóa' },
          { code: 'TH-HH', name: 'Huyện Hoằng Hóa' },
          { code: 'TH-HL', name: 'Huyện Hậu Lộc' },
          { code: 'TH-NSO', name: 'Huyện Nga Sơn' },
          { code: 'TH-NX', name: 'Huyện Như Xuân' },
          { code: 'TH-NT', name: 'Huyện Như Thanh' },
          { code: 'TH-NC', name: 'Huyện Nông Cống' },
          { code: 'TH-DS', name: 'Huyện Đông Sơn' },
          { code: 'TH-QX', name: 'Huyện Quảng Xương' },
        ],
      },
      {
        code: 'NA',
        name: 'Nghệ An',
        districts: [
          { code: 'NA-VI', name: 'Thành phố Vinh' },
          { code: 'NA-CL', name: 'Thị xã Cửa Lò' },
          { code: 'NA-TH', name: 'Thị xã Thái Hòa' },
          { code: 'NA-HM', name: 'Thị xã Hoàng Mai' },
          { code: 'NA-QP', name: 'Huyện Quế Phong' },
          { code: 'NA-QC', name: 'Huyện Quỳ Châu' },
          { code: 'NA-KS', name: 'Huyện Kỳ Sơn' },
          { code: 'NA-TD', name: 'Huyện Tương Dương' },
          { code: 'NA-ND', name: 'Huyện Nghĩa Đàn' },
          { code: 'NA-QH', name: 'Huyện Quỳ Hợp' },
          { code: 'NA-QL', name: 'Huyện Quỳnh Lưu' },
          { code: 'NA-CC', name: 'Huyện Con Cuông' },
          { code: 'NA-TK', name: 'Huyện Tân Kỳ' },
          { code: 'NA-AS', name: 'Huyện Anh Sơn' },
          { code: 'NA-DC', name: 'Huyện Diễn Châu' },
          { code: 'NA-YT', name: 'Huyện Yên Thành' },
          { code: 'NA-DL', name: 'Huyện Đô Lương' },
          { code: 'NA-TC', name: 'Huyện Thanh Chương' },
          { code: 'NA-NL', name: 'Huyện Nghi Lộc' },
          { code: 'NA-ND2', name: 'Huyện Nam Đàn' },
          { code: 'NA-HN', name: 'Huyện Hưng Nguyên' },
        ],
      },
      {
        code: 'HT',
        name: 'Hà Tĩnh',
        districts: [
          { code: 'HT-HT', name: 'Thành phố Hà Tĩnh' },
          { code: 'HT-HL', name: 'Thị xã Hồng Lĩnh' },
          { code: 'HT-KA', name: 'Thị xã Kỳ Anh' },
          { code: 'HT-HS', name: 'Huyện Hương Sơn' },
          { code: 'HT-DT', name: 'Huyện Đức Thọ' },
          { code: 'HT-VQ', name: 'Huyện Vũ Quang' },
          { code: 'HT-NX', name: 'Huyện Nghi Xuân' },
          { code: 'HT-CL', name: 'Huyện Can Lộc' },
          { code: 'HT-HK', name: 'Huyện Hương Khê' },
          { code: 'HT-TH', name: 'Huyện Thạch Hà' },
          { code: 'HT-CX', name: 'Huyện Cẩm Xuyên' },
          { code: 'HT-KA2', name: 'Huyện Kỳ Anh' },
          { code: 'HT-LH', name: 'Huyện Lộc Hà' },
        ],
      },
      {
        code: 'QB',
        name: 'Quảng Bình',
        districts: [
          { code: 'QB-DH', name: 'Thành phố Đồng Hới' },
          { code: 'QB-BD', name: 'Thị xã Ba Đồn' },
          { code: 'QB-MH', name: 'Huyện Minh Hóa' },
          { code: 'QB-TH', name: 'Huyện Tuyên Hóa' },
          { code: 'QB-QT', name: 'Huyện Quảng Trạch' },
          { code: 'QB-BT', name: 'Huyện Bố Trạch' },
          { code: 'QB-QN', name: 'Huyện Quảng Ninh' },
          { code: 'QB-LT', name: 'Huyện Lệ Thủy' },
        ],
      },
      {
        code: 'TTH',
        name: 'Thừa Thiên Huế',
        districts: [
          { code: 'TTH-H', name: 'Thành phố Huế' },
          { code: 'TTH-HT', name: 'Thị xã Hương Thủy' },
          { code: 'TTH-HTr', name: 'Thị xã Hương Trà' },
          { code: 'TTH-PD', name: 'Huyện Phong Điền' },
          { code: 'TTH-QD', name: 'Huyện Quảng Điền' },
          { code: 'TTH-PV', name: 'Huyện Phú Vang' },
          { code: 'TTH-AL', name: 'Huyện A Lưới' },
          { code: 'TTH-PL', name: 'Huyện Phú Lộc' },
          { code: 'TTH-ND', name: 'Huyện Nam Đông' },
        ],
      },
      {
        code: 'PY',
        name: 'Phú Yên',
        districts: [
          { code: 'PY-TY', name: 'Thành phố Tuy Hòa' },
          { code: 'PY-SC', name: 'Thị xã Sông Cầu' },
          { code: 'PY-DH', name: 'Thị xã Đông Hòa' },
          { code: 'PY-DX', name: 'Huyện Đồng Xuân' },
          { code: 'PY-TA', name: 'Huyện Tuy An' },
          { code: 'PY-SH', name: 'Huyện Sơn Hòa' },
          { code: 'PY-SHi', name: 'Huyện Sông Hinh' },
          { code: 'PY-TH', name: 'Huyện Tây Hòa' },
          { code: 'PY-PH', name: 'Huyện Phú Hòa' },
        ],
      },
      {
        code: 'BDP',
        name: 'Bình Phước',
        districts: [
          { code: 'BDP-DX', name: 'Thành phố Đồng Xoài' },
          { code: 'BDP-PL', name: 'Thị xã Phước Long' },
          { code: 'BDP-BL', name: 'Thị xã Bình Long' },
          { code: 'BDP-CT', name: 'Thị xã Chơn Thành' },
          { code: 'BDP-BGM', name: 'Huyện Bù Gia Mập' },
          { code: 'BDP-LN', name: 'Huyện Lộc Ninh' },
          { code: 'BDP-BD', name: 'Huyện Bù Đốp' },
          { code: 'BDP-HQ', name: 'Huyện Hớn Quản' },
          { code: 'BDP-DP', name: 'Huyện Đồng Phú' },
          { code: 'BDP-BDG', name: 'Huyện Bù Đăng' },
          { code: 'BDP-PR', name: 'Huyện Phú Riềng' },
        ],
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

  /* ---------------- ADDRESSES (no ward) ---------------- */
  private async getOrCreateAddressByCodes(opts: {
    contactName: string;
    contactPhone: string;
    line1: string;
    provinceCode: string;
    districtCode: string;
    lat?: number;
    lng?: number;
  }): Promise<SeedAddress> {
    // 1) Có sẵn thì dùng (và đảm bảo line1 không rỗng)
    const existed = await this.addressModel.findOne({
      contactName: opts.contactName,
    });
    if (existed) {
      if (!existed.line1 || !existed.line1.trim()) {
        existed.line1 = opts.line1;
        await existed.save();
      }
      return this.toSeedAddress(existed);
    }

    // 2) Resolve id tỉnh/quận theo code
    const prov = await this.provinceModel
      .findOne({ code: opts.provinceCode })
      .lean();
    if (!prov?._id) throw new Error(`Missing province ${opts.provinceCode}`);

    const dist = await this.districtModel
      .findOne({ code: opts.districtCode, provinceId: prov._id })
      .lean();
    if (!dist?._id)
      throw new Error(
        `Missing district ${opts.districtCode} of ${opts.provinceCode}`,
      );

    // 3) Tạo mới -> trả về lean ngay
    const [created] = await this.addressModel.insertMany([
      {
        line1: opts.line1,
        provinceId: prov._id,
        districtId: dist._id,
        lat: opts.lat ?? 0,
        lng: opts.lng ?? 0,
        contactName: opts.contactName,
        contactPhone: opts.contactPhone,
      },
    ]);

    return this.toSeedAddress(created);
  }

  private async seedAddresses(
    _hn: any,
    _hcm: any,
  ): Promise<{
    addrHn1: SeedAddress;
    addrHcm1: SeedAddress;
    addrHn2: SeedAddress;
  }> {
    const addrHn1 = await this.getOrCreateAddressByCodes({
      contactName: 'Kho HN',
      contactPhone: '0123456789',
      line1: '123 Tràng Tiền',
      provinceCode: 'HN',
      districtCode: 'HN-HK',
      lat: 21.027763,
      lng: 105.83416,
    });

    const addrHcm1 = await this.getOrCreateAddressByCodes({
      contactName: 'Kho HCM',
      contactPhone: '0987654321',
      line1: '45 Lê Lợi',
      provinceCode: 'HCM',
      districtCode: 'HCM-Q1',
      lat: 10.776889,
      lng: 106.700806,
    });

    const addrHn2 = await this.getOrCreateAddressByCodes({
      contactName: 'Khách HN',
      contactPhone: '0909009009',
      line1: '25 Hàng Bài',
      provinceCode: 'HN',
      districtCode: 'HN-HK',
      lat: 21.0245,
      lng: 105.8542,
    });

    return { addrHn1, addrHcm1, addrHn2 };
  }

  /* ---------------- BRANCHES ---------------- */
  private async seedBranches(addrHn: SeedAddress, addrHcm: SeedAddress) {
    if (await this.branchModel.countDocuments()) {
      const branches = await this.branchModel.find().limit(2);
      return { branchHN: branches[0], branchHCM: branches[1] };
    }

    const branches = [
      {
        code: 'HN01',
        name: 'Hà Nội Center',
        address: addrHn.line1 ?? '123 Tràng Tiền, Hoàn Kiếm',
        city: 'Hà Nội',
        province: 'Hà Nội',
        postalCode: '100000',
        phone: '024-000-000',
        isActive: true,
      },
      {
        code: 'HCM01',
        name: 'HCM Center',
        address: addrHcm.line1 ?? '456 Lê Lợi, Quận 1',
        city: 'Hồ Chí Minh',
        province: 'Hồ Chí Minh',
        postalCode: '700000',
        phone: '028-000-000',
        isActive: true,
      },
      {
        code: 'DN01',
        name: 'Đà Nẵng Center',
        address: '99 Hùng Vương, Hải Châu',
        city: 'Đà Nẵng',
        province: 'Đà Nẵng',
        postalCode: '550000',
        phone: '0236-000-000',
        isActive: true,
      },
      {
        code: 'HP01',
        name: 'Hải Phòng Hub',
        address: '88 Điện Biên Phủ, Ngô Quyền',
        city: 'Hải Phòng',
        province: 'Hải Phòng',
        postalCode: '180000',
        phone: '0225-000-000',
        isActive: true,
      },
      {
        code: 'CT01',
        name: 'Cần Thơ Hub',
        address: '77 Hòa Bình, Ninh Kiều',
        city: 'Cần Thơ',
        province: 'Cần Thơ',
        postalCode: '900000',
        phone: '0292-000-000',
        isActive: true,
      },
      {
        code: 'KH01',
        name: 'Nha Trang Hub',
        address: '66 Trần Phú, Nha Trang',
        city: 'Nha Trang',
        province: 'Khánh Hòa',
        postalCode: '650000',
        phone: '0258-000-000',
        isActive: true,
      },
      {
        code: 'BD01',
        name: 'Bình Dương Center',
        address: '12 Đại Lộ Bình Dương, Thủ Dầu Một',
        city: 'Thủ Dầu Một',
        province: 'Bình Dương',
        postalCode: '590000',
        phone: '0274-000-000',
        isActive: true,
      },
      {
        code: 'DN02',
        name: 'Biên Hòa Hub',
        address: '55 Võ Thị Sáu, Biên Hòa',
        city: 'Biên Hòa',
        province: 'Đồng Nai',
        postalCode: '810000',
        phone: '0251-000-000',
        isActive: true,
      },
      {
        code: 'TH01',
        name: 'Thanh Hóa Hub',
        address: '33 Lê Hoàn, Thanh Hóa',
        city: 'Thanh Hóa',
        province: 'Thanh Hóa',
        postalCode: '440000',
        phone: '0237-000-000',
        isActive: true,
      },
      {
        code: 'NA01',
        name: 'Vinh Hub',
        address: '22 Trường Thi, Vinh',
        city: 'Vinh',
        province: 'Nghệ An',
        postalCode: '460000',
        phone: '0238-000-000',
        isActive: true,
      },
      {
        code: 'HU01',
        name: 'Huế Center',
        address: '45 Hùng Vương, Huế',
        city: 'Huế',
        province: 'Thừa Thiên Huế',
        postalCode: '530000',
        phone: '0234-000-000',
        isActive: true,
      },
      {
        code: 'QN01',
        name: 'Quảng Ninh Hub',
        address: '11 Trần Hưng Đạo, Hạ Long',
        city: 'Hạ Long',
        province: 'Quảng Ninh',
        postalCode: '200000',
        phone: '0203-000-000',
        isActive: true,
      },
    ];

    const inserted = await this.branchModel.insertMany(branches);
    this.logger.log('>>> INIT BRANCHES DONE (12 records)');

    // Return 2 chính để seed shipment
    const branchHN = inserted.find((b) => b.code === 'HN01')!;
    const branchHCM = inserted.find((b) => b.code === 'HCM01')!;
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

  /* ---------------- ORDERS (no embedded address) ---------------- */
  private async seedOrders(
    pickupAddr: SeedAddress,
    deliveryAddr: SeedAddress,
  ): Promise<{ order1: OrderDocument; customer: UserDocument }> {
    // Nếu đã có order thì dùng lại
    if (await this.orderModel.countDocuments()) {
      const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
      const order1 = await this.orderModel.findOne({ userId: customer?._id });
      return { order1, customer };
    }

    const customer = await this.userModel.findOne({ role: 'CUSTOMER' });
    if (!customer) throw new Error('No CUSTOMER user to seed orders');

    if (!pickupAddr?._id)
      throw new Error('seedOrders: pickupAddressId is empty');
    if (!deliveryAddr?._id)
      throw new Error('seedOrders: deliveryAddressId is empty');

    // Bổ sung line1 nếu thiếu (giúp hiển thị/in tem)
    await Promise.all([
      this.ensureLine1(pickupAddr),
      this.ensureLine1(deliveryAddr),
    ]);

    const [order1] = await this.orderModel.insertMany([
      {
        userId: customer._id,
        senderName: 'Nguyễn Văn A',
        receiverName: 'Trần Thị B',
        receiverPhone: '0912345678',
        pickupAddressId: new Types.ObjectId(pickupAddr._id),
        deliveryAddressId: new Types.ObjectId(deliveryAddr._id),
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
    pickupAddr: SeedAddress,
    deliveryAddr: SeedAddress,
  ) {
    if (await this.shipmentModel.countDocuments()) return;

    // 1) Tính khoảng cách
    const km = this.haversineKm(
      pickupAddr.lat ?? 0,
      pickupAddr.lng ?? 0,
      deliveryAddr.lat ?? 0,
      deliveryAddr.lng ?? 0,
    );

    // 2) Chọn bảng giá phù hợp
    const now = new Date();
    const slab = await this.pricingModel
      .findOne({
        serviceId: svcSTD._id,
        isActive: true,
        isDeleted: false,
        minWeightKg: { $lte: 1.5 },
        maxWeightKg: { $gte: 1.5 },
        minKm: { $lte: km },
        maxKm: { $gte: km },
        $or: [
          { effectiveFrom: { $exists: false } },
          { effectiveFrom: { $lte: now } },
        ],
        $or_2: [
          { effectiveTo: null },
          { effectiveTo: { $exists: false } },
          { effectiveTo: { $gte: now } },
        ],
      })
      .lean();

    const fee = slab
      ? Math.round(
          (slab.baseFee ?? 0) +
            (slab.perKm ?? 0) * km +
            (slab.perKg ?? 0) * 1.5,
        )
      : 30000;

    // 3) Tạo shipment
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
          {
            status: ShipmentStatus.IN_TRANSIT,
            timestamp: new Date(),
            note: 'Đang trung chuyển',
          },
        ],
      },
    ]);

    // 4) Payment (snapshot theo shipment)
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

  private async ensureLine1(addr: any): Promise<any> {
    if (addr?.line1 && addr.line1.trim().length > 0) return addr;

    const [district, province] = await Promise.all([
      this.districtModel.findById(addr.districtId).lean(),
      this.provinceModel.findById(addr.provinceId).lean(),
    ]);

    const fallback = [
      district?.name || 'Quận/Huyện',
      province?.name || 'Tỉnh/Thành',
    ].join(', ');

    await this.addressModel.updateOne(
      { _id: addr._id },
      { $set: { line1: fallback } },
    );

    return { ...addr, line1: fallback };
  }

  private toSeedAddress(a: any): SeedAddress {
    const obj = typeof a?.toObject === 'function' ? a.toObject() : a || {};
    return {
      _id: obj._id as Types.ObjectId,
      line1: (obj.line1 as string) || '',
      lat: obj.lat,
      lng: obj.lng,
      provinceId: obj.provinceId as Types.ObjectId,
      districtId: obj.districtId as Types.ObjectId,
    };
  }
}
