import { Component, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { LocationService } from '../services/location.service';
import { Router, RouterLink } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  templateUrl: './home.html',
  imports: [CommonModule, FormsModule, RouterLink],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Home {
  provinces: any[] = [];
  communes: any[] = [];

  selectedProvince: any = null;
  selectedCommune: any = null;

  constructor(
    private locationService: LocationService,
    private router: Router
  ) {}

  ngOnInit() {
  }

  // Khi chọn tỉnh, lấy xã/phường trực thuộc
  onProvinceChange() {
    this.selectedCommune = null;
    if (!this.selectedProvince) return;
  }

  trackById(index: number, item: any) {
    return item.id;
  }

  // ✅ Xử lý nút "Bắt đầu ngay"
  // onStartClick() {
  //   const token = localStorage.getItem('access_token');

  //   if (token) {
  //     // 🔑 Nếu đã đăng nhập
  //     this.router.navigate(['/dashboard']);
  //   } else {
  //     // 🚪 Nếu chưa đăng nhập
  //     this.router.navigate(['/login']);
  //   }
  // }
}
