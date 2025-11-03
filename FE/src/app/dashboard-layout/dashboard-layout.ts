import { CommonModule, isPlatformBrowser } from '@angular/common';
import {
  Component,
  HostListener,
  Inject,
  PLATFORM_ID,
  OnInit,
  OnDestroy,
  CUSTOM_ELEMENTS_SCHEMA,
} from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { ToastrService } from 'ngx-toastr';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-dashboard-layout',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './dashboard-layout.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardLayout implements OnInit, OnDestroy {
  sidebarOpen = true;
  innerWidth = window.innerWidth;
  isBrowser = false;
  user: any = null;
  private userSubscription!: Subscription;

  constructor(
    public authService: AuthService,
    private router: Router,
    private toastr: ToastrService,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {}

  ngOnInit(): void {
    this.isBrowser = isPlatformBrowser(this.platformId);
    if (this.isBrowser) {
      this.userSubscription = this.authService.currentUser$.subscribe((user) => {
        this.user = user;
      });
    }
  }

  @HostListener('window:resize')
  onResize() {
    this.innerWidth = window.innerWidth;
    this.sidebarOpen = this.innerWidth >= 992;
  }

  toggleSidebar() {
    this.sidebarOpen = !this.sidebarOpen;
  }

  logout() {
    this.authService.logout();
    this.toastr.success('Đăng xuất thành công!');
    setTimeout(() => this.router.navigate(['/']), 500);
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
  }
}
