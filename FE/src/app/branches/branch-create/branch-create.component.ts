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
      // REQUIRED
      code: ['', Validators.required],
      name: ['', Validators.required],
      address: ['', Validators.required],
      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      province: ['', Validators.required],
      ward: ['', Validators.required], // giữ lại Phường/Xã

      // NOT REQUIRED
      note: [''],

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

    const formValue = this.addForm.value;

    // Build payload
    const payload: any = {
      code: formValue.code?.trim(),
      name: formValue.name?.trim(),
      address: formValue.address?.trim(),

      phone: formValue.phone?.trim(),
      email: formValue.email?.trim(),

      province: formValue.province?.trim(),

      ward: formValue.ward?.trim() || undefined,
      note: formValue.note?.trim() || undefined,

      isActive: formValue.isActive,
    };

    // Remove undefined keys
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key];
      }
    });

    try {
      const res: any = await this.branchService.create(payload);
      console.log('Create branch response:', res);

      const message = res?.message || 'Tạo chi nhánh mới thành công';
      this.toastr.success(message);
      this.router.navigate(['/admin/branch']);
    } catch (err: any) {
      console.error('Create branch error:', err);

      let message = 'Thêm chi nhánh thất bại, vui lòng thử lại';
      const rawMsg = err?.error?.message || err?.message;

      if (Array.isArray(rawMsg)) {
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
