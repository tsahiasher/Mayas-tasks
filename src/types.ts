
export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  deadline: string;
  createdAt: number;
  isArchived: boolean;
}
