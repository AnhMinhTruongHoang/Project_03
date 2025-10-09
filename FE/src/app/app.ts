import { AsyncPipe } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit, signal } from '@angular/core';
import { Event, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from './services/auth.service';

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet, RouterLink
  ],
  templateUrl: './app.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class App implements OnInit{
  isAuthPage: Boolean;

  constructor(public authService: AuthService, private router: Router) {}

  ngOnInit(): void {
    this.router.events.subscribe((evt: Event) =>{
      if(evt instanceof NavigationEnd){
         const url = evt.urlAfterRedirects;

        this.isAuthPage = 
          url.startsWith('/login') ||
          url.startsWith('/register') ||
          url.startsWith('/forget-password') ||
          url.startsWith('/verify');
      }
    });
  }
  
  logout() {
    this.authService.logout();
    this.router.navigate(['/']);
  }


}
