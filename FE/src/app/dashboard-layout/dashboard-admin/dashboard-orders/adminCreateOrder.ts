import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { OrdersService } from '../../../services/dashboard/orders.service';
import { LocationService } from '../../../services/location.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { MapPickerComponent } from '../../../shared/map-picker/map-picker';
import { GeocodingService } from '../../../services/geocoding.service';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-create-order',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, HttpClientModule, MapPickerComponent],
  templateUrl: './adminCreateOrder.html',
})
export class AdmninCreateOrder implements OnInit {
  @ViewChild('pickupMap') pickupMap!: MapPickerComponent;
  @ViewChild('deliveryMap') deliveryMap!: MapPickerComponent;

  orderForm!: FormGroup;
  loading = false;

  provinces: any[] = [];
  pickupCommunes: any[] = [];
  deliveryCommunes: any[] = [];

  shippingFee = 0;
  totalPrice = 0;

  constructor(
    private fb: FormBuilder,
    private ordersService: OrdersService,
    private locationService: LocationService,
    private router: Router,
    private geocoding: GeocodingService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadProvinces();

    // Giảm debounce xuống 800ms (nhạy hơn), chỉ search khi >=3 ký tự
    this.orderForm
      .get('pickupDetailAddress')!
      .valueChanges.pipe(debounceTime(800))
      .subscribe(() => {
        if (this.shouldSearch('pickup')) {
          console.log('🔍 Starting pickup search...'); // Debug
          this.updatePickupMap();
        }
      });

    this.orderForm
      .get('deliveryDetailAddress')!
      .valueChanges.pipe(debounceTime(800))
      .subscribe(() => {
        if (this.shouldSearch('delivery')) {
          console.log('🔍 Starting delivery search...'); // Debug
          this.updateDeliveryMap();
        }
      });

    this.orderForm.valueChanges
      .pipe(debounceTime(600), distinctUntilChanged())
      .subscribe(() => this.calculateShippingFee());
  }

  // Hàm kiểm tra đủ điều kiện để search (tránh gọi thừa)
  private shouldSearch(type: 'pickup' | 'delivery'): boolean {
    const f = this.orderForm.value;
    const detail = type === 'pickup' ? f.pickupDetailAddress : f.deliveryDetailAddress;
    const provinceId = type === 'pickup' ? f.pickupProvinceId : f.deliveryProvinceId;
    const communeId = type === 'pickup' ? f.pickupCommuneId : f.deliveryCommuneId;

    const canSearch = !!(
      detail &&
      detail.trim().length >= 3 && // Giảm từ 6 xuống 3
      provinceId &&
      communeId
    );

    if (canSearch) {
      console.log(`✅ Can search ${type}: "${detail}"`); // Debug
    }
    return canSearch;
  }

  initForm() {
    this.orderForm = this.fb.group({
      senderName: ['', Validators.required],
      receiverName: ['', Validators.required],
      receiverPhone: ['', [Validators.required, Validators.pattern('^[0-9]{9,11}$')]],
      pickupProvinceId: ['', Validators.required],
      pickupCommuneId: ['', Validators.required],
      pickupDetailAddress: ['', Validators.required],
      deliveryProvinceId: ['', Validators.required],
      deliveryCommuneId: ['', Validators.required],
      deliveryDetailAddress: ['', Validators.required],

      serviceCode: ['STD'],
      weightKg: [1, [Validators.required, Validators.min(0.01)]],
      codValue: [0, [Validators.required, Validators.min(0)]],
    });
  }

  // ... các hàm loadProvinces, onPickupProvinceChange, onDeliveryProvinceChange, submit ... giữ nguyên như cũ

  loadProvinces() {
    this.locationService.getProvinces().subscribe({
      next: (res) => (this.provinces = res.data || []),
      error: (err) => console.error('Load provinces failed', err),
    });
  }

  onPickupProvinceChange() {
    const provinceId = this.orderForm.get('pickupProvinceId')?.value;
    if (!provinceId) {
      this.pickupCommunes = [];
      return;
    }
    this.locationService.getCommunes(provinceId).subscribe({
      next: (res) => {
        this.pickupCommunes = res.data || [];
        this.orderForm.get('pickupCommuneId')?.setValue('');
      },
      error: (err) => console.error(err),
    });
  }

  onDeliveryProvinceChange() {
    const provinceId = this.orderForm.get('deliveryProvinceId')?.value;
    if (!provinceId) {
      this.deliveryCommunes = [];
      return;
    }
    this.locationService.getCommunes(provinceId).subscribe({
      next: (res) => {
        this.deliveryCommunes = res.data || [];
        this.orderForm.get('deliveryCommuneId')?.setValue('');
      },
      error: (err) => console.error(err),
    });
  }

  setPickupLocation(pos: { lat: number; lng: number }) {
    this.orderForm.patchValue({ pickupLat: pos.lat, pickupLng: pos.lng });
  }

  setDeliveryLocation(pos: { lat: number; lng: number }) {
    this.orderForm.patchValue({ deliveryLat: pos.lat, deliveryLng: pos.lng });
  }

