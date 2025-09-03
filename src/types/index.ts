export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
}

export interface Receipt {
  id: string;
  quantity: number;
  price: number;
  date: any; // Firestore Timestamp
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: any; // Firestore Timestamp
}

export interface TechCardItem {
  materialId: string;
  name: string;
  quantity: number;
  unit: string;
  status?: 'Найден' | 'Не найден';
}

export type OrderStatus = 'В работе' | 'Выполнен' | 'Отменен';
export type NotificationType = 'success' | 'error' | 'warning' | 'info';
export type PageType = 'dashboard' | 'materials' | 'orders';
