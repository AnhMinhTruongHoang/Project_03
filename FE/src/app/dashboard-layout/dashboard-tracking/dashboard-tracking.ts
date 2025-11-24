import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrackingEvent, TrackingPublicService } from '../../services/dashboard/tracking.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-tracking-public',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard-tracking.html',
  styleUrls: ['./dashboard-tracking.scss'],
})
export class TrackingComponent {
  waybill = ''; // ĐỔI TÊN CHO RÕ NGHĨA
  trackingData: any = null; // Đổi sang object thay vì array
  trackingEvents: TrackingEvent[] = [];
  loading = false;
  error = '';

  private statusOrder = [
    'PENDING',
    'CONFIRMED',
    'SHIPPING',
    'COMPLETED',
    'CANCELED',
  ] as const;

  private statusLabels: Record<string, string> = {
    PENDING: 'Chờ xử lý',
    CONFIRMED: 'Đã xác nhận',
    SHIPPING: 'Đang giao hàng',
    COMPLETED: 'Giao thành công',
    CANCELED: 'Đã hủy',
  };

  private statusColors: Record<string, string> = {
    PENDING: 'text-secondary',
    CONFIRMED: 'text-info',
    SHIPPING: 'text-warning',
    COMPLETED: 'text-success',
    CANCELED: 'text-danger',
  };

  private statusIcons: Record<string, string> = {
    PENDING: 'bi bi-hourglass-split',
    CONFIRMED: 'bi bi-check2-circle',
    SHIPPING: 'bi bi-truck',
    COMPLETED: 'bi bi-check-circle-fill',
    CANCELED: 'bi bi-slash-circle',
  };

  constructor(private trackingService: TrackingPublicService) { }

  search() {
    if (!this.waybill.trim()) {
      this.error = 'Vui lòng nhập mã vận đơn';
      return;
    }

    this.loading = true;
    this.error = '';
    this.trackingData = null;
    this.trackingEvents = [];

    // ← ĐÚNG METHOD MỚI
    this.trackingService.getTrackingByWaybill(this.waybill).subscribe({
      next: (res: any) => {
        console.log('Data từ API:', res);
        this.trackingData = res.data || null;
        this.trackingEvents = res.data?.timeline || [];
        this.loading = false;
      },
      error: (err) => {
        this.error = err.message;
        this.trackingEvents = [];
        this.trackingData = null;
        this.loading = false;
      },
    });
  }

  // Các getter giữ nguyên như cũ
  get currentStepIndex() {
    if (this.trackingEvents.length === 0) return -1;
    const latestStatus = this.trackingEvents[this.trackingEvents.length - 1].status;
    return this.statusOrder.indexOf(latestStatus as any);
  }

  get latestUpdate() {
    return this.trackingData?.updatedAt || null;
  }

  getCurrentStatusLabel() {
    return this.trackingData ? this.statusLabels[this.trackingData.currentStatus] : '';
  }

  getCurrentStatusColor() {
    return this.trackingData
      ? this.statusColors[this.trackingData.currentStatus] || 'text-muted'
      : 'text-muted';
  }

  getStatusLabel(status: string) {
    return this.statusLabels[status] || status;
  }

  getStatusTextClass(status: string) {
    return this.statusColors[status] || 'text-muted';
  }

  getStatusIcon(status: string) {
    return this.statusIcons[status] || 'bi bi-circle';
  }
}
