import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ViettelPostService } from '../services/viettelpost.service';
import { LocationService } from '../services/location.service';
import { normalizeAdministrativeData } from '../services/location-normalizer';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  imports: [CommonModule, FormsModule],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Home {
  provinces: any[] = [];
  communes: any[] = [];

  selectedProvince: any = null;
  selectedCommune: any = null;

  constructor(
    private viettelPostService: ViettelPostService,
    private locationService: LocationService
  ) {}

  ngOnInit() {
    // 🗺️ Lấy danh sách tỉnh/thành phố
    this.viettelPostService.getProvinces().subscribe((res) => {
      const raw = res?.data?.data || res?.data || res || [];
      this.provinces = normalizeAdministrativeData(raw, 'province');
    });

    // (Tuỳ chọn) Log dữ liệu hành chính chuẩn quốc gia
    this.locationService.getProvinces().subscribe((official) => {
      console.log('📚 Dữ liệu hành chính quốc gia:', official);
    });
  }

  // Khi chọn tỉnh, lấy xã/phường trực thuộc
  onProvinceChange() {
    this.selectedCommune = null;
    if (!this.selectedProvince) return;

    this.viettelPostService.getCommunes(this.selectedProvince.id).subscribe((res) => {
      const raw = res?.data?.data || res?.data || res || [];
      this.communes = normalizeAdministrativeData(raw, 'ward');
    });
  }

  trackById(index: number, item: any) {
    return item.id;
  }
}
