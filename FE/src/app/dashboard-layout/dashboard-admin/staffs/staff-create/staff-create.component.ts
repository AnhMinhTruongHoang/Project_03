import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
  AbstractControl,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

import { StaffService } from '../../../../services/staff.service';
import { BranchService } from '../../../../services/branch.service';

@Component({
  selector: 'app-staff-create',
  standalone: true,
  templateUrl: './staff-create.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class StaffCreateComponent implements OnInit {
  addForm: FormGroup;
  loading = false;
  branches: any[] = [];

  constructor(
    private fb: FormBuilder,
    private staffService: StaffService,
    private branchService: BranchService,
    private router: Router,
    private toastr: ToastrService
  ) {
    this.addForm = this.fb.group(
      {
        name: ['', Validators.required],
        email: ['', [Validators.required, Validators.email]],

        // khớp với DTO: branchId
        branchId: ['', Validators.required],

        // mặc định ĐANG HOẠT ĐỘNG
        isActive: [true],

        password: ['', [Validators.required, Validators.minLength(6)]],
        confirmPassword: ['', Validators.required],
      },
      {
        validators: this.passwordMatchValidator,
      }
    );
  }

  ngOnInit(): void {
    this.loadBranches();
  }

  async loadBranches() {
    try {
      const res: any = await this.branchService.findAll();
      this.branches = res?.data?.results || [];
    } catch (err) {
      console.error(err);
      this.toastr.error('Không tải được danh sách chi nhánh');
    }
  }

  // validator cho confirm password
  passwordMatchValidator(group: AbstractControl) {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;

    if (password && confirmPassword && password !== confirmPassword) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async save() {
    if (this.addForm.invalid) {
      this.addForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    // bỏ confirmPassword khỏi payload
    const { confirmPassword, ...payload } = this.addForm.value;
    // payload lúc này: { name, email, branchId, isActive, password }

    try {
      await this.staffService.create(payload);
      this.toastr.success('Thêm nhân viên thành công');
      this.backToList();
    } catch (err: any) {
      console.error(err);
      this.toastr.error(err?.error?.message || 'Thêm nhân viên thất bại');
    } finally {
      this.loading = false;
    }
  }

  backToList() {
    this.router.navigate(['/admin/staff']);
  }
}
