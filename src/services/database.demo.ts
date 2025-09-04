import { BaseDatabaseService } from './database.base';
import { Material, Order, Reception, OrderStatus } from '../types';

// Демо-реализация для работы без внешней БД
export class DemoDatabaseService extends BaseDatabaseService {
  private materials: Material[] = [];
  private orders: Order[] = [];
  private receptions: Reception[] = [];
  private currentUser = { id: 'demo-user', email: 'demo@example.com' };

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    // Инициализируем демо-данные
    this.materials = [
      {
        id: 'mat1', name: 'Арматура 12мм', category: 'Металл', unit: 'м',
        currentStock: 150, minStock: 50, order: 1
      },
      {
        id: 'mat2', name: 'Цемент М400', category: 'Стройматериалы', unit: 'мешок',
        currentStock: 20, minStock: 10, order: 2
      },
      {
        id: 'mat3', name: 'Доска 25x150', category: 'Дерево', unit: 'м',
        currentStock: 80, minStock: 30, order: 3
      },
      {
        id: 'mat4', name: 'Кирпич красный', category: 'Стройматериалы', unit: 'шт',
        currentStock: 5, minStock: 100, order: 4
      },
      {
        id: 'mat5', name: 'Песок', category: 'Сыпучие', unit: 'м³',
        currentStock: 15, minStock: 20, order: 5
      }
    ];

    this.orders = [
      {
        id: 'ord1', orderNumber: 'ЗК-001', status: 'В работе',
        createdAt: new Date(), items: [], techCards: []
      },
      {
        id: 'ord2', orderNumber: 'ЗК-002', status: 'Выполнен',
        createdAt: new Date(Date.now() - 86400000), items: [], techCards: []
      }
    ];

    // Демо-приемки для арматуры
    this.receptions = [
      {
        id: 'rec1', materialName: 'Арматура 12мм', quantity: 100,
        comment: 'Поставка от ООО "Металл"', date: new Date(Date.now() - 172800000)
      },
      {
        id: 'rec2', materialName: 'Арматура 12мм', quantity: 50,
        comment: 'Доставка со склада', date: new Date(Date.now() - 86400000)
      }
    ];

    this.isInitialized = true;
  }

  isConnected(): boolean {
    return this.isInitialized;
  }

  getCurrentUser(): any {
    return this.currentUser;
  }

  // === МАТЕРИАЛЫ ===
  async getMaterials(): Promise<Material[]> {
    return [...this.materials].sort((a, b) => (a.order || 999) - (b.order || 999));
  }

  async getMaterialById(id: string): Promise<Material | null> {
    return this.materials.find(m => m.id === id) || null;
  }

  async addMaterial(material: Omit<Material, 'id'>): Promise<Material> {
    const newMaterial: Material = {
      ...material,
      id: this.generateId(),
      order: Math.max(...this.materials.map(m => m.order || 0), 0) + 1
    };
    this.materials.push(newMaterial);
    return newMaterial;
  }

  async updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
    const index = this.materials.findIndex(m => m.id === id);
    if (index !== -1) {
      this.materials[index] = { ...this.materials[index], ...updates };
    }
  }

  async deleteMaterial(id: string): Promise<void> {
    this.materials = this.materials.filter(m => m.id !== id);
  }

  async receiveMaterial(materialId: string, quantity: number, comment?: string): Promise<void> {
    // Обновляем остаток
    const material = this.materials.find(m => m.id === materialId);
    if (material) {
      material.currentStock += quantity;
      
      // Добавляем запись о приемке
      this.receptions.push({
        id: this.generateId(),
        materialId,
        materialName: material.name,
        quantity,
        comment: comment || '',
        date: new Date()
      });
    }
  }

  async reorderMaterials(materials: Material[]): Promise<void> {
    materials.forEach((material, index) => {
      const existing = this.materials.find(m => m.id === material.id);
      if (existing) {
        existing.order = index + 1;
      }
    });
  }

  // === ЗАКАЗЫ ===
  async getOrders(): Promise<Order[]> {
    return [...this.orders].sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getOrderById(id: string): Promise<Order | null> {
    return this.orders.find(o => o.id === id) || null;
  }

  async addOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    const newOrder: Order = {
      ...order,
      id: this.generateId(),
      createdAt: new Date()
    };
    this.orders.push(newOrder);
    return newOrder;
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    const index = this.orders.findIndex(o => o.id === id);
    if (index !== -1) {
      this.orders[index] = { ...this.orders[index], ...updates };
    }
  }

  async deleteOrder(id: string): Promise<void> {
    this.orders = this.orders.filter(o => o.id !== id);
  }

  // === ПРИЕМКИ ===
  async getReceptionHistory(materialName: string): Promise<Reception[]> {
    return this.receptions
      .filter(r => r.materialName.toLowerCase().includes(materialName.toLowerCase()))
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async addReception(reception: Omit<Reception, 'id'>): Promise<Reception> {
    const newReception: Reception = {
      ...reception,
      id: this.generateId()
    };
    this.receptions.push(newReception);
    return newReception;
  }

  async updateReception(id: string, updates: Partial<Reception>): Promise<void> {
    const index = this.receptions.findIndex(r => r.id === id);
    if (index !== -1) {
      this.receptions[index] = { ...this.receptions[index], ...updates };
    }
  }

  async deleteReception(id: string): Promise<void> {
    this.receptions = this.receptions.filter(r => r.id !== id);
  }
}