import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PricingService } from '../../../services/dashboard/pricing.service';

@Component({
  selector: 'app-list-pricing',
  templateUrl: './listPricing.html',
  standalone: true,
  imports: [CommonModule, FormsModule],
})
export class ListPricing implements OnInit {
  // ==============================
  //  DATA
  // ==============================
  prices: any[] = [];
  filteredPrices: any[] = [];

  expandedId: string | null = null;

  // ==============================
  //  FILTERS
  // ==============================
  filters = {
    isActive: '',
    minPrice: null as number | null,
    maxPrice: null as number | null,
    search: '',
  };

  // ==============================
  //  PAGINATION
  // ==============================
  currentPage = 1;
  pageSize = 10;

  constructor(private pricingService: PricingService) {}

  ngOnInit() {
    this.loadPricing();
  }

  // ==============================
  //  LOAD DATA (DÙNG SERVICE)
  // ==============================
  loadPricing() {
    this.pricingService.getAll().subscribe({
      next: (res) => {
        console.log('FULL RESPONSE:', res);

        // Lấy đúng vị trí backend trả về:
        this.prices = res?.data?.results || [];

        this.applyFilters();
      },
      error: (err) => {
        console.error('Failed to load pricing:', err);
        this.prices = [];
        this.applyFilters();
      },
    });
  }

  // ==============================
  //  FILTER FUNCTION
  // ==============================
  applyFilters() {
    let results = [...this.prices];

    // Trạng thái
    if (this.filters.isActive !== '') {
      results = results.filter((p) => p.isActive === (this.filters.isActive === 'true'));
    }

    // Giá min
    if (this.filters.minPrice != null) {
      results = results.filter((p) => p.basePrice >= this.filters.minPrice!);
    }

    // Giá max
    if (this.filters.maxPrice != null) {
      results = results.filter((p) => p.basePrice <= this.filters.maxPrice!);
    }

    // Search
    if (this.filters.search.trim() !== '') {
      const s = this.filters.search.toLowerCase();
      results = results.filter(
        (p) =>
          (p.serviceId?.name || '').toLowerCase().includes(s) ||
          (p._id || '').toLowerCase().includes(s)
      );
    }

    this.filteredPrices = results;
    this.currentPage = 1;
  }

  // ==============================
  //  PAGINATION
  // ==============================
  pagedPrices() {
    const start = (this.currentPage - 1) * this.pageSize;
    return this.filteredPrices.slice(start, start + this.pageSize);
  }

  totalPages() {
    const count = Math.ceil(this.filteredPrices.length / this.pageSize);
    return Array.from({ length: count }, (_, i) => i + 1);
  }

  changePage(p: number) {
    if (p < 1 || p > this.totalPages().length) return;
    this.currentPage = p;
  }

  // ==============================
  //  EXPAND + COLLAPSE
  // ==============================
  toggleExpand(id: string) {
    this.expandedId = this.expandedId === id ? null : id;
  }

  // ==============================
  //  EDIT / DELETE PRICING
  // ==============================
  editPricing(id: string) {
    alert('Đi tới trang sửa: ' + id);
  }

  deletePricing(id: string, event: Event) {
    event.stopPropagation();

    if (!confirm('Bạn có chắc muốn xóa bảng giá này?')) return;

    this.pricingService.delete(id).subscribe({
      next: () => {
        alert('Đã xóa thành công');
        this.loadPricing();
      },
      error: (err) => {
        console.error('Delete error:', err);
        alert('Không thể xóa.');
      },
    });
  }
}
