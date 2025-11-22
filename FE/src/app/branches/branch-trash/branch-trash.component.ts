import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BranchService } from '../../services/branch.service';

@Component({
  selector: 'app-branch-trash',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './branch-trash.component.html',
})
export class BranchTrashComponent implements OnInit {
  branches: any[] = [];
  isLoading = false;

  constructor(private branchService: BranchService, private toastr: ToastrService) {}

  ngOnInit(): void {
    this.loadTrash();
  }

  loadTrash() {
    this.isLoading = true;

    this.branchService
      .findTrash()
      .then((branches: any[]) => {
        console.log('trash data = ', branches); // lúc này là Array(4)
        this.branches = branches; // gán mảng
        this.isLoading = false;
      })
      .catch((err) => {
        this.isLoading = false;
        this.toastr.error('Không tải được thùng rác chi nhánh');
        console.error(err);
      });
  }

  restore(id: string) {
    if (!confirm('Khôi phục chi nhánh này?')) return;

    this.isLoading = true;
    this.branchService
      .restore(id)
      .then(() => {
        this.toastr.success('Đã khôi phục chi nhánh');
        this.loadTrash();
      })
      .catch((err) => {
        this.isLoading = false;
        this.toastr.error('Khôi phục thất bại');
        console.error(err);
      });
  }

  hardDelete(id: string) {
    if (!confirm('Xoá vĩnh viễn? Dữ liệu sẽ không thể khôi phục.')) return;

    this.isLoading = true;
    this.branchService
      .hardDelete(id)
      .then(() => {
        this.toastr.success('Đã xoá vĩnh viễn chi nhánh');
        this.loadTrash();
      })
      .catch((err) => {
        this.isLoading = false;
        this.toastr.error('Xoá vĩnh viễn thất bại');
        console.error(err);
      });
  }
}
