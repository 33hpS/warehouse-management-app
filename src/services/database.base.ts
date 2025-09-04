import { IDatabaseService, DatabaseConfig } from './database.types';
import { Material, Order, Reception } from '../types';

// Абстрактный базовый класс для всех провайдеров БД
export abstract class BaseDatabaseService implements IDatabaseService {
  public config: DatabaseConfig;
  protected isInitialized: boolean = false;

  constructor(config: DatabaseConfig) {
    this.config = config;
  }

  // Абстрактные методы - должны быть реализованы в наследниках
  abstract initialize(): Promise<void>;
  abstract isConnected(): boolean;
  abstract getCurrentUser(): any;

  // Материалы
  abstract getMaterials(): Promise<Material[]>;
  abstract getMaterialById(id: string): Promise<Material | null>;
  abstract addMaterial(material: Omit<Material, 'id'>): Promise<Material>;
  abstract updateMaterial(id: string, updates: Partial<Material>): Promise<void>;
  abstract deleteMaterial(id: string): Promise<void>;
  abstract receiveMaterial(materialId: string, quantity: number, comment?: string): Promise<void>;
  abstract reorderMaterials(materials: Material[]): Promise<void>;

  // Заказы
  abstract getOrders(): Promise<Order[]>;
  abstract getOrderById(id: string): Promise<Order | null>;
  abstract addOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order>;
  abstract updateOrder(id: string, updates: Partial<Order>): Promise<void>;
  abstract deleteOrder(id: string): Promise<void>;

  // Приемки
  abstract getReceptionHistory(materialName: string): Promise<Reception[]>;
  abstract addReception(reception: Omit<Reception, 'id'>): Promise<Reception>;
  abstract updateReception(id: string, updates: Partial<Reception>): Promise<void>;
  abstract deleteReception(id: string): Promise<void>;

  // Подписки (опциональные)
  subscribeMaterials?(callback: (materials: Material[]) => void): () => void;
  subscribeOrders?(callback: (orders: Order[]) => void): () => void;

  // Общие утилиты
  protected generateId(): string {
    return Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
  }

  protected logError(operation: string, error: any): void {
    console.error(`Database error in ${operation}:`, error);
  }

  protected validateMaterial(material: Partial<Material>): boolean {
    return !!(material.name && material.unit && 
             typeof material.currentStock === 'number' && 
             typeof material.minStock === 'number');
  }

  protected validateOrder(order: Partial<Order>): boolean {
    return !!(order.orderNumber && order.status);
  }
}