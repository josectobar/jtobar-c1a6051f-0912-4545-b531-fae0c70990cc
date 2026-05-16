import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Task, CreateTaskDto, UpdateTaskDto } from './task.model';
import { inject } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class TaskService {
  private base = `${environment.apiUrl}/tasks`;
  private http = inject(HttpClient);

  getTasks(): Observable<Task[]> {
    return this.http.get<Task[]>(this.base);
  }

  createTask(dto: CreateTaskDto): Observable<Task> {
    return this.http.post<Task>(this.base, dto);
  }

  updateTask(id: number, dto: UpdateTaskDto): Observable<Task> {
    return this.http.patch<Task>(`${this.base}/${id}`, dto);
  }

  deleteTask(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }
}