  updatePickupMap() {
    const f = this.orderForm.value;
    if (!f.pickupDetailAddress || !f.pickupProvinceId || !f.pickupCommuneId) return;

    const fullAddress = `${this.getCommuneName(f.pickupCommuneId)}, ${this.getProvinceName(
      f.pickupProvinceId
    )}, ${f.pickupDetailAddress}`;
    console.log('📍 Pickup full address:', fullAddress); // Debug

    this.geocoding.search(fullAddress).subscribe((res) => {
      console.log('📍 Pickup result:', res); // Debug
      if (!res || res.length === 0) {
        console.warn('⚠️ No pickup location found');
        return;
      }

      const lat = parseFloat(res[0].lat);
      const lng = parseFloat(res[0].lon);
      console.log(`✅ Setting pickup marker at ${lat}, ${lng}`);

      this.orderForm.patchValue({ pickupLat: lat, pickupLng: lng });
      if (this.pickupMap) {
        this.pickupMap.setMarker(lat, lng);
      }
    });
  }

  updateDeliveryMap() {
    const f = this.orderForm.value;
    if (!f.deliveryDetailAddress || !f.deliveryProvinceId || !f.deliveryCommuneId) return;

    const fullAddress = `${this.getCommuneName(f.deliveryCommuneId)}, ${this.getProvinceName(
      f.deliveryProvinceId
    )}, ${f.deliveryDetailAddress}`;
    console.log('📍 Delivery full address:', fullAddress); // Debug

    this.geocoding.search(fullAddress).subscribe((res) => {
      console.log('📍 Delivery result:', res); // Debug
      if (!res || res.length === 0) {
        console.warn('⚠️ No delivery location found');
        return;
      }

      const lat = parseFloat(res[0].lat);
      const lng = parseFloat(res[0].lon);
      console.log(`✅ Setting delivery marker at ${lat}, ${lng}`);

      this.orderForm.patchValue({ deliveryLat: lat, deliveryLng: lng });
      if (this.deliveryMap) {
        this.deliveryMap.setMarker(lat, lng);
      }
    });
  }

  getProvinceName(id: string) {
    return this.provinces.find((p) => p._id === id)?.name || '';
  }

  getCommuneName(id: string) {
    return (
      this.pickupCommunes.find((c) => c._id === id)?.name ||
      this.deliveryCommunes.find((c) => c._id === id)?.name ||
      ''
    );
  }

  async calculateShippingFee() {
    // ... giữ nguyên như cũ
    const f = this.orderForm.value;
    if (!f.pickupProvinceId || !f.deliveryProvinceId || !f.weightKg) {
      this.shippingFee = 0;
      this.totalPrice = Number(f.codValue || 0);
      return;
    }

    const originProv = this.provinces.find((p) => p._id === f.pickupProvinceId);
    const destProv = this.provinces.find((p) => p._id === f.deliveryProvinceId);

    if (!originProv?.code || !destProv?.code) {
      this.shippingFee = 0;
      this.totalPrice = Number(f.codValue || 0);
      return;
    }

    try {
      const isSameProvince = f.pickupProvinceId === f.deliveryProvinceId;
      const res: any = await firstValueFrom(
        this.ordersService.calculateShippingFee({
          originProvinceCode: originProv.code,
          destProvinceCode: destProv.code,
          serviceCode: f.serviceCode,
          weightKg: Number(f.weightKg),
          isLocal: isSameProvince,
        })
      );
      this.shippingFee = res.data?.totalPrice ?? 0;
      this.totalPrice = this.shippingFee + Number(f.codValue || 0);
    } catch (err) {
      console.warn('Lỗi tính phí:', err);
      this.shippingFee = 0;
      this.totalPrice = Number(f.codValue || 0);
    }
  }

  // submit() giữ nguyên như cũ của bạn
  submit() {
    if (this.orderForm.invalid) {
      this.orderForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    const f = this.orderForm.value;

    const pickupAddress = {
      provinceId: f.pickupProvinceId,
      communeId: f.pickupCommuneId,
      address: f.pickupDetailAddress,
      lat: f.pickupLat,
      lng: f.pickupLng,
    };

    const deliveryAddress = {
      provinceId: f.deliveryProvinceId,
      communeId: f.deliveryCommuneId,
      address: f.deliveryDetailAddress,
      lat: f.deliveryLat,
      lng: f.deliveryLng,
    };

    const data = {
      senderName: f.senderName,
      receiverName: f.receiverName,
      receiverPhone: f.receiverPhone,
      pickupAddress,
      deliveryAddress,
      codValue: Number(f.codValue) || 0,
      weightKg: Number(f.weightKg) || 1,
      serviceCode: f.serviceCode || 'STD',
    };

    this.ordersService.createOrder(data).subscribe({
      next: () => {
        this.loading = false;
        Swal.fire({
          icon: 'success',
          title: 'Tạo đơn hàng thành công!',
          timer: 1500,
          showConfirmButton: false,
        });
        this.router.navigate(['/admin/orders/list']);
      },
      error: (err) => {
        this.loading = false;
        Swal.fire({
          icon: 'error',
          title: 'Tạo đơn hàng thất bại!',
          text: err.error?.message || 'Vui lòng thử lại.',
        });
      },
    });
  }
}
