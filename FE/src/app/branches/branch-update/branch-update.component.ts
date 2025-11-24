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

  ngOnInit(): void {
    this.branchId = this.route.snapshot.paramMap.get('id') || '';

    // Khởi tạo form
    this.editForm = this.formBuilder.group({
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

    // Load danh sách tỉnh trước, xong rồi mới load chi nhánh
    this.locationService.getProvinces().subscribe({
      next: (res: any) => {
        this.provinces = res?.data || res || [];

        // Khi đổi tỉnh -> load phường
        this.editForm.get('province')?.valueChanges.subscribe((provinceId) => {
          this.onProvinceChange(provinceId);
        });

        // Sau khi có provinces mới load branch
        this.loadBranch();
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Không tải được danh sách tỉnh/thành phố');
      },
    });
  }

  /** Load data chi nhánh theo id rồi patch vào form */
  private async loadBranch() {
    if (!this.branchId) return;

    try {
      this.loading = true;
      const branch: any = await this.branchService.findById(this.branchId);
      console.log('BRANCH FROM API = ', branch);

      // Map provinceName -> provinceId
      let provinceId: string | '' = '';
      if (branch.provinceName) {
        const p = this.provinces.find((x) => x.name === branch.provinceName);
        provinceId = p?._id || '';
      }

      this.editForm.patchValue({
        code: branch.code,
        name: branch.name,
        address: branch.address,
        phone: branch.phone,
        province: provinceId,
        note: branch.note,
        isActive: branch.isActive ?? true,
      });

      // Nếu có province -> load wards rồi set ward theo communeName
      if (provinceId) {
        this.locationService.getCommunes(provinceId).subscribe({
          next: (res: any) => {
            this.wards = res?.data || res || [];

            if (branch.communeName) {
              const w = this.wards.find((x) => x.name === branch.communeName);
              const wardId = w?._id || '';
              if (wardId) {
                this.editForm.patchValue({ ward: wardId });
              }
            }
          },
          error: (err) => {
            console.error(err);
            this.toastr.error('Không tải được danh sách phường/xã');
          },
        });
      }
    } catch (err) {
      console.error(err);
      this.toastr.error('Không tải được thông tin chi nhánh');
    } finally {
      this.loading = false;
    }
  }

  /** Khi đổi tỉnh: reset ward + load API phường */
  onProvinceChange(provinceId: string) {
    this.wards = [];
    this.editForm.get('ward')?.setValue('');

    if (!provinceId) return;

    this.locationService.getCommunes(provinceId).subscribe({
      next: (res: any) => {
        this.wards = res?.data || res || [];
      },
      error: (err) => {
        console.error(err);
        this.toastr.error('Không tải được danh sách phường/xã');
      },
    });
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

    // Tìm tên tỉnh / phường từ id đang chọn
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
