import { Component, OnInit } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BranchService } from '../../services/branch.service';
import { LocationService } from '../../services/location.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branch-create',
  standalone: true,
  templateUrl: './branch-create.component.html',
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
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

  ngOnInit(): void {
    // Khởi tạo form
    this.addForm = this.formBuilder.group({
      code: ['', Validators.required],
      name: ['', Validators.required],
      address: ['', Validators.required],
      phone: [
        '',
        [
          Validators.required,
          Validators.pattern(/^[0-9]{9,11}$/), // 9–11 chữ số
        ],
      ],
      province: ['', Validators.required],
      ward: ['', Validators.required],
      note: [''],
      isActive: [true],
    });

    // Load danh sách tỉnh
    this.loadProvinces();

    // Khi province thay đổi → load phường/xã
    this.addForm.get('province')?.valueChanges.subscribe((provinceId) => {
      this.onProvinceChange(provinceId);
    });
  }

  /** Gọi API lấy danh sách tỉnh */
  private loadProvinces(): void {
    this.locationService.getProvinces().subscribe({
      next: (res: any) => {
        // Nếu BE trả { data: [...] } thì lấy res.data, còn không thì lấy thẳng res
        this.provinces = Array.isArray(res?.data) ? res.data : res;

        if (!Array.isArray(this.provinces)) {
          console.error('API provinces không trả về mảng:', this.provinces);
          this.provinces = [];
        }
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Không tải được danh sách tỉnh/thành phố');
      },
    });
  }

  /** Khi đổi tỉnh: reset ward + load API phường/xã */
  onProvinceChange(provinceId: string): void {
    this.wards = [];
    this.addForm.get('ward')?.setValue('');

    if (!provinceId) return;

    this.locationService.getCommunes(provinceId).subscribe({
      next: (res: any) => {
        this.wards = Array.isArray(res?.data) ? res.data : res;

        if (!Array.isArray(this.wards)) {
          console.error('API communes không trả về mảng:', this.wards);
          this.wards = [];
        }
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Không tải được danh sách phường/xã');
      },
    });
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

    const selectedProvince = this.provinces.find((p) => p._id === formValue.province);
    const selectedWard = this.wards.find((w) => w._id === formValue.ward);

    const payload: any = {
      code: formValue.code?.trim(),
      name: formValue.name?.trim(),
      address: formValue.address?.trim(),
      phone: formValue.phone?.trim(),
      provinceName: selectedProvince?.name,
      communeName: selectedWard?.name,
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
      const res: any = await this.branchService.create(payload); // create nhiều khả năng vẫn trả Promise

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
