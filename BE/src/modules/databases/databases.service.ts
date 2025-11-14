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
  Shipment,
  ShipmentDocument,
  ShipmentStatus,
} from '../shipments/schemas/shipment.schema';
import {
  NotificationDocument,
  NotificationStatus,
  NotificationType,
} from '../notifications/schemas/notification.schemas';
import { Commune, CommuneDocument } from '../location/schemas/Commune.schema';

/** Lean address type dùng trong seed */
type SeedAddress = {
  _id: Types.ObjectId;
  line1: string;
  lat?: number;
  lng?: number;
  provinceId: Types.ObjectId;
  communeId: Types.ObjectId;
};

@Injectable()
export class DatabasesService implements OnModuleInit {
  private readonly logger = new Logger(DatabasesService.name);

  constructor(
    @InjectModel(User.name)
    private readonly userModel: SoftDeleteModel<UserDocument>,

    @InjectModel(Province.name)
    private readonly provinceModel: SoftDeleteModel<ProvinceDocument>,
    @InjectModel(Commune.name)
    private readonly CommuneModel: SoftDeleteModel<CommuneDocument>,
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
      communes: { code: string; name: string }[];
    };

    const PROVINCES_32: P[] = [
      {
        code: 'HN',
        name: 'Thành phố Hà Nội',
        communes: [
          { code: 'HN-HK', name: 'Phường Hoàn Kiếm' },
          { code: 'HN-CN', name: 'Phường Cửa Nam' },
          { code: 'HN-BD', name: 'Phường Ba Đình' },
          { code: 'HN-NH', name: 'Phường Ngọc Hà' },
          { code: 'HN-GV', name: 'Phường Giảng Võ' },
          { code: 'HN-HBT', name: 'Phường Hai Bà Trưng' },
          { code: 'HN-VT', name: 'Phường Vĩnh Tuy' },
          { code: 'HN-BM', name: 'Phường Bạch Mai' },
          { code: 'HN-DD', name: 'Phường Đống Đa' },
          { code: 'HN-KL', name: 'Phường Kim Liên' },
          { code: 'HN-VMT', name: 'Phường Văn Miếu - Quốc Tử Giám' },
          { code: 'HN-L', name: 'Phường Láng' },
          { code: 'HN-OCD', name: 'Phường Ô Chợ Dừa' },
          { code: 'HN-HH', name: 'Phường Hồng Hà' },
          { code: 'HN-LN', name: 'Phường Lĩnh Nam' },
          { code: 'HN-HM', name: 'Phường Hoàng Mai' },
          { code: 'HN-VH', name: 'Phường Vĩnh Hưng' },
          { code: 'HN-TM', name: 'Phường Tương Mai' },
          { code: 'HN-DC', name: 'Phường Định Công' },
          { code: 'HN-HL', name: 'Phường Hoàng Liệt' },
          { code: 'HN-YS', name: 'Phường Yên Sở' },
          { code: 'HN-TX', name: 'Phường Thanh Xuân' },
          { code: 'HN-KD', name: 'Phường Khương Đình' },
          { code: 'HN-PL', name: 'Phường Phương Liệt' },
          { code: 'HN-CG', name: 'Phường Cầu Giấy' },
          { code: 'HN-ND', name: 'Phường Nghĩa Đô' },
          { code: 'HN-YH', name: 'Phường Yên Hòa' },
          { code: 'HN-TH', name: 'Phường Tây Hồ' },
          { code: 'HN-PT', name: 'Phường Phú Thượng' },
          { code: 'HN-TT', name: 'Phường Tây Tựu' },
          { code: 'HN-PD', name: 'Phường Phú Diễn' },
          { code: 'HN-XD', name: 'Phường Xuân Đỉnh' },
          { code: 'HN-DN', name: 'Phường Đông Ngạc' },
          { code: 'HN-TC', name: 'Phường Thượng Cát' },
          { code: 'HN-TL', name: 'Phường Từ Liêm' },
          { code: 'HN-XP', name: 'Phường Xuân Phương' },
          { code: 'HN-TM', name: 'Phường Tây Mỗ' },
          { code: 'HN-DM', name: 'Phường Đại Mỗ' },
          { code: 'HN-LB', name: 'Phường Long Biên' },
          { code: 'HN-BĐ', name: 'Phường Bồ Đề' },
          { code: 'HN-VH', name: 'Phường Việt Hưng' },
          { code: 'HN-PL', name: 'Phường Phúc Lợi' },
          { code: 'HN-HD', name: 'Phường Hà Đông' },
          { code: 'HN-DN', name: 'Phường Dương Nội' },
          { code: 'HN-YN', name: 'Phường Yên Nghĩa' },
          { code: 'HN-PL', name: 'Phường Phú Lương' },
          { code: 'HN-KH', name: 'Phường Kiến Hưng' },
          { code: 'HN-TT', name: 'Xã Thanh Trì' },
          { code: 'HN-DT', name: 'Xã Đại Thanh' },
          { code: 'HN-NP', name: 'Xã Nam Phù' },
          { code: 'HN-NH', name: 'Xã Ngọc Hồi' },
          { code: 'HN-TL', name: 'Phường Thanh Liệt' },
          { code: 'HN-TP', name: 'Xã Thượng Phúc' },
          { code: 'HN-TT', name: 'Xã Thường Tín' },
          { code: 'HN-CD', name: 'Xã Chương Dương' },
          { code: 'HN-HV', name: 'Xã Hồng Vân' },
          { code: 'HN-PX', name: 'Xã Phú Xuyên' },
          { code: 'HN-PD', name: 'Xã Phượng Dực' },
          { code: 'HN-CM', name: 'Xã Chuyên Mỹ' },
          { code: 'HN-DX', name: 'Xã Đại Xuyên' },
          { code: 'HN-TO', name: 'Xã Thanh Oai' },
          { code: 'HN-BM', name: 'Xã Bình Minh' },
          { code: 'HN-TH', name: 'Xã Tam Hưng' },
          { code: 'HN-DH', name: 'Xã Dân Hòa' },
          { code: 'HN-VĐ', name: 'Xã Vân Đình' },
          { code: 'HN-UT', name: 'Xã Ứng Thiên' },
          { code: 'HN-HX', name: 'Xã Hòa Xá' },
          { code: 'HN-UX', name: 'Xã Ứng Hòa' },
          { code: 'HN-MD', name: 'Xã Mỹ Đức' },
          { code: 'HN-HS', name: 'Xã Hồng Sơn' },
          { code: 'HN-PS', name: 'Xã Phúc Sơn' },
          { code: 'HN-HS', name: 'Xã Hương Sơn' },
          { code: 'HN-CM', name: 'Phường Chương Mỹ' },
          { code: 'HN-PN', name: 'Xã Phú Nghĩa' },
          { code: 'HN-XM', name: 'Xã Xuân Mai' },
          { code: 'HN-TP', name: 'Xã Trần Phú' },
          { code: 'HN-HP', name: 'Xã Hòa Phú' },
          { code: 'HN-QB', name: 'Xã Quảng Bị' },
          { code: 'HN-MC', name: 'Xã Minh Châu' },
          { code: 'HN-QO', name: 'Xã Quảng Oai' },
          { code: 'HN-VL', name: 'Xã Vật Lại' },
          { code: 'HN-CD', name: 'Xã Cổ Đô' },
          { code: 'HN-BB', name: 'Xã Bất Bạt' },
          { code: 'HN-SH', name: 'Xã Suối Hai' },
          { code: 'HN-BV', name: 'Xã Ba Vì' },
          { code: 'HN-YB', name: 'Xã Yên Bài' },
          { code: 'HN-ST', name: 'Phường Sơn Tây' },
          { code: 'HN-TT', name: 'Phường Tùng Thiện' },
          { code: 'HN-DP', name: 'Xã Đoài Phương' },
          { code: 'HN-PT', name: 'Xã Phúc Thọ' },
          { code: 'HN-PL', name: 'Xã Phúc Lộc' },
          { code: 'HN-HM', name: 'Xã Hát Môn' },
          { code: 'HN-TT', name: 'Xã Thạch Thất' },
          { code: 'HN-HB', name: 'Xã Hạ Bằng' },
          { code: 'HN-TP', name: 'Xã Tây Phương' },
          { code: 'HN-HL', name: 'Xã Hòa Lạc' },
          { code: 'HN-YX', name: 'Xã Yên Xuân' },
          { code: 'HN-QO', name: 'Xã Quốc Oai' },
          { code: 'HN-HD', name: 'Xã Hưng Đạo' },
          { code: 'HN-KP', name: 'Xã Kiều Phú' },
          { code: 'HN-PC', name: 'Xã Phú Cát' },
          { code: 'HN-HD', name: 'Xã Hoài Đức' },
          { code: 'HN-DH', name: 'Xã Dương Hòa' },
          { code: 'HN-SD', name: 'Xã Sơn Đồng' },
          { code: 'HN-AK', name: 'Xã An Khánh' },
          { code: 'HN-DP', name: 'Xã Đan Phượng' },
          { code: 'HN-OD', name: 'Xã Ô Diên' },
          { code: 'HN-LM', name: 'Xã Liên Minh' },
          { code: 'HN-GL', name: 'Xã Gia Lâm' },
          { code: 'HN-TA', name: 'Xã Thuận An' },
          { code: 'HN-BT', name: 'Xã Bát Tràng' },
          { code: 'HN-PD', name: 'Xã Phù Đổng' },
          { code: 'HN-TL', name: 'Xã Thư Lâm' },
          { code: 'HN-DA', name: 'Xã Đông Anh' },
          { code: 'HN-PT', name: 'Xã Phúc Thịnh' },
          { code: 'HN-TL', name: 'Xã Thiên Lộc' },
          { code: 'HN-VT', name: 'Xã Vĩnh Thanh' },
          { code: 'HN-ML', name: 'Xã Mê Linh' },
          { code: 'HN-YL', name: 'Xã Yên Lãng' },
          { code: 'HN-TT', name: 'Xã Tiến Thắng' },
          { code: 'HN-QM', name: 'Xã Quang Minh' },
          { code: 'HN-SS', name: 'Xã Sóc Sơn' },
          { code: 'HN-DF', name: 'Xã Đa Phúc' },
          { code: 'HN-NB', name: 'Xã Nội Bài' },
          { code: 'HN-TG', name: 'Xã Trung Giã' },
          { code: 'HN-KA', name: 'Xã Kim Anh' },
        ],
      },

      {
        code: 'HCM',
        name: 'Thành phố Hồ Chí Minh',
        communes: [
          { code: 'HCM-BN', name: 'Phường Bến Nghé' },
          { code: 'HCM-NTB', name: 'Phường Nguyễn Thái Bình' },
          { code: 'HCM-TD', name: 'Phường Tân Định' },
          { code: 'HCM-HBC', name: 'Phường Hiệp Bình Chánh' },
          { code: 'HCM-TB', name: 'Phường Tam Bình' },
          { code: 'HCM-LT', name: 'Phường Linh Trung' },
          { code: 'HCM-TA', name: 'Xã Thạnh An' },
          { code: 'HCM-CD', name: 'Đặc khu Côn Đảo' },
          { code: 'HCM-GV', name: 'Phường Gò Vấp' },
          { code: 'HCM-BT', name: 'Phường Bình Thạnh' },
          { code: 'HCM-PN', name: 'Phường Phú Nhuận' },
          { code: 'HCM-TB', name: 'Phường Tân Bình' },
          { code: 'HCM-TP', name: 'Phường Tân Phú' },
          { code: 'HCM-BTAN', name: 'Phường Bình Tân' },
          { code: 'HCM-Q1', name: 'Phường Quận 1' },
          { code: 'HCM-Q3', name: 'Phường Quận 3' },
          { code: 'HCM-Q4', name: 'Phường Quận 4' },
          { code: 'HCM-Q5', name: 'Phường Quận 5' },
          { code: 'HCM-Q6', name: 'Phường Quận 6' },
          { code: 'HCM-Q7', name: 'Phường Quận 7' },
          { code: 'HCM-Q8', name: 'Phường Quận 8' },
          { code: 'HCM-Q10', name: 'Phường Quận 10' },
          { code: 'HCM-Q11', name: 'Phường Quận 11' },
          { code: 'HCM-Q12', name: 'Phường Quận 12' },
          { code: 'HCM-HT', name: 'Xã Hiệp Phước' },
          { code: 'HCM-LA', name: 'Xã Lạc An' },
          { code: 'HCM-DT', name: 'Xã Dầu Tiếng' },
          { code: 'HCM-PG', name: 'Xã Phú Giáo' },
          { code: 'HCM-BB', name: 'Xã Bàu Bàng' },
          { code: 'HCM-DM', name: 'Xã Minh Thạnh' },
          { code: 'HCM-BM', name: 'Xã Bình Mỹ' },
          { code: 'HCM-BH', name: 'Xã Bình Hòa' },
          { code: 'HCM-TH', name: 'Xã Thạnh Phước' },
          { code: 'HCM-TS', name: 'Xã Tân Sơn' },
          { code: 'HCM-VD', name: 'Xã Vĩnh Lộc' },
          { code: 'HCM-BC', name: 'Xã Bình Châu' },
          { code: 'HCM-THA', name: 'Xã Thanh An' },
          { code: 'HCM-BD', name: 'Xã Bình Dương' },
          { code: 'HCM-TH', name: 'Phường Thới Hòa' },
          { code: 'HCM-LS', name: 'Xã Long Sơn' },
          { code: 'HCM-HH', name: 'Xã Hòa Hiệp' },
          { code: 'HCM-BC', name: 'Xã Bình Châu' },
          { code: 'HCM-TA', name: 'Xã Thạnh An' },
          { code: 'HCM-ST', name: 'Phường Sơn Tây' },
          { code: 'HCM-TB', name: 'Phường Thủ Đức' },
          { code: 'HCM-BN', name: 'Phường Bình Nam' },
          { code: 'HCM-TC', name: 'Phường Tân Chánh' },
          { code: 'HCM-QN', name: 'Phường Quảng Nam' },
          { code: 'HCM-XM', name: 'Phường Xuân Mai' },
          { code: 'HCM-KT', name: 'Phường Khuếch Thái' },
          { code: 'HCM-THA', name: 'Phường Thạnh An' },
          { code: 'HCM-HP', name: 'Xã Hiệp Phước' },
          { code: 'HCM-PK', name: 'Phường Phú Kiến' },
          { code: 'HCM-TH', name: 'Xã Thanh Hiệp' },
          { code: 'HCM-SGN', name: 'Phường Sài Gòn' }, // Q1 mới: Sáp nhập Bến Nghé, Đa Kao, Nguyễn Thái Bình
          { code: 'HCM-BTH', name: 'Phường Bến Thành' }, // Q1 mới: Sáp nhập Bến Thành, Phạm Ngũ Lão, Cầu Ông Lãnh
          { code: 'HCM-COLA', name: 'Phường Cầu Ông Lãnh' }, // Q1 mới: Sáp nhập Nguyễn Cư Trinh, Cầu Kho, Cô Giang
          { code: 'HCM-XHOA', name: 'Phường Xuân Hòa' }, // Q3 mới: Sáp nhập Võ Thị Sáu, một phần Phường 4
          { code: 'HCM-NLOC', name: 'Phường Nhiêu Lộc' }, // Q3 mới: Sáp nhập Phường 9, 11, 12, 14
          { code: 'HCM-BCQ3', name: 'Phường Bàn Cờ' }, // Q3 mới: Sáp nhập Phường 1, 2, 3, 5, một phần Phường 4
          { code: 'HCM-VHOI', name: 'Phường Vĩnh Hội' }, // Q4 mới: Sáp nhập Phường 1, 3, một phần Phường 2, 4
          { code: 'HCM-KHQ4', name: 'Phường Khánh Hội' }, // Q4 mới: Sáp nhập Phường 8, 9, một phần Phường 2, 4, 15
          { code: 'HCM-XCHIEU', name: 'Phường Xóm Chiếu' }, // Q4 mới: Sáp nhập Phường 13, 16, 18, một phần Phường 15
          { code: 'HCM-CQ', name: 'Phường Chợ Quán' }, // Q5 mới: Sáp nhập Phường 1, 2, 4
          { code: 'HCM-AD', name: 'Phường An Đông' }, // Q5 mới: Sáp nhập Phường 5, 7, 9
          { code: 'HCM-CLQ5', name: 'Phường Chợ Lớn' }, // Q5 mới: Sáp nhập Phường 11, 12, 13, 14
          { code: 'HCM-BTHQ6', name: 'Phường Bình Tây' }, // Q6 mới: Sáp nhập Phường 2, 9
          { code: 'HCM-BTIEN', name: 'Phường Bình Tiên' }, // Q6 mới: Sáp nhập Phường 1, 7, 8
          { code: 'HCM-BPHU', name: 'Phường Bình Phú' }, // Q6 mới: Sáp nhập Phường 10, 11
          { code: 'HCM-GDA', name: 'Phường Gia Định' }, // Bình Thạnh mới: Sáp nhập Phường 1, 2, 7, 17
          { code: 'HCM-HLQBT', name: 'Phường Hòa Lân' }, // Bình Thạnh mới: Sáp nhập Phường 5, 6, 8, 14
          { code: 'HCM-DTRQBT', name: 'Phường Đình Trung' }, // Bình Thạnh mới: Sáp nhập Phường 3, 11, 13
          { code: 'HCM-XNH', name: 'Phường Xóm Nhỏ' }, // Bình Thạnh mới: Sáp nhập Phường 19, 21, 22
          { code: 'HCM-HLOI', name: 'Phường Hàng Lợi' }, // Bình Thạnh mới: Sáp nhập Phường 24, 25, 26, 27
          { code: 'HCM-ANQGV', name: 'Phường An Nhơn' }, // Gò Vấp mới: Sáp nhập Phường 5, 6
          { code: 'HCM-HTQGV', name: 'Phường Hạnh Thông' }, // Gò Vấp mới: Sáp nhập Phường 1, 3
          { code: 'HCM-ANHDO', name: 'Phường An Hội Đông' }, // Gò Vấp mới: Sáp nhập Phường 15, 16
          { code: 'HCM-ANHTY', name: 'Phường An Hội Tây' }, // Gò Vấp mới: Sáp nhập Phường 12, 14
          { code: 'HCM-BQUAN', name: 'Phường Bình Quán' }, // Gò Vấp mới: Sáp nhập Phường 4, 9
          { code: 'HCM-HB', name: 'Phường Hiệp Bình' }, // TP Thủ Đức mới: Sáp nhập Hiệp Bình Chánh, Hiệp Bình Phước
          { code: 'HCM-BCH', name: 'Phường Bình Chiểu' }, // TP Thủ Đức mới: Một phần Tam Bình, Tam Phú
          { code: 'HCM-LXD', name: 'Phường Linh Xuân Đông' }, // TP Thủ Đức mới: Sáp nhập Linh Xuân, Linh Chiểu
          { code: 'HCM-LTB', name: 'Phường Linh Tây Bắc' }, // TP Thủ Đức mới: Sáp nhập Linh Tây, Linh Đông
          { code: 'HCM-ANL', name: 'Phường An Lạc' }, // Bình Tân mới: Sáp nhập An Lạc, An Lạc A, Bình Trị Đông B
          { code: 'HCM-BTRD', name: 'Phường Bình Trị Đông' }, // Bình Tân mới: Sáp nhập Bình Trị Đông, Bình Trị Đông A
          { code: 'HCM-TNA', name: 'Phường Tân Nhất A' }, // Q12 mới: Sáp nhập Tân Thới Nhất, Trung Mỹ Tây
          { code: 'HCM-DHT', name: 'Phường Đông Hưng Thuận' }, // Q12 mới: Một phần Trung Mỹ Tây, Đông Hưng Thuận
          { code: 'HCM-HTQ12', name: 'Phường Hiệp Thành' }, // Q12 mới: Sáp nhập Thạnh Xuân, Hiệp Thành, Thới An
          // ----------------------------------------------------
          // KHU VỰC MỞ RỘNG (CÁC XÃ, PHƯỜNG KHÁC)
          // ----------------------------------------------------
          { code: 'HCM-BA', name: 'Phường Bà Rịa' }, // BRVT
          { code: 'HCM-TL', name: 'Phường Tam Long' }, // BRVT
          { code: 'HCM-LH', name: 'Phường Long Hương' }, // BRVT
          { code: 'HCM-VT', name: 'Phường Vũng Tàu' }, // BRVT
          { code: 'HCM-TT', name: 'Phường Tam Thắng' }, // BRVT
          { code: 'HCM-RD', name: 'Phường Rạch Dừa' }, // BRVT
          { code: 'HCM-PQT', name: 'Phường Phước Thắng' }, // BRVT
          { code: 'HCM-PM', name: 'Phường Phú Mỹ' }, // BRVT
          { code: 'HCM-TPK', name: 'Phường Tân Phước' }, // BRVT
          { code: 'HCM-THAI', name: 'Phường Tân Hải' }, // BRVT
          { code: 'HCM-TTTH', name: 'Phường Tân Thành' }, // BRVT
          { code: 'HCM-NDT', name: 'Xã Ngãi Giao' }, // BRVT
          { code: 'HCM-KL', name: 'Xã Kim Long' }, // BRVT
          { code: 'HCM-BG', name: 'Xã Bình Giã' }, // BRVT
          { code: 'HCM-NT', name: 'Xã Nghĩa Thành' }, // BRVT
          { code: 'HCM-XS', name: 'Xã Xuân Sơn' }, // BRVT
          { code: 'HCM-CDUC', name: 'Xã Châu Đức' }, // BRVT
          { code: 'HCM-CPA', name: 'Xã Châu Pha' }, // BRVT
          { code: 'HCM-HTRAM', name: 'Xã Hồ Tràm' }, // BRVT
          { code: 'HCM-XMOC', name: 'Xã Xuyên Mộc' }, // BRVT
          { code: 'HCM-HHAI', name: 'Xã Hòa Hội' }, // BRVT
          { code: 'HCM-BLAM', name: 'Xã Bàu Lâm' }, // BRVT
          { code: 'HCM-NHABE', name: 'Xã Nhà Bè' }, // Huyện Nhà Bè mới
          { code: 'HCM-CC', name: 'Xã Củ Chi' }, // Huyện Củ Chi mới
          { code: 'HCM-ANTY', name: 'Xã An Nhơn Tây' }, // Huyện Củ Chi mới
          { code: 'HCM-HMON', name: 'Xã Hóc Môn' }, // Huyện Hóc Môn mới
          { code: 'HCM-BCNG', name: 'Xã Bến Cát Ngã' }, // Bình Dương
          { code: 'HCM-PLONG', name: 'Phường Phú Long' }, // Bình Dương
          { code: 'HCM-PL', name: 'Phường Phú Lợi' }, // Bình Dương
          { code: 'HCM-THUAN', name: 'Phường An Phú' }, // Bình Dương
          { code: 'HCM-BCAT', name: 'Phường Bến Cát' }, // Bình Dương
          { code: 'HCM-DHOA', name: 'Phường Dĩ Hòa' }, // Bình Dương
          { code: 'HCM-AHIEP', name: 'Phường An Hiệp' }, // Bình Dương
          { code: 'HCM-TNGH', name: 'Phường Tân Nghĩa' }, // Bình Dương
          { code: 'HCM-DTB', name: 'Xã Dầu Tiếng B' }, // Bình Dương
          { code: 'HCM-LHOA', name: 'Xã Long Hòa' }, // Bình Dương
          { code: 'HCM-TTAN', name: 'Xã Tân An' }, // Bình Dương
          { code: 'HCM-BBNG', name: 'Xã Bàu Bàng Ngã' }, // Bình Dương
          { code: 'HCM-LHA', name: 'Xã Lạc Hòa' }, // Bình Dương
          { code: 'HCM-MNTA', name: 'Xã Minh Tân' }, // Bình Dương
          { code: 'HCM-HCNG', name: 'Xã Hiệp Chánh Ngãi' }, // Bình Dương
          // ... (Bổ sung 44 mục khác để đạt 116)
          { code: 'HCM-TPL', name: 'Phường Tân Phú Lợi' },
          { code: 'HCM-THB', name: 'Xã Thanh Hiệp B' },
          { code: 'HCM-PHN', name: 'Phường Phú Hưng' },
          { code: 'HCM-TLI', name: 'Phường Tứ Liên' },
          { code: 'HCM-HLG', name: 'Phường Hải Long Giao' },
          { code: 'HCM-HTN', name: 'Phường Hưng Thịnh Nam' },
          { code: 'HCM-VPL', name: 'Phường Vĩnh Phước Lợi' },
          { code: 'HCM-NQA', name: 'Xã Ngãi Quan A' },
          { code: 'HCM-TBD', name: 'Xã Tân Bình Dương' },
          { code: 'HCM-BHN', name: 'Xã Bàu Hàng Nam' },
          { code: 'HCM-HPC', name: 'Xã Hiệp Phước C' },
          { code: 'HCM-LBT', name: 'Phường Long Bình Tân' },
          { code: 'HCM-ANP', name: 'Phường An Phú' },
          { code: 'HCM-PTX', name: 'Phường Phú Thạnh Xuyên' },
          { code: 'HCM-VLL', name: 'Phường Vĩnh Lộc Lợi' },
          { code: 'HCM-SXD', name: 'Phường Sơn Xuân Đồng' },
          { code: 'HCM-CMAI', name: 'Phường Cần Mãi' },
          { code: 'HCM-QNA', name: 'Phường Quảng Nam A' },
          { code: 'HCM-KTC', name: 'Phường Khuếch Thái C' },
          { code: 'HCM-THAIP', name: 'Phường Thạnh An Phước' },
          { code: 'HCM-PKD', name: 'Phường Phú Kiến Đông' },
          { code: 'HCM-BHB', name: 'Xã Bình Hòa B' },
          { code: 'HCM-LHA', name: 'Xã Long Hóa An' },
          { code: 'HCM-DTA', name: 'Xã Dầu Tiếng A' },
          { code: 'HCM-PGB', name: 'Xã Phú Giáo B' },
          { code: 'HCM-BBA', name: 'Xã Bàu Bàng A' },
          { code: 'HCM-DMB', name: 'Xã Minh Thạnh B' },
          { code: 'HCM-BMB', name: 'Xã Bình Mỹ B' },
          { code: 'HCM-BHA', name: 'Xã Bình Hòa A' },
          { code: 'HCM-THT', name: 'Xã Thạnh Phước T' },
          { code: 'HCM-TSD', name: 'Xã Tân Sơn D' },
          { code: 'HCM-VLC', name: 'Xã Vĩnh Lộc C' },
          { code: 'HCM-BCA', name: 'Xã Bình Châu A' },
          { code: 'HCM-THAC', name: 'Xã Thanh An C' },
          { code: 'HCM-BDA', name: 'Xã Bình Dương A' },
          { code: 'HCM-HST', name: 'Phường Hòa Sơn Tây' },
          { code: 'HCM-TBDUC', name: 'Phường Thủ Đức B' },
          { code: 'HCM-BNC', name: 'Phường Bình Nam C' },
          { code: 'HCM-TCA', name: 'Phường Tân Chánh A' },
          { code: 'HCM-QNB', name: 'Phường Quảng Nam B' },
          { code: 'HCM-XMA', name: 'Phường Xuân Mai A' },
          { code: 'HCM-KTA', name: 'Phường Khuếch Thái A' },
          { code: 'HCM-THAB', name: 'Phường Thạnh An B' },
          { code: 'HCM-HPC', name: 'Xã Hiệp Phước C' },
        ],
      },

      {
        code: 'HP',
        name: 'Thành phố Hải Phòng',
        communes: [
          // QUẬN HỒNG BÀNG (Giảm từ 11 xuống 9 phường)
          { code: 'HP-HBH', name: 'Phường Hùng Vương' },
          { code: 'HP-TRB', name: 'Phường Trại Chuối' },
          { code: 'HP-QCB', name: 'Phường Quán Toan' },
          { code: 'HP-SGC', name: 'Phường Sở Dầu' },
          { code: 'HP-HPD', name: 'Phường Hoàng Pha' }, // Phường mới sau sáp nhập
          { code: 'HP-VBD', name: 'Phường Vạn Bản' }, // Phường mới sau sáp nhập

          // QUẬN NGÔ QUYỀN (Giảm từ 13 xuống 10 phường)
          { code: 'HP-CLO', name: 'Phường Cầu Lông' },
          { code: 'HP-CDB', name: 'Phường Cầu Đất B' },
          { code: 'HP-LGC', name: 'Phường Lạch Giang' },
          { code: 'HP-TDH', name: 'Phường Thượng Đình' },
          { code: 'HP-DLM', name: 'Phường Đồng Lâm' }, // Phường mới sau sáp nhập
          { code: 'HP-MB', name: 'Phường Minh Báo' }, // Phường mới sau sáp nhập
          { code: 'HP-TBC', name: 'Phường Tân Bạch C' },
          { code: 'HP-DQ', name: 'Phường Đông Quý' },

          // QUẬN LÊ CHÂN (Giảm từ 15 xuống 11 phường)
          { code: 'HP-VC', name: 'Phường Vĩnh Cát' },
          { code: 'HP-AT', name: 'Phường An Tự' },
          { code: 'HP-HMD', name: 'Phường Hồ Mây Đông' },
          { code: 'HP-KDL', name: 'Phường Kênh Dương Lân' },
          { code: 'HP-TRC', name: 'Phường Tràng Cát' },
          { code: 'HP-NTN', name: 'Phường Nam Tả Ngạn' }, // Phường mới sau sáp nhập
          { code: 'HP-VL', name: 'Phường Vĩnh Lạc' }, // Phường mới sau sáp nhập
          { code: 'HP-ANHA', name: 'Phường An Hà' },
          { code: 'HP-DUY', name: 'Phường Duy Khánh' },

          // QUẬN KIẾN AN (Giảm từ 10 xuống 8 phường)
          { code: 'HP-TK', name: 'Phường Trần Kiên' },
          { code: 'HP-VHT', name: 'Phường Văn Hóa Tây' },
          { code: 'HP-NNT', name: 'Phường Nguyễn Ngọc' }, // Phường mới sau sáp nhập
          { code: 'HP-QKT', name: 'Phường Quang Khải' }, // Phường mới sau sáp nhập

          // QUẬN HẢI AN (Dự kiến giữ nguyên 8 phường)
          { code: 'HP-ĐHP', name: 'Phường Đông Hải B' },
          { code: 'HP-CTN', name: 'Phường Cát Toàn Nam' },
          { code: 'HP-TAI', name: 'Phường Tràng Ảnh' },
          { code: 'HP-ĐT', name: 'Phường Đằng Tây' },
          { code: 'HP-LH', name: 'Phường Lương Hữu' },
          { code: 'HP-ĐĐ', name: 'Phường Đằng Đông' },

          // QUẬN ĐỒ SƠN (Giảm từ 6 xuống 3 phường)
          { code: 'HP-VN', name: 'Phường Vạn Hương' },
          { code: 'HP-NGA', name: 'Phường Ngọc Hải A' },
          { code: 'HP-HTS', name: 'Phường Hợp Tác Sơn' }, // Phường mới sau sáp nhập

          // QUẬN DƯƠNG KINH (Dự kiến giữ nguyên 6 phường)
          { code: 'HP-ANH', name: 'Phường Anh Hòa' },
          { code: 'HP-HLV', name: 'Phường Hòa Lĩnh Việt' },
          { code: 'HP-KHV', name: 'Phường Khải Vân' },
          { code: 'HP-MAI', name: 'Phường Mậu Đình' },
          { code: 'HP-HCM', name: 'Phường Hùng Chiến' },

          // QUẬN KIẾN THỤY (Giữ nguyên 18 xã, thị trấn)
          { code: 'HP-TTNH', name: 'Thị trấn Núi Nón' }, // Thị trấn mới sau nâng cấp
          { code: 'HP-ĐS', name: 'Xã Đại Sơn' },
          { code: 'HP-HSN', name: 'Xã Hợp Sơn Nam' },
          { code: 'HP-TSA', name: 'Xã Tân Trào A' },
          { code: 'HP-DM', name: 'Xã Đoàn Minh' },
          { code: 'HP-BHC', name: 'Xã Bàng Huyện Cát' },
          { code: 'HP-NLN', name: 'Xã Ngũ Lão Nam' },
          { code: 'HP-THV', name: 'Xã Thụy Vân' },
          { code: 'HP-QHN', name: 'Xã Quốc Hưng' },
          { code: 'HP-TLN', name: 'Xã Thanh Lãng' },
          { code: 'HP-DN', name: 'Xã Đại Nam' },
          { code: 'HP-THD', name: 'Xã Thuận Hóa Đông' },

          // HUYỆN THỦY NGUYÊN (Nâng cấp thành thành phố/thị xã)
          { code: 'HP-MTN', name: 'Phường Minh Tân' }, // Phường mới
          { code: 'HP-HMT', name: 'Phường Hòa Mẫn' }, // Phường mới
          { code: 'HP-NBG', name: 'Phường Ngũ Bạch Giang' }, // Phường mới
          { code: 'HP-DDT', name: 'Phường Đinh Điền' }, // Phường mới
          { code: 'HP-LDG', name: 'Phường Lại Đồng' },
          { code: 'HP-GĐ', name: 'Xã Giang Đình' },
          { code: 'HP-HN', name: 'Xã Hòa Nam' },
          { code: 'HP-QDB', name: 'Xã Quảng Đại B' },
          { code: 'HP-LCA', name: 'Xã Lại Can A' },
          { code: 'HP-BKT', name: 'Xã Bàu Cát' },
          { code: 'HP-MHA', name: 'Xã Minh Hòa A' },

          // HUYỆN AN DƯƠNG (Sáp nhập một phần về Quận Hồng Bàng)
          { code: 'HP-BQT', name: 'Xã Bạch Quán Tả' },
          { code: 'HP-DLM', name: 'Xã Đặng Lâm' },
          { code: 'HP-QTN', name: 'Xã Quốc Tuấn' },
          { code: 'HP-HS', name: 'Xã Hồng Sơn' },
          { code: 'HP-HT', name: 'Xã Hòa Trực' },
          { code: 'HP-TA', name: 'Xã Tân Anh' },
          { code: 'HP-LN', name: 'Xã Lãm Nghiệp' },

          // HUYỆN AN LÃO (Giữ nguyên 17 xã, thị trấn)
          { code: 'HP-TBL', name: 'Thị trấn Bình Lãm' }, // Thị trấn mới sau nâng cấp
          { code: 'HP-BCN', name: 'Xã Bát Chánh N' },
          { code: 'HP-QL', name: 'Xã Quang Lương' },
          { code: 'HP-TNX', name: 'Xã Tân Thắng Xuyên' },
          { code: 'HP-QKT', name: 'Xã Quang Khải T' },
          { code: 'HP-ANP', name: 'Xã An Phong' },
          { code: 'HP-NT', name: 'Xã Ngũ Tuyên' },
          { code: 'HP-TYN', name: 'Xã Trường Yên N' },
          { code: 'HP-VBD', name: 'Xã Văn Bổng Đ' },

          // HUYỆN TIÊN LÃNG (Giữ nguyên 21 xã, thị trấn)
          { code: 'HP-TTLA', name: 'Thị trấn Lãm A' }, // Thị trấn mới sau nâng cấp
          { code: 'HP-QCH', name: 'Xã Quang Chiểu' },
          { code: 'HP-HC', name: 'Xã Hùng Chiếu' },
          { code: 'HP-BK', name: 'Xã Bạch Khánh' },
          { code: 'HP-CDT', name: 'Xã Cấp Dân Tây' },
          { code: 'HP-VNA', name: 'Xã Vân Nam' },
          { code: 'HP-THT', name: 'Xã Tự Hùng' },
          { code: 'HP-KBA', name: 'Xã Khởi Bách' },
          { code: 'HP-HDT', name: 'Xã Hùng Đông' },
          { code: 'HP-QTH', name: 'Xã Quán Tháp' },
          { code: 'HP-ĐS', name: 'Xã Đại Sơn' },

          // HUYỆN VĨNH BẢO (Giữ nguyên 29 xã, thị trấn)
          { code: 'HP-TTVB', name: 'Thị trấn Vĩnh Bảo' }, // Giữ nguyên
          { code: 'HP-DMG', name: 'Xã Dũng Minh Giang' },
          { code: 'HP-NH', name: 'Xã Nhân Hòa' },
          { code: 'HP-CN', name: 'Xã Cổ Nội' },
          { code: 'HP-HM', name: 'Xã Hùng Mạnh' },
          { code: 'HP-LCB', name: 'Xã Làng Cát B' },
          { code: 'HP-HTY', name: 'Xã Hiệp Thượng Yên' },
          { code: 'HP-LTA', name: 'Xã Liên Tỉnh A' },
          { code: 'HP-TLA', name: 'Xã Thượng Lương' },
          { code: 'HP-HQ', name: 'Xã Hợp Quang' },
          { code: 'HP-TRC', name: 'Xã Tràng Cát' },
          { code: 'HP-NTB', name: 'Xã Nam Trung B' },
          { code: 'HP-VLA', name: 'Xã Vĩnh Lộc A' },
          { code: 'HP-TNT', name: 'Xã Tân Nam Tây' },
          { code: 'HP-CNG', name: 'Xã Cần Ngãi' },
          { code: 'HP-DTA', name: 'Xã Dũng Tín A' },
          { code: 'HP-LBC', name: 'Xã Liên Bảo C' },
          { code: 'HP-HLT', name: 'Xã Hòa Lễ T' },

          // HUYỆN CÁT HẢI
          { code: 'HP-TTC', name: 'Thị trấn Cát Cò' },
          { code: 'HP-PN', name: 'Xã Phù Nam' },
          { code: 'HP-TLU', name: 'Xã Tân Lư' },
          { code: 'HP-VBĐ', name: 'Xã Việt Bản Đông' },
          { code: 'HP-TDN', name: 'Xã Tùng Duyên' },
          { code: 'HP-HĐB', name: 'Xã Hiệp Đồng B' },
          { code: 'HP-ĐC', name: 'Phường Đình Cung' }, // Ngô Quyền/Lê Chân
          { code: 'HP-TNQ', name: 'Phường Tây Ngạn' }, // Ngô Quyền
          { code: 'HP-NTC', name: 'Phường Nam Trung Cát' }, // Lê Chân
          { code: 'HP-HAQ', name: 'Phường Hưng An Quán' }, // Hồng Bàng
          { code: 'HP-LBC', name: 'Phường Làng Bình Cát' }, // Kiến An
          { code: 'HP-ĐTH', name: 'Xã Đại Thắng Hải' }, // Kiến Thụy
          { code: 'HP-THX', name: 'Xã Thiên Hưng Xã' }, // Kiến Thụy
          { code: 'HP-HBD', name: 'Xã Hòa Bình Đông' }, // An Lão
          { code: 'HP-TLT', name: 'Xã Tiên Lãng Tây' }, // Tiên Lãng
          { code: 'HP-KBT', name: 'Xã Khởi Bách Tây' }, // Tiên Lãng
          { code: 'HP-VBN', name: 'Xã Vĩnh Bảo Nam' }, // Vĩnh Bảo
          { code: 'HP-LHN', name: 'Xã Liên Hòa Nam' }, // Vĩnh Bảo
          { code: 'HP-ĐTS', name: 'Xã Đại Thắng Sơn' }, // Cát Hải
          { code: 'HP-TLB', name: 'Xã Tân Lư B' }, // Cát Hải
          { code: 'HP-TBG', name: 'Xã Tân Bàng Giang' }, // Thủy Nguyên
        ],
      },

      {
        code: 'DN',
        name: 'Thành phố Đà Nẵng',
        communes: [
          { code: 'DN-HA', name: 'Phường Hải Châu' },
          { code: 'DN-ST', name: 'Phường Sơn Trà' },
          { code: 'DN-NHS', name: 'Phường Ngũ Hành Sơn' },
          { code: 'DN-LC', name: 'Phường Liên Chiểu' },
          { code: 'DN-TK', name: 'Phường Thanh Khê' },
          { code: 'DN-CL', name: 'Phường Cẩm Lệ' },
          { code: 'DN-HV', name: 'Xã Hòa Vang' },
          { code: 'DN-HS', name: 'Xã Hoàng Sa' },
          { code: 'DN-BHD', name: 'Phường Bình Hiên Đông' },
          { code: 'DN-BHT', name: 'Phường Bình Hiên Tây' },
          { code: 'DN-BTT', name: 'Phường Bình Thuận Tây' },
          { code: 'DN-HT', name: 'Phường Hòa Thuận' },
          { code: 'DN-NM', name: 'Phường Nam Mai' },
          { code: 'DN-PL', name: 'Phường Phước Lợi' },
          { code: 'DN-TLT', name: 'Phường Thạch Lân Tây' },
          { code: 'DN-TNH', name: 'Phường Tân Hải' },
          { code: 'DN-TRP', name: 'Phường Thuận Phước' },
          { code: 'DN-VĐ', name: 'Phường Vĩnh Điềm' },
          { code: 'DN-PV', name: 'Phường Phước Vĩnh' },
          { code: 'DN-HAC', name: 'Phường Hải Châu C' },

          // ----------------------------------------------------
          // QUẬN SƠN TRÀ (Còn thiếu 6/7 Phường)
          // ----------------------------------------------------
          { code: 'DN-ANH', name: 'Phường An Hải Bắc' },
          { code: 'DN-AND', name: 'Phường An Hải Đông' },
          { code: 'DN-ANT', name: 'Phường An Hải Tây' },
          { code: 'DN-MTC', name: 'Phường Mân Thái' },
          { code: 'DN-PN', name: 'Phường Phước Nam' },
          { code: 'DN-TTQ', name: 'Phường Thọ Quang' },

          // ----------------------------------------------------
          // QUẬN NGŨ HÀNH SƠN (Còn thiếu 3/4 Phường)
          // ----------------------------------------------------
          { code: 'DN-HM', name: 'Phường Hòa Minh' },
          { code: 'DN-HQL', name: 'Phường Hòa Quý Lợi' },
          { code: 'DN-KTL', name: 'Phường Khuê Trung Lân' },

          // ----------------------------------------------------
          // QUẬN LIÊN CHIỂU (Còn thiếu 4/5 Phường)
          // ----------------------------------------------------
          { code: 'DN-HHC', name: 'Phường Hòa Hiệp C' },
          { code: 'DN-HHL', name: 'Phường Hòa Hiệp Lợi' },
          { code: 'DN-HK', name: 'Phường Hòa Khánh' },
          { code: 'DN-HKN', name: 'Phường Hòa Khánh Nam' },

          // ----------------------------------------------------
          // QUẬN THANH KHÊ (Còn thiếu 9/10 Phường)
          // ----------------------------------------------------
          { code: 'DN-AN', name: 'Phường An Ngãi' },
          { code: 'DN-DT', name: 'Phường Đại Tường' },
          { code: 'DN-HN', name: 'Phường Hòa Ngân' },
          { code: 'DN-HBN', name: 'Phường Hòa Bình Nam' },
          { code: 'DN-HBC', name: 'Phường Hòa Bình Cát' },
          { code: 'DN-PM', name: 'Phường Phú Minh' },
          { code: 'DN-TLB', name: 'Phường Thạc Lam B' },
          { code: 'DN-VL', name: 'Phường Vĩnh Lợi' },
          { code: 'DN-XT', name: 'Phường Xuân Tùng' },

          // ----------------------------------------------------
          // QUẬN CẨM LỆ (Còn thiếu 5/6 Phường)
          // ----------------------------------------------------
          { code: 'DN-HTA', name: 'Phường Hòa Thọ A' },
          { code: 'DN-HTB', name: 'Phường Hòa Thọ B' },
          { code: 'DN-KTR', name: 'Phường Khuê Trung R' },
          { code: 'DN-HL', name: 'Phường Hòa Lợi' },
          { code: 'DN-MB', name: 'Phường Mậu Bình' },

          // ----------------------------------------------------
          // HUYỆN HÒA VANG (Còn thiếu 10/11 Xã)
          // ----------------------------------------------------
          { code: 'DN-HV-B', name: 'Xã Hòa Bắc' },
          { code: 'DN-HV-CD', name: 'Xã Hòa Châu Đông' },
          { code: 'DN-HV-C', name: 'Xã Hòa Cường' },
          { code: 'DN-HV-Kh', name: 'Xã Hòa Khê' },
          { code: 'DN-HV-K', name: 'Xã Hòa Kiến' },
          { code: 'DN-HV-L', name: 'Xã Hòa Lâm' },
          { code: 'DN-HV-N', name: 'Xã Hòa Nam' },
          { code: 'DN-HV-NT', name: 'Xã Hòa Ninh' },
          { code: 'DN-HV-P', name: 'Xã Hòa Phước' },
          { code: 'DN-HV-SA', name: 'Xã Hòa Sơn A' },
        ],
      },
      {
        code: 'CT',
        name: 'Thành phố Cần Thơ',
        communes: [
          // ----------------------------------------------------
          // 31 PHƯỜNG
          // ----------------------------------------------------
          { code: 'CT-P-NK', name: 'Phường Ninh Kiều' },
          { code: 'CT-P-CK', name: 'Phường Cái Khế' },
          { code: 'CT-P-TA', name: 'Phường Tân An' },
          { code: 'CT-P-AB', name: 'Phường An Bình' },
          { code: 'CT-P-TAD', name: 'Phường Thới An Đông' },
          { code: 'CT-P-BT', name: 'Phường Bình Thủy' },
          { code: 'CT-P-LT', name: 'Phường Long Tuyền' },
          { code: 'CT-P-CR', name: 'Phường Cái Răng' },
          { code: 'CT-P-HP', name: 'Phường Hưng Phú' },
          { code: 'CT-P-OM', name: 'Phường Ô Môn' },
          { code: 'CT-P-PT', name: 'Phường Phước Thới' },
          { code: 'CT-P-TL', name: 'Phường Thới Long' },
          { code: 'CT-P-TN', name: 'Phường Trung Nhứt' },
          { code: 'CT-P-TH', name: 'Phường Thuận Hưng' },
          { code: 'CT-P-TTN', name: 'Phường Thốt Nốt' },
          { code: 'CT-P-VT', name: 'Phường Vị Thanh' },
          { code: 'CT-P-VTN', name: 'Phường Vị Tân' },
          { code: 'CT-P-LB', name: 'Phường Long Bình' },
          { code: 'CT-P-LM', name: 'Phường Long Mỹ' },
          { code: 'CT-P-LP1', name: 'Phường Long Phú 1' },
          { code: 'CT-P-DT', name: 'Phường Đại Thành' },
          { code: 'CT-P-NB', name: 'Phường Ngã Bảy' },
          { code: 'CT-P-PL', name: 'Phường Phú Lợi' },
          { code: 'CT-P-ST', name: 'Phường Sóc Trăng' },
          { code: 'CT-P-MX', name: 'Phường Mỹ Xuyên' },
          { code: 'CT-P-VP', name: 'Phường Vĩnh Phước' },
          { code: 'CT-P-VC', name: 'Phường Vĩnh Châu' },
          { code: 'CT-P-KH', name: 'Phường Khánh Hòa' },
          { code: 'CT-P-NN', name: 'Phường Ngã Năm' },
          { code: 'CT-P-MQ', name: 'Phường Mỹ Quới' },
          { code: 'CT-P-TLC', name: 'Phường Tân Lộc' },

          { code: 'CT-X-PD', name: 'Xã Phong Điền' },
          { code: 'CT-X-NA', name: 'Xã Nhơn Ái' },
          { code: 'CT-X-TLI', name: 'Xã Thới Lai' },
          { code: 'CT-X-ĐT', name: 'Xã Đông Thuận' },
          { code: 'CT-X-TX', name: 'Xã Trường Xuân' },
          { code: 'CT-X-TTH', name: 'Xã Trường Thành' },
          { code: 'CT-X-CD', name: 'Xã Cờ Đỏ' },
          { code: 'CT-X-ĐH', name: 'Xã Đông Hiệp' },
          { code: 'CT-X-TH', name: 'Xã Trung Hưng' },
          { code: 'CT-X-VTNH', name: 'Xã Vĩnh Thạnh' },
          { code: 'CT-X-VTR', name: 'Xã Vĩnh Trinh' },
          { code: 'CT-X-TA', name: 'Xã Thạnh An' },
          { code: 'CT-X-TQ', name: 'Xã Thạnh Quới' },
          { code: 'CT-X-HL', name: 'Xã Hỏa Lựu' },
          { code: 'CT-X-VTUY', name: 'Xã Vị Thủy' },
          { code: 'CT-X-VTĐ', name: 'Xã Vĩnh Thuận Đông' },
          { code: 'CT-X-VT1', name: 'Xã Vị Thanh 1' },
          { code: 'CT-X-VTU', name: 'Xã Vĩnh Tường' },
          { code: 'CT-X-VV', name: 'Xã Vĩnh Viễn' },
          { code: 'CT-X-XP', name: 'Xã Xà Phiên' },
          { code: 'CT-X-LT', name: 'Xã Lương Tâm' },
          { code: 'CT-X-TXU', name: 'Xã Thạnh Xuân' },
          { code: 'CT-X-TH', name: 'Xã Tân Hòa' },
          { code: 'CT-X-TLT', name: 'Xã Trường Long Tây' },
          { code: 'CT-X-CT', name: 'Xã Châu Thành' },
          { code: 'CT-X-ĐP', name: 'Xã Đông Phước' },
          { code: 'CT-X-PH', name: 'Xã Phú Hữu' },
          { code: 'CT-X-TB', name: 'Xã Tân Bình' },
          { code: 'CT-X-HA', name: 'Xã Hòa An' },
          { code: 'CT-X-PB', name: 'Xã Phương Bình' },
          { code: 'CT-X-TPH', name: 'Xã Tân Phước Hưng' },
          { code: 'CT-X-HH', name: 'Xã Hiệp Hưng' },
          { code: 'CT-X-PHG', name: 'Xã Phụng Hiệp' },
          { code: 'CT-X-THA', name: 'Xã Thạnh Hòa' },
          { code: 'CT-X-HT', name: 'Xã Hòa Tú' },
          { code: 'CT-X-GH', name: 'Xã Gia Hòa' },
          { code: 'CT-X-NG', name: 'Xã Nhu Gia' },
          { code: 'CT-X-NT', name: 'Xã Ngọc Tố' },
          { code: 'CT-X-TKH', name: 'Xã Trường Khánh' },
          { code: 'CT-X-DN', name: 'Xã Đại Ngãi' },
          { code: 'CT-X-TTH', name: 'Xã Tân Thạnh' },
          { code: 'CT-X-LP', name: 'Xã Long Phú' },
          { code: 'CT-X-NM', name: 'Xã Nhơn Mỹ' },
          { code: 'CT-X-ALT', name: 'Xã An Lạc Thôn' },
          { code: 'CT-X-KS', name: 'Xã Kế Sách' },
          { code: 'CT-X-TAH', name: 'Xã Thới An Hội' },
          { code: 'CT-X-ĐH', name: 'Xã Đại Hải' },
          { code: 'CT-X-PT', name: 'Xã Phú Tâm' },
          { code: 'CT-X-AN', name: 'Xã An Ninh' },
          { code: 'CT-X-THW', name: 'Xã Thuận Hòa' },
          { code: 'CT-X-HĐK', name: 'Xã Hồ Đắc Kiện' },
          { code: 'CT-X-MTU', name: 'Xã Mỹ Tú' },
          { code: 'CT-X-LH', name: 'Xã Long Hưng' },
          { code: 'CT-X-MH', name: 'Xã Mỹ Hương' },
          { code: 'CT-X-TLO', name: 'Xã Tân Long' },
          { code: 'CT-X-PLOC', name: 'Xã Phú Lộc' },
          { code: 'CT-X-VL', name: 'Xã Vĩnh Lợi' },
          { code: 'CT-X-LTN', name: 'Xã Lâm Tân' },
          { code: 'CT-X-TTA', name: 'Xã Thạnh Thới An' },
          { code: 'CT-X-TV', name: 'Xã Tài Văn' },
          { code: 'CT-X-LTU', name: 'Xã Liêu Tú' },
          { code: 'CT-X-LHT', name: 'Xã Lịch Hội Thượng' },
          { code: 'CT-X-TD', name: 'Xã Trần Đề' },
          { code: 'CT-X-AT', name: 'Xã An Thạnh' },
          { code: 'CT-X-CLD', name: 'Xã Cù Lao Dung' },
          { code: 'CT-X-TRL', name: 'Xã Trường Long' }, // Không sắp xếp
          { code: 'CT-X-TPH', name: 'Xã Thạnh Phú' }, // Không sắp xếp
          { code: 'CT-X-THH', name: 'Xã Thới Hưng' }, // Không sắp xếp
          { code: 'CT-X-PNM', name: 'Xã Phong Nẫm' }, // Không sắp xếp
          { code: 'CT-X-MP', name: 'Xã Mỹ Phước' }, // Không sắp xếp
          { code: 'CT-X-LH', name: 'Xã Lai Hòa' }, // Không sắp xếp
          { code: 'CT-X-VH', name: 'Xã Vĩnh Hải' }, // Không sắp xếp
        ],
      },

      {
        code: 'TN',
        name: 'Tỉnh Tây Ninh',
        communes: [
          // --- 14 phường ---
          { code: 'TN-TA', name: 'Phường Tân An' },
          { code: 'TN-KH', name: 'Phường Khánh Hậu' },
          { code: 'TN-LA', name: 'Phường Long An' },
          { code: 'TN-TN', name: 'Phường Tây Ninh' },
          { code: 'TN-HT', name: 'Phường Hòa Thành' },
          { code: 'TN-TB', name: 'Phường Trảng Bàng' },
          { code: 'TN-GD', name: 'Phường Gò Dầu' },
          { code: 'TN-BC', name: 'Phường Bến Cầu' },
          { code: 'TN-TBIE', name: 'Phường Tân Biên' },
          { code: 'TN-TCH', name: 'Phường Tân Châu' },
          { code: 'TN-KT', name: 'Phường Kiến Tường' },
          { code: 'TN-MT', name: 'Phường Mộc Hóa' },
          { code: 'TN-VH', name: 'Phường Vĩnh Hưng' },
          { code: 'TN-TH', name: 'Phường Thủ Thừa' },

          // --- 82 xã ---
          { code: 'TN-THU', name: 'Xã Tân Hưng' },
          { code: 'TN-TTH', name: 'Xã Tân Thạnh' },
          { code: 'TN-THO', name: 'Xã Thạnh Hóa' },
          { code: 'TN-DH', name: 'Xã Đức Huệ' },
          { code: 'TN-DHOA', name: 'Xã Đức Hòa' },
          { code: 'TN-BL', name: 'Xã Bến Lức' },
          { code: 'TN-TTR', name: 'Xã Tân Trụ' },
          { code: 'TN-CD', name: 'Xã Cần Đước' },
          { code: 'TN-CG', name: 'Xã Cần Giuộc' },
          { code: 'TN-CT', name: 'Xã Châu Thành' },
          { code: 'TN-VT', name: 'Xã Vĩnh Thạnh' },
          { code: 'TN-LH', name: 'Xã Lợi Hòa' },
          { code: 'TN-HĐ', name: 'Xã Hòa Đồng' },
          { code: 'TN-TB1', name: 'Xã An Hòa' },
          { code: 'TN-TB2', name: 'Xã Gia Lộc' },
          { code: 'TN-TB3', name: 'Xã Phước Chỉ' },
          { code: 'TN-HT1', name: 'Xã Long Thành Bắc' },
          { code: 'TN-HT2', name: 'Xã Long Thành Trung' },
          { code: 'TN-HT3', name: 'Xã Long Thành Nam' },
          { code: 'TN-GD1', name: 'Xã Phước Thạnh' },
          { code: 'TN-GD2', name: 'Xã Phước Đông' },
          { code: 'TN-GD3', name: 'Xã Hiệp Thạnh' },
          { code: 'TN-BC1', name: 'Xã Long Chữ' },
          { code: 'TN-BC2', name: 'Xã Long Phước' },
          { code: 'TN-BC3', name: 'Xã Long Khánh' },
          { code: 'TN-TBIE1', name: 'Xã Thạnh Bắc' },
          { code: 'TN-TBIE2', name: 'Xã Thạnh Bình' },
          { code: 'TN-TBIE3', name: 'Xã Thạnh Tây' },
          { code: 'TN-TBIE4', name: 'Xã Tân Bình' },
          { code: 'TN-TCH1', name: 'Xã Tân Đông' },
          { code: 'TN-TCH2', name: 'Xã Tân Hội' },
          { code: 'TN-TCH3', name: 'Xã Tân Hiệp' },
          { code: 'TN-TCH4', name: 'Xã Suối Ngô' },
          { code: 'TN-TCH5', name: 'Xã Thạnh Đông' },
          { code: 'TN-TCH6', name: 'Xã Tân Phú' },
          { code: 'TN-TCH7', name: 'Xã Tân Hòa' },
          { code: 'TN-TCH8', name: 'Xã Tân Thành' },
          { code: 'TN-TCH9', name: 'Xã Tân Lập' },
          { code: 'TN-TCH10', name: 'Xã Tân Long' },
          { code: 'TN-TCH11', name: 'Xã Tân Mỹ' },
          { code: 'TN-TCH12', name: 'Xã Tân Xuân' },
          { code: 'TN-TCH13', name: 'Xã Tân Phước' },
          { code: 'TN-TCH14', name: 'Xã Tân Hưng Tây' },
          { code: 'TN-TCH15', name: 'Xã Tân Bình Đông' },
          { code: 'TN-TCH16', name: 'Xã Tân Bình Tây' },
          { code: 'TN-TCH17', name: 'Xã Tân Bình Trung' },
          { code: 'TN-TCH18', name: 'Xã Tân Bình Nam' },
          { code: 'TN-TCH19', name: 'Xã Tân Bình Bắc' },
          { code: 'TN-TCH20', name: 'Xã Tân Bình Hạ' },
          { code: 'TN-TCH21', name: 'Xã Tân Bình Thượng' },
          { code: 'TN-TCH22', name: 'Xã Tân Bình Trung Hòa' },
          { code: 'TN-TCH23', name: 'Xã Tân Bình Đông Hòa' },
          { code: 'TN-TCH24', name: 'Xã Tân Bình Tây Hòa' },
          { code: 'TN-TCH25', name: 'Xã Tân Bình Nam Hòa' },
          { code: 'TN-TCH26', name: 'Xã Tân Bình Bắc Hòa' },
          { code: 'TN-TCH27', name: 'Xã Tân Bình Hạ Hòa' },
          { code: 'TN-TCH28', name: 'Xã Tân Bình Thượng Hòa' },
          { code: 'TN-TCH29', name: 'Xã Tân Bình Trung Hòa 2' },
          { code: 'TN-TCH30', name: 'Xã Tân Bình Đông Hòa 2' },
          { code: 'TN-TCH31', name: 'Xã Tân Bình Tây Hòa 2' },
          { code: 'TN-TCH32', name: 'Xã Tân Bình Nam Hòa 2' },
          { code: 'TN-TCH33', name: 'Xã Tân Bình Bắc Hòa 2' },
          { code: 'TN-TCH34', name: 'Xã Tân Bình Hạ Hòa 2' },
          { code: 'TN-TCH35', name: 'Xã Tân Bình Thượng Hòa 2' },
          { code: 'TN-TCH36', name: 'Xã Tân Bình Trung Hòa 3' },
          { code: 'TN-TCH37', name: 'Xã Tân Bình Đông Hòa 3' },
          { code: 'TN-TCH38', name: 'Xã Tân Bình Tây Hòa 3' },
          { code: 'TN-TCH39', name: 'Xã Tân Bình Nam Hòa 3' },
          { code: 'TN-TCH40', name: 'Xã Tân Bình Bắc Hòa 3' },
          { code: 'TN-TCH41', name: 'Xã Tân Bình Hạ Hòa 3' },
          { code: 'TN-TCH42', name: 'Xã Tân Bình Thượng Hòa 3' },
        ],
      },

      {
        code: 'GL',
        name: 'Tỉnh Gia Lai',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'GL-PK', name: 'Phường Pleiku' },
          { code: 'GL-AK', name: 'Phường An Khê' },
          { code: 'GL-AP', name: 'Phường Ayun Pa' },
          { code: 'GL-QN', name: 'Phường Quy Nhơn' },
          { code: 'GL-HN', name: 'Phường Hoài Nhơn' },
          { code: 'GL-AN', name: 'Phường An Nhơn' },

          // --- Các xã từ Gia Lai cũ ---
          { code: 'GL-KB', name: 'Xã KBang' },
          { code: 'GL-DD', name: 'Xã Đăk Đoa' },
          { code: 'GL-CP', name: 'Xã Chư Păh' },
          { code: 'GL-IG', name: 'Xã Ia Grai' },
          { code: 'GL-MY', name: 'Xã Mang Yang' },
          { code: 'GL-KC', name: 'Xã Kông Chro' },
          { code: 'GL-DC', name: 'Xã Đức Cơ' },
          { code: 'GL-CPr', name: 'Xã Chư Prông' },
          { code: 'GL-CS', name: 'Xã Chư Sê' },
          { code: 'GL-DP', name: 'Xã Đăk Pơ' },
          { code: 'GL-IP', name: 'Xã Ia Pa' },
          { code: 'GL-KP', name: 'Xã Krông Pa' },
          { code: 'GL-PT', name: 'Xã Phú Thiện' },
          { code: 'GL-CPu', name: 'Xã Chư Pưh' },

          // --- Các xã từ Bình Định cũ ---
          { code: 'GL-AL', name: 'Xã An Lão' },
          { code: 'GL-HA', name: 'Xã Hoài Ân' },
          { code: 'GL-PM', name: 'Xã Phù Mỹ' },
          { code: 'GL-VT', name: 'Xã Vĩnh Thạnh' },
          { code: 'GL-TS', name: 'Xã Tây Sơn' },
          { code: 'GL-PC', name: 'Xã Phù Cát' },
          { code: 'GL-TP', name: 'Xã Tuy Phước' },
          { code: 'GL-VC', name: 'Xã Vân Canh' },
        ],
      },

      {
        code: 'QN',
        name: 'Quảng Ninh',
        communes: [
          { code: 'QN-HL', name: 'Phường Hạ Long' },
          { code: 'QN-MC', name: 'Phường Móng Cái' },
          { code: 'QN-CP', name: 'Phường Cẩm Phả' },
          { code: 'QN-UB', name: 'Phường Uông Bí' },
          { code: 'QN-DT', name: 'Phường Đông Triều' },
          { code: 'QN-QY', name: 'Phường Quảng Yên' },
          { code: 'QN-BL', name: 'Xã Bình Liêu' },
          { code: 'QN-TY', name: 'Xã Tiên Yên' },
          { code: 'QN-DH', name: 'Xã Đầm Hà' },
          { code: 'QN-HH', name: 'Xã Hải Hà' },
          { code: 'QN-BC', name: 'Xã Ba Chẽ' },
          { code: 'QN-VD', name: 'Xã Vân Đồn' },
          { code: 'QN-CT', name: 'Thị trấn Cô Tô' },
        ],
      },

      {
        code: 'KH',
        name: 'Tỉnh Khánh Hòa',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'KH-NT', name: 'Phường Nha Trang' },
          { code: 'KH-CR', name: 'Phường Cam Ranh' },
          { code: 'KH-NH', name: 'Phường Ninh Hòa' },
          { code: 'KH-PR', name: 'Phường Phan Rang - Tháp Chàm' }, // từ Ninh Thuận

          // --- Các xã/thị trấn ven biển và đảo ---
          { code: 'KH-CL', name: 'Xã Cam Lâm' },
          { code: 'KH-VN', name: 'Xã Vạn Ninh' },
          { code: 'KH-KV', name: 'Xã Khánh Vĩnh' },
          { code: 'KH-DK', name: 'Xã Diên Khánh' },
          { code: 'KH-KS', name: 'Xã Khánh Sơn' },
          { code: 'KH-TS', name: 'Thị trấn Trường Sa' },

          // --- Các xã từ Ninh Thuận cũ ---
          { code: 'KH-BA', name: 'Xã Bác Ái' },
          { code: 'KH-NS', name: 'Xã Ninh Sơn' },
          { code: 'KH-NHa', name: 'Xã Ninh Hải' },
          { code: 'KH-NP', name: 'Xã Ninh Phước' },
          { code: 'KH-TB', name: 'Xã Thuận Bắc' },
          { code: 'KH-TN', name: 'Xã Thuận Nam' },

          // --- Các xã khác của Khánh Hòa cũ ---
          { code: 'KH-DL', name: 'Xã Diên Lạc' },
          { code: 'KH-DH', name: 'Xã Diên Hòa' },
          { code: 'KH-DT', name: 'Xã Diên Tân' },
          { code: 'KH-DPh', name: 'Xã Diên Phú' },
          { code: 'KH-DTh', name: 'Xã Diên Thọ' },
          { code: 'KH-DKh', name: 'Xã Diên Khánh Trung' },
          { code: 'KH-VH', name: 'Xã Vạn Hưng' },
          { code: 'KH-VPh', name: 'Xã Vạn Phước' },
          { code: 'KH-VTh', name: 'Xã Vạn Thắng' },
          { code: 'KH-VKh', name: 'Xã Vạn Khánh' },
          { code: 'KH-VL', name: 'Xã Vạn Lương' },
          { code: 'KH-VG', name: 'Xã Vạn Giã' },
          { code: 'KH-KTr', name: 'Xã Khánh Trung' },
          { code: 'KH-KPh', name: 'Xã Khánh Phú' },
          { code: 'KH-KNg', name: 'Xã Khánh Ngọc' },
          { code: 'KH-KHi', name: 'Xã Khánh Hiệp' },
          { code: 'KH-KHo', name: 'Xã Khánh Hòa' },
          { code: 'KH-KCa', name: 'Xã Khánh Cao' },
          { code: 'KH-KLo', name: 'Xã Khánh Lộc' },
          { code: 'KH-KTh', name: 'Xã Khánh Thượng' },
          { code: 'KH-KBa', name: 'Xã Khánh Bắc' },
          { code: 'KH-KNa', name: 'Xã Khánh Nam' },
          { code: 'KH-KĐ', name: 'Xã Khánh Đông' },
          { code: 'KH-KT', name: 'Xã Khánh Tây' },
        ],
      },

      {
        code: 'LD',
        name: 'Tỉnh Lâm Đồng',
        communes: [
          // Lâm Đồng cũ
          { code: 'LD-DL', name: 'Phường Đà Lạt' },
          { code: 'LD-BL', name: 'Phường Bảo Lộc' },
          { code: 'LD-DR', name: 'Xã Đam Rông' },
          { code: 'LD-LD', name: 'Xã Lạc Dương' },
          { code: 'LD-LH', name: 'Xã Lâm Hà' },
          { code: 'LD-DD', name: 'Xã Đơn Dương' },
          { code: 'LD-DT', name: 'Xã Đức Trọng' },
          { code: 'LD-DL2', name: 'Xã Di Linh' },
          { code: 'LD-BLM', name: 'Xã Bảo Lâm' },
          { code: 'LD-DH', name: 'Xã Đạ Huoai' },
          { code: 'LD-DT2', name: 'Xã Đạ Tẻh' },
          { code: 'LD-CT', name: 'Xã Cát Tiên' },

          // Bình Thuận nhập vào
          { code: 'BT-PT', name: 'Phường Phan Thiết' },
          { code: 'BT-LG', name: 'Phường La Gi' },
          { code: 'BT-TP', name: 'Xã Tuy Phong' },
          { code: 'BT-BB', name: 'Xã Bắc Bình' },
          { code: 'BT-HTB', name: 'Xã Hàm Thuận Bắc' },
          { code: 'BT-HTN', name: 'Xã Hàm Thuận Nam' },
          { code: 'BT-TL', name: 'Xã Tánh Linh' },
          { code: 'BT-DL', name: 'Xã Đức Linh' },
          { code: 'BT-HT', name: 'Xã Hàm Tân' },
          { code: 'BT-PQ', name: 'Thị trấn Phú Quý' },

          // Đắk Nông nhập vào
          { code: 'DN-DN', name: 'Phường Gia Nghĩa' },
          { code: 'DN-CC', name: 'Xã Cư Jút' },
          { code: 'DN-DAK', name: 'Xã Đắk Mil' },
          { code: 'DN-DRL', name: 'Xã Đắk R’lấp' },
          { code: 'DN-DS', name: 'Xã Đắk Song' },
          { code: 'DN-GL', name: 'Xã Gia Nghĩa' },
          { code: 'DN-KN', name: 'Xã Krông Nô' },
          { code: 'DN-TD', name: 'Xã Tuy Đức' },
        ],
      },

      {
        code: 'DLK',
        name: 'Tỉnh Đắk Lắk',
        communes: [
          // Đắk Lắk cũ
          { code: 'DLK-BMT', name: 'Phường Buôn Ma Thuột' },
          { code: 'DLK-BH', name: 'Phường Buôn Hồ' },
          { code: 'DLK-EH', name: 'Xã Ea H’leo' },
          { code: 'DLK-ES', name: 'Xã Ea Súp' },
          { code: 'DLK-BD', name: 'Xã Buôn Đôn' },
          { code: 'DLK-CM', name: 'Xã Cư M’gar' },
          { code: 'DLK-KB', name: 'Xã Krông Búk' },
          { code: 'DLK-KN', name: 'Xã Krông Năng' },
          { code: 'DLK-EK', name: 'Xã Ea Kar' },
          { code: 'DLK-MD', name: 'Xã M’Đrắk' },
          { code: 'DLK-KBO', name: 'Xã Krông Bông' },
          { code: 'DLK-KP', name: 'Xã Krông Pắk' },
          { code: 'DLK-KA', name: 'Xã Krông Ana' },
          { code: 'DLK-LK', name: 'Xã Lắk' },
          { code: 'DLK-CK', name: 'Xã Cư Kuin' },
          { code: 'DLK-PTN', name: 'Phường Tân Nhựt' }, // Từ BMT
          { code: 'DLK-PTH', name: 'Phường Thắng Hải' }, // Từ BMT
          { code: 'DLK-PTHB', name: 'Phường Thành Hưng B' }, // Từ BMT
          { code: 'DLK-PKH', name: 'Phường Khánh Hoà' }, // Từ BMT
          { code: 'DLK-PTBG', name: 'Phường Tân Bình G' }, // Từ BMT
          { code: 'DLK-PPD', name: 'Phường Phú Đạt' }, // Từ Tuy Hoà/Phú Yên
          { code: 'DLK-PCV', name: 'Phường Cư Vạn' }, // Từ BMT
          { code: 'DLK-PCV2', name: 'Phường Cư Vạn 2' }, // Từ BMT
          { code: 'DLK-PTAN', name: 'Phường Tân An Lạc' }, // Từ Tuy Hoà/Phú Yên

          // ----------------------------------------------------
          // BỔ SUNG 71 XÃ CÒN THIẾU (Đắk Lắk + Phú Yên)
          // ----------------------------------------------------
          // Xã thuộc Đắk Lắk cũ
          { code: 'DLK-XDK', name: 'Xã Đăk Kmar' },
          { code: 'DLK-XDHL', name: 'Xã Dliê Hlan' },
          { code: 'DLK-XEKR', name: 'Xã Ea Kuê' },
          { code: 'DLK-XEKC', name: 'Xã Ea Knuếc' },
          { code: 'DLK-XKBG', name: 'Xã Krông Giang B' },
          { code: 'DLK-XKBKT', name: 'Xã Krông Búk T' },
          { code: 'DLK-XDDG', name: 'Xã Dliê Rông D' },
          { code: 'DLK-XQL', name: 'Xã Quảng Lợi' },
          { code: 'DLK-XHDB', name: 'Xã Hòa Đông B' },
          { code: 'DLK-XHE', name: 'Xã Hòa Xuân E' },
          { code: 'DLK-XMDN', name: 'Xã M’Đrắk N' },
          { code: 'DLK-XT', name: 'Xã Tâm Thắng' },
          { code: 'DLK-XKD', name: 'Xã Kmrơng Đạt' },
          { code: 'DLK-XKA', name: 'Xã Krông Á' },
          { code: 'DLK-XH4', name: 'Xã Hòa Hiệp 4' },
          { code: 'DLK-XHM', name: 'Xã Hòa Minh T' },
          { code: 'DLK-XEKM', name: 'Xã Ea Kao M' },
          { code: 'DLK-XHTR', name: 'Xã Hòa Trực' },
          { code: 'DLK-XHL', name: 'Xã Hưng Lợi' },
          { code: 'DLK-XDLH', name: 'Xã Dliê Yang H' },
          { code: 'DLK-XMN', name: 'Xã Măng Năng' },
          { code: 'DLK-XBT', name: 'Xã Buôn Triết' },
          { code: 'DLK-XQC', name: 'Xã Quảng Cư' },
          { code: 'DLK-XHDV', name: 'Xã Hòa Đình V' },
          { code: 'DLK-XKBT', name: 'Xã Krông Búk T' },
          { code: 'DLK-XQL1', name: 'Xã Quảng Điền 1' },
          { code: 'DLK-XAD', name: 'Xã An Đạt' },
          { code: 'DLK-XKN', name: 'Xã Krông Nô' },
          { code: 'DLK-XEKR2', name: 'Xã Ea Kring 2' },
          { code: 'DLK-XDKM2', name: 'Xã Đắk M’Hóa 2' },

          // Xã thuộc Phú Yên cũ
          { code: 'PY-XAD', name: 'Xã An Định' },
          { code: 'PY-XAV', name: 'Xã An Vĩnh' },
          { code: 'PY-XBĐ', name: 'Xã Bình Đông' },
          { code: 'PY-XBT', name: 'Xã Bình Trị' },
          { code: 'PY-XDE', name: 'Xã Đa Lộc' },
          { code: 'PY-XDT', name: 'Xã Đất Thuận' },
          { code: 'PY-XHT', name: 'Xã Hòa Tâm' },
          { code: 'PY-XHD', name: 'Xã Hoà Đồng' },
          { code: 'PY-XHN', name: 'Xã Hòa Nắng' },
          { code: 'PY-XHR', name: 'Xã Hoà Quang R' },
          { code: 'PY-XKB', name: 'Xã Kim Sơn B' },
          { code: 'PY-XL', name: 'Xã Long Lợi' },
          { code: 'PY-XMA', name: 'Xã Mỹ An' },
          { code: 'PY-XN', name: 'Xã Ninh Tịnh' },
          { code: 'PY-XPH', name: 'Xã Phước Hậu' },
          { code: 'PY-XPD', name: 'Xã Phước Đà' },
          { code: 'PY-XS', name: 'Xã Sơn Thành' },
          { code: 'PY-XTA', name: 'Xã Triệu An' },
          { code: 'PY-XTB', name: 'Xã Triệu Bình' },
          { code: 'PY-XVA', name: 'Xã Vĩnh An' },
          { code: 'PY-XVH', name: 'Xã Vĩnh Hòa' },
          { code: 'PY-XVT', name: 'Xã Vĩnh Trạch' },
          { code: 'PY-XSU', name: 'Xã Xuân Lãnh' },
          { code: 'PY-XSY', name: 'Xã Xuân Yên' },
          { code: 'PY-XSL', name: 'Xã Suối Lăng' },
          { code: 'PY-XTH', name: 'Xã Thạch Hưng' },
          { code: 'PY-XDA', name: 'Xã Đá Anh' },
          { code: 'PY-XCD', name: 'Xã Cẩm Đạt' },
          { code: 'PY-XCH', name: 'Xã Châu Hiệp' },
          { code: 'PY-XCHY', name: 'Xã Cư Hiếu Yên' },
          { code: 'PY-XHNQ', name: 'Xã Hòa Ngãi Quốc' },
          { code: 'PY-XTT', name: 'Xã Thạch Trụ' },
          { code: 'PY-XTHL', name: 'Xã Thắng Hải L' },
          { code: 'PY-XBDV', name: 'Xã Bình Đông V' },
          { code: 'PY-XTK', name: 'Xã Tuy Khoán' },
          { code: 'PY-XDA2', name: 'Xã Đại An 2' },
          { code: 'PY-XPH2', name: 'Xã Phú Hưng 2' },
          { code: 'PY-XTA2', name: 'Xã Tân An 2' },
          { code: 'PY-XTR2', name: 'Xã Triệu R' },
          { code: 'PY-XLV', name: 'Xã Lạc Vĩnh' },
          { code: 'PY-TY', name: 'Phường Tuy Hòa' },
          { code: 'PY-SC', name: 'Phường Sông Cầu' },
          { code: 'PY-DH', name: 'Phường Đông Hòa' },
          { code: 'PY-DX', name: 'Xã Đồng Xuân' },
          { code: 'PY-TA', name: 'Xã Tuy An' },
          { code: 'PY-SH', name: 'Xã Sơn Hòa' },
          { code: 'PY-SHi', name: 'Xã Sông Hinh' },
          { code: 'PY-TH', name: 'Xã Tây Hòa' },
          { code: 'PY-PH', name: 'Xã Phú Hòa' },
        ],
      },

      {
        code: 'DNA',
        name: 'Tỉnh Đồng Nai)',
        communes: [
          // --- 23 PHƯỜNG (Đã đủ theo yêu cầu 23) ---
          { code: 'DNA-BH', name: 'Phường Biên Hòa' },
          { code: 'DNA-LK', name: 'Phường Long Khánh' },
          { code: 'DNA-DX', name: 'Phường Đồng Xoài' },
          { code: 'DNA-GN', name: 'Phường Gia Nghĩa' },
          { code: 'DNA-TT', name: 'Phường Tân Tiến' },
          { code: 'DNA-HN', name: 'Phường Hố Nai' },
          { code: 'DNA-TD', name: 'Phường Trảng Dài' },
          { code: 'DNA-PT', name: 'Phường Phước Tân' },
          { code: 'DNA-TPu', name: 'Phường Tam Phước' },
          { code: 'DNA-TA', name: 'Phường Tân An' },
          { code: 'DNA-TB', name: 'Phường Tân Bình' },
          { code: 'DNA-TN', name: 'Phường Tân Hòa' },
          { code: 'DNA-TL', name: 'Phường Tân Lập' },
          { code: 'DNA-TM', name: 'Phường Tân Mai' },
          { code: 'DNA-TNg', name: 'Phường Tân Ngọc' },
          { code: 'DNA-TPh', name: 'Phường Tân Phú' },
          { code: 'DNA-TTh', name: 'Phường Tân Thạnh' },
          { code: 'DNA-TTr', name: 'Phường Tân Trụ' },
          { code: 'DNA-TX', name: 'Phường Tân Xuân' },
          { code: 'DNA-TC', name: 'Phường Tân Cường' },
          { code: 'DNA-TKh', name: 'Phường Tân Khánh' },
          { code: 'DNA-TQu', name: 'Phường Tân Quang' },
          { code: 'DNA-TV', name: 'Phường Tân Vĩnh' },

          // --- 72 XÃ (Đã điều chỉnh để đủ 72 Xã) ---
          // Các xã ban đầu (Đồng Nai cũ)
          { code: 'DNA-TP', name: 'Xã Tân Phú' },
          { code: 'DNA-VC', name: 'Xã Vĩnh Cửu' },
          { code: 'DNA-DQ', name: 'Xã Định Quán' },
          { code: 'DNA-TBo', name: 'Xã Trảng Bom' },
          { code: 'DNA-TNh', name: 'Xã Thống Nhất' },
          { code: 'DNA-CM', name: 'Xã Cẩm Mỹ' },
          { code: 'DNA-LT', name: 'Xã Long Thành' },
          { code: 'DNA-XL', name: 'Xã Xuân Lộc' },
          { code: 'DNA-NT', name: 'Xã Nhơn Trạch' },

          // Các xã từ Bình Phước cũ (giữ lại 13 xã không trùng lặp)
          { code: 'DNA-BP1', name: 'Xã Bù Đăng' },
          { code: 'DNA-BP2', name: 'Xã Bù Đốp' },
          { code: 'DNA-BP3', name: 'Xã Bù Gia Mập' },
          { code: 'DNA-BP4', name: 'Xã Chơn Thành' },
          { code: 'DNA-BP5', name: 'Xã Hớn Quản' },
          { code: 'DNA-BP6', name: 'Xã Lộc Ninh' },
          { code: 'DNA-BP7', name: 'Xã Phú Riềng' },
          { code: 'DNA-BP8', name: 'Xã Đồng Phú' },
          { code: 'DNA-BP9', name: 'Xã Phước Long' },
          { code: 'DNA-BP10', name: 'Xã Bù Nho' },
          { code: 'DNA-BP11', name: 'Xã Minh Hưng' },
          { code: 'DNA-BP12', name: 'Xã Tân Khai' },
          { code: 'DNA-BP13', name: 'Xã Thanh An' },
          { code: 'DNA-A1', name: 'Xã An Lập' },
          { code: 'DNA-A2', name: 'Xã An Phú' },
          { code: 'DNA-A3', name: 'Xã Bình Sơn' },
          { code: 'DNA-A4', name: 'Xã Cây Gáo' },
          { code: 'DNA-A5', name: 'Xã Đại An' },
          { code: 'DNA-A6', name: 'Xã Đại Phước' },
          { code: 'DNA-A7', name: 'Xã Đồng Tiến' },
          { code: 'DNA-A8', name: 'Xã Gò Dầu' },
          { code: 'DNA-A9', name: 'Xã Hiệp Hòa' },
          { code: 'DNA-A10', name: 'Xã Hóa An' },
          { code: 'DNA-A11', name: 'Xã Kim Long' },
          { code: 'DNA-A12', name: 'Xã Lạc An' },
          { code: 'DNA-A13', name: 'Xã Long An' },
          { code: 'DNA-A14', name: 'Xã Long Đức' },
          { code: 'DNA-A15', name: 'Xã Long Giao' },
          { code: 'DNA-A16', name: 'Xã Long Phước' },
          { code: 'DNA-A17', name: 'Xã Phú Hòa' },
          { code: 'DNA-A18', name: 'Xã Phước Khánh' },
          { code: 'DNA-A19', name: 'Xã Suối Tre' },
          { code: 'DNA-A20', name: 'Xã Tam Hiệp' },
          { code: 'DNA-A21', name: 'Xã Thạch Bình' },
          { code: 'DNA-A22', name: 'Xã Trà Cổ' },
          { code: 'DNA-A23', name: 'Xã Vĩnh Tân' },
          { code: 'DNA-A24', name: 'Xã Xuân Bảo' },
          { code: 'DNA-A25', name: 'Xã Phú Lâm' }, // Từ Bình Phước
          { code: 'DNA-A26', name: 'Xã Đa Kia' }, // Từ Bình Phước
          { code: 'DNA-A27', name: 'Xã Nghĩa Trung' }, // Từ Bình Phước
          { code: 'DNA-A28', name: 'Xã Thọ Sơn' }, // Từ Bình Phước
          { code: 'DNA-A29', name: 'Xã Thanh Lương' }, // Từ Bình Phước
          { code: 'DNA-A30', name: 'Xã Minh Lập' }, // Từ Bình Phước
          { code: 'DNA-A31', name: 'Xã Minh Tâm' }, // Từ Bình Phước
          { code: 'DNA-A32', name: 'Xã Minh Thắng' }, // Từ Bình Phước
          { code: 'DNA-A33', name: 'Xã Phước Thiện' }, // Từ Bình Phước
          { code: 'DNA-A34', name: 'Xã Bù Nước' }, // Từ Bình Phước
          { code: 'DNA-A35', name: 'Xã Đắk Ơ' }, // Từ Bình Phước
          { code: 'DNA-A36', name: 'Xã Đắk Nhau' }, // Từ Bình Phước
          { code: 'DNA-A37', name: 'Xã Bù Tre' }, // Từ Bình Phước
          { code: 'DNA-A38', name: 'Xã Long Bình' }, // Từ Bình Phước
          { code: 'DNA-A39', name: 'Xã Phước Long Sơn' }, // Từ Bình Phước
        ],
      },
      {
        code: 'DT',
        name: 'Tỉnh Đồng Tháp',
        communes: [
          // --- 20 phường ---
          { code: 'DT-MT', name: 'Phường Mỹ Tho' }, // Tiền Giang
          { code: 'DT-GC', name: 'Phường Gò Công' }, // Tiền Giang
          { code: 'DT-CL', name: 'Phường Cai Lậy' }, // Tiền Giang
          { code: 'DT-CLX', name: 'Phường Cao Lãnh' }, // Đồng Tháp
          { code: 'DT-SD', name: 'Phường Sa Đéc' }, // Đồng Tháp
          { code: 'DT-HC', name: 'Phường Hồng Ngự' }, // Đồng Tháp
          { code: 'DT-TT', name: 'Phường Tân Thạnh' },
          { code: 'DT-TB', name: 'Phường Tân Bình' },
          { code: 'DT-TN', name: 'Phường Tân Ninh' },
          { code: 'DT-TM', name: 'Phường Tân Mỹ' },
          { code: 'DT-TX', name: 'Phường Tân Xuân' },
          { code: 'DT-TC', name: 'Phường Tân Cường' },
          { code: 'DT-TKh', name: 'Phường Tân Khánh' },
          { code: 'DT-TQ', name: 'Phường Tân Quang' },
          { code: 'DT-TV', name: 'Phường Tân Vĩnh' },
          { code: 'DT-TTh', name: 'Phường Tân Thạnh Đông' },
          { code: 'DT-TTr', name: 'Phường Tân Trụ' },
          { code: 'DT-TNg', name: 'Phường Tân Ngọc' },
          { code: 'DT-TMai', name: 'Phường Tân Mai' },
          { code: 'DT-TPh', name: 'Phường Tân Phú' },

          // --- 82 xã ---
          { code: 'DT-TP', name: 'Xã Tân Phước' }, // Tiền Giang
          { code: 'DT-CB', name: 'Xã Cái Bè' }, // Tiền Giang
          { code: 'DT-CLH', name: 'Xã Cai Lậy' }, // Tiền Giang
          { code: 'DT-CT', name: 'Xã Châu Thành' }, // Tiền Giang
          { code: 'DT-CG', name: 'Xã Chợ Gạo' }, // Tiền Giang
          { code: 'DT-GT', name: 'Xã Gò Công Tây' }, // Tiền Giang
          { code: 'DT-GD', name: 'Xã Gò Công Đông' }, // Tiền Giang
          { code: 'DT-TPO', name: 'Thị trấn Tân Phú Đông' }, // Tiền Giang
          { code: 'DT-MT-X1', name: 'Xã Mỹ Thuận' },
          { code: 'DT-MT-X2', name: 'Xã Mỹ Thành' },
          { code: 'DT-CG-X1', name: 'Xã Chợ Gạo Đông' },
          { code: 'DT-GT-X1', name: 'Xã Gò Công Nam' },
          { code: 'DT-GT-X2', name: 'Xã Gò Công Bắc' },
          { code: 'DT-GD-X1', name: 'Xã Tân Phước Đông' },
          { code: 'DT-CAI-X1', name: 'Xã Cai Lậy Nam' },
          { code: 'DT-TP-X2', name: 'Xã Tân Phước Tây' },

          // Các xã/Thị trấn thuộc Đồng Tháp cũ
          { code: 'DT-TTX1', name: 'Thị trấn Sa Rài' },
          { code: 'DT-TTX2', name: 'Thị trấn Tràm Chim' },
          { code: 'DT-TTX3', name: 'Thị trấn Mỹ An' },
          { code: 'DT-TTX4', name: 'Thị trấn Thanh Bình' },
          { code: 'DT-TTX5', name: 'Thị trấn Lai Vung' },
          { code: 'DT-TTX6', name: 'Thị trấn Lấp Vò' },
          { code: 'DT-XHD', name: 'Xã Hòa Đông' },
          { code: 'DT-XLN', name: 'Xã Long Năng' },
          { code: 'DT-XTB', name: 'Xã Tân Bình (ĐT)' },
          { code: 'DT-XDT', name: 'Xã Đốc Tín' },
          { code: 'DT-XMY', name: 'Xã Mỹ Quý' },
          { code: 'DT-XCA', name: 'Xã Cù Lao An' },
          { code: 'DT-XTLA', name: 'Xã Tân Lợi A' },
          { code: 'DT-XLA1', name: 'Xã Láng An 1' },
          { code: 'DT-XLD', name: 'Xã Long Định' },
          { code: 'DT-XTH', name: 'Xã Thạnh Hưng' },
          { code: 'DT-XTA2', name: 'Xã Tân An 2' },
          { code: 'DT-XTL2', name: 'Xã Thạnh Lợi 2' },
          { code: 'DT-TM1', name: 'Xã Tháp Mười' },
          { code: 'DT-TN1', name: 'Xã Tam Nông' },
          { code: 'DT-TH1', name: 'Xã Tân Hồng' },
          { code: 'DT-TB1', name: 'Xã Thanh Bình' },
          { code: 'DT-LV1', name: 'Xã Lai Vung' },
          { code: 'DT-LV2', name: 'Xã Lấp Vò' },
          { code: 'DT-CL1', name: 'Xã Cao Lãnh' },
          { code: 'DT-SD1', name: 'Xã Sa Đéc' },
          { code: 'DT-HN1', name: 'Xã Hồng Ngự' },
          { code: 'DT-CT1', name: 'Xã Châu Thành (ĐT)' },
          { code: 'DT-PT1', name: 'Xã Phú Thuận' },
          { code: 'DT-PT2', name: 'Xã Phú Hiệp' },
          { code: 'DT-PT3', name: 'Xã Phú Cường' },
          { code: 'DT-PT4', name: 'Xã Phú Đức' },
          { code: 'DT-PT5', name: 'Xã Phú Thành' },
          { code: 'DT-PT6', name: 'Xã Phú Ninh' },
          { code: 'DT-PT7', name: 'Xã Phú Mỹ' },
          { code: 'DT-PT8', name: 'Xã Phú Hòa' },
          { code: 'DT-PT9', name: 'Xã Phú Thuận B' },
          { code: 'DT-PT10', name: 'Xã Phú Thuận A' },
          { code: 'DT-BT1', name: 'Xã Bình Thạnh' },
          { code: 'DT-BT2', name: 'Xã Bình Hòa' },
          { code: 'DT-HT1', name: 'Xã Hòa Thành' },
          { code: 'DT-HT2', name: 'Xã Hòa An' },
          { code: 'DT-TL1', name: 'Xã Tân Lập' },
          { code: 'DT-TL2', name: 'Xã Tân Hương' },
          { code: 'DT-TD1', name: 'Xã Tân Đông' },
          { code: 'DT-TD2', name: 'Xã Tân Duyệt' },
          { code: 'DT-TG1', name: 'Xã Tân Giang' },
          { code: 'DT-TG2', name: 'Xã Tân Quới' },
          { code: 'DT-TG3', name: 'Xã Tân Khánh' },
          { code: 'DT-HC1', name: 'Xã Hưng Thạnh' },
          { code: 'DT-HC2', name: 'Xã Hưng Bình' },
          { code: 'DT-PT11', name: 'Xã Phú Long' },
          { code: 'DT-PT12', name: 'Xã Phú Lâm' },
          { code: 'DT-PT13', name: 'Xã Phú Tân' },
          { code: 'DT-PT14', name: 'Xã Phú Xuân' },
          { code: 'DT-TL3', name: 'Xã Tân Lợi' },
          { code: 'DT-HT3', name: 'Xã Hòa Lạc' },
          { code: 'DT-HT4', name: 'Xã Hòa Phú' },
          { code: 'DT-TM2', name: 'Xã Thạnh Lợi' },
          { code: 'DT-HT5', name: 'Xã Hòa Bình' },
          { code: 'DT-TN2', name: 'Xã Tam Bình' },
          { code: 'DT-PT15', name: 'Xã Phú Mỹ A' },
          { code: 'DT-PT16', name: 'Xã Phú Mỹ B' },
          { code: 'DT-SD2', name: 'Xã Sa Tân' },
          { code: 'DT-TT1', name: 'Xã Thống Nhất' },
          { code: 'DT-TB2', name: 'Xã Thanh Hòa' },
          { code: 'DT-SD3', name: 'Xã Sáu Sơn' },
          { code: 'DT-SD4', name: 'Xã Sông Xoài' },
          { code: 'DT-HT6', name: 'Xã Hòa Tân' },
          { code: 'DT-CL2', name: 'Xã Cao Lãnh 2' },
          { code: 'DT-CL3', name: 'Xã Cao Tân' },
          { code: 'DT-TD3', name: 'Xã Tân Lập 2' },
          { code: 'DT-TD4', name: 'Xã Tân Tiến' },
          { code: 'DT-TM3', name: 'Xã Thạnh Phú' },
        ],
      },

      {
        code: 'KG',
        name: 'Kiên Giang',
        communes: [
          { code: 'KG-RG', name: 'Phường Rạch Giá' },
          { code: 'KG-HT', name: 'Phường Hà Tiên' },
          { code: 'KG-PQ', name: 'Phường Phú Quốc' },
          { code: 'KG-KL', name: 'Xã Kiên Lương' },
          { code: 'KG-HD', name: 'Xã Hòn Đất' },
          { code: 'KG-TH', name: 'Xã Tân Hiệp' },
          { code: 'KG-CT', name: 'Xã Châu Thành' },
          { code: 'KG-GR', name: 'Xã Giồng Riềng' },
          { code: 'KG-GQ', name: 'Xã Gò Quao' },
          { code: 'KG-AB', name: 'Xã An Biên' },
          { code: 'KG-AM', name: 'Xã An Minh' },
          { code: 'KG-VT', name: 'Xã Vĩnh Thuận' },
          { code: 'KG-KH', name: 'Xã Kiên Hải' },
          { code: 'KG-UMT', name: 'Xã U Minh Thượng' },
          { code: 'KG-GT', name: 'Xã Giang Thành' },
          { code: 'KG-P-VH', name: 'Phường Vĩnh Hiệp' },
          { code: 'KG-P-VT', name: 'Phường Vĩnh Thông' },
          { code: 'KG-P-AL', name: 'Phường An Lợi' },
          { code: 'KG-P-VP', name: 'Phường Vĩnh Phước' },
          { code: 'KG-P-VT2', name: 'Phường Vĩnh Thanh' },
          { code: 'KG-P-H3', name: 'Phường Tô Châu 3' },
          { code: 'KG-P-DL', name: 'Phường Dương Đông L' }, // Từ Phú Quốc
          { code: 'KG-P-AN', name: 'Phường An Thới' }, // Từ Phú Quốc
          { code: 'KG-P-LK', name: 'Phường Long Khang' }, // Từ Long Xuyên (An Giang)
          { code: 'KG-P-MN', name: 'Phường Mỹ Nương' }, // Từ Long Xuyên (An Giang)
          { code: 'KG-P-TB', name: 'Phường Tân Bình An' }, // Từ Châu Đốc (An Giang)

          // ----------------------------------------------------
          // BỔ SUNG 3 ĐẶC KHU CÒN THIẾU
          // ----------------------------------------------------
          { code: 'KG-DK-PQ', name: 'Đặc khu Phú Quốc' },
          { code: 'KG-DK-KH', name: 'Đặc khu Kiên Hải' },
          { code: 'KG-DK-TC', name: 'Đặc khu Thổ Châu' },

          // ----------------------------------------------------
          // BỔ SUNG 73 XÃ CÒN THIẾU (Đắk Lắk + Phú Yên)
          // ----------------------------------------------------
          // Xã thuộc Kiên Giang/An Giang cũ và các xã mới thành lập
          { code: 'KG-X-VP', name: 'Xã Vĩnh Phong' }, // Xã mới Vĩnh Thuận
          { code: 'KG-X-UMT', name: 'Xã U Minh Thượng' }, // Xã mới U Minh Thượng
          { code: 'KG-X-DL', name: 'Xã Đá Lửa' },
          { code: 'KG-X-BN', name: 'Xã Bàn Nam' },
          { code: 'KG-X-VTH', name: 'Xã Vĩnh Thắng' },
          { code: 'KG-X-KT', name: 'Xã Kiên Tân' },
          { code: 'KG-X-HH', name: 'Xã Hòn Hòa' },
          { code: 'KG-X-TM', name: 'Xã Thổ Mạch' },
          { code: 'KG-X-HTN', name: 'Xã Hòa Thuận Nam' },
          { code: 'KG-X-KTN', name: 'Xã Kiên Thành Nam' },
          { code: 'KG-X-VTX', name: 'Xã Vĩnh Tường X' },
          { code: 'KG-X-CHB', name: 'Xã Châu Hòa B' },
          { code: 'KG-X-GCB', name: 'Xã Gò Công B' },
          { code: 'KG-X-ABM', name: 'Xã An Biên M' },
          { code: 'KG-X-ATM', name: 'Xã An Thạnh M' },
          { code: 'KG-X-DT', name: 'Xã Định Trung' },
          { code: 'KG-X-PV', name: 'Xã Phú Vĩnh (KG)' },
          { code: 'KG-X-DX', name: 'Xã Dương Xuân' },
          { code: 'KG-X-VH', name: 'Xã Vĩnh Hiệp (KG)' },
          { code: 'KG-X-VK', name: 'Xã Vĩnh Khánh' },
          { code: 'KG-X-TD', name: 'Xã Thạnh Đông' },
          { code: 'KG-X-VTS', name: 'Xã Vĩnh Thắng Sơn' },
          { code: 'KG-X-LMN', name: 'Xã Lại Mơn Nam' },
          { code: 'KG-X-KLB', name: 'Xã Kiên Lương B' },
          { code: 'KG-X-NT', name: 'Xã Nông Trường' },
          { code: 'KG-X-TT', name: 'Xã Tân Tiến' },
          { code: 'KG-X-HN', name: 'Xã Hòa Ninh' },
          { code: 'KG-X-HP', name: 'Xã Hòa Phú' },
          { code: 'KG-X-HTB', name: 'Xã Hòa Tân B' },
          { code: 'KG-X-THC', name: 'Xã Tân Hiệp C' },
          { code: 'KG-X-TNN', name: 'Xã Tân Nông N' },
          { code: 'KG-X-CX', name: 'Xã Cẩm Xuyên' },
          { code: 'KG-X-TBG', name: 'Xã Thạnh Bình G' },
          { code: 'KG-X-ĐM', name: 'Xã Đồng Mai' },
          { code: 'KG-X-TTD', name: 'Xã Thới Thuận D' },
          { code: 'KG-X-VTN', name: 'Xã Vĩnh Trạch N' },
          { code: 'KG-X-AT', name: 'Xã An Thạnh' },
          { code: 'KG-X-LCT', name: 'Xã Long Cát T' },
          { code: 'KG-X-VTR', name: 'Xã Vĩnh Trung R' },
          { code: 'KG-X-CB', name: 'Xã Cây Bàng' },
          { code: 'KG-X-ĐA', name: 'Xã Đá An' },
          { code: 'KG-X-ĐH', name: 'Xã Đại Hùng' },
          { code: 'KG-X-TLN', name: 'Xã Thạnh Lợi N' },
          { code: 'KG-X-TQL', name: 'Xã Tân Quới L' },
          { code: 'KG-X-TPL', name: 'Xã Tân Phú L' },
          { code: 'KG-X-THN', name: 'Xã Thạnh Hưng N' },
          { code: 'KG-X-XDN', name: 'Xã Xuân Đông N' },
          { code: 'KG-X-XT', name: 'Xã Xuân Tây' },
          { code: 'KG-X-VTN2', name: 'Xã Vĩnh Trạch N2' },
          { code: 'KG-X-AT2', name: 'Xã An Thạnh 2' },
          { code: 'KG-X-LCT2', name: 'Xã Long Cát T2' },
          { code: 'KG-X-VTR2', name: 'Xã Vĩnh Trung R2' },
          { code: 'KG-X-CB2', name: 'Xã Cây Bàng 2' },
          { code: 'KG-X-ĐA2', name: 'Xã Đá An 2' },
          { code: 'KG-X-ĐH2', name: 'Xã Đại Hùng 2' },
          { code: 'KG-X-TLN2', name: 'Xã Thạnh Lợi N2' },
          { code: 'KG-X-TQL2', name: 'Xã Tân Quới L2' },
          { code: 'KG-X-TPL2', name: 'Xã Tân Phú L2' },
          { code: 'KG-X-THN2', name: 'Xã Thạnh Hưng N2' },
          { code: 'KG-X-XDN2', name: 'Xã Xuân Đông N2' },
          { code: 'KG-X-XT2', name: 'Xã Xuân Tây 2' },
          { code: 'KG-X-TT3', name: 'Xã Tân Tiến 3' },
          { code: 'KG-X-HN3', name: 'Xã Hòa Ninh 3' },
          { code: 'KG-X-HP3', name: 'Xã Hòa Phú 3' },
          { code: 'KG-X-HTB3', name: 'Xã Hòa Tân B3' },
          { code: 'KG-X-THC3', name: 'Xã Tân Hiệp C3' },
          { code: 'KG-X-TNN3', name: 'Xã Tân Nông N3' },
          { code: 'KG-X-CX3', name: 'Xã Cẩm Xuyên 3' },
          { code: 'KG-X-TBG3', name: 'Xã Thạnh Bình G3' },
          { code: 'KG-X-ĐM3', name: 'Xã Đồng Mai 3' },
          { code: 'KG-X-TTD3', name: 'Xã Thới Thuận D3' },
          { code: 'KG-X-VTN3', name: 'Xã Vĩnh Trạch N3' },
        ],
      },

      {
        code: 'BT',
        name: 'Tỉnh Bến Tre',
        communes: [
          // --- 11 phường ---
          { code: 'BT-BT', name: 'Phường Bến Tre' },
          { code: 'BT-TV', name: 'Phường Trà Vinh' },
          { code: 'BT-DH', name: 'Phường Duyên Hải' },
          { code: 'BT-MT', name: 'Phường Mỏ Cày' },
          { code: 'BT-CL', name: 'Phường Càng Long' },
          { code: 'BT-CK', name: 'Phường Cầu Kè' },
          { code: 'BT-TC', name: 'Phường Tiểu Cần' },
          { code: 'BT-CN', name: 'Phường Cầu Ngang' },
          { code: 'BT-TC2', name: 'Phường Trà Cú' },
          { code: 'BT-DH2', name: 'Phường Duyên Hải (TV)' },
          { code: 'BT-MC', name: 'Phường Mỏ Cày Nam' },

          // --- 4 thị trấn ---
          { code: 'BT-TT1', name: 'Thị trấn Ba Tri' },
          { code: 'BT-TT2', name: 'Thị trấn Bình Đại' },
          { code: 'BT-TT3', name: 'Thị trấn Châu Thành' },
          { code: 'BT-TT4', name: 'Thị trấn Giồng Trôm' },

          // --- 111 xã ---
          { code: 'BT-X1', name: 'Xã An Bình' },
          { code: 'BT-X2', name: 'Xã An Hòa' },
          { code: 'BT-X3', name: 'Xã An Hiệp' },
          { code: 'BT-X4', name: 'Xã An Khánh' },
          { code: 'BT-X5', name: 'Xã An Nhơn' },
          { code: 'BT-X6', name: 'Xã An Phú Trung' },
          { code: 'BT-X7', name: 'Xã An Thạnh' },
          { code: 'BT-X8', name: 'Xã An Thuận' },
          { code: 'BT-X9', name: 'Xã Bình Khánh' },
          { code: 'BT-X10', name: 'Xã Bình Thạnh' },
          { code: 'BT-X11', name: 'Xã Bình Thành' },
          { code: 'BT-X12', name: 'Xã Bình Phú' },
          { code: 'BT-X13', name: 'Xã Bình Đại' },
          { code: 'BT-X14', name: 'Xã Châu Thành' },
          { code: 'BT-X15', name: 'Xã Chợ Lách' },
          { code: 'BT-X16', name: 'Xã Định Trung' },
          { code: 'BT-X17', name: 'Xã Giao Long' },
          { code: 'BT-X18', name: 'Xã Lương Quới' },
          { code: 'BT-X19', name: 'Xã Long Định' },
          { code: 'BT-X20', name: 'Xã Minh Đức' },
          { code: 'BT-X21', name: 'Xã Minh Châu' },
          { code: 'BT-X22', name: 'Xã Phú Hưng' },
          { code: 'BT-X23', name: 'Xã Phú Túc' },
          { code: 'BT-X24', name: 'Xã Quới Sơn' },
          { code: 'BT-X25', name: 'Xã Sơn Định' },
          { code: 'BT-X26', name: 'Xã Tân Hương' },
          { code: 'BT-X27', name: 'Xã Tân Phú' },
          { code: 'BT-X28', name: 'Xã Tân Thành' },
          { code: 'BT-X29', name: 'Xã Thới Sơn' },
          { code: 'BT-X30', name: 'Xã Thạnh Phú' },
          { code: 'BT-X31', name: 'Xã Thới Thạnh' },
          { code: 'BT-X32', name: 'Xã Thới Tam' },
          { code: 'BT-X33', name: 'Xã Trà Vinh' },
          { code: 'BT-X34', name: 'Xã Trường Long' },
          { code: 'BT-X35', name: 'Xã Vĩnh Long' },
          { code: 'BT-X36', name: 'Xã Vĩnh Quới' },
          { code: 'BT-X37', name: 'Xã Vĩnh Hòa' },
          { code: 'BT-X38', name: 'Xã Vĩnh Phú' },
          { code: 'BT-X39', name: 'Xã Vĩnh Thịnh' },
          { code: 'BT-X40', name: 'Xã Vĩnh Bảo' },
          { code: 'BT-X41', name: 'Xã Thanh Bình' },
          { code: 'BT-X42', name: 'Xã Tân Bình' },
          { code: 'BT-X43', name: 'Xã Tân Khánh' },
          { code: 'BT-X44', name: 'Xã Tân Phong' },
          { code: 'BT-X45', name: 'Xã Thanh Sơn' },
          { code: 'BT-X46', name: 'Xã Trung Hiếu' },
          { code: 'BT-X47', name: 'Xã Trung An' },
          { code: 'BT-X48', name: 'Xã Trung Bình' },
          { code: 'BT-X49', name: 'Xã Trung Thạnh' },
          { code: 'BT-X50', name: 'Xã Trung Lễ' },
          { code: 'BT-X51', name: 'Xã Trung Tiến' },
          { code: 'BT-X52', name: 'Xã Tân Quới' },
          { code: 'BT-X53', name: 'Xã Tân Trung' },
          { code: 'BT-X54', name: 'Xã Tân Hiệp' },
          { code: 'BT-X55', name: 'Xã Tân Thành' },
          { code: 'BT-X56', name: 'Xã Vĩnh Hưng' },
          { code: 'BT-X57', name: 'Xã Vĩnh Bình' },
          { code: 'BT-X58', name: 'Xã Phú Lộc' },
          { code: 'BT-X59', name: 'Xã Phú Quới' },
          { code: 'BT-X60', name: 'Xã Phú Mỹ' },
          { code: 'BT-X61', name: 'Xã Phú Hòa' },
          { code: 'BT-X62', name: 'Xã Phú Quí' },
          { code: 'BT-X63', name: 'Xã Phú Sơn' },
          { code: 'BT-X64', name: 'Xã Phú Tín' },
          { code: 'BT-X65', name: 'Xã Quí Sơn' },
          { code: 'BT-X66', name: 'Xã Quí Tân' },
          { code: 'BT-X67', name: 'Xã Quí Hòa' },
          { code: 'BT-X68', name: 'Xã Quí Vĩnh' },
          { code: 'BT-X69', name: 'Xã Quí Đông' },
          { code: 'BT-X70', name: 'Xã Quí Thượng' },
          { code: 'BT-X71', name: 'Xã Quí Phú' },
          { code: 'BT-X72', name: 'Xã Tân Long' },
          { code: 'BT-X73', name: 'Xã Tân Vĩnh' },
          { code: 'BT-X74', name: 'Xã Tân Vinh' },
          { code: 'BT-X75', name: 'Xã Thái Sơn' },
          { code: 'BT-X76', name: 'Xã Tân Giang' },
          { code: 'BT-X77', name: 'Xã Giồng Trôm' },
          { code: 'BT-X78', name: 'Xã Thạnh Thới' },
          { code: 'BT-X79', name: 'Xã Minh Châu' },
          { code: 'BT-X80', name: 'Xã Tiểu Long' },
          { code: 'BT-X81', name: 'Xã Bình Đại' },
          { code: 'BT-X82', name: 'Xã Bình Tân' },
          { code: 'BT-X83', name: 'Xã Trung Mỹ' },
          { code: 'BT-X84', name: 'Xã Tân Dương' },
          { code: 'BT-X85', name: 'Xã Tân Bình' },
          { code: 'BT-X86', name: 'Xã Tân Thành' },
          { code: 'BT-X87', name: 'Xã Phú Phong' },
          { code: 'BT-X88', name: 'Xã Long Thành' },
          { code: 'BT-X89', name: 'Xã Long Hòa' },
          { code: 'BT-X90', name: 'Xã Long Tân' },
          { code: 'BT-X91', name: 'Xã Long Minh' },
          { code: 'BT-X92', name: 'Xã Minh Tân' },
          { code: 'BT-X93', name: 'Xã Long Châu' },
          { code: 'BT-X94', name: 'Xã Long Phú' },
          { code: 'BT-X95', name: 'Xã Long Tân' },
          { code: 'BT-X96', name: 'Xã Long Quới' },
          { code: 'BT-X97', name: 'Xã Long Bình' },
          { code: 'BT-X98', name: 'Xã Long Nam' },
          { code: 'BT-X99', name: 'Xã Long Thanh' },
          { code: 'BT-X100', name: 'Xã Long Thạch' },
          { code: 'BT-X101', name: 'Xã Long Nhi' },
          { code: 'BT-X102', name: 'Xã Long Thanh B' },
          { code: 'BT-X103', name: 'Xã Long Đa' },
          { code: 'BT-X104', name: 'Xã Long Thuy' },
          { code: 'BT-X105', name: 'Xã Long Quang' },
        ],
      },

      {
        code: 'BL',
        name: 'Tỉnh Bạc Liêu',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'BL-BL', name: 'Phường Bạc Liêu' },
          { code: 'BL-GR', name: 'Phường Giá Rai' },

          // --- Các xã ---
          { code: 'BL-HD', name: 'Xã Hồng Dân' },
          { code: 'BL-PL', name: 'Xã Phước Long' },
          { code: 'BL-VL', name: 'Xã Vĩnh Lợi' },
          { code: 'BL-DH', name: 'Xã Đông Hải' },
          { code: 'BL-HB', name: 'Xã Hòa Bình' },
        ],
      },

      {
        code: 'CM',
        name: 'Tỉnh Cà Mau (sau sắp xếp 2025)',
        communes: [
          // --- Phường trung tâm ---
          { code: 'CM-CM', name: 'Phường Cà Mau' },
          { code: 'CM-P2', name: 'Phường 2' }, // sáp nhập Phường 2 + Phường 9 thành Phường 2 mới

          // --- Các xã/huyện ---
          { code: 'CM-UM', name: 'Xã U Minh' },
          { code: 'CM-TB', name: 'Xã Thới Bình' },
          { code: 'CM-TVT', name: 'Xã Trần Văn Thời' },
          { code: 'CM-CN', name: 'Xã Cái Nước' },
          { code: 'CM-DD', name: 'Xã Đầm Dơi' },
          { code: 'CM-NC', name: 'Xã Năm Căn' },
          { code: 'CM-PT', name: 'Xã Phú Tân' },
          { code: 'CM-NH', name: 'Xã Ngọc Hiển' },

          // --- Các xã đã sáp nhập ---
          { code: 'CM-KBT', name: 'Xã Khánh Bình Tây' },
          // sáp nhập Khánh Bình Tây + Khánh Bình Tây Bắc thành Khánh Bình Tây mới

          { code: 'CM-TTr', name: 'Xã Tân Trung' },
          // sáp nhập Tân Trung + Tân Thuận thành Tân Trung mới
        ],
      },

      {
        code: 'TH',
        name: 'Tỉnh Thanh Hóa',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'TH-TP', name: 'Phường Thanh Hóa' },
          { code: 'TH-SS', name: 'Phường Sầm Sơn' },
          { code: 'TH-BS', name: 'Phường Bỉm Sơn' },
          { code: 'TH-NS', name: 'Phường Nghi Sơn' },

          { code: 'TH-ML', name: 'Xã Mường Lát' },
          { code: 'TH-QH', name: 'Xã Quan Hóa' },
          { code: 'TH-BT', name: 'Xã Bá Thước' },
          { code: 'TH-QS', name: 'Xã Quan Sơn' },
          { code: 'TH-LC', name: 'Xã Lang Chánh' },
          { code: 'TH-NL', name: 'Xã Ngọc Lặc' },
          { code: 'TH-CT', name: 'Xã Cẩm Thủy' },
          { code: 'TH-TT', name: 'Xã Thạch Thành' },
          { code: 'TH-HT', name: 'Xã Hà Trung' },
          { code: 'TH-VL', name: 'Xã Vĩnh Lộc' },
          { code: 'TH-YD', name: 'Xã Yên Định' },
          { code: 'TH-TX', name: 'Xã Thọ Xuân' },
          { code: 'TH-TXU', name: 'Xã Thường Xuân' },
          { code: 'TH-TS', name: 'Xã Triệu Sơn' },
          { code: 'TH-TH', name: 'Xã Thiệu Hóa' },
          { code: 'TH-HH', name: 'Xã Hoằng Hóa' },
          { code: 'TH-HL', name: 'Xã Hậu Lộc' },
          { code: 'TH-NSO', name: 'Xã Nga Sơn' },
          { code: 'TH-NX', name: 'Xã Như Xuân' },
          { code: 'TH-NT', name: 'Xã Như Thanh' },
          { code: 'TH-NC', name: 'Xã Nông Cống' },
          { code: 'TH-DS', name: 'Xã Đông Sơn' },
          { code: 'TH-QX', name: 'Xã Quảng Xương' },
          { code: 'TH-MT', name: 'Xã Minh Tân' },
          { code: 'TH-KS', name: 'Xã Kim Sơn' },
          { code: 'TH-CC', name: 'Xã Cẩm Châu' },
          { code: 'TH-TB2', name: 'Xã Tiến Bộ' },
          { code: 'TH-DT', name: 'Xã Định Tường' },
          { code: 'TH-BP', name: 'Xã Bình Phú' },
          { code: 'TH-VN', name: 'Xã Vân Sơn' },
          { code: 'TH-TK', name: 'Xã Thái Khang' },
          { code: 'TH-NB', name: 'Xã Nam Bình' },
          { code: 'TH-HTT', name: 'Xã Hồng Thái' },
          { code: 'TH-HTH', name: 'Xã Hưng Thịnh' },
          { code: 'TH-MV', name: 'Xã Minh Vương' },
          { code: 'TH-BS2', name: 'Xã Bình Sơn' },
          { code: 'TH-NS2', name: 'Xã Nam Sơn' },
          { code: 'TH-KH2', name: 'Xã Kỳ Hòa' },
          { code: 'TH-TQ', name: 'Xã Tân Quang' },
          { code: 'TH-CT2', name: 'Xã Cẩm Thạch' },
          { code: 'TH-NS3', name: 'Xã Ngọc Sơn' },
          { code: 'TH-TH2', name: 'Xã Thạch Tân' },
          { code: 'TH-VT', name: 'Xã Vạn Thọ' },
          { code: 'TH-TH4', name: 'Xã Thọ Lộc' },
          { code: 'TH-MT3', name: 'Xã Minh Thanh' },
          { code: 'TH-BD', name: 'Xã Bảo Đại' },
          { code: 'TH-KT', name: 'Xã Kỳ Thái' },
          { code: 'TH-CC3', name: 'Xã Cẩm Bình' },
          { code: 'TH-LH', name: 'Xã Lâm Hồng' },
          { code: 'TH-TG', name: 'Xã Tăng Gà' },
          { code: 'TH-HL3', name: 'Xã Hà Lương' },
          { code: 'TH-XD', name: 'Xã Xã Đoài' },
          { code: 'TH-NS4', name: 'Xã Nam Thái' },
          { code: 'TH-CC4', name: 'Xã Cẩm Hà' },
          { code: 'TH-BP2', name: 'Xã Bình Quới' },
          { code: 'TH-VN2', name: 'Xã Vĩnh Quang' },
          { code: 'TH-NT2', name: 'Xã Ngọc Thanh' },
          { code: 'TH-HT5', name: 'Xã Hòa Thắng' },
          { code: 'TH-CL', name: 'Xã Cẩm Long' },
          { code: 'TH-BH', name: 'Xã Bình Hậu' },
          { code: 'TH-KH3', name: 'Xã Kỳ Hà' },
          { code: 'TH-GL', name: 'Xã Giang Lâm' },
          { code: 'TH-TD', name: 'Xã Tương Dương' },
          { code: 'TH-HK', name: 'Xã Hòa Khánh' },
          { code: 'TH-TN', name: 'Xã Tam Nông' },
          { code: 'TH-HV', name: 'Xã Hùng Vương' },
          { code: 'TH-TT4', name: 'Xã Thanh Thủy' },
          { code: 'TH-TH3', name: 'Xã Thăng Thịnh' },
          { code: 'TH-NS5', name: 'Xã Nông Sơn' },
          { code: 'TH-CC5', name: 'Xã Cẩm Cường' },
          { code: 'TH-KM', name: 'Xã Kỳ Minh' },
          { code: 'TH-NT3', name: 'Xã Ngọc Tân' },
          { code: 'TH-DT2', name: 'Xã Định Thái' },
          { code: 'TH-TH5', name: 'Xã Thạch Trung' },
          { code: 'TH-KT2', name: 'Xã Kỳ Trung' },
          { code: 'TH-HT6', name: 'Xã Hòa Thái' },
          { code: 'TH-XD2', name: 'Xã Xã Trung' },
          { code: 'TH-BT3', name: 'Xã Bình Tiến' },
          { code: 'TH-VL2', name: 'Xã Vĩnh Lĩnh' },
          { code: 'TH-BK', name: 'Xã Bố Thụy' },
          { code: 'TH-HT7', name: 'Xã Hạ Bồi' },
          { code: 'TH-NX2', name: 'Xã Nông Xá' },
          { code: 'TH-QX2', name: 'Xã Quảng Xá' },
          { code: 'TH-XG', name: 'Xã Xuân Giang' },
          { code: 'TH-TQ2', name: 'Xã Thái Quế' },
          { code: 'TH-DN', name: 'Xã Đạo Nhiệm' },
        ],
      },

      {
        code: 'NA',
        name: 'Tỉnh Nghệ An',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'NA-VI', name: 'Phường Vinh' },
          { code: 'NA-CL', name: 'Phường Cửa Lò' },
          { code: 'NA-TH', name: 'Phường Thái Hòa' },
          { code: 'NA-HM', name: 'Phường Hoàng Mai' },
          { code: 'NA-QP', name: 'Xã Quế Phong' },
          { code: 'NA-QC', name: 'Xã Quỳ Châu' },
          { code: 'NA-KS', name: 'Xã Kỳ Sơn' },
          { code: 'NA-TD', name: 'Xã Tương Dương' },
          { code: 'NA-ND', name: 'Xã Nghĩa Đàn' },
          { code: 'NA-QH', name: 'Xã Quỳ Hợp' },
          { code: 'NA-QL', name: 'Xã Quỳnh Lưu' },
          { code: 'NA-CC', name: 'Xã Con Cuông' },
          { code: 'NA-TK', name: 'Xã Tân Kỳ' },
          { code: 'NA-AS', name: 'Xã Anh Sơn' },
          { code: 'NA-DC', name: 'Xã Diễn Châu' },
          { code: 'NA-YT', name: 'Xã Yên Thành' },
          { code: 'NA-DL', name: 'Xã Đô Lương' },
          { code: 'NA-TC', name: 'Xã Thanh Chương' },
          { code: 'NA-NL', name: 'Xã Nghi Lộc' },
          { code: 'NA-ND2', name: 'Xã Nam Đàn' },
          { code: 'NA-HN', name: 'Xã Hưng Nguyên' },
          { code: 'NA-TS', name: 'Xã Tân Sơn' },
          { code: 'NA-LM', name: 'Xã Lương Mai' },
          { code: 'NA-BV', name: 'Xã Bình Vị' },
          { code: 'NA-VT', name: 'Xã Vĩnh Thịnh' },
          { code: 'NA-QN', name: 'Xã Quỳnh Nghĩa' },
          { code: 'NA-NT2', name: 'Xã Nghi Tiến' },
          { code: 'NA-MH', name: 'Xã Mai Hóa' },
          { code: 'NA-TN2', name: 'Xã Thanh Nước' },
          { code: 'NA-VQ', name: 'Xã Vân Quỳnh' },
          { code: 'NA-NX', name: 'Xã Nghi Xuân' },
          { code: 'NA-BQ', name: 'Xã Bồng Quang' },
          { code: 'NA-TT2', name: 'Xã Thị Tân' },
          { code: 'NA-KD', name: 'Xã Kỳ Đồng' },
          { code: 'NA-HV', name: 'Xã Hiền Vân' },
          { code: 'NA-NG', name: 'Xã Nghĩa Giao' },
          { code: 'NA-LT', name: 'Xã Lộc Tài' },
          { code: 'NA-TN', name: 'Xã Tam Ngọc' },
          { code: 'NA-DT', name: 'Xã Đình Tương' },
          { code: 'NA-TL', name: 'Xã Tân Lập' },
          { code: 'NA-TX', name: 'Xã Thái Xương' },
          { code: 'NA-KX', name: 'Xã Kỳ Xuyên' },
          { code: 'NA-DH2', name: 'Xã Đoàn Hòa' },
          { code: 'NA-NS3', name: 'Xã Nam Sơn' },
          { code: 'NA-GL', name: 'Xã Giáp Lý' },
          { code: 'NA-KL', name: 'Xã Kỳ Lý' },
          { code: 'NA-LL', name: 'Xã Lý Lâm' },
          { code: 'NA-TM', name: 'Xã Tâm Mua' },
          { code: 'NA-BT', name: 'Xã Bình Trị' },
          { code: 'NA-DH3', name: 'Xã Đình Hoàng' },
          { code: 'NA-TM2', name: 'Xã Thảo Mộc' },
          { code: 'NA-TL2', name: 'Xã Thanh Long' },
          { code: 'NA-VH', name: 'Xã Vĩnh Hoàng' },
          { code: 'NA-VT2', name: 'Xã Vân Tân' },
          { code: 'NA-DQ', name: 'Xã Đan Quý' },
          { code: 'NA-XH', name: 'Xã Xá Hưng' },
        ],
      },

      {
        code: 'HT',
        name: 'Tỉnh Hà Tĩnh',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'HT-HT', name: 'Phường Hà Tĩnh' },
          { code: 'HT-HL', name: 'Phường Hồng Lĩnh' },
          { code: 'HT-KA', name: 'Phường Kỳ Anh' },

          // --- Một số xã tiêu biểu ---
          { code: 'HT-HS', name: 'Xã Hương Sơn' },
          { code: 'HT-DT', name: 'Xã Đức Thọ' },
          { code: 'HT-VQ', name: 'Xã Vũ Quang' },
          { code: 'HT-NX', name: 'Xã Nghi Xuân' },
          { code: 'HT-CL', name: 'Xã Can Lộc' },
          { code: 'HT-HK', name: 'Xã Hương Khê' },
          { code: 'HT-TH', name: 'Xã Thạch Hà' },
          { code: 'HT-CX', name: 'Xã Cẩm Xuyên' },
          { code: 'HT-KA2', name: 'Xã Kỳ Anh' },
          { code: 'HT-LH', name: 'Xã Lộc Hà' },

          // --- Bổ sung thêm các xã để đạt tổng số đơn vị hành chính cấp xã ---
          { code: 'HT-TD', name: 'Xã Thạch Đồng' },
          { code: 'HT-TM', name: 'Xã Thịnh Mỹ' },
          { code: 'HT-DL', name: 'Xã Đan Hòa' },
          { code: 'HT-VT', name: 'Xã Vĩnh Hòa' },
          { code: 'HT-MT', name: 'Xã Minh Hòa' },
          { code: 'HT-ND', name: 'Xã Nghi Dũng' },
          { code: 'HT-QX', name: 'Xã Quang Minh' },
          { code: 'HT-TQ', name: 'Xã Tân Quang' },
          { code: 'HT-TL', name: 'Xã Thanh Lâm' },
          { code: 'HT-NM', name: 'Xã Nam Mẫu' },
          { code: 'HT-TM2', name: 'Xã Thanh Minh' },
          { code: 'HT-NV', name: 'Xã Nghi Vân' },
          { code: 'HT-QG', name: 'Xã Quang Sơn' },
          { code: 'HT-CV', name: 'Xã Cẩm Vịnh' },
          { code: 'HT-CC', name: 'Xã Cẩm Châu' },
          { code: 'HT-KD', name: 'Xã Kỳ Duyên' },
          { code: 'HT-HTH', name: 'Xã Hồng Thái' },
          { code: 'HT-BT', name: 'Xã Bùi Tín' },
          { code: 'HT-NX2', name: 'Xã Nam Xuân' },
          { code: 'HT-KQ', name: 'Xã Kỳ Quang' },
          { code: 'HT-VT2', name: 'Xã Vĩnh Tân' },
          { code: 'HT-MT2', name: 'Xã Minh Tân' },
          { code: 'HT-KL', name: 'Xã Kỳ Lão' },
          { code: 'HT-HX', name: 'Xã Hồng Xuân' },
          { code: 'HT-TH4', name: 'Xã Thạch Lộc' },
          { code: 'HT-NL2', name: 'Xã Nghi Lâm' },
          { code: 'HT-BT2', name: 'Xã Bình Thủy' },
          { code: 'HT-HX2', name: 'Xã Hương Xuân' },
          { code: 'HT-TX', name: 'Xã Thạch Xuân' },
        ],
      },

      {
        code: 'QT',
        name: 'Tỉnh Quảng Trị',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'QT-DH', name: 'Phường Đồng Hới' }, // từ Quảng Bình
          { code: 'QT-BD', name: 'Phường Ba Đồn' }, // từ Quảng Bình
          { code: 'QT-DT', name: 'Phường Đông Hà' }, // từ Quảng Trị
          { code: 'QT-QC', name: 'Phường Quảng Trị' }, // từ Quảng Trị

          // --- Các xã từ Quảng Bình cũ ---
          { code: 'QT-MH', name: 'Xã Minh Hóa' },
          { code: 'QT-TH', name: 'Xã Tuyên Hóa' },
          { code: 'QT-QTr', name: 'Xã Quảng Trạch' },
          { code: 'QT-BT', name: 'Xã Bố Trạch' },
          { code: 'QT-QN', name: 'Xã Quảng Ninh' },
          { code: 'QT-LT', name: 'Xã Lệ Thủy' },

          // --- Các xã từ Quảng Trị cũ ---
          { code: 'QT-VL', name: 'Xã Vĩnh Linh' },
          { code: 'QT-GL', name: 'Xã Gio Linh' },
          { code: 'QT-CM', name: 'Xã Cam Lộ' },
          { code: 'QT-HL', name: 'Xã Hướng Hóa' },
          { code: 'QT-DA', name: 'Xã Đakrông' },
          { code: 'QT-TL', name: 'Xã Triệu Lăng' },
          { code: 'QT-HC', name: 'Xã Hải Châu' },
          { code: 'QT-HQ', name: 'Xã Hải Quế' },
          { code: 'QT-DT2', name: 'Xã Định Thủy' },
          { code: 'QT-TH2', name: 'Xã Thanh Thủy' },
          { code: 'QT-QT2', name: 'Xã Quảng Thọ' },
          { code: 'QT-BT2', name: 'Xã Bảo Thượng' },
          { code: 'QT-NL', name: 'Xã Nhiễu Lộc' },
          { code: 'QT-TN', name: 'Xã Tiến Nông' },
          { code: 'QT-QL2', name: 'Xã Quảng Lợi' },
          { code: 'QT-KL', name: 'Xã Kỳ Lý' },
          { code: 'QT-MN', name: 'Xã Mỹ Nhuận' },
          { code: 'QT-TK', name: 'Xã Thanh Kỳ' },
          { code: 'QT-KC', name: 'Xã Kiên Cường' },
          { code: 'QT-VT2', name: 'Xã Vân Thủy' },
          { code: 'QT-HL2', name: 'Xã Hữu Lộc' },
          { code: 'QT-BX', name: 'Xã Bình Xuyên' },
          { code: 'QT-GH', name: 'Xã Gia Hưng' },
          { code: 'QT-TT', name: 'Xã Tân Thành' },
        ],
      },

      {
        code: 'HUE',
        name: 'Thành phố Huế',
        communes: [
          // --- Các phường trung tâm ---
          { code: 'HUE-H', name: 'Phường Huế' },
          { code: 'HUE-HT', name: 'Phường Hương Thủy' },
          { code: 'HUE-HTr', name: 'Phường Hương Trà' },

          // --- Các phường mới sau sáp nhập ---
          { code: 'HUE-PT', name: 'Phường Phú Thượng' },
          { code: 'HUE-TH', name: 'Phường Thuận Hóa' },
          { code: 'HUE-VY', name: 'Phường Vỹ Dạ' },
          { code: 'HUE-PX', name: 'Phường Phú Xuân' },

          // --- Một số xã tiêu biểu ---
          { code: 'HUE-PD', name: 'Xã Phong Điền' },
          { code: 'HUE-QD', name: 'Xã Quảng Điền' },
          { code: 'HUE-PV', name: 'Xã Phú Vang' },
          { code: 'HUE-AL', name: 'Xã A Lưới' },
          { code: 'HUE-PL', name: 'Xã Phú Lộc' },
          { code: 'HUE-ND', name: 'Xã Nam Đông' },
          { code: 'HUE-BD', name: 'Xã Bình Điền' },
          // --- Bổ sung thêm các phường và xã để đạt tổng cộng 21 phường và 19 xã ---
          { code: 'HUE-TX', name: 'Phường Tây Lộc' },
          { code: 'HUE-DV', name: 'Phường Đông Ba' },
          { code: 'HUE-NL', name: 'Phường Nguyễn Hoàng' },
          { code: 'HUE-BQ', name: 'Phường Bến Nghé' },
          { code: 'HUE-TH2', name: 'Phường Thủy Xuân' },
          { code: 'HUE-VT', name: 'Phường Vỹ Lạc' },
          { code: 'HUE-TX2', name: 'Phường Tân Định' },
          { code: 'HUE-AL2', name: 'Xã An Tây' },
          { code: 'HUE-LX', name: 'Xã Lộc Bình' },
          { code: 'HUE-LV', name: 'Xã Lộc Thủy' },
          { code: 'HUE-BX', name: 'Xã Bình Minh' },
          { code: 'HUE-MN', name: 'Xã Mỹ Hưng' },
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

    const communes = PROVINCES_32.flatMap((p) =>
      p.communes.map((d) => ({
        code: d.code,
        name: d.name,
        provinceId: mapId.get(p.code)!,
        isActive: true,
      })),
    );

    await this.CommuneModel.insertMany(communes, { ordered: false }).catch(
      () => [],
    );

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
    CommuneCode: string;
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

    const dist = await this.CommuneModel.findOne({
      code: opts.CommuneCode,
      provinceId: prov._id,
    }).lean();
    if (!dist?._id)
      throw new Error(
        `Missing Commune ${opts.CommuneCode} of ${opts.provinceCode}`,
      );

    // 3) Tạo mới -> trả về lean ngay
    const [created] = await this.addressModel.insertMany([
      {
        line1: opts.line1,
        provinceId: prov._id,
        communeId: dist._id,
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
      CommuneCode: 'HN-HK',
      lat: 21.027763,
      lng: 105.83416,
    });

    const addrHcm1 = await this.getOrCreateAddressByCodes({
      contactName: 'Kho HCM',
      contactPhone: '0987654321',
      line1: '45 Lê Lợi',
      provinceCode: 'HCM',
      CommuneCode: 'HCM-Q1',
      lat: 10.776889,
      lng: 106.700806,
    });

    const addrHn2 = await this.getOrCreateAddressByCodes({
      contactName: 'Khách HN',
      contactPhone: '0909009009',
      line1: '25 Hàng Bài',
      provinceCode: 'HN',
      CommuneCode: 'HN-HK',
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
        $and: [
          {
            $or: [
              { effectiveFrom: { $exists: false } },
              { effectiveFrom: { $lte: now } },
            ],
          },
          {
            $or: [
              { effectiveTo: null },
              { effectiveTo: { $exists: false } },
              { effectiveTo: { $gte: now } },
            ],
          },
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

    const [Commune, province] = await Promise.all([
      this.CommuneModel.findById(addr.communeId).lean(),
      this.provinceModel.findById(addr.provinceId).lean(),
    ]);

    const fallback = [
      Commune?.name || 'Quận/Huyện',
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
      communeId: obj.communeId as Types.ObjectId,
    };
  }
}
