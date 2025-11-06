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

  @ApiProperty({ example: 0 }) @IsNumber() @Min(0) minWeightKg: number;
  @ApiProperty({ example: 2 }) @IsNumber() @Min(0) maxWeightKg: number;

  @ApiProperty({ example: 0 }) @IsNumber() @Min(0) minKm: number;
  @ApiProperty({ example: 5 }) @IsNumber() @Min(0) maxKm: number;

  @ApiProperty({ example: 10000 }) @IsNumber() @Min(0) baseFee: number;
  @ApiProperty({ example: 1000 }) @IsNumber() @Min(0) perKm: number;
  @ApiProperty({ example: 2000 }) @IsNumber() @Min(0) perKg: number;

  @ApiProperty({ required: false, example: 35000 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  flatFee?: number;

  @ApiProperty({ required: false, example: new Date().toISOString() })
  @IsOptional()
  effectiveFrom?: Date;

  @ApiProperty({ required: false })
  @IsOptional()
  effectiveTo?: Date;
}
