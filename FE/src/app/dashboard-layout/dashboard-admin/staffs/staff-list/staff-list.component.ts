import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { StaffService } from '../../../../services/staff.service';  

// Khai báo interface Staff đơn giản, có thể bổ sung thêm field nếu BE trả về
interface Staff {
  _id: string;
  name: string;
  email: string;
  role: string; // "ADMIN", "STAFF", ...
  isActive: boolean;
  branchId?: {
    _id: string;
    name: string;
  };
}

@Component({
  selector: 'app-staff-list',
  standalone: true,
  templateUrl: './staff-list.component.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class StaffListComponent implements OnInit {
  staffs: Staff[] = [];
  filteredStaffs: Staff[] = [];
  pagedStaffs: Staff[] = [];

  keyword = '';
  msg = '';
  isLoading = false;

  page = 1;
  pageSize = 10;
  totalPages = 1;

  sortField: keyof Staff | '' = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  constructor(private staffService: StaffService) {}

  ngOnInit() {
    this.loadStaffs();
  }

  /* --------- Load data --------- */
  async loadStaffs() {
    this.isLoading = true;
    try {
      // dùng StaffService kiểu mới: findAll()
      const res: any = await this.staffService.findAll();

      // Tùy BE bọc data thế nào, xử lý linh hoạt:
      const list: Staff[] =
        res?.data?.result || // nếu decorator bọc dạng { data: { result } }
        res?.data || // hoặc { data: [...] }
        res?.result || // hoặc { result: [...] }
        res || []; // hoặc trả mảng luôn

      this.staffs = list;
      this.filteredStaffs = [...this.staffs];

      this.applyFilterSortPaginate();
    } catch (error) {
      console.error(error);
      this.msg = 'Không thể tải danh sách nhân viên';
    } finally {
      this.isLoading = false;
    }
  }

  /* --------- Search --------- */
  search() {
    const kw = this.keyword.trim().toLowerCase();

    if (!kw) {
      this.filteredStaffs = [...this.staffs];
    } else {
      this.filteredStaffs = this.staffs.filter((s) => {
        const branchName = (s as any).branchId?.name || '';
        return (
          s.name?.toLowerCase().includes(kw) ||
          s.email?.toLowerCase().includes(kw) ||
          s.role?.toLowerCase().includes(kw) ||
          branchName.toLowerCase().includes(kw)
        );
      });
    }

    this.page = 1;
    this.applyFilterSortPaginate();
  }

  /* --------- Sort --------- */
  sortData(field: keyof Staff) {
    if (this.sortField === field) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortField = field;
      this.sortDirection = 'asc';
    }
    this.applyFilterSortPaginate();
  }

  /* --------- Paginate + sort + filter --------- */
  applyFilterSortPaginate() {
    let data = [...this.filteredStaffs];

    // sort
    if (this.sortField) {
      const field = this.sortField;
      const dir = this.sortDirection === 'asc' ? 1 : -1;

      data.sort((a: any, b: any) => {
        let av = a[field];
        let bv = b[field];

        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();

        if (av > bv) return dir;
        if (av < bv) return -dir;
        return 0;
      });
    }

    // paginate
    this.totalPages = Math.max(1, Math.ceil(data.length / this.pageSize));
    if (this.page > this.totalPages) this.page = this.totalPages;

    const start = (this.page - 1) * this.pageSize;
    const end = start + this.pageSize;
    this.pagedStaffs = data.slice(start, end);
  }

  nextPage() {
    if (this.page < this.totalPages) {
      this.page++;
      this.applyFilterSortPaginate();
    }
  }

  prevPage() {
    if (this.page > 1) {
      this.page--;
      this.applyFilterSortPaginate();
    }
  }

  /* --------- Delete --------- */
  async delete(id: string) {
    const ok = confirm('Bạn có chắc chắn muốn xoá nhân viên này?');
    if (!ok) return;

    try {
      // dùng method delete() trong StaffService kiểu mới
      await this.staffService.delete(id);
      this.msg = 'Xoá nhân viên thành công';

      // remove khỏi list hiện tại
      this.staffs = this.staffs.filter((s) => s._id !== id);
      this.search(); // tính lại filter + paginate
    } catch (error) {
      console.error(error);
      this.msg = 'Không thể xoá nhân viên';
    }
  }
}
