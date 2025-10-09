import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'verify',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verify.html',
})
export class Verify {
  code = '';
  errorMessage = '';
  successMessage = '';
  userId = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    if (isPlatformBrowser(this.platformId)) {
      this.userId = localStorage.getItem('pending_user_id') || '';
    }
  }

  verifyCode() {
    if (!this.code || !this.userId) {
      this.errorMessage = 'Missing user or code!';
      return;
    }

    this.authService.verify({ _id: this.userId, code: this.code }).subscribe({
      next: () => {
        this.successMessage = 'Account activated successfully!';
        this.errorMessage = '';

        if (isPlatformBrowser(this.platformId)) {
          localStorage.removeItem('pending_user_id');
        }

        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Verification failed!';
        this.successMessage = '';
      },
    });
  }
}
