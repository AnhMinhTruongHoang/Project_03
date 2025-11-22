import { isPlatformBrowser, CurrencyPipe } from '@angular/common';
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  Inject,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
} from '@angular/core';
import { Event, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'employee-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  templateUrl: './employee-layout.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class EmployeeLayout implements OnInit, OnDestroy {
  isAuthPage = false;
  user: any = null;
  balance = 0;
  isBrowser = false;
  private userSubscription?: Subscription;
  private routerSubscription?: Subscription;

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
        this.user = user || null;
      });
    }

    this.checkUrl(this.router.url);

    this.routerSubscription = this.router.events.subscribe((evt) => {
      if (evt instanceof NavigationEnd) {
        this.checkUrl(evt.urlAfterRedirects);
      }
    });
  }

  private checkUrl(url: string) {
    this.isAuthPage =
      url.startsWith('/login') ||
      url.startsWith('/register') ||
      url.startsWith('/forget-password') ||
      url.startsWith('/verify') ||
      url.startsWith('/reset-password') ||
      url.startsWith('/employee/') ||
      url.startsWith('/employee/home') ||
      url.startsWith('/employee/order') ||
      url.startsWith('/employee/profile');
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
    this.toastr.success('Đăng xuất thành công!');
    setTimeout(() => {
      if (this.isBrowser) window.location.href = '/';
    }, 2000);
  }

  ngOnDestroy(): void {
    this.userSubscription?.unsubscribe();
    this.routerSubscription?.unsubscribe();
  }
}
