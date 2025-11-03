import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ViettelPostService {
  private readonly baseUrl = 'https://partner.viettelpost.vn/v2/categories'; // ✅ dùng URL đầy đủ

  constructor(private http: HttpClient) {}

  getProvinces(): Observable<any> {
    return this.http.get(`${this.baseUrl}/listProvince`);
  }

  getDistricts(provinceId: number | string): Observable<any> {
    const params = new HttpParams().set('provinceId', String(provinceId));
    return this.http.get(`${this.baseUrl}/listDistrict`, { params });
  }

  getCommunes(districtId: number | string): Observable<any> {
    const params = new HttpParams().set('districtId', String(districtId));
    return this.http.get(`${this.baseUrl}/listWards`, { params });
  }
}

