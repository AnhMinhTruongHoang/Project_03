import { CommonModule } from '@angular/common';
import { Component, ElementRef, ViewChild, NgZone, AfterViewInit, OnDestroy } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import Chart from 'chart.js/auto';
import { DashboardService } from '../../../services/dashboard/dashboard.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard-home',
  standalone: true,
  imports: [CommonModule, HttpClientModule, FormsModule],
  templateUrl: './dashboard-home.html',
})
export class DashboardHome implements AfterViewInit, OnDestroy {
  private orderChart!: Chart;
  private statusChart!: Chart<'doughnut', number[], string>;

  private readonly STATUS_ORDER = [
    'PENDING',
    'CONFIRMED',
    'SHIPPING',
    'COMPLETED',
    'CANCELED',
  ] as const;
  private readonly STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    SHIPPING: 'Đang giao',
    COMPLETED: 'Hoàn tất',
    CANCELED: 'Đã hủy',
  };
  private readonly STATUS_COLORS: Record<string, string> = {
    PENDING: '#6c757d',
    CONFIRMED: '#0d6efd',
    SHIPPING: '#20c997',
    COMPLETED: '#198754',
    CANCELED: '#dc3545',
  };

  @ViewChild('orderChartCanvas') orderChartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChartCanvas') statusChartCanvas!: ElementRef<HTMLCanvasElement>;

  deliveredCount = 0;
  returnedCount = 0;
  totalOrders = 0;
  estimatedRevenue = 0;

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  viewAllYear = false;

  monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `Tháng ${i + 1}`,
    value: i + 1,
  }));

  yearOptions = (() => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 5 }, (_, i) => currentYear - i);
  })();

  summaryCards = [
    {
      label: 'Đã giao thành công',
      value: 0,
      icon: 'bi bi-truck text-success',
      textClass: 'text-success',
    },
    {
      label: 'Đã hoàn / Bị hủy',
      value: 0,
      icon: 'bi bi-arrow-repeat text-danger',
      textClass: 'text-danger',
    },
    {
      label: 'Tổng đơn trong tháng',
      value: 0,
      icon: 'bi bi-box-seam text-primary',
      textClass: 'text-primary',
    },
    {
      label: 'Doanh thu ước tính',
      value: '0₫',
      icon: 'bi bi-currency-dollar text-warning',
      textClass: 'text-warning',
    },
  ];

  constructor(private ngZone: NgZone, private dashboardService: DashboardService) {}

  ngAfterViewInit(): void {
    this.fetchStatistics();
  }

  onMonthOrYearChange() {
    console.log(
      'Thay đổi tháng/năm:',
      this.selectedMonth,
      this.selectedYear,
      'Toàn năm:',
      this.viewAllYear
    );
    this.fetchStatistics();
  }

  private fetchStatistics(): void {
    const month = this.viewAllYear ? undefined : this.selectedMonth;
    const year = this.selectedYear;

    console.log('📡 Gọi API với month =', month, 'year =', year);

    this.dashboardService.getStatistics(month, year).subscribe((res: any) => {
      const data = res?.data || {};

      this.deliveredCount = data.statusCounts?.COMPLETED ?? 0;
      this.returnedCount = data.statusCounts?.CANCELED ?? 0;
      this.totalOrders = data.totalOrders ?? 0;
      this.estimatedRevenue = data.estimatedRevenue ?? 0;

      this.summaryCards[0].value = this.deliveredCount;
      this.summaryCards[1].value = this.returnedCount;
      this.summaryCards[2].value = this.totalOrders;
      this.summaryCards[3].value = `${this.estimatedRevenue.toLocaleString()}₫`;

      this.renderCharts(data);
    });
  }

  private renderCharts(data: any): void {
    const dayOrder = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    const labels = dayOrder.filter((k) => data.ordersByDay?.[k]);

    const statusKeys: string[] = Object.keys(data.statusCounts || {});
    const statuses = statusKeys.length ? statusKeys : this.STATUS_ORDER;

    const datasets = statuses.map((st) => ({
      label: this.STATUS_LABELS[st],
      data: labels.map((d) => data.ordersByDay?.[d]?.[st] ?? 0),
      tension: 0.3,
      fill: false,
      borderColor: this.STATUS_COLORS[st],
      backgroundColor: this.STATUS_COLORS[st],
    }));

    if (this.orderChart) this.orderChart.destroy();
    this.orderChart = new Chart(this.orderChartCanvas.nativeElement, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: { label: (ctx) => `${ctx.dataset.label}: ${ctx.parsed.y}` },
          },
        },
        interaction: { mode: 'index', intersect: false },
        scales: { y: { beginAtZero: true, ticks: { precision: 0 } } },
      },
    });

    const statusCounts = data.statusDistribution || data.statusCounts || {};
    const doughnutLabelsVN = this.STATUS_ORDER.filter((st) => statusCounts[st] !== undefined).map(
      (st) => this.STATUS_LABELS[st]
    );
    const doughnutValues = this.STATUS_ORDER.filter((st) => statusCounts[st] !== undefined).map(
      (st) => Number(statusCounts[st] || 0)
    );
    const doughnutColors = this.STATUS_ORDER.filter((st) => statusCounts[st] !== undefined).map(
      (st) => this.STATUS_COLORS[st]
    );

    if (this.statusChart) this.statusChart.destroy();

    if (doughnutLabelsVN.length === 0 || doughnutValues.every((v) => v === 0)) {
      const ctx = this.statusChartCanvas.nativeElement.getContext('2d');
      if (ctx) {
        ctx.clearRect(
          0,
          0,
          this.statusChartCanvas.nativeElement.width,
          this.statusChartCanvas.nativeElement.height
        );
        ctx.font = '16px sans-serif';
        ctx.fillStyle = 'gray';
        ctx.textAlign = 'center';
        ctx.fillText('Không có dữ liệu', this.statusChartCanvas.nativeElement.width / 2, 60);
      }
      return;
    }

    this.statusChart = new Chart<'doughnut', number[], string>(
      this.statusChartCanvas.nativeElement,
      {
        type: 'doughnut',
        data: {
          labels: doughnutLabelsVN,
          datasets: [{ data: doughnutValues, backgroundColor: doughnutColors }],
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: { callbacks: { label: (ctx) => `${ctx.label}: ${ctx.parsed}` } },
          },
        },
      }
    );
  }

  ngOnDestroy(): void {
    this.orderChart?.destroy();
    this.statusChart?.destroy();
  }
}
