import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Login implements OnInit {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  returnUrl: string | null = null;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private toastr: ToastrService
  ) {}

  ngOnInit(): void {
    // lấy returnUrl nếu có (vd: /login?returnUrl=/transaction)
    this.returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
  }

  login() {
    this.errorMessage = '';

    this.authService.login(this.email, this.password).subscribe({
      next: (res: any) => {
        console.log('Login success:', res);

        const data = res?.data || res;

        if (!data?.user) {
          this.toastr.error('Dữ liệu người dùng không hợp lệ.');
          return;
        }

        // Tài khoản chưa xác minh
        if (data.user.status === false) {
          localStorage.setItem('pending_user_id', data.user._id);
          this.toastr.warning(
            'Tài khoản của bạn chưa được xác minh. Đang chuyển đến trang xác minh...',
            'Chú ý',
            { timeOut: 3000 }
          );
          this.router.navigate(['/verify']);
          return;
        }

        // Lưu token + user
        localStorage.setItem('access_token', data.access_token);
        localStorage.setItem('refresh_token', data.refresh_token);
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('userId', data.user._id);
        this.authService.setUser(data.user);

        console.log('user role raw:', data.user.role);
        console.log('roles chuẩn hóa:', (this.authService as any)['normalizeRoles']?.(data.user));
        console.log('isAdmin:', this.authService.isAdmin(data.user));
        console.log('isEmployee:', this.authService.isEmployee(data.user));

        this.toastr.success('Đăng nhập thành công!');

        // Điều hướng
        if (this.authService.isAdmin(data.user)) {
          // admin
          this.router.navigateByUrl('/admin/dashboard');
        } else {
          // user thường
          if (this.returnUrl && this.returnUrl !== '/login') {
            this.router.navigateByUrl(this.returnUrl);
          } else {
            this.router.navigate(['/dashboard']);
          }
        }
      },
      error: (err) => {
        console.error('Login error:', err);
        this.errorMessage = err?.error?.message || 'Đăng nhập thất bại, vui lòng thử lại.';
        this.toastr.error(this.errorMessage, 'Lỗi');
      },
    });
  }
}
