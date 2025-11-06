// src/modules/shipments/shipments.controller.ts
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
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ApiTags } from '@nestjs/swagger';
import { ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@ApiTags('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @ResponseMessage('Tạo vận đơn mới')
  async create(@Body() dto: CreateShipmentDto, @Users() user: IUser) {
    const shipment = await this.shipmentsService.create(dto, user._id);
    return {
      _id: shipment._id,
      trackingNumber: shipment.trackingNumber,
      createdAt: shipment.createdAt,
    };
  }

  @Get()
  @ResponseMessage('Danh sách vận đơn')
  async findAll(
    @Query('current') current?: string,
    @Query('pageSize') size?: string,
    @Query() query?: any,
  ) {
    const page = current ? Number(current) : 1;
    const limit = size ? Number(size) : 10;
    return this.shipmentsService.findAll(page, limit, query || {});
  }

  @Get(':id')
  @ResponseMessage('Chi tiết vận đơn')
  async findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật vận đơn')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @Users() user: IUser,
  ) {
    return this.shipmentsService.update(id, dto, user._id);
  }

  @Delete(':id')
  @ResponseMessage('Xóa (soft) vận đơn')
  async remove(@Param('id') id: string, @Users() user: IUser) {
    return this.shipmentsService.remove(id, user._id);
  }

  @Patch(':id/restore')
  @ResponseMessage('Khôi phục vận đơn')
  async restore(@Param('id') id: string) {
    return this.shipmentsService.restore(id);
  }
}
