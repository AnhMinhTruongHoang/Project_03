import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { OrdersService } from '../../../services/dashboard/orders.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-list-order',
  templateUrl: './adminlistOrder.html',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
})
export class AdminListOrder implements OnInit {
  orders: any[] = [];
  filteredOrders: any[] = [];
  expandedOrderId: string | null = null;
  copiedWaybill: string | null = null; // cho hiệu ứng copy
  pageSize = 10;
  currentPage = 1;

  filters: any = {
    status: [],
    fromDate: '',
    toDate: '',
    minPrice: '',
    maxPrice: '',
    search: '',
    receiverName: '',
    receiverPhone: '',
  };

  statusOptions = [
    { value: 'PENDING', label: 'Chờ xác nhận' },
    { value: 'CONFIRMED', label: 'Đã xác nhận' },
    { value: 'SHIPPING', label: 'Đang giao' },
    { value: 'COMPLETED', label: 'Hoàn tất' },
    { value: 'CANCELED', label: 'Đã hủy' },
  ];

  constructor(private ordersService: OrdersService) { }

  ngOnInit() {
    this.loadOrders();
  }

  loadOrders() {
    const query = { ...this.filters };
    if (query.status?.length) query.status = query.status.join(',');
    this.ordersService.getOrders(query).subscribe((res: any) => {
      this.orders = res.data?.results || [];
      this.applyFilters();
    });
  }

  applyFilters() {
    this.currentPage = 1;
    this.filteredOrders = this.orders.filter((order) => {
      const statusMatch = this.filters.status.length
        ? this.filters.status.includes(order.status)
        : true;
      const fromDateMatch = this.filters.fromDate
        ? new Date(order.createdAt) >= new Date(this.filters.fromDate)
        : true;
      const toDateMatch = this.filters.toDate
        ? new Date(order.createdAt) <= new Date(this.filters.toDate)
        : true;
      const minPriceMatch = this.filters.minPrice
        ? order.totalPrice >= +this.filters.minPrice
        : true;
      const maxPriceMatch = this.filters.maxPrice
        ? order.totalPrice <= +this.filters.maxPrice
        : true;
      const searchMatch = this.filters.search
        ? (order.waybill || '').toLowerCase().includes(this.filters.search.toLowerCase()) ||
        order._id.toLowerCase().includes(this.filters.search.toLowerCase())
        : true;
      const nameMatch = this.filters.receiverName
        ? order.receiverName.toLowerCase().includes(this.filters.receiverName.toLowerCase())
        : true;
      const phoneMatch = this.filters.receiverPhone
        ? order.receiverPhone.includes(this.filters.receiverPhone)
        : true;

      return (
        statusMatch &&
        fromDateMatch &&
        toDateMatch &&
        minPriceMatch &&
        maxPriceMatch &&
        searchMatch &&
        nameMatch &&
        phoneMatch
      );
    });
  }

  toggleExpand(id: string) {
    this.expandedOrderId = this.expandedOrderId === id ? null : id;
  }

  statusText(status: string): string {
    const map: any = {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      SHIPPING: 'Đang giao',
      COMPLETED: 'Hoàn tất',
      CANCELED: 'Đã hủy',
    };
    return map[status] || status;
  }

  statusClass(status: string): any {
    return {
      'text-info': status === 'PENDING',
      'text-primary': status === 'CONFIRMED',
      'text-warning': status === 'SHIPPING',
      'text-success': status === 'COMPLETED',
      'text-danger': status === 'CANCELED',
    };
  }

  canEdit(order: any) {
    return true;
  }
  canDelete(order: any) {
    return ['PENDING', 'CANCELED'].includes(order.status);
  }

  deleteOrder(id: string, event: Event) {
    event.stopPropagation();
    if (confirm('Bạn có chắc muốn xóa đơn hàng này? (Soft delete)')) {
      this.ordersService.deleteOrder(id).subscribe({
        next: () => {
          alert('Đơn hàng đã bị xóa tạm thời.');
          this.loadOrders();
        },
        error: (err) => alert(err.error?.message || 'Xóa thất bại'),
      });
    }
  }

  // COPY MÃ VẬN ĐƠN
  copyWaybill(waybill: string, event: Event) {
    event.stopPropagation();
    navigator.clipboard
      .writeText(waybill)
      .then(() => {
        this.copiedWaybill = waybill;
        setTimeout(() => (this.copiedWaybill = null), 2000);
      })
      .catch(() => alert('Copy thất bại!'));
  }

