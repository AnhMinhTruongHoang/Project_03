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
import { BranchService } from '../../services/branch.service';
import { LocationService } from '../../services/location.service';

@Component({
  selector: 'app-branch-update',
  standalone: true,
  templateUrl: './branch-update.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
})
export class BranchUpdateComponent implements OnInit {
  provinces: any[] = [];
  wards: any[] = [];

  editForm: FormGroup;
  loading = false;
  msg = '';

  branchId = '';

  constructor(
    private branchService: BranchService,
    private locationService: LocationService,
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  async ngOnInit() {
    // Lấy id từ url
    this.branchId = this.route.snapshot.paramMap.get('id') || '';

    // Khởi tạo form (giống create)
    this.editForm = this.formBuilder.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      address: ['', Validators.required],

      phone: ['', Validators.required],
      // không có email

      province: ['', Validators.required],
      ward: ['', Validators.required],

      note: [''],
      isActive: [true],
    });

    // Load danh sách tỉnh
    const provinceRes: any = await this.locationService.getProvinces();
    this.provinces = provinceRes?.data || provinceRes || [];

    // Khi province thay đổi → load phường
    this.editForm.get('province')?.valueChanges.subscribe((provinceId) => {
      this.onProvinceChange(provinceId);
    });

    // Load thông tin chi nhánh cần sửa
    await this.loadBranch();
  }

  /** Load data chi nhánh theo id rồi patch vào form */
  private async loadBranch() {
    if (!this.branchId) return;

    try {
      this.loading = true;
      const branch: any = await this.branchService.findById(this.branchId);
      console.log('BRANCH FROM API = ', branch);

      // province / ward có thể là object hoặc id
      const provinceId =
        typeof branch.province === 'string' ? branch.province : branch.province?._id;
      const wardId = typeof branch.ward === 'string' ? branch.ward : branch.ward?._id;

      // Patch các field cơ bản + province trước
      this.editForm.patchValue({
        code: branch.code,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        province: provinceId,
        note: branch.note,
        isActive: branch.isActive ?? true,
      });

      // Nếu có province → load wards rồi set ward
      if (provinceId) {
        await this.onProvinceChange(provinceId);
        if (wardId) {
          this.editForm.patchValue({ ward: wardId });
        }
      }
    } catch (err) {
      console.error(err);
      this.toastr.error('Không tải được thông tin chi nhánh');
    } finally {
      this.loading = false;
    }
  }

  /** Khi đổi tỉnh: reset ward + load API phường */
  async onProvinceChange(provinceId: string) {
    this.wards = [];
    this.editForm.get('ward')?.setValue('');

    if (!provinceId) return;

    try {
      const res: any = await this.locationService.getCommunes(provinceId);
      this.wards = res?.data || res || [];
    } catch (err) {
      console.error(err);
      this.toastr.error('Không tải được danh sách phường/xã');
    }
  }

  /** Cập nhật chi nhánh */
  async update() {
    if (this.editForm.invalid || this.loading) {
      this.msg = 'Vui lòng nhập đầy đủ các trường bắt buộc!';
      this.editForm.markAllAsTouched();
      return;
    }

    this.loading = true;
    this.msg = '';

    const formValue = this.editForm.value;

    const payload: any = {
      code: formValue.code?.trim(),
      name: formValue.name?.trim(),
      address: formValue.address?.trim(),
      phone: formValue.phone?.trim(),
      province: formValue.province,
      ward: formValue.ward,
      note: formValue.note?.trim() || undefined,
      isActive: formValue.isActive,
    };

    // Remove undefined / ''
    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === '') {
        delete payload[key];
      }
    });

    try {
      const res: any = await this.branchService.update(this.branchId, payload);

      this.toastr.success(res?.message || 'Cập nhật chi nhánh thành công');
      this.router.navigate(['/admin/branch']);
    } catch (err: any) {
      console.error(err);

      let msg = 'Cập nhật chi nhánh thất bại';
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
