import { CommonModule, DatePipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { StaffService } from '../../../../services/staff.service'; 

@Component({
  selector: 'app-staff-detail',
  standalone: true,
  templateUrl: './staff-detail.component.html',
  imports: [CommonModule, DatePipe],
})
export class StaffDetailComponent implements OnInit {
  isLoading = false;
  error = '';
  staff: any;

  constructor(
    private staffService: StaffService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');

    if (!id) {
      this.error = 'Không tìm thấy nhân viên.';
      return;
    }

    this.loadStaff(id);
  }

  private loadStaff(id: string) {
    this.isLoading = true;

    this.staffService
      .findById(id) 
      .then((res: any) => {
        this.staff = res.data ?? res;
        this.isLoading = false;
      })
      .catch((err) => {
        console.error(err);
        this.error =
          err?.error?.message || 'Không tải được dữ liệu nhân viên.';
        this.isLoading = false;
      });
  }

  backToList() {
    this.router.navigate(['/admin/staff']); 
  }
}
