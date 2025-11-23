import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TrackingEvent, TrackingPublicService } from '../../services/dashboard/tracking.service';

@Component({
  selector: 'app-tracking-public',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-tracking.html',
  styleUrls: ['./dashboard-tracking.scss']
})
export class TrackingComponent {
  shipmentId = '';
  trackingEvents: TrackingEvent[] = [];
  loading = false;
  error = '';

  private statusOrder = [
    'CREATED', 'ACCEPTED', 'IN_TRANSIT',
    'OUT_FOR_DELIVERY', 'DELIVERED',
    'FAILED', 'RETURNED', 'CANCELED'
  ] as const;

  private statusLabels: Record<string, string> = {
    CREATED: 'Đã tạo đơn hàng',
    ACCEPTED: 'Đã tiếp nhận',
    IN_TRANSIT: 'Đang vận chuyển',
    OUT_FOR_DELIVERY: 'Đang giao hàng',
    DELIVERED: 'Giao thành công',
    FAILED: 'Giao thất bại',
    RETURNED: 'Đã hoàn hàng',
    CANCELED: 'Đã hủy'
  };

  private statusColors: Record<string, string> = {
    CREATED: 'text-secondary',
    ACCEPTED: 'text-info',
    IN_TRANSIT: 'text-warning',
    OUT_FOR_DELIVERY: 'text-orange',
    DELIVERED: 'text-success',
    FAILED: 'text-danger',
    RETURNED: 'text-purple',
    CANCELED: 'text-danger'
  };

  private statusIcons: Record<string, string> = {
    CREATED: 'bi bi-plus-circle',
    ACCEPTED: 'bi bi-check2-circle',
    IN_TRANSIT: 'bi bi-truck',
    OUT_FOR_DELIVERY: 'bi bi-box-seam',
    DELIVERED: 'bi bi-check-circle-fill',
    FAILED: 'bi bi-x-circle-fill',
    RETURNED: 'bi bi-arrow-return-left',
    CANCELED: 'bi bi-slash-circle'
  };

  constructor(private trackingService: TrackingPublicService) {}

  search() {
    if (!this.shipmentId.trim()) {
      this.error = 'Vui lòng nhập mã vận đơn';
      return;
    }

    this.loading = true;
    this.error = '';
    this.trackingEvents = [];

    this.trackingService.getTrackingByShipmentId(this.shipmentId).subscribe({
      next: (events) => {
        this.trackingEvents = events;
        this.loading = false;

        if (events.length === 0) {
          this.error = 'Vận đơn này chưa có hành trình hoặc không tồn tại.';
        }
      },
      error: (err) => {
        this.error = err.message || 'Đã có lỗi xảy ra';
        this.trackingEvents = [];
        this.loading = false;
      }
    });
  }

  // Các getter giữ nguyên như cũ
  get currentStepIndex() {
    if (this.trackingEvents.length === 0) return -1;
    const latestStatus = this.trackingEvents[this.trackingEvents.length - 1].status;
    return this.statusOrder.indexOf(latestStatus as any);
  }

  get latestUpdate() {
    return this.trackingEvents.length > 0
      ? this.trackingEvents[this.trackingEvents.length - 1].timestamp
      : null;
  }

  getCurrentStatusLabel() {
    const latest = this.trackingEvents[this.trackingEvents.length - 1];
    return latest ? this.statusLabels[latest.status] : '';
  }

  getCurrentStatusColor() {
    const latest = this.trackingEvents[this.trackingEvents.length - 1];
    return latest ? this.statusColors[latest.status] || 'text-muted' : 'text-muted';
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