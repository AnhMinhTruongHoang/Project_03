import { CommonModule } from '@angular/common';
import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class Register implements OnInit {
  name: string;
  age: number;
  gender: string;
  address: string;
  phone: string;
  email: string;
  password: string;
  errorMessage: string;
  constructor(private authService: AuthService, private router: Router) {}
  ngOnInit() {
    this.name = '';
    this.age = 0;
    this.gender = '';
    this.address = '';
    this.phone = '';
    this.email = '';
    this.password = '';
    this.errorMessage = '';
  }

  register() {
    const userData = {
      name: this.name,
      age: this.age,
      gender: this.gender,
      address: this.address,
      phone: this.phone,
      email: this.email,
      password: this.password,
    };

    this.authService.register(userData).subscribe({
      next: (res) => {
        console.log('Register success:', res);

        if (res.data?._id) {
          localStorage.setItem('pending_user_id', res.data._id);
        }

        this.router.navigate(['/verify']);
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Register failed!';
      },
    });
  }
}
