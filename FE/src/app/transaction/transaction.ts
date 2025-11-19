import { Component, Inject, PLATFORM_ID } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-transaction',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './transaction.html',
})
export class Transaction {
  amount = 0;
  type = 1; // 1 = nạp, 2 = rút
  user: any;

  constructor(
    private authService: AuthService,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      const stored = localStorage.getItem('user');
      if (stored) this.user = JSON.parse(stored);
    }
  }

  submitTransaction() {
    console.log({
      accId: this.user._id,
      transMoney: this.amount,
      transType: this.type,
    });
    if (!this.user) {
      this.toastr.error('Vui lòng đăng nhập!');
      return;
    }

    if (this.amount <= 0) {
      this.toastr.warning('Số tiền không hợp lệ!');
      return;
    }

  }
}
