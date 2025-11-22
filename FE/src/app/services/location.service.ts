// import { HttpClient, HttpParams } from '@angular/common/http';
// import { Injectable } from '@angular/core';
// import { lastValueFrom } from 'rxjs';
// import { env } from '../environments/environment'; // chỉnh path nếu cần

// @Injectable({
//   providedIn: 'root',
// })
// export class LocationService {
//   constructor(private httpClient: HttpClient) {}

//   // GET /locations/provinces
//   getProvinces() {
//     return lastValueFrom(this.httpClient.get(env.baseUrl + '/locations/provinces'));
//   }

//   // GET /locations/Communes?provinceId=xxx
//   getCommunes(provinceId: string) {
//     const params = new HttpParams().set('provinceId', provinceId);

//     return lastValueFrom(this.httpClient.get(env.baseUrl + '/locations/Communes', { params }));
//   }

//   // GET /locations/addresses
//   listAddresses(current = 1, pageSize = 10, q?: string) {
//     let params = new HttpParams().set('current', current).set('pageSize', pageSize);

//     if (q) params = params.set('q', q);

//     return lastValueFrom(this.httpClient.get(env.baseUrl + '/locations/addresses', { params }));
//   }

//   // POST /locations/addresses
//   createAddress(body: any) {
//     return lastValueFrom(this.httpClient.post(env.baseUrl + '/locations/addresses', body));
//   }

//   // PATCH /locations/addresses/:id
//   updateAddress(id: string, body: any) {
//     return lastValueFrom(this.httpClient.patch(env.baseUrl + '/locations/addresses/' + id, body));
//   }

//   // GET /locations/addresses/:id
//   getAddressById(id: string) {
//     return lastValueFrom(this.httpClient.get(env.baseUrl + '/locations/addresses/' + id));
//   }
// }

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../environments/environment';

@Injectable({ providedIn: 'root' })
export class LocationService {
  private readonly API_URL = `${env.baseUrl}/locations`;

  constructor(private http: HttpClient) {}

  private getAuthHeaders() {
    const token = localStorage.getItem('access_token') || '';
    return new HttpHeaders({ Authorization: `Bearer ${token}` });
  }

  getProvinces(): Observable<any> {
    return this.http.get(`${this.API_URL}/provinces`, { headers: this.getAuthHeaders() });
  }

  getCommunes(provinceId: string): Observable<any> {
    return this.http.get(`${this.API_URL}/communes`, {
      headers: this.getAuthHeaders(),
      params: { provinceId },
    });
  }
}