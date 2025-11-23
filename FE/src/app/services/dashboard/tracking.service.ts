// src/app/services/tracking-public.service.ts

import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { env } from '../../environments/environment';

export interface TrackingEvent {
  _id: string;
  shipmentId: string;
  status: string;
  timestamp: string;
  location?: string;
  branchId?: {
    _id: string;
    name: string;
  };
  note?: string;
  createdBy?: {
    email: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class TrackingPublicService {
  private apiUrl = `${env.baseUrl}/tracking`;

  constructor(private http: HttpClient) {}

  getTrackingByShipmentId(shipmentId: string): Observable<TrackingEvent[]> {
    if (!shipmentId?.trim()) {
      return throwError(() => new Error('Mã vận đơn không được để trống'));
    }

    return this.http.get<TrackingEvent[]>(
      `${this.apiUrl}/shipment/${shipmentId.trim()}`
    ).pipe(
      catchError(err => {
        const message = err.error?.message || 'Không tìm thấy vận đơn hoặc lỗi hệ thống';
        return throwError(() => new Error(message));
      })
    );
  }
}