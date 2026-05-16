export type TaskStatus = 'Todo' | 'InProgress' | 'Done';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  category: string | null;
  createdById: number | null;
  createdAt: string;
}

export interface CreateTaskDto {
  title: string;
  status?: TaskStatus;
  category?: string;
}

export interface UpdateTaskDto {
  title?: string;
  status?: TaskStatus;
  category?: string;
}
