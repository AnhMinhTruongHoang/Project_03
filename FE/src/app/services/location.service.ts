// src/app/services/location.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

/**
 * Service này dùng để lấy dữ liệu hành chính Việt Nam chuẩn (tỉnh, huyện, xã)
 * theo dữ liệu công khai của GitHub: https://github.com/madnh/hanhchinhvn
 *
 * => Có thể dùng để cross-check hoặc đồng bộ với dữ liệu ViettelPost.
 */

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly baseUrl = 'https://raw.githubusercontent.com/madnh/hanhchinhvn/master/dist';

  constructor(private http: HttpClient) {}

  /** Lấy danh sách Tỉnh/Thành phố */
  getProvinces(): Observable<any> {
    return this.http.get(`${this.baseUrl}/tinh_tp.json`);
  }

  /** Lấy danh sách Quận/Huyện */
  getDistricts(): Observable<any> {
    return this.http.get(`${this.baseUrl}/quan_huyen.json`);
  }

  /** Lấy danh sách Xã/Phường */
  getWards(): Observable<any> {
    return this.http.get(`${this.baseUrl}/xa_phuong.json`);
  }
}
