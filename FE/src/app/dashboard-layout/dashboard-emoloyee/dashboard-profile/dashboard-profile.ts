import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-profile.html',
})
export class DashboardProfile implements OnInit {
  user: any = {};
  isBrowser = false;

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      const stored = localStorage.getItem('user');
      if (stored) {
        this.user = JSON.parse(stored);

        // Bổ sung giá trị mặc định nếu thiếu
        this.user.accountType = this.user.accountType || 'LOCAL';
        this.user.role = this.user.role || 'USER';
        this.user.createdAt = this.user.createdAt ? new Date(this.user.createdAt) : new Date();
      }
    }
    console.log('User data:', this.user);
  }

  update() {
    if (!this.isBrowser) return;

    // Chỉ cho phép cập nhật các trường người dùng được phép thay đổi
    const updateData: any = {
      name: this.user.name,
      phone: this.user.phone,
    };

    // Nếu có nhập mật khẩu mới thì thêm vào
    if (this.user.password && this.user.password.trim() !== '') {
      updateData.password = this.user.password;
    }

    this.authService.updateAccount(this.user._id, updateData).subscribe({
      next: (res) => {
        this.toastr.success('Cập nhật thông tin thành công');
        // Cập nhật lại user lưu trong localStorage
        this.authService.setUser({
          ...this.user,
          ...updateData,
        });
      },
      error: (err) => {
        this.toastr.error(err.error.message || 'Cập nhật thất bại');
      },
    });
  }
}
