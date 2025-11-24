import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { env } from '../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StaffService {
  constructor(private httpClient: HttpClient) {}

  // GET /users?current=&pageSize=&role=STAFF
  findAll() {
    const params = new HttpParams()
      .set('current', '1')
      .set('pageSize', '9999')
      .set('role', 'STAFF')
      .set('populate', 'branchId');

    return lastValueFrom(this.httpClient.get(env.baseUrl + '/users', { params }));
  }

  // Lấy danh sách nhân viên đã xoá mềm
  // GET /users/trash?role=STAFF&populate=branchId
  getTrash() {
    const params = new HttpParams().set('role', 'STAFF').set('populate', 'branchId');

    return lastValueFrom(this.httpClient.get<any>(env.baseUrl + '/users/trash', { params })).then(
      (res) => res.data
    ); // <-- chỉ trả về mảng user
  }

  // GET /users/:id
  findById(id: string) {
    return lastValueFrom(this.httpClient.get<any>(env.baseUrl + '/users/' + id)).then(
      (res) => res.data
    );
  }

  // POST /users  (admin tạo user/staff)
  create(staff: any) {
    return lastValueFrom(this.httpClient.post(env.baseUrl + '/users', staff));
  }

  // PATCH /users/:id
  update(id: string, staff: any) {
    return lastValueFrom(this.httpClient.patch(env.baseUrl + '/users/' + id, staff));
  }

  // DELETE /users/:id  (soft delete)
  delete(id: string) {
    return lastValueFrom(this.httpClient.delete(env.baseUrl + '/users/' + id));
  }

  // PATCH /users/:id/restore  (khôi phục từ thùng rác)
  restore(id: string) {
    return lastValueFrom(this.httpClient.patch(env.baseUrl + `/users/${id}/restore`, {}));
  }

  // DELETE /users/:id/hard  (xoá vĩnh viễn)
  hardDelete(id: string) {
    return lastValueFrom(this.httpClient.delete(env.baseUrl + `/users/${id}/hard`));
  }
}
