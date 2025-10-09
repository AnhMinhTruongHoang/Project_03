import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { NotificationType } from '../schemas/notification.schemas';

export class CreateNotificationDto {
  @ApiProperty({ example: 'user@gmail.com' })
  @IsNotEmpty()
  @IsString()
  recipient: string;

  @ApiProperty({ example: 'Cập nhật đơn hàng' })
  @IsNotEmpty()
  @IsString()
  title: string;

  @ApiProperty({ example: 'Đơn hàng #123 đã được giao thành công' })
  @IsNotEmpty()
  @IsString()
  message: string;

  @ApiProperty({ enum: NotificationType, example: NotificationType.EMAIL })
  @IsEnum(NotificationType)
  type: NotificationType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relatedShipmentId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  relatedOrderId?: string;
}
