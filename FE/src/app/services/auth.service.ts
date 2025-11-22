import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { env } from '../environments/environment';
import { isPlatformBrowser } from '@angular/common';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private apiUrl = `${env.baseUrl}/auth/login`;
  private registerUrl = `${env.baseUrl}/auth/register`;
  private verifyCode = `${env.baseUrl}/auth/check-code`;
  private apiAccount = `${env.baseUrl}/auth`;
  private apiUser = `${env.baseUrl}/users`;

  private userSubject: BehaviorSubject<any>;
  public currentUser$: Observable<any>;
  private isBrowser: boolean;

  constructor(private http: HttpClient, @Inject(PLATFORM_ID) private platformId: Object) {
    this.isBrowser = isPlatformBrowser(this.platformId);
    let initialUser = null;

    if (this.isBrowser) {
      const userData = localStorage.getItem('user');
      if (userData) {
        initialUser = JSON.parse(userData);
      }
    }

    this.userSubject = new BehaviorSubject<any>(initialUser);
    this.currentUser$ = this.userSubject.asObservable();
  }

  setUser(user: any) {
    if (this.isBrowser) {
      localStorage.setItem('user', JSON.stringify(user));
      this.userSubject.next(user);
    }
  }

  login(email: string, password: string): Observable<any> {
    return this.http.post(this.apiUrl, { username: email, password });
  }

  register(userData: {
    name: string;
    phone: string;
    email: string;
    password: string;
  }): Observable<any> {
    return this.http.post(this.registerUrl, userData);
  }

  logout() {
    if (this.isBrowser) {
      localStorage.removeItem('user');
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('userId');

      this.userSubject.next(null);
    }
  }

  isLoggedIn(): boolean {
    if (this.isBrowser) {
      return !!localStorage.getItem('access_token');
    }
    return false;
  }

  verify(data: { _id: string; code: string }): Observable<any> {
    return this.http.post(this.verifyCode, data);
  }

  requestPasswordReset(email: string) {
    return this.http.post(`${this.apiAccount}/retry-password`, { email });
  }

  verifyReset(data: { _id: string; code: string }) {
    return this.http.post(`${this.apiAccount}/verify-reset`, data);
  }

  resetPassword(data: { _id: string; newPassword: string }) {
    return this.http.post(`${this.apiAccount}/reset-password`, data);
  }

  updateAccount(id: string, data: any) {
    const token = localStorage.getItem('access_token');
    return this.http.patch<any>(`${this.apiUser}/${id}`, data, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  getUser() {
    return JSON.parse(localStorage.getItem('user') || '{}');
  }

  // --- Chuẩn hoá vai trò về dạng lowercase, bỏ ký tự thừa ---
  private normalizeRoles(user: any): string[] {
    if (!user) return [];
    const raw: string[] = [
      ...(Array.isArray(user.roles) ? user.roles : []),
      ...(user.role ? [user.role] : []),
    ];
    return raw.filter(Boolean).map((r) =>
      String(r)
        .trim()
        .replace(/[,\s;]+/g, '') // ✅ chỉ 1 dấu \ trong \s, gộp , ; và khoảng trắng
        .toLowerCase()
    );
  }

  hasRole(role: string, user?: any): boolean {
    const list = this.normalizeRoles(user ?? this.getUser());
    return list.includes(String(role).toLowerCase());
  }

  isAdmin(user?: any): boolean {
    return this.hasRole('admin', user);
  }

  isEmployee(user?: any): boolean {
    return this.hasRole('staff', user);
  }

  isCustomer(user?: any): boolean {
    return this.hasRole('customer', user);
  }
}
