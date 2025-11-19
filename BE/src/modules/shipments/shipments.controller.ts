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
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt.auth.guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { ResponseMessage, Users } from 'src/health/decorator/customize';
import { IUser } from 'src/types/user.interface';
import { ShipmentsService } from './shipments.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';
import { ShipmentStatus } from './schemas/shipment.schema';

@ApiTags('shipments')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('shipments')
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  @ResponseMessage('Tạo vận đơn')
  create(@Body() dto: CreateShipmentDto, @Users() user: IUser) {
    return this.shipmentsService.create(dto, user._id);
  }

  @Get()
  @ResponseMessage('Danh sách vận đơn')
  findAll(
    @Query('current') current?: string,
    @Query('pageSize') limit?: string,
    @Query() query?: any,
  ) {
    const page = current ? Number(current) : 1;
    const size = limit ? Number(limit) : 10;
    return this.shipmentsService.findAll(page, size, query || {});
  }

  @Get(':id')
  @ResponseMessage('Chi tiết vận đơn')
  findOne(@Param('id') id: string) {
    return this.shipmentsService.findOne(id);
  }

  @Patch(':id')
  @ResponseMessage('Cập nhật vận đơn')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateShipmentDto,
    @Users() user: IUser,
  ) {
    return this.shipmentsService.update(id, dto, user._id);
  }

  @Patch(':id/status/:status')
  @ResponseMessage('Cập nhật trạng thái vận đơn')
  updateStatus(
    @Param('id') id: string,
    @Param('status') status: ShipmentStatus,
  ) {
    return this.shipmentsService.updateStatus(id, status);
  }

  @Delete(':id')
  @ResponseMessage('Xóa vận đơn (soft)')
  remove(@Param('id') id: string, @Users() user: IUser) {
    return this.shipmentsService.remove(id, user._id);
  }

  @Patch(':id/restore')
  @ResponseMessage('Khôi phục vận đơn')
  restore(@Param('id') id: string) {
    return this.shipmentsService.restore(id);
  }
}
