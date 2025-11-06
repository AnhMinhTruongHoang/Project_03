import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { Types } from 'mongoose';

export class CreateAddressDto {
  @IsNotEmpty() @IsString() line1: string;
  @IsNotEmpty() provinceId: Types.ObjectId;
  @IsNotEmpty() districtId: Types.ObjectId;
  @IsNotEmpty() wardId: Types.ObjectId;
  @IsNumber() lat: number;
  @IsNumber() lng: number;
  @IsString() contactName?: string;
  @IsString() contactPhone?: string;
}
