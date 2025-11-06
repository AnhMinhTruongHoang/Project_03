// locations/location.controller.ts
import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  // Cấp 1: Tỉnh/Thành
  @Get('provinces')
  getProvinces() {
    return this.locationService.getProvinces();
  }

  // Cấp 2: Quận/Huyện theo Tỉnh/Thành
  @Get('districts')
  getDistricts(@Query('provinceId') provinceId: string) {
    return this.locationService.getDistricts(provinceId);
  }

  // === ĐỊA CHỈ (không còn ward/phường) ===
  @Post('addresses')
  createAddress(@Body() body: any) {
    return this.locationService.createAddress(body);
  }

  @Get('addresses/:id')
  getAddress(@Param('id') id: string) {
    return this.locationService.getAddressById(id);
  }
}
