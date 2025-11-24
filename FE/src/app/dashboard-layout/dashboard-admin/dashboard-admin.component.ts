import { Component, AfterViewInit, ViewChild, ElementRef, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import Chart from 'chart.js/auto';
import { DashboardService } from '../../services/dashboard/dashboard.service';

@Component({
  selector: 'app-dashboard-admin',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-admin.component.html',
})
export class DashboardAdmin implements AfterViewInit, OnDestroy {
  @ViewChild('revenueOrderChart') revenueOrderChart!: ElementRef<HTMLCanvasElement>;
  @ViewChild('statusChart') statusChartEl!: ElementRef<HTMLCanvasElement>;
  @ViewChild('topEmployeesChart') topEmployeesChart!: ElementRef<HTMLCanvasElement>;

  private charts: Chart[] = [];

  selectedMonth = new Date().getMonth() + 1;
  selectedYear = new Date().getFullYear();
  viewAllYear = false;

  monthOptions = Array.from({ length: 12 }, (_, i) => ({
    label: `Tháng ${i + 1}`,
    value: i + 1,
  }));

  yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  summaryCards: any[] = [];

  private STATUS_LABELS: Record<string, string> = {
    PENDING: 'Chờ xác nhận',
    CONFIRMED: 'Đã xác nhận',
    SHIPPING: 'Đang giao',
    COMPLETED: 'Hoàn tất',
    CANCELED: 'Đã hủy',
  };

  private STATUS_COLORS: Record<string, string> = {
    PENDING: '#6c757d',
    CONFIRMED: '#0d6efd',
    SHIPPING: '#20c997',
    COMPLETED: '#198754',
    CANCELED: '#dc3545',
  };

  constructor(private dashboardService: DashboardService) { }

  ngAfterViewInit(): void {
    this.loadData();
  }

  onFilterChange() {
    this.loadData();
  }

  private loadData() {
    const month = this.viewAllYear ? undefined : this.selectedMonth;
    const year = this.selectedYear;

    this.dashboardService.getSystemStatistics(month, year).subscribe({
      next: (res) => {
        // Xử lý linh hoạt: res.data (nếu có wrapper) hoặc res trực tiếp
        const data = (res as any).data || res; 
        if (data) {
          this.updateSummaryCards(data.summary);
          this.renderCharts(data);
        }
      },
      error: (err) => {
        console.error('Load dashboard failed', err);
      },
    });
  }

  private updateSummaryCards(summary: any) {
    if (!summary) return;
    this.summaryCards = [
      { label: 'Tổng đơn hàng', value: summary.totalOrders?.toLocaleString() || '0', icon: 'bi bi-box-seam text-primary', textClass: 'text-primary' },
      { label: 'Đã giao thành công', value: summary.deliveredOrders?.toLocaleString() || '0', icon: 'bi bi-truck text-success', textClass: 'text-success' },
      { label: 'Đã hủy / Hoàn', value: summary.canceledOrders?.toLocaleString() || '0', icon: 'bi bi-x-circle text-danger', textClass: 'text-danger' },
      { label: 'Đơn hôm nay', value: summary.todayOrders || 0, icon: 'bi bi-lightning-charge text-warning', textClass: 'text-warning' },
      { label: 'Doanh thu hôm nay', value: `${(summary.todayRevenue || 0).toLocaleString()}₫`, icon: 'bi bi-currency-dollar text-success', textClass: 'text-success' },
      { label: 'Nhân viên hoạt động', value: summary.activeEmployees || 0, sub: `/ ${summary.totalEmployees || 0} tổng`, icon: 'bi bi-people text-info', textClass: 'text-info' },
      { label: 'Tỷ lệ COD', value: (summary.codRate || 0) + '%', icon: 'bi bi-cash-stack text-purple', textClass: 'text-purple' },
      { label: 'Tỷ lệ giao thành công', value: (summary.successRate || 0) + '%', icon: 'bi bi-check2-all text-success', textClass: 'text-success' },
      { label: 'Đơn kẹt > 48h', value: summary.stuckOrders48h || 0, icon: 'bi bi-exclamation-triangle text-danger', textClass: 'text-danger' },
      { label: 'Bảng giá đang áp dụng', value: summary.activePricingTables || 0, icon: 'bi bi-table text-secondary', textClass: 'text-secondary' },
    ];
  }

  private renderCharts(data: any) {
    this.destroyAllCharts();

    if (!data.charts) return;

    // 1. Doanh thu + Số đơn theo ngày
    const days = data.charts.dailyLabels || [];
    const labels = days.map((d: number) => `Ngày ${d}`);

    this.charts.push(new Chart(this.revenueOrderChart.nativeElement, {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Số đơn',
            data: data.charts.dailyOrders || [],
            borderColor: '#0d6efd',
            backgroundColor: 'rgba(13, 110, 253, 0.1)',
            yAxisID: 'y',
            tension: 0.3,
            fill: true,
          },
          {
            label: 'Doanh thu (₫)',
            data: data.charts.dailyRevenue || [],
            borderColor: '#198754',
            backgroundColor: 'rgba(25, 135, 84, 0.1)',
            yAxisID: 'y1',
            tension: 0.3,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'top' } },
        scales: {
          y: { beginAtZero: true, position: 'left', title: { display: true, text: 'Số đơn' } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, title: { display: true, text: 'Doanh thu' } },
        },
      },
    }));

    // 2. Tỷ lệ trạng thái
    const statusData = data.charts.statusDistribution || {};
    const statusLabels = Object.keys(statusData).filter(k => statusData[k] > 0);
    const statusValues = statusLabels.map(k => statusData[k]);
    const statusColors = statusLabels.map(k => this.STATUS_COLORS[k] || '#ccc');

    this.charts.push(new Chart(this.statusChartEl.nativeElement, {
      type: 'doughnut',
      data: {
        labels: statusLabels.map(k => this.STATUS_LABELS[k] || k),
        datasets: [{ data: statusValues, backgroundColor: statusColors }],
      },
      options: {
        responsive: true,
        plugins: { legend: { position: 'bottom' } },
      },
    }));

    // 3. Top 10 nhân viên
    const topEmp = data.charts?.topEmployees || [];

    if (topEmp.length === 0) {
      const ctx = this.topEmployeesChart.nativeElement.getContext('2d');
      if (ctx) {
          ctx.clearRect(0, 0, this.topEmployeesChart.nativeElement.width, this.topEmployeesChart.nativeElement.height);
          ctx.font = '14px Inter';
          ctx.fillStyle = '#6c757d';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(
            'Chưa có dữ liệu nhân viên',
            this.topEmployeesChart.nativeElement.width / 2,
            this.topEmployeesChart.nativeElement.height / 2
          );
      }
    } else {
      this.charts.push(new Chart(this.topEmployeesChart.nativeElement, {
        type: 'bar',
        data: {
          labels: topEmp.map((e: any) => e.name),
          datasets: [{
            label: 'Số đơn giao thành công',
            data: topEmp.map((e: any) => e.completed),
            backgroundColor: '#198754',
            barThickness: 20,
          }],
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (ctx) => ` ${ctx.raw} đơn hoàn tất`,
              },
            },
          },
          scales: { 
            x: { 
                beginAtZero: true, 
                ticks: { stepSize: 1 } 
            } 
          },
        },
      }));
    }
  }

  private destroyAllCharts() {
    this.charts.forEach(c => c.destroy());
    this.charts = [];
  }

  ngOnDestroy(): void {
    this.destroyAllCharts();
  }
}