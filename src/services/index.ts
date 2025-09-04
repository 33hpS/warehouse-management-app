// Главный экспорт для сервиса базы данных
export * from './database.types';
export * from './database.base';
export * from './database.firebase';
export * from './database.demo';
export * from './database.supabase';
export * from './database.factory';

// Удобные реэкспорты
export { createDatabaseService, DatabaseServiceFactory } from './database.factory';
export type { IDatabaseService } from './database.types';