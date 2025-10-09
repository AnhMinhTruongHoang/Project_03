import { PartialType, ApiProperty } from '@nestjs/swagger';
import { CreateShipmentDto } from './create-shipment.dto';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ShipmentStatus } from '../schemas/shipment.schema';

export class UpdateShipmentDto extends PartialType(CreateShipmentDto) {
  @ApiProperty({
    required: false,
    enum: ShipmentStatus,
    example: ShipmentStatus.IN_TRANSIT,
    description: 'Trạng thái vận đơn',
  })
  @IsOptional()
  @IsEnum(ShipmentStatus, { message: 'status không hợp lệ' })
  status?: ShipmentStatus;

  @ApiProperty({
    required: false,
    example: 'Khách hàng không nghe máy',
    description: 'Lý do giao hàng thất bại (nếu có)',
  })
  @IsOptional()
  @IsString()
  failedReason?: string;
}
