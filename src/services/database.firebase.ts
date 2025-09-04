import { 
  Firestore, 
  collection, 
  doc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDocs, 
  getDoc, 
  query, 
  orderBy, 
  where, 
  Timestamp,
  onSnapshot,
  writeBatch
} from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';
import { BaseDatabaseService } from './database.base';
import { Material, Order, Reception } from '../types';

export class FirebaseDatabaseService extends BaseDatabaseService {
  private db: Firestore;
  private currentUser: FirebaseUser | null = null;

  constructor(db: Firestore, user: FirebaseUser | null = null) {
    super({ provider: 'firebase', config: {} });
    this.db = db;
    this.currentUser = user;
  }

  async initialize(): Promise<void> {
    if (!this.db) {
      throw new Error('Firestore instance not provided');
    }
    this.isInitialized = true;
  }

  isConnected(): boolean {
    return this.isInitialized && !!this.db;
  }

  getCurrentUser(): FirebaseUser | null {
    return this.currentUser;
  }

  // === МАТЕРИАЛЫ ===
  async getMaterials(): Promise<Material[]> {
    try {
      const materialsRef = collection(this.db, 'materials');
      const q = query(materialsRef, orderBy('order', 'asc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
    } catch (error) {
      this.logError('getMaterials', error);
      return [];
    }
  }

  async getMaterialById(id: string): Promise<Material | null> {
    try {
      const docRef = doc(this.db, 'materials', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Material;
      }
      return null;
    } catch (error) {
      this.logError('getMaterialById', error);
      return null;
    }
  }

  async addMaterial(material: Omit<Material, 'id'>): Promise<Material> {
    try {
      if (!this.validateMaterial(material)) {
        throw new Error('Invalid material data');
      }

      const materialsRef = collection(this.db, 'materials');
      const docRef = await addDoc(materialsRef, {
        ...material,
        order: material.order || Date.now()
      });

      return { id: docRef.id, ...material };
    } catch (error) {
      this.logError('addMaterial', error);
      throw error;
    }
  }

  async updateMaterial(id: string, updates: Partial<Material>): Promise<void> {
    try {
      const docRef = doc(this.db, 'materials', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      this.logError('updateMaterial', error);
      throw error;
    }
  }

  async deleteMaterial(id: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'materials', id);
      await deleteDoc(docRef);
    } catch (error) {
      this.logError('deleteMaterial', error);
      throw error;
    }
  }

  async receiveMaterial(materialId: string, quantity: number, comment?: string): Promise<void> {
    try {
      // Получаем текущие данные материала
      const material = await this.getMaterialById(materialId);
      if (!material) throw new Error('Material not found');

      // Обновляем остаток
      await this.updateMaterial(materialId, {
        currentStock: material.currentStock + quantity
      });

      // Добавляем запись о приемке
      await this.addReception({
        materialId,
        materialName: material.name,
        quantity,
        comment: comment || '',
        date: Timestamp.now()
      });
    } catch (error) {
      this.logError('receiveMaterial', error);
      throw error;
    }
  }

  async reorderMaterials(materials: Material[]): Promise<void> {
    try {
      const batch = writeBatch(this.db);
      
      materials.forEach((material, index) => {
        const docRef = doc(this.db, 'materials', material.id);
        batch.update(docRef, { order: index + 1 });
      });

      await batch.commit();
    } catch (error) {
      this.logError('reorderMaterials', error);
      throw error;
    }
  }

  // === ЗАКАЗЫ ===
  async getOrders(): Promise<Order[]> {
    try {
      const ordersRef = collection(this.db, 'orders');
      const q = query(ordersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
    } catch (error) {
      this.logError('getOrders', error);
      return [];
    }
  }

  async getOrderById(id: string): Promise<Order | null> {
    try {
      const docRef = doc(this.db, 'orders', id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as Order;
      }
      return null;
    } catch (error) {
      this.logError('getOrderById', error);
      return null;
    }
  }

  async addOrder(order: Omit<Order, 'id' | 'createdAt'>): Promise<Order> {
    try {
      if (!this.validateOrder(order)) {
        throw new Error('Invalid order data');
      }

      const ordersRef = collection(this.db, 'orders');
      const docRef = await addDoc(ordersRef, {
        ...order,
        createdAt: Timestamp.now()
      });

      return { 
        id: docRef.id, 
        ...order, 
        createdAt: Timestamp.now() 
      };
    } catch (error) {
      this.logError('addOrder', error);
      throw error;
    }
  }

  async updateOrder(id: string, updates: Partial<Order>): Promise<void> {
    try {
      const docRef = doc(this.db, 'orders', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      this.logError('updateOrder', error);
      throw error;
    }
  }

  async deleteOrder(id: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'orders', id);
      await deleteDoc(docRef);
    } catch (error) {
      this.logError('deleteOrder', error);
      throw error;
    }
  }

  // === ПРИЕМКИ ===
  async getReceptionHistory(materialId: string): Promise<Reception[]> {
    try {
      const receptionsRef = collection(this.db, 'reception_history');
      const q = query(
        receptionsRef, 
        where('materialId', '==', materialId),
        orderBy('date', 'desc')
      );
      const snapshot = await getDocs(q);
      
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Reception[];
    } catch (error) {
      this.logError('getReceptionHistory', error);
      return [];
    }
  }

  async addReception(reception: Omit<Reception, 'id'>): Promise<Reception> {
    try {
      const receptionsRef = collection(this.db, 'reception_history');
      const docRef = await addDoc(receptionsRef, {
        ...reception,
        userId: this.currentUser?.uid || null
      });

      return { id: docRef.id, ...reception };
    } catch (error) {
      this.logError('addReception', error);
      throw error;
    }
  }

  async updateReception(id: string, updates: Partial<Reception>): Promise<void> {
    try {
      const docRef = doc(this.db, 'reception_history', id);
      await updateDoc(docRef, updates);
    } catch (error) {
      this.logError('updateReception', error);
      throw error;
    }
  }

  async deleteReception(id: string): Promise<void> {
    try {
      const docRef = doc(this.db, 'reception_history', id);
      await deleteDoc(docRef);
    } catch (error) {
      this.logError('deleteReception', error);
      throw error;
    }
  }

  // === ПОДПИСКИ ===
  subscribeMaterials(callback: (materials: Material[]) => void): () => void {
    const materialsRef = collection(this.db, 'materials');
    const q = query(materialsRef, orderBy('order', 'asc'));
    
    return onSnapshot(q, (snapshot) => {
      const materials = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Material[];
      callback(materials);
    }, (error) => {
      this.logError('subscribeMaterials', error);
      callback([]);
    });
  }

  subscribeOrders(callback: (orders: Order[]) => void): () => void {
    const ordersRef = collection(this.db, 'orders');
    const q = query(ordersRef, orderBy('createdAt', 'desc'));
    
    return onSnapshot(q, (snapshot) => {
      const orders = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Order[];
      callback(orders);
    }, (error) => {
      this.logError('subscribeOrders', error);
      callback([]);
    });
  }
}