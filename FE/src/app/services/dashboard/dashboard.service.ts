import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly API_URL = `${env.baseUrl}/orders/statistics`;

  constructor(private http: HttpClient) {}

  getStatistics(month?: number, year?: number): Observable<any> {
    const token = localStorage.getItem('access_token');
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;

    return this.http.get(this.API_URL, { headers, params });
  }
}
