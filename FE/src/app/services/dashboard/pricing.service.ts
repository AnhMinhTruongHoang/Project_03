import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class PricingService {
  private apiUrl = `${env.baseUrl}/pricing`;

  constructor(private http: HttpClient) {}

  /** Lấy danh sách bảng giá */
  getAll(
    current: number = 1,
    pageSize: number = 20,
    filters?: any
  ): Observable<any> {
    let params = new HttpParams()
      .set('current', current)
      .set('pageSize', pageSize);

    if (filters) {
      Object.keys(filters).forEach((key) => {
        if (filters[key] !== null && filters[key] !== '' && filters[key] !== undefined) {
          params = params.set(key, filters[key]);
        }
      });
    }

    return this.http.get(this.apiUrl, { params });
  }

  /** Tạo bảng giá mới */
  create(data: any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  /** Lấy chi tiết */
  getById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}`);
  }

  /** Cập nhật */
  update(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/${id}`, data);
  }

  /** Xóa (soft delete) */
  delete(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  /** Tính giá cước */
  calculateShipping(body: {
    originProvinceCode: string;
    destProvinceCode: string;
    serviceCode: 'STD' | 'EXP';
    weightKg: number;
    isLocal: boolean;
  }): Observable<any> {
    return this.http.post(`${this.apiUrl}/calculate`, body);
  }
}
