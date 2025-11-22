// src/app/services/geocoding.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, catchError, of } from 'rxjs';  // Thêm catchError, of

@Injectable({ providedIn: 'root' })
export class GeocodingService {
  private cache = new Map<string, any[]>();

  constructor(private http: HttpClient) {}

  search(address: string): any {
    const cacheKey = address.toLowerCase().trim();
    
    // Cache hit
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey)!);
    }

    // BƯỚC 1: Thử Photon trước (nhanh, không CORS)
    return this.http.get<any>('https://photon.komoot.io/api/', {
      params: {
        q: encodeURIComponent(address),  // Encode UTF-8 đúng, không thêm ', Việt Nam' vì gây conflict
        limit: '1',
        // Bỏ lang=vi (không support), thêm countrycode=vn
        countrycode: 'vn'
      }
    }).pipe(
      map((response: any) => {
        const features = response.features || [];
        let result = [];
        
        if (features.length > 0) {
          // Success! Format giống Nominatim
          result = [{
            lat: features[0].geometry.coordinates[1].toString(),
            lon: features[0].geometry.coordinates[0].toString(),
            display_name: features[0].properties.name || address
          }];
          console.log('✅ Photon success:', result);  // Debug
        } else {
          console.warn('⚠️ Photon empty, fallback Nominatim');
          return null;  // Trigger fallback
        }

        // Cache chỉ khi success
        this.cache.set(cacheKey, result);
        setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);
        return result;
      }),
      catchError((err) => {
        console.warn('❌ Photon error:', err.message, '→ Fallback Nominatim');
        return this.fallbackNominatim(address, cacheKey);  // Fallback
      })
    );
  }

  // Fallback Nominatim (giống code cũ của bạn)
  private fallbackNominatim(address: string, cacheKey: string) {
    return this.http.get<any[]>(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=vn&limit=1`,
      {
        headers: {
          'User-Agent': 'MyDeliveryApp/1.0 (your_email@example.com)',
        },
      }
    ).pipe(
      map((res) => {
        if (res && res.length > 0) {
          // Cache success
          this.cache.set(cacheKey, res);
          setTimeout(() => this.cache.delete(cacheKey), 10 * 60 * 1000);
          console.log('✅ Nominatim fallback success:', res[0]);
        } else {
          console.warn('❌ Nominatim also empty');
        }
        return res || [];
      }),
      catchError((err) => {
        console.error('❌ Fallback failed:', err);
        return of([]);  // Trả empty nếu cả hai fail
      })
    );
  }
}