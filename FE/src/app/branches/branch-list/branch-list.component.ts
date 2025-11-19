import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchService } from '../../services/branch.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branch-list',
  standalone: true,
  templateUrl: './branch-list.component.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class BranchListComponent implements OnInit {
  branches: any[] = [];
  filteredBranches: any[] = [];
  originalBranches: any[] = []; // dùng để reset về trạng thái không sort
  keyword: string = '';
  msg: string = '';
  isLoading = false;

  // --- Phân trang ---
  page = 1;
  limit = 10;
  totalPages = 1;

  // Sort 3 trạng thái
  sortField: string = '';
  sortDirection: 'asc' | 'desc' | '' = ''; // '' = không sort

  constructor(private branchService: BranchService) {}

  ngOnInit() {
    this.keyword = '';
    this.loadData();
  }

  // LOAD DATA
  loadData() {
    this.isLoading = true;
    this.branchService.findAll().then(
      (res: any) => {
        const data = res?.data ?? res;

        if (Array.isArray(data?.results)) {
          this.branches = data.results;
        } else {
          this.branches = [];
        }

        this.filteredBranches = [...this.branches];
        this.originalBranches = [...this.branches];

        this.updateTotalPages();
        this.page = 1;
        this.isLoading = false;
      },
      (err) => {
        console.log('Lỗi khi gọi API:', err);
        this.msg = 'Không tải được danh sách chi nhánh';
        this.isLoading = false;
      }
    );
  }

  // SEARCH
  search() {
    const term = this.keyword.trim().toLowerCase();

    if (term === '') {
      this.filteredBranches = [...this.originalBranches];
    } else {
      this.filteredBranches = this.originalBranches.filter((b) => {
        return (
          b.code?.toLowerCase().includes(term) ||
          b.name?.toLowerCase().includes(term) ||
          b.city?.toLowerCase().includes(term) ||
          b.province?.toLowerCase().includes(term) ||
          b.address?.toLowerCase().includes(term)
        );
      });
    }

    this.page = 1;
    this.updateTotalPages();
  }

  // DELETE
  delete(id: string) {
    if (window.confirm('Bạn có chắc chắn muốn xoá chi nhánh này?')) {
      this.branchService.delete(id).then(
        () => {
          this.msg = 'Xoá thành công';
          this.loadData();
        },
        (err) => {
          console.log(err);
          this.msg = 'Xoá thất bại';
        }
      );
    }
  }

  // PHÂN TRANG
  get pagedBranches() {
    const start = (this.page - 1) * this.limit;
    const end = start + this.limit;
    return this.filteredBranches.slice(start, end);
  }

  updateTotalPages() {
    this.totalPages = Math.ceil(this.filteredBranches.length / this.limit) || 1;
  }

  prevPage() {
    if (this.page > 1) this.page--;
  }

  nextPage() {
    if (this.page < this.totalPages) this.page++;
  }

  // SORT 3 LẦN
  sortData(field: string) {
    if (this.sortField === field) {
      // Chuyển trạng thái sort
      if (this.sortDirection === 'asc') this.sortDirection = 'desc';
      else if (this.sortDirection === 'desc') this.sortDirection = '';
      else this.sortDirection = 'asc';
    } else {
      // Click sang cột mới => reset sort cũ
      this.sortField = field;
      this.sortDirection = 'asc';
    }

    // Nếu trạng thái thứ 3 (''), trả về dữ liệu gốc
    if (this.sortDirection === '') {
      this.filteredBranches = [...this.originalBranches];
      return;
    }

    // Sort ASC/DESC
    this.filteredBranches.sort((a, b) => {
      let valA = (a[field] ?? '').toString().toLowerCase();
      let valB = (b[field] ?? '').toString().toLowerCase();

      if (valA < valB) return this.sortDirection === 'asc' ? -1 : 1;
      if (valA > valB) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }
}
