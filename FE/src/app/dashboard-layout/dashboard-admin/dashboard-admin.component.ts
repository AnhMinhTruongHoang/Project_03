import { Component, CUSTOM_ELEMENTS_SCHEMA, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
// Nếu bạn dùng Chart.js:
import Chart from 'chart.js/auto';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard-admin.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class DashboardAdmin implements AfterViewInit {
  @ViewChild('orderChartCanvas') orderChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topChartCanvas') topChartCanvas!: ElementRef<HTMLCanvasElement>;

  ngAfterViewInit(): void {
    // TODO: vẽ chart thật theo dữ liệu API
    // Ví dụ đơn giản:
    // new Chart(this.orderChartCanvas.nativeElement, { ... });
    // new Chart(this.topChartCanvas.nativeElement, { ... });
  }
}
