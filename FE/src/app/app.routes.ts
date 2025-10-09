import { Routes } from '@angular/router';
import { Home } from './home/home';
import { Login } from './account/login/login';
import { Register } from './account/register/register';
import { ForgetPassword } from './account/forgetpassword/forgetpassword';
import { Verify } from './account/verify/verify';

export const routes: Routes = [
    {
        path:'',
        component: Home,
    },
    {
        path:'home',
        component: Home
    },
    {
       path: 'login',
        component: Login
    },
    {
       path: 'register',
        component: Register
    },
    {
        path:'forget-password',
        component: ForgetPassword
    },
    {
        path:'verify',
        component: Verify
    }
];
