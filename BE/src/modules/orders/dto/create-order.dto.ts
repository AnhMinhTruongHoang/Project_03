import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateOrderDto {
  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty()
  @IsString()
  senderName: string;

  @ApiProperty({ example: 'Trần Thị B' })
  @IsNotEmpty()
  @IsString()
  receiverName: string;

  @ApiProperty({ example: '0987654321' })
  @IsNotEmpty()
  @IsString()
  receiverPhone: string;

  @ApiProperty({ example: '123 Trần Hưng Đạo, Hà Nội' })
  @IsNotEmpty()
  @IsString()
  pickupAddress: string;

  @ApiProperty({ example: '456 Lê Lợi, TP.HCM' })
  @IsNotEmpty()
  @IsString()
  deliveryAddress: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  totalPrice: number;
}
