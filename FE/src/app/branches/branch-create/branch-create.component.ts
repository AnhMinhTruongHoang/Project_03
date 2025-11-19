import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BranchService } from '../../services/branch.service';
import { CommonModule } from '@angular/common';
import { VIETNAM_PROVINCES } from '../../shared/data/vietnam-provinces';

@Component({
  selector: 'app-branch-create',
  standalone: true,
  templateUrl: './branch-create.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
})
export class BranchCreateComponent implements OnInit {
  provinces = VIETNAM_PROVINCES;
  addForm: FormGroup;
  loading = false;
  msg = '';

  constructor(
    private branchService: BranchService,
    private formBuilder: FormBuilder,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {
    this.addForm = this.formBuilder.group({
      // REQUIRED từ CreateBranchDto
      code: ['', Validators.required],
      name: ['', Validators.required],
      address: ['', Validators.required],

      // OPTIONAL
      phone: ['', Validators.required],
      managerId: ['', Validators.required],
      city: ['', Validators.required],
      province: ['', Validators.required],
      // schema có isActive default true – cho user tick luôn
      isActive: [true],
    });
  }

  async save() {
    if (this.addForm.invalid || this.loading) {
      this.msg = 'Vui lòng nhập đầy đủ các trường bắt buộc!';
      this.addForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.msg = '';

    // Lấy value từ form
    const formValue = this.addForm.value;

    // Build payload đúng CreateBranchDto + schema
    const payload: any = {
      code: formValue.code?.trim(),
      name: formValue.name?.trim(),
      address: formValue.address?.trim(),
      phone: formValue.phone?.trim() || undefined,
      city: formValue.city?.trim() || undefined,
      province: formValue.province?.trim() || undefined,
      managerId: formValue.managerId?.trim() || undefined,
      isActive: formValue.isActive,
    };

    // Xóa field undefined để body gọn, tránh gửi rác
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key];
      }
    });

    try {
      const res: any = await this.branchService.create(payload);
      console.log('Create branch response:', res);

      // Thường pattern ResponseMessage hay wrap kiểu:
      // { statusCode, message, data }
      const message = res?.message || 'Tạo chi nhánh mới thành công';
      this.toastr.success(message);
      this.router.navigate(['/admin/branch']); // chỉnh path nếu khác
    } catch (err: any) {
      console.error('Create branch error:', err);

      // class-validator + Nest thường trả:
      // error.error.message: string | string[]
      let message = 'Thêm chi nhánh thất bại, vui lòng thử lại';

      const rawMsg = err?.error?.message || err?.message;

      if (Array.isArray(rawMsg)) {
        // ['code không được để trống', 'name không được để trống', ...]
        message = rawMsg.join('<br/>');
      } else if (typeof rawMsg === 'string') {
        message = rawMsg;
      }

      this.msg = message;
      this.toastr.error(message.replace(/<br\/>/g, '\n'));
    } finally {
      this.loading = false;
    }
  }

  backToList() {
    this.router.navigate(['/admin/branch']);
  }
}
