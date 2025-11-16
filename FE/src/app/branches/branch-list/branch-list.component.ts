import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { BranchService } from '../../services/branch.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-branch-list',
  standalone: true,
  templateUrl: './branch-list.component.html',
  imports: [CommonModule, FormsModule, RouterLink],
})
export class BranchListComponent implements OnInit {
  branches: any[] = [];
  filteredBranches: any[] = [];
  keyword: string = '';
  msg: string = '';
  isLoading = false;

  constructor(private branchService: BranchService) {}

  ngOnInit() {
    this.keyword = '';
    this.loadData();
  }

  loadData() {
    this.isLoading = true;
    this.branchService.findAll().then(
      (res: any) => {
        const data = res?.data ?? res; // Kiểm tra lại cách trả về dữ liệu
        console.log('Dữ liệu API:', data);

        if (Array.isArray(data?.results)) {
          // Kiểm tra chính xác mảng kết quả
          this.branches = data.results;
        } else {
          this.branches = [];
        }

        this.filteredBranches = this.branches;
        this.isLoading = false;
        console.log('Dữ liệu sau khi tải:', this.filteredBranches); // Kiểm tra sau khi gán
      },
      (err) => {
        console.log('Lỗi khi gọi API:', err); // Log lỗi nếu có
        this.msg = 'Không tải được danh sách chi nhánh';
        this.isLoading = false;
      }
    );
  }

  search() {
    const term = this.keyword.trim().toLowerCase();

    if (term === '') {
      this.filteredBranches = this.branches;
      return;
    }

    this.filteredBranches = this.branches.filter((b) => {
      return (
        b.code?.toLowerCase().includes(term) ||
        b.name?.toLowerCase().includes(term) ||
        b.city?.toLowerCase().includes(term) ||
        b.province?.toLowerCase().includes(term) ||
        b.address?.toLowerCase().includes(term)
      );
    });
  }

  delete(id: string) {
    if (window.confirm('Bạn có chắc chắn muốn xoá chi nhánh này?')) {
      this.branchService.delete(id).then(
        (res) => {
          this.msg = 'Xoá thành công';
          this.loadData(); // load lại giống bạn dùng this.ngOnInit()
        },
        (err) => {
          console.log(err);
          this.msg = 'Xoá thất bại';
        }
      );
    }
  }
}
