import { IDatabaseService, DatabaseConfig } from './database.types';
import { FirebaseDatabaseService } from './database.firebase';
import { DemoDatabaseService } from './database.demo';
import { SupabaseDatabaseService } from './database.supabase';
import { Firestore } from 'firebase/firestore';
import { User as FirebaseUser } from 'firebase/auth';

// Фабрика для создания нужного сервиса БД
export class DatabaseServiceFactory {
  static create(config: DatabaseConfig, dependencies: any = {}): IDatabaseService {
    switch (config.provider) {
      case 'firebase':
        // Ensure dependencies provided for Firebase
        if (!dependencies || typeof dependencies.db === 'undefined') {
          console.warn('Missing Firebase dependencies, falling back to demo service');
          return new DemoDatabaseService(config);
        }
        const { db, user } = dependencies as { db: Firestore; user: FirebaseUser | null };
        return new FirebaseDatabaseService(db, user);
        
      case 'supabase':
        const { url, key } = config.config as { url: string; key: string };
        return new SupabaseDatabaseService(url, key);
        
      case 'demo':
      default:
        return new DemoDatabaseService(config);
    }
  }

  // Утилита для определения провайдера по переменным окружения
  static detectProvider(): DatabaseConfig {
    // Проверяем Firebase
    const rawFirebaseKey = process.env.REACT_APP_FIREBASE_API_KEY?.trim();
    const looksValidFirebaseKey = rawFirebaseKey &&
      rawFirebaseKey.length > 20 &&
      !/your[_-]?firebase|demo|replace|api[_-]?key/i.test(rawFirebaseKey);
    if (looksValidFirebaseKey) {
      return {
        provider: 'firebase',
        config: {
          apiKey: rawFirebaseKey,
          authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
          projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
          storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
          messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
          appId: process.env.REACT_APP_FIREBASE_APP_ID
        }
      };
    }

    // Проверяем Supabase
    if (process.env.REACT_APP_SUPABASE_URL && 
        process.env.REACT_APP_SUPABASE_ANON_KEY) {
      return {
        provider: 'supabase',
        config: {
          url: process.env.REACT_APP_SUPABASE_URL,
          key: process.env.REACT_APP_SUPABASE_ANON_KEY
        }
      };
    }

    // По умолчанию демо режим
    return {
      provider: 'demo',
      config: {}
    };
  }
}

// Хук для работы с базой данных
export function createDatabaseService(
  firebaseDb?: Firestore,
  firebaseUser?: FirebaseUser | null
): IDatabaseService {
  const config = DatabaseServiceFactory.detectProvider();
  
  let service: IDatabaseService;
  
  if (config.provider === 'firebase' && firebaseDb) {
    service = DatabaseServiceFactory.create(config, { 
      db: firebaseDb, 
      user: firebaseUser 
    });
  } else {
    // Fallback to demo if Firebase not available
    service = DatabaseServiceFactory.create({ 
      provider: 'demo', 
      config: {} 
    });
  }
  
  return service;
}

// Утилиты для миграции данных между провайдерами
export class MigrationUtils {
  static async migrateData(
    source: IDatabaseService, 
    target: IDatabaseService
  ): Promise<void> {
    console.log('Starting data migration...');
    
    try {
      // Мигрируем материалы
      const materials = await source.getMaterials();
      console.log(`Migrating ${materials.length} materials...`);
      
      for (const material of materials) {
        const { id, ...materialData } = material;
        await target.addMaterial(materialData);
      }

      // Мигрируем заказы
      const orders = await source.getOrders();
      console.log(`Migrating ${orders.length} orders...`);
      
      for (const order of orders) {
        const { id, createdAt, ...orderData } = order;
        await target.addOrder(orderData);
      }

      console.log('Migration completed successfully!');
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  static async validateMigration(
    source: IDatabaseService,
    target: IDatabaseService
  ): Promise<boolean> {
    try {
      const sourceMaterials = await source.getMaterials();
      const targetMaterials = await target.getMaterials();
      
      const sourceOrders = await source.getOrders();
      const targetOrders = await target.getOrders();
      
      const isValid = 
        sourceMaterials.length === targetMaterials.length &&
        sourceOrders.length === targetOrders.length;
        
      console.log('Migration validation:', {
        materials: { source: sourceMaterials.length, target: targetMaterials.length },
        orders: { source: sourceOrders.length, target: targetOrders.length },
        isValid
      });
      
      return isValid;
    } catch (error) {
      console.error('Migration validation failed:', error);
      return false;
    }
  }
}