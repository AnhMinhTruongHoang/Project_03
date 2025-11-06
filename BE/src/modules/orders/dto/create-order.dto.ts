import { ApiProperty } from '@nestjs/swagger';
import {
  IsMongoId,
  IsNotEmpty,
  IsNumber,
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

  @ApiProperty({ example: '653f2a2bb70f7a1f4fa11111' })
  @IsNotEmpty()
  @IsMongoId()
  pickupAddressId: string;

  @ApiProperty({ example: '653f2a2bb70f7a1f4fa22222' })
  @IsNotEmpty()
  @IsMongoId()
  deliveryAddressId: string;

  @ApiProperty({ example: 100000 })
  @IsNumber()
  @Min(0)
  totalPrice: number;
}
