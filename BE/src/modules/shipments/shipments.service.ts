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

// Các model để populate
import { Address } from '../location/schemas/address.schema';
import { Branch } from '../branches/schemas/branch.schemas';
import { Service } from '../services/schemas/service.schemas';
import { Province } from '../location/schemas/province.schema';
import { Commune } from '../location/schemas/Commune.schema';

import { ProvinceCode, Region } from 'src/types/location.type';
import { getRegionByProvinceCode } from '../location/dto/locations';

// ===== Lean types =====
interface AddressLean {
  _id: Types.ObjectId;
  lat?: number;
  lng?: number;
  provinceId?: Types.ObjectId;
}
interface ServiceLean {
  _id: Types.ObjectId;
  volumetricDivisor?: number; // vd: 6000
  code?: string; // 'STD' | 'EXP'
}
interface ProvinceLean {
  _id: Types.ObjectId;
  code: ProvinceCode;
}

@Injectable()
export class ShipmentsService {
  constructor(
    @InjectModel(Shipment.name)
    private readonly shipmentModel: SoftDeleteModel<ShipmentDocument>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  /* ===== Utils ===== */
  private generateTrackingNumber(): string {
    const nanoid = customAlphabet('0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ', 10);
    return `VN${nanoid()}`;
  }

  private distanceKm(lat1 = 0, lon1 = 0, lat2 = 0, lon2 = 0) {
    const toRad = (d: number) => (d * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /* ===== Create ===== */
  async create(dto: CreateShipmentDto, userId: string) {
    const trackingNumber = this.generateTrackingNumber();

    // Lấy Address + Service
    const AddressModel = this.connection.model<Address>('Address');
    const ServiceModel = this.connection.model<Service>('Service');
    const ProvinceModel = this.connection.model<Province>('Province');

    const [pickup, delivery, service] = await Promise.all([
      AddressModel.findById(dto.pickupAddressId).lean<AddressLean>(),
      AddressModel.findById(dto.deliveryAddressId).lean<AddressLean>(),
      ServiceModel.findById(dto.serviceId).lean<ServiceLean>(),
    ]);

    if (!pickup || !delivery)
      throw new BadRequestException('Địa chỉ không hợp lệ');
    if (!service) throw new BadRequestException('Service không hợp lệ');

    // Lấy provinceCode từ Address -> Province
    const [originProv, destProv] = await Promise.all([
      pickup.provinceId
        ? ProvinceModel.findById(pickup.provinceId).lean<ProvinceLean>()
        : null,
      delivery.provinceId
        ? ProvinceModel.findById(delivery.provinceId).lean<ProvinceLean>()
        : null,
    ]);

    if (!originProv || !destProv) {
      throw new BadRequestException('Province code không hợp lệ');
    }

    const originProvinceCode = originProv.code;
    const destProvinceCode = destProv.code;

    // Khoảng cách (chỉ để lưu tham khảo)
    const km = this.distanceKm(
      pickup.lat ?? 0,
      pickup.lng ?? 0,
      delivery.lat ?? 0,
      delivery.lng ?? 0,
    );

    // Volumetric weight
    let volumetricWeightKg: number | undefined;
    if (
      dto.lengthCm &&
      dto.widthCm &&
      dto.heightCm &&
      service.volumetricDivisor
    ) {
      volumetricWeightKg =
        (dto.lengthCm * dto.widthCm * dto.heightCm) / service.volumetricDivisor;
    }
    const chargeableWeightKg = Math.max(dto.weightKg, volumetricWeightKg ?? 0);

    // ===== TÍNH GIÁ THEO RULE MỚI =====
    const originRegion = getRegionByProvinceCode(originProvinceCode);
    const destRegion = getRegionByProvinceCode(destProvinceCode);

    if (!originRegion || !destRegion) {
      throw new BadRequestException('Province code không hợp lệ (region)');
    }

    // base theo service code
    const serviceCode = service.code as 'STD' | 'EXP';
    const SERVICE_BASE_PRICE: Record<'STD' | 'EXP', number> = {
      STD: 20000,
      EXP: 40000,
    };
    const baseServicePrice = SERVICE_BASE_PRICE[serviceCode];
    if (baseServicePrice == null) {
      throw new BadRequestException('Service code không hợp lệ');
    }

    // phụ phí vùng
    let regionFee = 0;
    const pair = new Set<Region>([originRegion, destRegion]);
    if (pair.has('North') && pair.has('Central')) {
      regionFee = 10000;
    } else if (pair.has('North') && pair.has('South')) {
      regionFee = 15000;
    } else if (pair.has('South') && pair.has('Central')) {
      regionFee = 10000;
    } // cùng vùng = 0

    // phụ phí quá cân (> 5kg)
    const overweightFee = chargeableWeightKg > 5 ? 5000 : 0;

    // nội thành + cùng kho = free ship
    const isLocal =
      originProvinceCode === destProvinceCode &&
      dto.originBranchId === dto.destinationBranchId;

    const shippingFee = isLocal
      ? 0
      : baseServicePrice + regionFee + overweightFee;

    const shipment = await this.shipmentModel.create({
      ...dto,
      trackingNumber,
      createdBy: new Types.ObjectId(userId),
      volumetricWeightKg,
      chargeableWeightKg,
      distanceKm: km,
      shippingFee,
      status: ShipmentStatus.PENDING,
      timeline: [
        {
          status: ShipmentStatus.PENDING,
          timestamp: new Date(),
          note: 'Đơn tạo',
        },
      ],
    });

    return shipment;
  }

  /* ===== List ===== */
  async findAll(currentPage = 1, limit = 10, queryObj: any = {}) {
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
      .populate({ path: 'originBranchId', model: Branch.name })
      .populate({ path: 'destinationBranchId', model: Branch.name })
      .populate({ path: 'serviceId', model: Service.name });

    if (population) q.populate(population as any);
    const results = await q.exec();

    return { meta: { current: page, pageSize: size, pages, total }, results };
  }

  /* ===== Detail ===== */
  async findOne(id: string) {
    const shipment = await this.shipmentModel
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
      })
      .populate({ path: 'originBranchId', model: Branch.name })
      .populate({ path: 'destinationBranchId', model: Branch.name })
      .populate({ path: 'serviceId', model: Service.name });

    if (!shipment || shipment.isDeleted)
      throw new NotFoundException('Không tìm thấy vận đơn');
    return shipment;
  }

  /* ===== Update ===== */
  async update(id: string, dto: UpdateShipmentDto, userId: string) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment || shipment.isDeleted)
      throw new NotFoundException('Không tìm thấy vận đơn');

