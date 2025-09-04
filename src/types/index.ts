export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  order?: number; // для сортировки
}

export interface Receipt {
  id: string;
  quantity: number;
  price: number;
  date: any; // Firestore Timestamp
}

export interface Reception {
  id: string;
  materialId?: string;
  materialName: string;
  quantity: number;
  comment?: string;
  date: any; // Firestore Timestamp
  userId?: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: any; // Firestore Timestamp
  items?: Array<{
    materialId: string;
    quantity: number;
    source?: 'manual' | 'tech-card';
    techCardName?: string;
  }>;
  techCards?: Array<{
    name: string;
    data?: any;
    customName?: string;
    rows?: any[];
  }>;
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
