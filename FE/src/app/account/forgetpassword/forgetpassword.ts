import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'forgetpassword',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgetpassword.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class ForgetPassword implements OnInit {
  email: string = '';

  // 👉 Thêm hai biến thông báo ở đây
  successMessage: string = '';
  errorMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {}

  sendResetLink() {
    // Xóa thông báo cũ mỗi lần gửi
    this.successMessage = '';
    this.errorMessage = '';

    if (!this.email) {
      this.toastr.warning('Vui lòng nhập địa chỉ email của bạn.', 'Thiếu thông tin');
      this.errorMessage = 'Vui lòng nhập địa chỉ email của bạn.';
      return;
    }

    this.authService.requestPasswordReset(this.email).subscribe({
      next: (res: any) => {
        this.successMessage = 'Mã đặt lại mật khẩu đã được gửi, vui lòng kiểm tra email của bạn.';
        this.toastr.success(this.successMessage, 'Thành công');
        console.log('Reset request success:', res);

        const data = res.data || res;

        if (data._id) {
          localStorage.setItem('reset_user_id', data._id);
        }

        this.router.navigate(['/verify-reset']);
      },
      error: (err) => {
        console.error('Reset request failed:', err);
        const message = err.error?.message || 'Đã xảy ra lỗi, vui lòng thử lại sau.';
        this.errorMessage = message;
        this.toastr.error(message, 'Lỗi');
      },
    });
  }
}
