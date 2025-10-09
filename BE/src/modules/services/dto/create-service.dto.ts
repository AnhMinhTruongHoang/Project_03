import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateServiceDto {
  @ApiProperty({ example: 'EXPRESS', description: 'Mã dịch vụ' })
  @IsNotEmpty()
  @IsString()
  code: string;

  @ApiProperty({ example: 'Giao hàng hỏa tốc', description: 'Tên dịch vụ' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: 'Giao hàng trong vòng 2-4 giờ', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: 25000, description: 'Giá cơ bản' })
  @IsNumber()
  @Min(0)
  basePrice: number;
}
