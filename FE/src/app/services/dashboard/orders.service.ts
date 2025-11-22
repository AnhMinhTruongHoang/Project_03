// orders.service.ts (nâng cấp)
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class OrdersService {
  private readonly API_URL = `${env.baseUrl}/orders`;
  private readonly PRICING_URL = `${env.baseUrl}/pricing/calculate`;

  constructor(private http: HttpClient) {}

  private getHeaders() {
    const token = localStorage.getItem('access_token') || '';
    return { Authorization: `Bearer ${token}` };
  }

  /**
   * Tạo order mới
   */
  createOrder(data: any): Observable<any> {
    return this.http.post(`${this.API_URL}`, data, { headers: this.getHeaders() });
  }

  /**
   * Lấy danh sách order với filter/search/pagination
   */
  getOrders(filters: any = {}): Observable<any> {
    let params = new HttpParams().set('pageSize', '999').set('current', '1');

    // Convert object filters sang query params
    for (const key in filters) {
      if (filters[key] !== '' && filters[key] !== null && filters[key] !== undefined) {
        // Nếu là mảng (multi-status), join thành string
        const value = Array.isArray(filters[key]) ? filters[key].join(',') : filters[key];
        params = params.set(key, value);
      }
    }

    return this.http.get<any>(`${this.API_URL}`, { headers: this.getHeaders(), params });
  }

  /**
   * Lấy chi tiết order theo ID
   */
  getOrderById(id: string): Observable<any> {
    return this.http.get(`${this.API_URL}/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Cập nhật order
   */
  updateOrder(id: string, data: any): Observable<any> {
    return this.http.patch(`${this.API_URL}/${id}`, data, { headers: this.getHeaders() });
  }

  /**
   * Xóa soft delete order
   */
  deleteOrder(id: string): Observable<any> {
    return this.http.delete(`${this.API_URL}/${id}`, { headers: this.getHeaders() });
  }

  /**
   * Cập nhật trạng thái order
   */
  updateStatus(id: string, status: string): Observable<any> {
    return this.http.patch(
      `${this.API_URL}/${id}/status/${status}`,
      {},
      { headers: this.getHeaders() }
    );
  }

  calculateShippingFee(payload: {
    originProvinceCode: string;
    destProvinceCode: string;
    serviceCode: 'STD' | 'EXP';
    weightKg: number;
    isLocal: boolean;
  }): Observable<any> {
    return this.http.post(this.PRICING_URL, payload, { headers: this.getHeaders() });
  }
}
