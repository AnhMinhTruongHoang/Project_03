import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsMongoId, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { Zone } from '../schemas/pricing.schemas';

export class CreatePricingDto {
  @ApiProperty({ example: '652f03bc6db3430b5c1f26a2' })
  @IsNotEmpty()
  @IsMongoId()
  serviceId: string;

  @ApiProperty({ example: Zone.REGIONAL })
  @IsEnum(Zone)
  zone: Zone;

  @ApiProperty({ example: 0 })
  @IsNumber()
  @Min(0)
  minWeight: number;

  @ApiProperty({ example: 5000 })
  @IsNumber()
  @Min(0)
  maxWeight: number;

  @ApiProperty({ example: 30000 })
  @IsNumber()
  @Min(0)
  price: number;
}
