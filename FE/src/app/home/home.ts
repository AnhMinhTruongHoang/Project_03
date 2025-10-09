import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from "@angular/core";
import { RouterLink, RouterOutlet } from "@angular/router";

@Component({
    selector: 'home',
    imports: [
        RouterOutlet,
        RouterLink
    ],
    templateUrl: './home.html',
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class Home implements OnInit {

    ngOnInit() {
    }

}