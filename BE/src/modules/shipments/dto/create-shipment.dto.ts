import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsMongoId,
  Min,
} from 'class-validator';

export class CreateShipmentDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty()
  @IsString()
  senderName: string;
  @ApiProperty({ example: '0987654321' })
  @IsNotEmpty()
  @IsString()
  senderPhone: string;

  @ApiProperty({ example: 'Trần Thị B' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;
  @ApiProperty({ example: '0911222333' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiProperty({
    example: '653f2a2bb70f7a1f4fa11111',
    description: 'Address pickup',
  })
  @IsNotEmpty()
  @IsMongoId()
  pickupAddressId: string;

  @ApiProperty({
    example: '653f2a2bb70f7a1f4fa22222',
    description: 'Address delivery',
  })
  @IsNotEmpty()
  @IsMongoId()
  deliveryAddressId: string;

  @ApiProperty({
    example: '653f2a2bb70f7a1f4fa33333',
    description: 'Branch origin',
  })
  @IsNotEmpty()
  @IsMongoId()
  originBranchId: string;

  @ApiProperty({
    example: '653f2a2bb70f7a1f4fa44444',
    description: 'Branch destination',
  })
  @IsNotEmpty()
  @IsMongoId()
  destinationBranchId: string;

  @ApiProperty({ example: '653f2a2bb70f7a1f4fa55555', description: 'Service' })
  @IsNotEmpty()
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ example: 1.5, description: 'Cân nặng (kg)' })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  weightKg: number;

  @ApiProperty({ example: 30, required: false })
  @IsOptional()
  @IsNumber()
  lengthCm?: number;
  @ApiProperty({ example: 20, required: false })
  @IsOptional()
  @IsNumber()
  widthCm?: number;
  @ApiProperty({ example: 15, required: false })
  @IsOptional()
  @IsNumber()
  heightCm?: number;

  @ApiProperty({ required: false, example: 'Giao nhanh trong ngày' })
  @IsOptional()
  @IsString()
  note?: string;
}
