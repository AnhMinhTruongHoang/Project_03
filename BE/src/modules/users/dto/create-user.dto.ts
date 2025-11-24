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
  IsMongoId,
  IsBoolean,
} from 'class-validator';

export enum GenderEnum {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum RoleEnum {
  // route này dùng tạo nhân viên, chỉ cần STAFF/ADMIN
  STAFF = 'STAFF',
  ADMIN = 'ADMIN',
}

export enum AccountTypeEnum {
  LOCAL = 'LOCAL',
  GOOGLE = 'GOOGLE',
  FACEBOOK = 'FACEBOOK',
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
  @Type(() => Number)
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
    example: RoleEnum.STAFF,
    description: 'Phân quyền (mặc định STAFF)',
  })
  @IsOptional()
  @IsEnum(RoleEnum, { message: 'Quyền không hợp lệ' })
  role?: RoleEnum;

  @ApiProperty({
    required: true,
    example: '6527d0c9c3a2bd7f4a1b2345',
    description: 'Chi nhánh làm việc',
  })
  @IsNotEmpty({ message: 'Chi nhánh không được để trống' })
  @IsMongoId({ message: 'Chi nhánh không hợp lệ' })
  branchId: string;

  @ApiProperty({
    required: false,
    enum: AccountTypeEnum,
    example: AccountTypeEnum.LOCAL,
    description: 'Loại tài khoản',
  })
  @IsOptional()
  @IsEnum(AccountTypeEnum, { message: 'Loại tài khoản không hợp lệ' })
  accountType?: AccountTypeEnum;

  @ApiProperty({
    required: false,
    example: true,
    description: 'Trạng thái hoạt động',
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

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

/*********** RegisterUserDto & UserLoginDto giữ nguyên ***********/
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