    if (dto.status && dto.status !== shipment.status) {
      shipment.timeline.push({
        status: dto.status,
        timestamp: new Date(),
        note: 'Cập nhật trạng thái',
      });
      if (dto.status === ShipmentStatus.DELIVERED)
        shipment.deliveredAt = new Date();
    }

    Object.assign(shipment, dto);
    await shipment.save();
    return shipment;
  }

  /* ===== Update status (endpoint riêng) ===== */
  async updateStatus(id: string, status: ShipmentStatus) {
    const shipment = await this.shipmentModel.findById(id);
    if (!shipment || shipment.isDeleted)
      throw new NotFoundException('Không tìm thấy vận đơn');

    shipment.status = status;
    shipment.timeline.push({
      status,
      timestamp: new Date(),
      note: 'Cập nhật trạng thái',
    });
    if (status === ShipmentStatus.DELIVERED) shipment.deliveredAt = new Date();

    await shipment.save();
    return shipment;
  }

  /* ===== Soft delete / Restore ===== */
  async remove(id: string, userId: string) {
    const res = await this.shipmentModel.softDelete({
      _id: id,
      deletedBy: { _id: new Types.ObjectId(userId), email: 'system@local' },
    } as any);
    if (!res || (res as any).modifiedCount === 0)
      throw new NotFoundException('Không tìm thấy vận đơn');
    return { message: 'Đã xóa (soft) vận đơn' };
  }

  async restore(id: string) {
    const res = await this.shipmentModel.restore({ _id: id } as any);
    if (!res || (res as any).modifiedCount === 0)
      throw new NotFoundException('Không tìm thấy vận đơn đã xóa');
    return { message: 'Đã khôi phục vận đơn' };
  }
}
