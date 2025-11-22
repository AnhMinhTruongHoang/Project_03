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
  orders: any[] = []; // mảng gốc
  filteredOrders: any[] = []; // mảng đã lọc
  expandedOrderId: string | null = null;
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

  /** Load orders từ API */
  loadOrders() {
    const query: any = { ...this.filters };

    // Chỉ gửi status nếu có ít nhất 1 giá trị
    if (Array.isArray(query.status) && query.status.length > 0) {
      query.status = query.status.join(',');
    } else {
      delete query.status;
    }

    this.ordersService.getOrders(query).subscribe((res: any) => {
      this.orders = res.data?.results || [];
      this.applyFilters();
    });
  }

  /** Lọc đơn hàng realtime */
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
        ? order._id.toLowerCase().includes(this.filters.search.toLowerCase())
        : true;
      const receiverNameMatch = this.filters.receiverName
        ? order.receiverName.toLowerCase().includes(this.filters.receiverName.toLowerCase())
        : true;
      const receiverPhoneMatch = this.filters.receiverPhone
        ? order.receiverPhone.includes(this.filters.receiverPhone)
        : true;

      return (
        statusMatch &&
        fromDateMatch &&
        toDateMatch &&
        minPriceMatch &&
        maxPriceMatch &&
        searchMatch &&
        receiverNameMatch &&
        receiverPhoneMatch
      );
    });
  }

  /** Toggle expand chi tiết */
  toggleExpand(id: string) {
    this.expandedOrderId = this.expandedOrderId === id ? null : id;
  }

  /** Trả về text hiển thị trạng thái */
  statusText(status: string) {
    const map: Record<string, string> = {
      PENDING: 'Chờ xác nhận',
      CONFIRMED: 'Đã xác nhận',
      SHIPPING: 'Đang giao',
      COMPLETED: 'Hoàn tất',
      CANCELED: 'Đã hủy',
    };
    return map[status] || status;
  }

  /** Class màu trạng thái */
  statusClass(status: string) {
    return {
      'text-info': status === 'PENDING',
      'text-light-emphasis': status === 'CONFIRMED',
      'text-warning': status === 'SHIPPING',
      'text-success': status === 'COMPLETED',
      'text-danger': status === 'CANCELED',
    };
  }

  /** Kiểm tra có thể sửa */
  canEdit(order: any) {
    return true;
  }

  /** Kiểm tra có thể xóa */
  canDelete(order: any) {
    return ['PENDING', 'CANCELED'].includes(order.status);
  }

  /** Soft delete */
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

  /** Phân trang */
  pagedOrders() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredOrders.slice(start, start + this.pageSize);
  }

  totalPages() {
    const pages = [];
    const total = Math.ceil(this.filteredOrders.length / this.pageSize);
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }

  changePage(page: number) {
    if (page < 1 || page > Math.ceil(this.filteredOrders.length / this.pageSize)) return;
    this.currentPage = page;
  }

  /** Toggle trạng thái dạng pill */
  toggleStatusFilter(value: string) {
    const index = this.filters.status.indexOf(value);
    if (index > -1) {
      this.filters.status.splice(index, 1);
    } else {
      this.filters.status.push(value);
    }
    this.applyFilters();
  }
}