  // IN VẬN ĐƠN - ĐẸP CHUẨN A5
  printOrder(order: any) {
    const printWin = window.open('', '_blank');
    if (!printWin) {
      alert('Vui lòng cho phép popup để in đơn hàng!');
      return;
    }

    const printHTML = `
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Vận đơn ${order.waybill || order._id}</title>
<style>
  body { font-family: Arial, sans-serif; margin: 0; padding: 15px; width: 148mm; min-height: 210mm; background: white; }
  .container { border: 2px solid #000; padding: 20px; border-radius: 10px; }
  .header img { height: 60px; display: block; margin: 0 auto 10px; }
  .header h1 { text-align: center; margin: 10px 0; color: #1976d2; font-size: 24px; }
  .barcode { text-align: center; margin: 15px 0; }
  .barcode img { height: 70px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; }
  th, td { border: 1px solid #333; padding: 10px; text-align: left; font-size: 14px; }
  th { background: #f0f0f0; width: 35%; }
  .text-right { text-align: right; }
  .status { padding: 6px 12px; border-radius: 6px; color: white; font-weight: bold; }
  .status-PENDING { background: #ffc107; color: black; }
  .status-CONFIRMED { background: #17a2b8; }
  .status-SHIPPING { background: #fd7e14; }
  .status-COMPLETED { background: #28a745; }
  .status-CANCELED { background: #dc3545; }
  .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #555; }
  @media print { body { padding: 5mm; } }
</style>
</head>
<body onload="window.print(); setTimeout(() => window.close(), 500);">
<div class="container">
  <div class="header">
    <h1>PHIẾU GỬI HÀNG</h1>
    <h2>Mã vận đơn: <strong>${order.waybill || 'Chưa có'}</strong></h2>
  </div>
  <div class="barcode">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${order.waybill || order._id
      }" alt="QR Code">
  </div>
  <table>
    <tr><th>Người gửi</th><td>${order.senderName || '—'}</td></tr>
    <tr><th>Lấy hàng</th><td>${this.formatAddress(order.pickupAddressId)}</td></tr>
    <tr><th>Người nhận</th><td>${order.receiverName}</td></tr>
    <tr><th>SĐT nhận</th><td>${order.receiverPhone}</td></tr>
    <tr><th>Giao hàng</th><td>${this.formatAddress(order.deliveryAddressId)}</td></tr>
    <tr><th>Dịch vụ</th><td>${order.serviceCode || '—'}</td></tr>
    <tr><th>COD</th><td class="text-right">${(order.codValue || 0).toLocaleString()} đ</td></tr>
    <tr><th>Phí ship</th><td class="text-right">${(
        order.shippingFee || 0
      ).toLocaleString()} đ</td></tr>
    <tr><th>Tổng tiền</th><td class="text-right"><strong>${order.totalPrice.toLocaleString()} đ</strong></td></tr>
    <tr><th>Trạng thái</th><td><span class="status status-${order.status}">${this.statusText(
        order.status
      )}</span></td></tr>
  </table>
  ${order.items?.length
        ? `
  <h3 style="margin: 20px 0 10px;">Sản phẩm</h3>
  <table>
    <thead style="background:#e9ecef;"><tr><th>Sản phẩm</th><th class="text-right">SL</th><th class="text-right">Giá</th><th class="text-right">T.Tiền</th></tr></thead>
    <tbody>${order.items
          .map(
            (it: any) => `
      <tr><td>${it.productName}</td><td class="text-right">${it.quantity
              }</td><td class="text-right">${it.price.toLocaleString()} đ</td>
      <td class="text-right">${(it.quantity * it.price).toLocaleString()} đ</td></tr>`
          )
          .join('')}
    </tbody>
  </table>`
        : ''
      }
  <div class="footer">
    <p>Ngày in: ${new Date().toLocaleString('vi-VN')}</p>
    <p>Cảm ơn Quý khách đã sử dụng dịch vụ!</p>
  </div>
</div>
</body></html>`;

    printWin.document.write(printHTML);
    printWin.document.close();
  }

  formatAddress(addr: any): string {
    if (!addr) return '—';
    const parts = [
      addr.address,
      addr.communeId?.name,
      addr.districtId?.name || addr.provinceId?.name,
    ].filter(Boolean);
    return parts.join(', ') || '—';
  }

  pagedOrders() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  totalPages(): number[] {
    const total = Math.ceil(this.filteredOrders.length / this.pageSize);
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages().length) this.currentPage = page;
  }

  toggleStatusFilter(value: string) {
    const i = this.filters.status.indexOf(value);
    if (i > -1) this.filters.status.splice(i, 1);
    else this.filters.status.push(value);
    this.applyFilters();
  }
}
