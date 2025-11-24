import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = `${env.baseUrl}/orders/statistics`;

  private readonly API_URL_ADMIN = `${env.baseUrl}/dashboard/system`

  constructor(private http: HttpClient) { }

  // dành cho nhân viên, muốn tách admin ra
  getStatistics(month?: number, year?: number): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    return this.http.get(this.API_URL, { headers, params });
  }

  getSystemStatistics(month?: number, year?: number): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    return this.http.get(this.API_URL_ADMIN, { headers, params });
  }
}
