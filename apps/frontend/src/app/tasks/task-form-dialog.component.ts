import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, NonNullableFormBuilder, Validators, FormGroup, FormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { Task, TaskStatus } from './task.model';

export interface TaskFormDialogData {
  task?: Task;
}

interface TaskForm {
  title: FormControl<string>;
  status: FormControl<TaskStatus>;
  category: FormControl<string>;
}

@Component({
  selector: 'app-task-form-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatButtonModule],
  template: `
    <h2 mat-dialog-title>{{ data.task ? 'Edit task' : 'New task' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-4 pt-2 min-w-80">
        <mat-form-field>
          <mat-label>Title</mat-label>
          <input matInput formControlName="title" />
          @if (form.controls.title.invalid && form.controls.title.touched) {
            <mat-error>Title is required</mat-error>
          }
        </mat-form-field>
        <mat-form-field>
          <mat-label>Status</mat-label>
          <mat-select formControlName="status">
            <mat-option value="Todo">To do</mat-option>
            <mat-option value="InProgress">In progress</mat-option>
            <mat-option value="Done">Done</mat-option>
          </mat-select>
        </mat-form-field>
        <mat-form-field>
          <mat-label>Category (optional)</mat-label>
          <input matInput formControlName="category" />
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button (click)="save()">Save</button>
    </mat-dialog-actions>
  `,
})
export class TaskFormDialogComponent {
  readonly data = inject<TaskFormDialogData>(MAT_DIALOG_DATA);
  private dialogRef = inject(MatDialogRef<TaskFormDialogComponent>);
  readonly form: FormGroup<TaskForm>;

  constructor(fb: NonNullableFormBuilder) {
    this.form = fb.group<TaskForm>({
      title: fb.control(this.data.task?.title ?? '', Validators.required),
      status: fb.control<TaskStatus>(this.data.task?.status ?? 'Todo'),
      category: fb.control(this.data.task?.category ?? ''),
    });
  }

  save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { title, status, category } = this.form.getRawValue();
    this.dialogRef.close({ title, status, category: category || null });
  }
}
