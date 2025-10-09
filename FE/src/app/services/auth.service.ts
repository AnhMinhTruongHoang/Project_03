import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { env } from '../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${env.baseUrl}/auth/login`;
  private registerUrl = `${env.baseUrl}/auth/register`;
  private isBrowser: boolean;
  private verifyCode = `${env.baseUrl}/auth/check-code`;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) platformId: Object) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl, { username: email, password });
  }

  register(userData: {
    name: string;
    age: number;
    gender: string;
    address: string;
    phone: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(this.registerUrl, userData);
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('access_token');
    }
  }

  isLoggedIn(): boolean {
    return this.isBrowser && !!localStorage.getItem('access_token');
  }
  // verify(data: any) {
  //   return this.http.post(this.verifyCode, data);
  // }
  verify(data: { _id: string; code: string }): Observable<any> {
    return this.http.post(this.verifyCode, data);
  }

  retry(email: string) {
    return this.http.post(`${this.apiUrl}/auth/retry-active`, { email });
  }
}
