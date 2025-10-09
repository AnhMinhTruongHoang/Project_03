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
import { ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';

@ApiTags('pricing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('pricing')
export class PricingController {
  constructor(private readonly pricingService: PricingService) {}

  @Post()
  @ResponseMessage('Tạo bảng giá mới')
  create(@Body() createPricingDto: CreatePricingDto) {
    return this.pricingService.create(createPricingDto);
  }

  @Get()
  @ResponseMessage('Danh sách bảng giá')
  findAll(
    @Query('current') currentPage: string,
    @Query('pageSize') limit: string,
    @Query() qs: string,
  ) {
    return this.pricingService.findAll(+currentPage, +limit, qs);
  }

  @Get(':id')
  @ResponseMessage('Chi tiết bảng giá')
  findOne(@Param('id') id: string) {
    return this.pricingService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật bảng giá')
  update(@Param('id') id: string, @Body() updatePricingDto: UpdatePricingDto) {
    return this.pricingService.update(id, updatePricingDto);
  }

  @Delete(':id')
  @ResponseMessage('Xóa bảng giá')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.pricingService.remove(id, user);
  }

  // ✅ Endpoint tính giá vận chuyển theo trọng lượng & zone
  @Get('calculate/:serviceId/:zone/:weight')
  @ResponseMessage('Tính giá cước vận chuyển')
  calculate(
    @Param('serviceId') serviceId: string,
    @Param('zone') zone: string,
    @Param('weight') weight: string,
  ) {
    return this.pricingService.calculate(serviceId, Number(weight), zone);
  }
}
