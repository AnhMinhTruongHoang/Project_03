import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { SoftDeleteModel } from 'soft-delete-plugin-mongoose';
import aqp from 'api-query-params';
import {
  Shipment,
  ShipmentDocument,
  ShipmentStatus,
} from './schemas/shipment.schema';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { customAlphabet } from 'nanoid';

// ===== Interfaces cho .lean() (type-safe) =====
interface AddressLean {
  _id: Types.ObjectId;
  lat: number;
  lng: number;
}
interface ServiceLean {
  _id: Types.ObjectId;
  volumetricDivisor?: number; // vd: 6000
}
interface PricingSlabLean {
  baseFee?: number;
  perKm?: number;
  perKg?: number;
  flatFee?: number | null;
  isActive: boolean;
  isDeleted: boolean;
  minWeightKg: number;
  maxWeightKg: number;
  minKm: number;
  maxKm: number;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
}

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name)
    private readonly shipmentModel: SoftDeleteModel<ShipmentDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  // ========== Utils ==========
  private generateTrackingNumber(): string {
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
    return `VN${nanoid()}`;
  }

  // Haversine (km)
  private distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // ========== Create ==========
  async create(dto: CreateShipmentDto, userId: string) {
    const trackingNumber = this.generateTrackingNumber();

    // Lấy Address + Service (type-safe lean)
    const AddressModel = this.connection.model('Address');
    const ServiceModel = this.connection.model('Service');

    const [pickup, delivery, service] = await Promise.all([
      AddressModel.findById(dto.pickupAddressId).lean<AddressLean>(),
      AddressModel.findById(dto.deliveryAddressId).lean<AddressLean>(),
      ServiceModel.findById(dto.serviceId).lean<ServiceLean>(),
    ]);

    if (!pickup || !delivery) {
      throw new BadRequestException('Địa chỉ không hợp lệ');
    }
    if (!service) {
      throw new BadRequestException('Service không hợp lệ');
    }

    // Tính khoảng cách
    const km = this.distanceKm(
      pickup.lat,
      pickup.lng,
      delivery.lat,
      delivery.lng,
    );

    // Tính cân nặng quy đổi (nếu có kích thước & divisor)
    let volumetricWeightKg: number | undefined;
    if (
      dto.lengthCm &&
      dto.widthCm &&
      dto.heightCm &&
      service.volumetricDivisor
    ) {
      // (cm * cm * cm) / divisor  -> kg
      volumetricWeightKg =
        (dto.lengthCm * dto.widthCm * dto.heightCm) / service.volumetricDivisor;
    }
    const chargeableWeightKg = Math.max(dto.weightKg, volumetricWeightKg ?? 0);

    // Tra bảng giá (Pricing)
    const PricingModel = this.connection.model('Pricing');
    const now = new Date();

    const slab = (await PricingModel.findOne({
      serviceId: new Types.ObjectId(dto.serviceId),
      isActive: true,
      isDeleted: false,
      minWeightKg: { $lte: chargeableWeightKg },
      maxWeightKg: { $gte: chargeableWeightKg },
      minKm: { $lte: km },
      maxKm: { $gte: km },
      effectiveFrom: { $lte: now },
      $or: [
        { effectiveTo: null },
        { effectiveTo: { $exists: false } },
        { effectiveTo: { $gte: now } },
      ],
    }).lean<PricingSlabLean>()) as PricingSlabLean | null;

    if (!slab) {
      throw new BadRequestException(
        'Không tìm thấy bảng giá phù hợp (km/weight)',
      );
    }

    // Tính phí (đã fix cú pháp)
    const base = slab.baseFee ?? 0;
    const perKm = slab.perKm ?? 0;
    const perKg = slab.perKg ?? 0;
    const shippingFee =
      slab.flatFee != null
        ? slab.flatFee
        : Math.round(base + perKm * km + perKg * chargeableWeightKg);

    // Tạo shipment
    const shipment = await this.shipmentModel.create({
      ...dto,
      trackingNumber,
      createdBy: new Types.ObjectId(userId),
      weightKg: dto.weightKg,
      volumetricWeightKg,
      chargeableWeightKg,
      distanceKm: km,
      shippingFee,
      status: ShipmentStatus.PENDING,
      timeline: [
        {
          status: ShipmentStatus.PENDING,
          timestamp: new Date(),
          note: 'Đơn hàng được tạo',
        },
      ],
    });

    return shipment;
  }

  // ========== List ==========
  async findAll(currentPage = 1, limit = 10, queryObj: any = {}) {
    // Lưu ý: @Query() trong controller trả về object, không phải string
    const { filter, sort, population } = aqp(queryObj);
    delete (filter as any).current;
    delete (filter as any).pageSize;

    if (filter.isDeleted === undefined) (filter as any).isDeleted = false;

    const page = Number(currentPage) > 0 ? Number(currentPage) : 1;
    const size = Number(limit) > 0 ? Number(limit) : 10;
    const skip = (page - 1) * size;

    const total = await this.shipmentModel.countDocuments(filter);
    const pages = Math.ceil(total / size);

    const q = this.shipmentModel
      .find(filter)
      .sort(sort as any)
      .skip(skip)
      .limit(size);
    if (population) q.populate(population as any);
    const results = await q.exec();

    return { meta: { current: page, pageSize: size, pages, total }, results };
  }

  // ========== Detail ==========
  async findOne(id: string) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment || shipment.isDeleted) {
      throw new NotFoundException('Không tìm thấy vận đơn');
    }
    return shipment;
  }

  // ========== Update ==========
  async update(id: string, dto: UpdateShipmentDto, userId: string) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment || shipment.isDeleted) {
      throw new NotFoundException('Không tìm thấy vận đơn');
    }

    if (dto.status && dto.status !== shipment.status) {
      shipment.timeline.push({
        status: dto.status,
        timestamp: new Date(),
        note: 'Cập nhật trạng thái vận đơn',
      });
      if (dto.status === ShipmentStatus.DELIVERED) {
        shipment.deliveredAt = new Date();
      }
    }

    Object.assign(shipment, dto);
    await shipment.save();
    return shipment;
  }

  // ========== Soft delete ==========
  async remove(id: string, userId: string) {
    const res = await this.shipmentModel.softDelete({
      _id: id,
      deletedBy: { _id: new Types.ObjectId(userId), email: 'system@local' },
    } as any);
    if (!res || (res as any).modifiedCount === 0) {
      throw new NotFoundException('Không tìm thấy vận đơn');
    }
    return { message: 'Đã xóa (soft) vận đơn' };
  }

  async restore(id: string) {
    const res = await this.shipmentModel.restore({ _id: id } as any);
    if (!res || (res as any).modifiedCount === 0) {
      throw new NotFoundException('Không tìm thấy vận đơn đã xóa');
    }
    return { message: 'Đã khôi phục vận đơn' };
  }
}
