import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  IsEnum,
  Matches,
} from 'class-validator';

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum RoleEnum {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com', description: 'Email người dùng' })
  @IsNotEmpty({ message: 'Email không được để trống' })
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  @ApiProperty({ example: '123456', description: 'Mật khẩu người dùng' })
  @IsNotEmpty({ message: 'Mật khẩu không được để trống' })
  @IsString()
  password: string;

  @ApiProperty({ example: 'Nguyễn Văn A', description: 'Họ tên người dùng' })
  @IsNotEmpty({ message: 'Tên không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({ required: false, example: 25, description: 'Tuổi' })
  @IsOptional()
  @IsInt({ message: 'Tuổi phải là số nguyên' })
  @Min(0, { message: 'Tuổi không được nhỏ hơn 0' })
  @Max(120, { message: 'Tuổi không được lớn hơn 120' })
  age?: number;

  @ApiProperty({
    required: false,
    enum: GenderEnum,
    example: GenderEnum.MALE,
    description: 'Giới tính',
  })
  @IsOptional()
  @IsEnum(GenderEnum, { message: 'Giới tính không hợp lệ' })
  gender?: GenderEnum;

  @ApiProperty({
    required: false,
    example: '0987654321',
    description: 'Số điện thoại',
  })
  @IsOptional()
  @Matches(/^[0-9]{9,15}$/, { message: 'Số điện thoại không hợp lệ' })
  phone?: string;

  @ApiProperty({
    required: false,
    example: 'Hà Nội',
    description: 'Địa chỉ người dùng',
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({
    required: false,
    enum: RoleEnum,
    example: RoleEnum.USER,
    description: 'Phân quyền',
  })
  @IsOptional()
  @IsEnum(RoleEnum, { message: 'Quyền không hợp lệ' })
  role?: RoleEnum;

  @IsOptional()
  branchId?: string;

  @ApiProperty({
    required: false,
    example: 'https://example.com/avatar.png',
    description: 'Đường dẫn avatar người dùng',
  })
  @IsOptional()
  @IsString()
  avatarUrl?: string;

  createdAt?: string;
}

///////////// register valid

export class RegisterUserDto {
  @IsNotEmpty({ message: "Name mustn't empty" })
  name?: string;

  @IsNotEmpty({
    message: "Email can't be empty",
  })
  @IsEmail()
  email: string;

  @IsNotEmpty({ message: 'password should not be empty' })
  password: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Tuổi phải là số nguyên' })
  @Min(0, { message: 'Tuổi không được nhỏ hơn 0' })
  @Max(120, { message: 'Tuổi không được lớn hơn 120' })
  age?: number;

  @IsOptional()
  gender?: string;

  @IsOptional()
  address?: string;

  @IsOptional()
  phone?: number;
}

//create-user.dto
export class UserLoginDto {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ example: 'anhminh', description: 'username' })
  readonly username: string;

  @IsString()
  @IsNotEmpty()
  @ApiProperty({
    example: '123456',
    description: 'password',
  })
  readonly password: string;
}
