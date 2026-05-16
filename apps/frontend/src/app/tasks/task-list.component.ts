import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatChipsModule } from '@angular/material/chips';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Task, TaskStatus } from './task.model';
import { TaskService } from './task.service';
import { AuthService } from '../auth/auth.service';
import { TaskFormDialogComponent } from './task-form-dialog.component';

type FilterOption = 'All' | TaskStatus;

const STATUS_GROUPS: { status: TaskStatus; label: string }[] = [
  { status: 'InProgress', label: 'In progress' },
  { status: 'Todo', label: 'To do' },
  { status: 'Done', label: 'Done' },
];

@Component({
  selector: 'app-task-list',
  standalone: true,
  imports: [
    CommonModule,
    MatChipsModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
  ],
  template: `
    <div style="padding: 1.5rem;">
      <!-- Header -->
      <div
        style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;"
      >
        <h1
          style="font-size: 1.5rem; font-weight: 600; margin: 0; color: var(--mat-sys-on-surface)"
        >
          All tasks
        </h1>
        <button mat-raised-button (click)="openCreate()">+ New task</button>
      </div>

      <!-- Filter chips -->
      <mat-chip-listbox
        (change)="onFilterChange($event.value)"
        style="margin-bottom: 1.5rem; display: block;"
        aria-label="Filter by status"
      >
        <mat-chip-option value="All" [selected]="activeFilter() === 'All'"
          >All</mat-chip-option
        >
        <mat-chip-option value="Todo" [selected]="activeFilter() === 'Todo'"
          >To do</mat-chip-option
        >
        <mat-chip-option
          value="InProgress"
          [selected]="activeFilter() === 'InProgress'"
          >In progress</mat-chip-option
        >
        <mat-chip-option value="Done" [selected]="activeFilter() === 'Done'"
          >Done</mat-chip-option
        >
      </mat-chip-listbox>

      <!-- Task groups -->
      @if (tasks().length === 0 && !loading()) {
        <p style="color: var(--mat-sys-on-surface-variant)">No tasks found.</p>
      }

      @for (group of visibleGroups(); track group.status) {
        @if (tasksForGroup(group.status).length > 0) {
          <section style="margin-bottom: 1.5rem;">
            <div
              style="font-size: 0.875rem; font-weight: 500; margin-bottom: 0.5rem; color: var(--mat-sys-on-surface-variant)"
            >
              {{ group.label }}
            </div>
            @for (task of tasksForGroup(group.status); track task.id) {
              <div
                style="display: flex; align-items: center; gap: 0.75rem; padding: 0.625rem 0.75rem; margin-bottom: 4px; border: 1px solid var(--mat-sys-outline-variant); border-radius: 8px; background: var(--mat-sys-surface);"
              >
                <span
                  style="flex: 1; font-size: 0.875rem; color: var(--mat-sys-on-surface);"
                  [style.text-decoration]="
                    task.status === 'Done' ? 'line-through' : 'none'
                  "
                >
                  {{ task.title }}
                </span>
                <mat-chip style="font-size: 0.75rem;">{{
                  statusLabel(task.status)
                }}</mat-chip>
                @if (task.category) {
                  <mat-chip style="font-size: 0.75rem;">{{
                    task.category
                  }}</mat-chip>
                }
                @if (auth.canModify(task)) {
                  <button
                    mat-icon-button
                    matTooltip="Edit"
                    (click)="openEdit(task)"
                  >
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button
                    mat-icon-button
                    matTooltip="Delete"
                    (click)="deleteTask(task)"
                  >
                    <mat-icon>delete</mat-icon>
                  </button>
                }
              </div>
            }
          </section>
        }
      }
    </div>
  `,
})
export class TaskListComponent implements OnInit {
  readonly tasks = signal<Task[]>([]);
  readonly loading = signal(false);
  readonly activeFilter = signal<FilterOption>('All');

  readonly visibleGroups = computed(() =>
    this.activeFilter() === 'All'
      ? STATUS_GROUPS
      : STATUS_GROUPS.filter((g) => g.status === this.activeFilter()),
  );

  public auth = inject(AuthService);
  private taskService = inject(TaskService);
  private dialog = inject(MatDialog);
  private snackBar = inject(MatSnackBar);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.taskService.getTasks().subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: () => {
        this.snackBar.open('Failed to load tasks.', 'Dismiss', {
          duration: 4000,
        });
        this.loading.set(false);
      },
    });
  }

  tasksForGroup(status: TaskStatus): Task[] {
    return this.tasks().filter((t) => t.status === status);
  }

  statusLabel(status: TaskStatus): string {
    return { Todo: 'To do', InProgress: 'In progress', Done: 'Done' }[status];
  }

  onFilterChange(value: FilterOption): void {
    this.activeFilter.set(value ?? 'All');
  }

  openCreate(): void {
    this.dialog
      .open(TaskFormDialogComponent, { data: {} })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.taskService.createTask(result).subscribe({
          next: (task) => this.tasks.update((ts) => [...ts, task]),
          error: () =>
            this.snackBar.open('Failed to create task.', 'Dismiss', {
              duration: 4000,
            }),
        });
      });
  }

  openEdit(task: Task): void {
    this.dialog
      .open(TaskFormDialogComponent, { data: { task } })
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.taskService.updateTask(task.id, result).subscribe({
          next: (updated) =>
            this.tasks.update((ts) =>
              ts.map((t) => (t.id === updated.id ? updated : t)),
            ),
          error: () =>
            this.snackBar.open('Failed to update task.', 'Dismiss', {
              duration: 4000,
            }),
        });
      });
  }

  deleteTask(task: Task): void {
    this.taskService.deleteTask(task.id).subscribe({
      next: () => this.tasks.update((ts) => ts.filter((t) => t.id !== task.id)),
      error: () =>
        this.snackBar.open('Failed to delete task.', 'Dismiss', {
          duration: 4000,
        }),
    });
  }
}
