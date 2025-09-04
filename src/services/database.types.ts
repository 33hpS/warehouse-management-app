// Базовые типы для работы с БД
import { Material, Order, Reception, OrderStatus } from '../types';

// Интерфейс для работы с материалами
export interface IMaterialsService {
  // Получение данных
  getMaterials(): Promise<Material[]>;
  getMaterialById(id: string): Promise<Material | null>;
  
  // CRUD операции
  addMaterial(material: Omit<Material, 'id'>): Promise<Material>;
  updateMaterial(id: string, updates: Partial<Material>): Promise<void>;
  deleteMaterial(id: string): Promise<void>;
  
  // Специальные операции
  receiveMaterial(materialId: string, quantity: number, comment?: string): Promise<void>;
  reorderMaterials(materials: Material[]): Promise<void>;
}

// Интерфейс для работы с заказами
export interface IOrdersService {
  // Получение данных
  getOrders(): Promise<Order[]>;
  getOrderById(id: string): Promise<Order | null>;
  
  // CRUD операции
  addOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  updateOrder(id: string, updates: Partial<Order>): Promise<void>;
  deleteOrder(id: string): Promise<void>;
}

// Интерфейс для работы с приемками
export interface IReceptionsService {
  // Получение данных
  getReceptionHistory(materialId: string): Promise<Reception[]>;
  
  // CRUD операции
  addReception(reception: Omit<Reception, 'id'>): Promise<Reception>;
  updateReception(id: string, updates: Partial<Reception>): Promise<void>;
  deleteReception(id: string): Promise<void>;
}

// Основной интерфейс базы данных
export interface IDatabaseService extends IMaterialsService, IOrdersService, IReceptionsService {
  // Инициализация и конфигурация
  initialize(): Promise<void>;
  isConnected(): boolean;
  config: DatabaseConfig;
  
  // Авторизация (если нужна)
  getCurrentUser(): any;
  signIn?(email: string, password: string): Promise<any>;
  signOut?(): Promise<void>;
  
  // Подписки на изменения (для реал-тайм обновлений)
  subscribeMaterials?(callback: (materials: Material[]) => void): () => void;
  subscribeOrders?(callback: (orders: Order[]) => void): () => void;
}

// Конфигурация для разных провайдеров
export interface DatabaseConfig {
  provider: 'firebase' | 'supabase' | 'demo';
  config: any;
}

// Типы для результатов операций
export type DatabaseResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// Типы для пагинации и фильтрации
export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'asc' | 'desc';
  where?: Array<{
    field: string;
    operator: '==' | '!=' | '<' | '<=' | '>' | '>=' | 'in' | 'contains';
    value: any;
  }>;
}

// Расширенные методы с опциями
export interface IAdvancedDatabaseService extends IDatabaseService {
  getMaterialsWithQuery(options: QueryOptions): Promise<Material[]>;
  getOrdersWithQuery(options: QueryOptions): Promise<Order[]>;
  
  // Batch операции
  batchUpdateMaterials(updates: Array<{ id: string; data: Partial<Material> }>): Promise<void>;
  batchAddMaterials(materials: Array<Omit<Material, 'id'>>): Promise<Material[]>;
}