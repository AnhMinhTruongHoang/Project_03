import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { StaffService } from '../../../../services/staff.service';

@Component({
  selector: 'app-staff-trash',
  standalone: true,
  templateUrl: './staff-trash.component.html',
  imports: [CommonModule, RouterLink],
})
export class StaffTrashComponent implements OnInit {
  staffs: any[] = [];
  isLoading = false;
  error = '';

  constructor(
    private staffService: StaffService,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    this.loadTrash();
  }

  async loadTrash(): Promise<void> {
  this.isLoading = true;
  this.error = '';

  try {
    const data = await this.staffService.getTrash(); // data là mảng
    this.staffs = data ?? [];
  } catch (err) {
    console.error(err);
    this.error = 'Không thể tải dữ liệu thùng rác. Vui lòng thử lại sau.';
  } finally {
    this.isLoading = false;
  }
}


  async restore(id: string): Promise<void> {
    if (!id) return;

    const ok = confirm('Bạn có chắc muốn khôi phục nhân viên này?');
    if (!ok) return;

    try {
      await this.staffService.restore(id);
      this.toastr.success('Đã khôi phục nhân viên.', 'Thành công');
      await this.loadTrash();
    } catch (err) {
      console.error(err);
      this.toastr.error('Khôi phục nhân viên thất bại.', 'Lỗi');
    }
  }

  async hardDelete(id: string): Promise<void> {
    if (!id) return;

    const ok = confirm(
      'Xoá vĩnh viễn nhân viên này? Hành động này không thể hoàn tác.'
    );
    if (!ok) return;

    try {
      await this.staffService.hardDelete(id);
      this.toastr.success('Đã xoá vĩnh viễn nhân viên.', 'Thành công');
      await this.loadTrash();
    } catch (err) {
      console.error(err);
      this.toastr.error('Xoá vĩnh viễn thất bại.', 'Lỗi');
    }
  }
}
