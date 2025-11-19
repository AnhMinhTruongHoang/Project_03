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
import { LocationService } from '../../services/location.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branch-create',
  standalone: true,
  templateUrl: './branch-create.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule, RouterLink],
})
export class BranchCreateComponent implements OnInit {
  provinces: any[] = [];
  wards: any[] = [];

  addForm: FormGroup;
  loading = false;
  msg = '';

  constructor(
    private branchService: BranchService,
    private locationService: LocationService,
    private formBuilder: FormBuilder,
    private router: Router,
    private toastr: ToastrService
  ) {}

  async ngOnInit() {
    // Khởi tạo form
    this.addForm = this.formBuilder.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      address: ['', Validators.required],

      phone: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],

      province: ['', Validators.required],
      ward: ['', Validators.required],

      note: [''],
      isActive: [true],
    });

    // Load danh sách tỉnh
    const provinceRes: any = await this.locationService.getProvinces();
    this.provinces = provinceRes?.data || provinceRes || [];

    // Khi province thay đổi → load phường
    this.addForm.get('province')?.valueChanges.subscribe((provinceId) => {
      this.onProvinceChange(provinceId);
    });
  }

  /** Khi đổi tỉnh: reset ward + load API phường */
  async onProvinceChange(provinceId: string) {
    this.wards = [];
    this.addForm.get('ward')?.setValue('');

    if (!provinceId) return;

    try {
      const res: any = await this.locationService.getCommunes(provinceId);
      this.wards = res?.data || res || [];
    } catch (err) {
      console.error(err);
      this.toastr.error('Không tải được danh sách phường/xã');
    }
  }

  /** Lưu chi nhánh */
  async save() {
    if (this.addForm.invalid || this.loading) {
      this.msg = 'Vui lòng nhập đầy đủ các trường bắt buộc!';
      this.addForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.msg = '';

    const formValue = this.addForm.value;

    const payload: any = {
      code: formValue.code?.trim(),
      name: formValue.name?.trim(),
      address: formValue.address?.trim(),
      phone: formValue.phone?.trim(),
      email: formValue.email?.trim(),
      province: formValue.province,
      ward: formValue.ward,
      note: formValue.note?.trim() || undefined,
      isActive: formValue.isActive,
    };

    // Remove undefined
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key];
      }
    });

    try {
      const res: any = await this.branchService.create(payload);

      this.toastr.success(res?.message || 'Tạo chi nhánh mới thành công');
      this.router.navigate(['/admin/branch']);
    } catch (err: any) {
      console.error(err);

      let msg = 'Thêm chi nhánh thất bại';
      const raw = err?.error?.message || err?.message;

      msg = Array.isArray(raw) ? raw.join('\n') : raw;

      this.msg = msg;
      this.toastr.error(msg);
    } finally {
      this.loading = false;
    }
  }

  backToList() {
    this.router.navigate(['/admin/branch']);
  }
}
