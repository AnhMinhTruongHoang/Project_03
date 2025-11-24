import { ApiProperty } from '@nestjs/swagger';
import {
  IsEnum,
  IsMongoId,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { TrackingStatus } from '../schemas/tracking.schemas';

export class CreateTrackingDto {
  @ApiProperty({ example: '652f03bc6db3430b5c1f26a2' })
  @IsNotEmpty()
  @IsMongoId()
  orderId: string;

  @ApiProperty({ example: TrackingStatus.IN_TRANSIT })
  @IsEnum(TrackingStatus)
  status: TrackingStatus;

  @ApiProperty({ example: 'Kho Hà Nội', required: false })
  @IsOptional()
  @IsString()
  location?: string;

  @ApiProperty({ example: '652f03bc6db3430b5c1f26b7', required: false })
  @IsOptional()
  @IsMongoId()
  branchId?: string;

  @ApiProperty({ example: 'Đang chuyển hàng tới TP.HCM', required: false })
  @IsOptional()
  @IsString()
  note?: string;
}
