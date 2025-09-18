import { ApiProperty } from '@nestjs/swagger';

export class CreatePromoDto {
  @ApiProperty()
  code: string;

  @ApiProperty()
  description?: string;

  @ApiProperty()
  discountPercent: number;

  @ApiProperty()
  maxUsage?: number;

  @ApiProperty()
  startDate?: Date;

  @ApiProperty()
  endDate?: Date;
}
