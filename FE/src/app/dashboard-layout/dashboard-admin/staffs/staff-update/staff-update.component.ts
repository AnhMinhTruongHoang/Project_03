import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { StaffService } from '../../../../services/staff.service';
import { BranchService } from '../../../../services/branch.service';

@Component({
  selector: 'app-staff-update',
  standalone: true,
  templateUrl: './staff-update.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class StaffUpdateComponent implements OnInit {
  editForm: FormGroup;
  loading = false;
  msg = '';

  staffId = '';
  branches: any[] = [];

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private branchService: BranchService,
    private route: ActivatedRoute,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.editForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      // ĐÚNG: trùng với formControlName trong HTML
      branchId: ['', Validators.required],
      isActive: [true],
    });
  }

  async ngOnInit() {
    this.staffId = this.route.snapshot.paramMap.get('id') || '';
    await Promise.all([this.loadBranches(), this.loadStaff()]);
  }

  async loadBranches() {
    try {
      const res: any = await this.branchService.findAll();
      const list = res?.data?.results || res?.data || [];
      this.branches = list.filter((b: any) => !b.isDeleted);
    } catch (error) {
      console.error('loadBranches error', error);
      this.toastr.error('Không tải được danh sách chi nhánh', 'Lỗi');
    }
  }

  async loadStaff() {
    if (!this.staffId) return;

    try {
      // findById đã trả về data rồi
      const staff: any = await this.staffService.findById(this.staffId);

      if (!staff) {
        this.toastr.error('Không tìm thấy nhân viên', 'Lỗi');
        this.backToList();
        return;
      }

      this.editForm.patchValue({
        name: staff.name,
        email: staff.email,
        // quan trọng: patch vào branchId
        branchId: staff.branchId?._id || staff.branchId,
        isActive: staff.isActive,
      });
    } catch (error) {
      console.error('loadStaff error', error);
      this.toastr.error('Không tải được thông tin nhân viên', 'Lỗi');
    }
  }

  async update() {
    if (this.editForm.invalid) {
      this.editForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.msg = '';

    try {
      const payload = this.editForm.value;
      console.log('payload gửi lên', payload); // để bạn check nhanh

      await this.staffService.update(this.staffId, payload);

      this.toastr.success('Cập nhật nhân viên thành công', 'Thành công');
      this.backToList();
    } catch (error: any) {
      console.error('update staff error', error);
      this.msg = error?.error?.message || error?.message || 'Đã có lỗi xảy ra, vui lòng thử lại.';
      this.toastr.error(this.msg, 'Lỗi');
    } finally {
      this.loading = false;
    }
  }

  backToList() {
    this.router.navigate(['/admin/staff']);
  }
}
