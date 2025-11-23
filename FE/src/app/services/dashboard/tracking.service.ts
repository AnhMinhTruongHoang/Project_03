// src/app/services/tracking-public.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { env } from '../../environments/environment';

export interface TrackingEvent {
  _id: string;
  orderId: string; // ← Đổi từ shipmentId → orderId
  status: string;
  timestamp: string;
  location?: string;
  branchId?: { _id: string; name: string };
  note?: string;
}
export interface TrackingResponse {
  waybill: string;
  currentStatus: string;
  updatedAt: string;
  senderName: string;
  receiverName: string;
  receiverPhone: string;
  codValue?: number;
  shippingFee?: number;
  timeline: TrackingEvent[];
}

@Injectable({
  providedIn: 'root',
})
export class TrackingPublicService {
  private apiUrl = `${env.baseUrl}/tracking`;

  constructor(private http: HttpClient) {}

  getTrackingByWaybill(waybill: string): Observable<TrackingResponse> {
    if (!waybill?.trim()) {
      return throwError(() => new Error('Vui lòng nhập mã vận đơn'));
    }

    const cleaned = waybill.trim().toUpperCase();
    return this.http.get<TrackingResponse>(`${this.apiUrl}/waybill/${cleaned}`).pipe(
      catchError((err) => {
        const msg = err.error?.message || 'Không tìm thấy vận đơn';
        return throwError(() => new Error(msg));
      })
    );
  }
}
