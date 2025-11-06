import { Controller, Get, Post, Body, Query, Param } from '@nestjs/common';
import { LocationService } from './location.service';

@Controller('locations')
export class LocationController {
  constructor(private readonly locationService: LocationService) {}

  @Get('provinces')
  getProvinces() {
    return this.locationService.getProvinces();
  }

  @Get('districts')
  getDistricts(@Query('provinceId') provinceId: string) {
    return this.locationService.getDistricts(provinceId);
  }

  @Get('wards')
  getWards(@Query('districtId') districtId: string) {
    return this.locationService.getWards(districtId);
  }

  @Post('addresses')
  createAddress(@Body() body: any) {
    return this.locationService.createAddress(body);
  }

  @Get('addresses/:id')
  getAddress(@Param('id') id: string) {
    return this.locationService.getAddressById(id);
  }
}
