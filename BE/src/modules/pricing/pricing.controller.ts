import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
} from '@nestjs/common';
import { PricingService } from './pricing.service';
import { CreatePricingDto } from './dto/create-pricing.dto';
import { UpdatePricingDto } from './dto/update-pricing.dto';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Public, ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { ProvinceCode } from 'src/types/location.type';

@ApiTags('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @ResponseMessage('Tạo bảng giá mới')
  create(@Body() dto: CreatePricingDto) {
    return this.pricingService.create(dto);
  }

  ///cal
  @Public()
  @Post('calculate')
  @ResponseMessage('Tính giá cước vận chuyển')
  calculate(@Body() body: any) {
    return this.pricingService.calculateShipping(
      body.originProvinceCode as ProvinceCode,
      body.destProvinceCode as ProvinceCode,
      body.serviceCode as 'STD' | 'EXP',
      Number(body.weightKg),
      body.isLocal === true,
    );
  }

  ///

  @Public()
  @Get()
  @ResponseMessage('Danh sách bảng giá')
  async findAll(
    @Query('current') current?: string,
    @Query('pageSize') limit?: string,
    @Query() query?: any,
  ) {
    const page = current ? Number(current) : 1;
    const size = limit ? Number(limit) : 10;

    const data = await this.pricingService.findAll(page, size, query || {});

    return data;
  }

  @Public()
  @Get(':id')
  @ResponseMessage('Chi tiết bảng giá')
  findOne(@Param('id') id: string) {
    return this.pricingService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật bảng giá')
  update(@Param('id') id: string, @Body() dto: UpdatePricingDto) {
    return this.pricingService.update(id, dto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa bảng giá (soft)')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.pricingService.remove(id, user);
  }
}
