import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Register implements OnInit {
  name: string = '';
  phone: string = '';
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  successMessage: string = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  ngOnInit() {}

  register() {
    if (!this.name || !this.phone || !this.email || !this.password) {
      this.errorMessage = 'Vui lòng nhập đầy đủ thông tin!';
      this.toastr.error(this.errorMessage);
      return;
    }

    const userData = {
      name: this.name,
      phone: this.phone,
      email: this.email,
      password: this.password,
      status: false,
      balance: 0,
    };

    this.authService.register(userData).subscribe({
      next: (res) => {
        if (res.data?._id) {
          localStorage.setItem('pending_user_id', res.data._id);
          this.router.navigate(['/verify'], { queryParams: { user: res.data._id } });
        }
        this.successMessage = 'Please login to confirm email.';
        this.toastr.success(this.successMessage);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Register failed!';
        this.toastr.error(this.errorMessage);
      },
    });
  }
}
