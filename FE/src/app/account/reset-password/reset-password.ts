import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reset-password.html',
})
export class ResetPassword {
  newPassword = '';
  confirmPassword = '';
  userId = '';
  message = '';
  errorMessage = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {
    this.route.queryParams.subscribe((params) => (this.userId = params['user'] || ''));
  }

  resetPassword() {
    this.message = '';
    this.errorMessage = '';

    if (!this.newPassword || !this.confirmPassword) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin.';
      this.toastr.warning(this.errorMessage, 'Warning');
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Mật khẩu không khớp.';
      this.toastr.error(this.errorMessage, 'Error');
      return;
    }

    this.authService.resetPassword({ _id: this.userId, newPassword: this.newPassword }).subscribe({
      next: () => {
        this.message = 'Đổi mật khẩu thành công!';
        this.toastr.success(this.message, 'Success');

        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Đổi mật khảu không hợp lệ.';
        this.toastr.error(this.errorMessage, 'Error');
      },
    });
  }
}
