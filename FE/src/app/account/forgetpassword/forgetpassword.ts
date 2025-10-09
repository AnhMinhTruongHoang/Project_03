import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
    selector: 'forgetpassword',
    imports: [
        // RouterOutlet,
        RouterLink
    ],
    templateUrl: './forgetpassword.html',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ForgetPassword implements OnInit {

    ngOnInit() {
    }

}