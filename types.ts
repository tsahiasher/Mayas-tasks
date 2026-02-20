
export interface Category {
  id: string;
  name: string;
  color: string;
  order: number;
}

export interface Task {
  id: string;
  title: string;
  categoryId: string;
  deadline: string;
  color: string;
  icon: string;
  createdAt: number;
  order: number;
  isArchived: boolean;
}
