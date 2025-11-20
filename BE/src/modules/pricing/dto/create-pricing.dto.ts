import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
  Min,
  IsOptional,
} from 'class-validator';

export class CreatePricingDto {
  @ApiProperty({ example: '652f03bc6db3430b5c1f26a2' })
  @IsNotEmpty()
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ example: 20000, description: 'Base price cho service' })
  @IsNumber()
  @Min(0)
  basePrice: number;

  @ApiProperty({
    example: 5,
    description: 'Ngưỡng quá cân (kg), ví dụ >5kg thì tính phụ phí',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overweightThresholdKg?: number;

  @ApiProperty({
    example: 5000,
    description: 'Phụ phí khi vượt ngưỡng cân',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  overweightFee?: number;

  @ApiProperty({
    required: false,
    example: new Date().toISOString(),
    description: 'Ngày bắt đầu hiệu lực',
  })
  @IsOptional()
  effectiveFrom?: Date;

  @ApiProperty({
    required: false,
    description: 'Ngày kết thúc hiệu lực (nếu có)',
  })
  @IsOptional()
  effectiveTo?: Date;
}
