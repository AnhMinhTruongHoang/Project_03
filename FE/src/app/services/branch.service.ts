import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { lastValueFrom } from 'rxjs';
import { env } from '../environments/environment'; // chỉnh path cho đúng

@Injectable({
  providedIn: 'root',
})
export class BranchService {
  constructor(private httpClient: HttpClient) {}

  // GET /branches?current=&pageSize=&...
  findAll() {
    const params = new HttpParams().set('pageSize', '9999');
    return lastValueFrom(this.httpClient.get(env.baseUrl + '/branches', { params }));
  }

  // GET /branches/:id
  findById(id: string) {
    return lastValueFrom(this.httpClient.get(env.baseUrl + '/branches/' + id));
  }

  // POST /branches
  create(branch: any) {
    return lastValueFrom(this.httpClient.post(env.baseUrl + '/branches', branch));
  }

  // PATCH /branches/:id
  update(id: string, branch: any) {
    return lastValueFrom(this.httpClient.patch(env.baseUrl + '/branches/' + id, branch));
  }

  // DELETE /branches/:id  (soft delete)
  delete(id: string) {
    return lastValueFrom(this.httpClient.delete(env.baseUrl + '/branches/' + id));
  }

  // PATCH /branches/:id/restore
  restore(id: string) {
    return lastValueFrom(this.httpClient.patch(env.baseUrl + '/branches/' + id + '/restore', {}));
  }

  // DELETE /branches/:id/force  (hard delete)
  hardDelete(id: string) {
    return lastValueFrom(this.httpClient.delete(env.baseUrl + '/branches/' + id + '/force'));
  }
}
