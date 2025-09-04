import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  ReactNode
} from 'react';
import { getApp } from 'firebase/app';
import { 
  getAuth, 
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { ensureFirebaseApp } from './config/firebase';
import { 
  Timestamp,
} from 'firebase/firestore';
import {
  Home,
  Package,
  ShoppingCart,
  Bell,
  X,
  Search,
  CheckCircle,
  AlertCircle,
  XCircle
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Новый абстрактный сервис БД
import { DatabaseServiceFactory, IDatabaseService } from './services';
import { Material, Order, OrderStatus, PageType, NotificationType } from './types';

import DemoModeBanner from './components/DemoModeBanner';
import Modal from './components/Modal';
import NewMaterialForm from './components/NewMaterialForm';
import WeatherWidget from './components/WeatherWidget';
import CurrencyWidget from './components/CurrencyWidget';
import DateCalendarWidget from './components/DateCalendarWidget';
import ReceptionHistoryModal from './components/ReceptionHistoryModal';
import ImportMaterials from './components/ImportMaterials';
import NewOrderForm from './components/NewOrderForm';

// ========== TYPES ==========
interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

// ========== CONSTANTS ==========
const ORDER_STATUSES: Record<string, OrderStatus> = {
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменен'
} as const;

const NOTIFICATION_DURATION = 5000;

// The following code is no longer needed as the configuration is handled by the DatabaseServiceFactory
// // Конфигурация Firebase
// const firebaseConfig: FirebaseConfig = {
//   apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo-key',
//   authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
//   projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'demo-project',
//   storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
//   messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
//   appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789:web:demo'
// };

// // Простая валидация API-ключа Firebase чтобы избежать попыток использовать placeholder'ы
// function isValidFirebaseApiKey(key?: string) {
//   if (!key) return false;
//   const trimmed = key.trim();
//   if (!trimmed) return false;
//   // Отбросим явно демонстрационные и явно неправильные плейсхолдеры
//   const lower = trimmed.toLowerCase();
//   if (lower === 'demo-key') return false;
//   if (lower.includes('your') || lower.includes('demo') || lower.includes('replace') || lower.includes('api_key')) return false;
//   // Обычные веб-ключи Firebase обычно имеют длину > 20 символов
//   if (trimmed.length < 20) return false;
//   return true;
// }

// ========== CONTEXTS ==========
const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {}
});

const DatabaseContext = createContext<{
  dbService: IDatabaseService | null;
  isLoading: boolean;
  user: FirebaseUser | null;
}>({
  dbService: null,
  isLoading: true,
  user: null,
});

// ========== HOOKS ==========
export const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

export const useDatabase = () => useContext(DatabaseContext);

const useMaterialsWithService = (dbService: IDatabaseService | null) => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (!dbService) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = dbService.subscribeMaterials?.((newMaterials) => {
      setMaterials(newMaterials);
      setLoading(false);
    });

    // Fallback for non-subscribable services
    if (!unsubscribe) {
      dbService.getMaterials().then(mats => {
        setMaterials(mats);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to get materials", err);
        setLoading(false);
      });
    }

    return () => unsubscribe?.();
  }, [dbService]);

  const addMaterial = useCallback(async (material: Omit<Material, 'id'>) => {
    if (!dbService) return;
    try {
      await dbService.addMaterial(material);
      showNotification('Материал успешно добавлен', 'success');
    } catch (error) {
      showNotification('Ошибка при добавлении материала', 'error');
      console.error(error);
    }
  }, [dbService, showNotification]);

  const updateMaterial = useCallback(async (id: string, updates: Partial<Material>) => {
    if (!dbService) return;
    try {
      await dbService.updateMaterial(id, updates);
      showNotification('Материал успешно обновлен', 'success');
    } catch (error) {
      showNotification('Ошибка при обновлении материала', 'error');
      console.error(error);
    }
  }, [dbService, showNotification]);

  const receiveMaterial = useCallback(async (id: string, quantity: number, comment: string) => {
    if (!dbService) return;
    try {
      await dbService.receiveMaterial(id, quantity, comment);
      showNotification('Материал успешно принят', 'success');
    } catch (error) {
      showNotification('Ошибка при приемке материала', 'error');
      console.error(error);
    }
  }, [dbService, showNotification]);

  const reorderMaterials = useCallback(async (reorderedMaterials: Material[]) => {
    if (!dbService) return;
    try {
      await dbService.reorderMaterials(reorderedMaterials);
      showNotification('Порядок материалов обновлен', 'success');
    } catch (error) {
      showNotification('Ошибка при обновлении порядка', 'error');
      console.error(error);
    }
  }, [dbService, showNotification]);

  return { materials, loading, addMaterial, updateMaterial, receiveMaterial, reorderMaterials };
};

const useOrdersWithService = (dbService: IDatabaseService | null) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const { showNotification } = useNotificationContext();

  useEffect(() => {
    if (!dbService) {
      setLoading(false);
      return;
    }

    setLoading(true);
    const unsubscribe = dbService.subscribeOrders?.((newOrders) => {
      setOrders(newOrders);
      setLoading(false);
    });

    if (!unsubscribe) {
      dbService.getOrders().then(ords => {
        setOrders(ords);
        setLoading(false);
      }).catch(err => {
        console.error("Failed to get orders", err);
        setLoading(false);
      });
    }

    return () => unsubscribe?.();
  }, [dbService]);

  const addOrder = useCallback(async (order: Omit<Order, 'id' | 'createdAt'>) => {
    if (!dbService) return;
    try {
      await dbService.addOrder(order);
      showNotification('Заказ успешно создан', 'success');
    } catch (error) {
      showNotification('Ошибка при создании заказа', 'error');
      console.error(error);
    }
  }, [dbService, showNotification]);

  const updateOrder = useCallback(async (id: string, updates: Partial<Order>) => {
    if (!dbService) return;
    try {
      await dbService.updateOrder(id, updates);
      showNotification('Заказ успешно обновлен', 'success');
    } catch (error) {
      showNotification('Ошибка при обновлении заказа', 'error');
      console.error(error);
    }
  }, [dbService, showNotification]);

  return { orders, loading, addOrder, updateOrder };
};

// ========== UTILITY FUNCTIONS ==========
const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'Неизвестно';
  
  try {
    // Handle Firebase Timestamp with toDate method
    if (timestamp && typeof timestamp === 'object' && timestamp.toDate && typeof timestamp.toDate === 'function') {
      return timestamp.toDate().toLocaleDateString('ru-RU');
    }
    
    // Handle plain Date object
    if (timestamp instanceof Date) {
      return timestamp.toLocaleDateString('ru-RU');
    }
    
    // Handle timestamp with seconds property (Firestore format)
    if (timestamp && typeof timestamp === 'object' && timestamp.seconds) {
      return new Date(timestamp.seconds * 1000).toLocaleDateString('ru-RU');
    }
    
    // Handle timestamp as number (milliseconds)
    if (typeof timestamp === 'number') {
      return new Date(timestamp).toLocaleDateString('ru-RU');
    }
    
    // Handle timestamp as string
    if (typeof timestamp === 'string') {
      const date = new Date(timestamp);
      return isNaN(date.getTime()) ? 'Неизвестно' : date.toLocaleDateString('ru-RU');
    }
    
    // Log unexpected timestamp format for debugging
    console.warn('Unexpected timestamp format:', timestamp, 'Type:', typeof timestamp);
    return 'Неизвестно';
  } catch (error) {
    console.error('Error formatting date:', error, 'Timestamp:', timestamp);
    return 'Неизвестно';
  }
};

// ========== PROVIDERS ==========

// NotificationProvider Component
interface NotificationProviderProps {
  children: ReactNode;
}

const NotificationProvider: React.FC<NotificationProviderProps> = ({ children }) => {
  const [notifications, setNotifications] = useState<Array<{
    id: string;
    message: string;
    type: NotificationType;
  }>>([]);

  const showNotification = useCallback((message: string, type: NotificationType = 'info') => {
    const id = Date.now().toString();
    setNotifications(prev => [...prev, { id, message, type }]);
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notifications.map(notification => (
        <Notification
          key={notification.id}
          message={notification.message}
          type={notification.type}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </NotificationContext.Provider>
  );
};

// Database Provider
interface DatabaseProviderProps {
  children: ReactNode;
}

const DatabaseProvider: React.FC<DatabaseProviderProps> = ({ children }) => {
  const [dbService, setDbService] = useState<IDatabaseService | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initialize = async () => {
      try {
        const config = DatabaseServiceFactory.detectProvider();
        if (config.provider === 'firebase') {
          // Ensure app is initialized (may return null if env vars missing)
          const ensured = ensureFirebaseApp();
          if (!ensured) {
            console.warn('Firebase config missing or invalid, switching to demo mode');
            const demoService = DatabaseServiceFactory.create({ provider: 'demo', config: {} });
            await demoService.initialize();
            setDbService(demoService);
            setUser(demoService.getCurrentUser());
            setIsLoading(false);
            return;
          }
          const app = getApp();
          const auth = getAuth(app);
          onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
              // User is signed in.
              const db = getFirestore(app);
              const service = DatabaseServiceFactory.create(config, { db, user: firebaseUser });
              setUser(firebaseUser);
              await service.initialize();
              setDbService(service);
              setIsLoading(false);
            } else {
              // User is signed out. Try to sign in anonymously.
              try {
                await signInAnonymously(auth);
                // The listener will re-run with the new anonymous user.
              } catch (authError) {
                console.error("Anonymous sign-in failed, falling back to demo mode.", authError);
                const demoService = DatabaseServiceFactory.create({ provider: 'demo', config: {} });
                await demoService.initialize();
                setDbService(demoService);
                setUser(demoService.getCurrentUser());
                setIsLoading(false);
              }
            }
          });
        } else {
          // For demo or other providers that don't have complex auth states
          const service = DatabaseServiceFactory.create(config);
          await service.initialize();
          setDbService(service);
          setUser(service.getCurrentUser());
          setIsLoading(false);
        }
      } catch (e: any) {
        console.error("Failed to initialize database provider:", e);
        setError(e.message);
        // Fallback to demo mode on any initialization error
        try {
          const demoService = DatabaseServiceFactory.create({ provider: 'demo', config: {} });
          await demoService.initialize();
          setDbService(demoService);
          setUser(demoService.getCurrentUser());
        } catch (demoError) {
           console.error("Failed to initialize demo mode fallback:", demoError);
           setError(e.message + ' | Demo fallback also failed: ' + (demoError as any).message);
        }
        setIsLoading(false);
      }
    };

    initialize();
  }, []);

  const value = { dbService, isLoading, user };

  if (error) {
    return <div className="text-red-500 p-4">Error initializing database: {error}</div>;
  }

  return (
    <DatabaseContext.Provider value={value}>
      {children}
    </DatabaseContext.Provider>
  );
};


// ========== COMPONENTS ==========

// Notification Component
interface NotificationProps {
  message: string;
  type: NotificationType;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = React.memo(({ 
  message, 
  type, 
  onClose 
}) => {
  const getIcon = () => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5" />;
      case 'error': return <XCircle className="w-5 h-5" />;
      case 'warning': return <AlertCircle className="w-5 h-5" />;
      default: return <AlertCircle className="w-5 h-5" />;
    }
  };

  const getColorClasses = () => {
    switch (type) {
      case 'success': return 'bg-green-100 border-green-400 text-green-700';
      case 'error': return 'bg-red-100 border-red-400 text-red-700';
      case 'warning': return 'bg-yellow-100 border-yellow-400 text-yellow-700';
      default: return 'bg-blue-100 border-blue-400 text-blue-700';
    }
  };

  useEffect(() => {
    const timer = setTimeout(onClose, NOTIFICATION_DURATION);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className={`fixed top-4 right-4 z-50 border-l-4 p-4 rounded shadow-lg ${getColorClasses()}`}>
      <div className="flex items-center">
        {getIcon()}
        <span className="ml-2">{message}</span>
        <button
          onClick={onClose}
          className="ml-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

// StatCard Component
interface StatCardProps {
  title: string;
  value: number;
  icon: ReactNode;
}

const StatCard: React.FC<StatCardProps> = React.memo(({ title, value, icon }) => (
  <div className="bg-white p-6 rounded-lg shadow-md">
    <div className="flex items-center">
      <div className="text-blue-600">{icon}</div>
      <div className="ml-4">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        <p className="text-2xl font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  </div>
));

// Dashboard Page
interface DashboardPageProps {
  materials: Material[];
  orders: Order[];
  setPage: (page: PageType) => void;
}

const DashboardPage: React.FC<DashboardPageProps> = React.memo(({ 
  materials, 
  orders, 
  setPage 
}) => {
  const lowStockMaterials = useMemo(() => 
    materials.filter(m => m.currentStock < m.minStock), 
    [materials]
  );

  const activeOrders = useMemo(() => 
    orders.filter(o => o.status !== ORDER_STATUSES.COMPLETED), 
    [orders]
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Панель управления</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard
          title="Всего материалов"
          value={materials.length}
          icon={<Package className="w-8 h-8" />}
        />
        <StatCard
          title="Активные заказы"
          value={activeOrders.length}
          icon={<ShoppingCart className="w-8 h-8" />}
        />
        <StatCard
          title="Низкий запас"
          value={lowStockMaterials.length}
          icon={<Bell className="w-8 h-8" />}
        />
      </div>

      {lowStockMaterials.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-800 mb-4">
            Материалы с низким запасом
          </h2>
          <div className="space-y-3">
            {lowStockMaterials.map(material => (
              <div 
                key={material.id}
                className="flex items-center justify-between bg-white p-3 rounded border"
              >
                <div>
                  <p className="font-medium text-gray-900">{material.name}</p>
                  <p className="text-sm text-gray-600">
                    В наличии: {material.currentStock} {material.unit} (Мин: {material.minStock})
                  </p>
                </div>
                <button
                  onClick={() => setPage('materials')}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all"
                >
                  Пополнить
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});

// Компонент для перетаскиваемой строки материала
interface SortableMaterialRowProps {
  material: Material;
  isLowStock: boolean;
  onHistoryClick: (material: Material) => void;
  onEditClick: (material: Material) => void;
  onReceiveClick: (material: Material) => void;
}

const SortableMaterialRow: React.FC<SortableMaterialRowProps> = ({
  material,
  isLowStock,
  onHistoryClick,
  onEditClick,
  onReceiveClick,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: material.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr 
      ref={setNodeRef}
      style={style}
      className={`${isLowStock ? 'bg-red-50 border-red-200' : 'hover:bg-gray-50'} ${isDragging ? 'shadow-lg' : ''}`}
    >
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center space-x-3">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab hover:cursor-grabbing p-1 text-gray-400 hover:text-gray-600"
            title="Перетащите для изменения порядка"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="3" r="1" />
              <circle cx="3" cy="8" r="1" />
              <circle cx="3" cy="13" r="1" />
              <circle cx="8" cy="3" r="1" />
              <circle cx="8" cy="8" r="1" />
              <circle cx="8" cy="13" r="1" />
              <circle cx="13" cy="3" r="1" />
              <circle cx="13" cy="8" r="1" />
              <circle cx="13" cy="13" r="1" />
            </svg>
          </div>
          <button
            className={`text-sm font-medium ${isLowStock ? 'text-red-700' : 'text-blue-700'} hover:underline focus:outline-none`}
            onClick={() => onHistoryClick(material)}
          >
            {material.name}
          </button>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${isLowStock ? 'text-red-700' : 'text-gray-900'}`}>
          {material.category}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm font-medium ${isLowStock ? 'text-red-700' : 'text-gray-900'}`}>
          {material.currentStock} {material.unit}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className={`text-sm ${isLowStock ? 'text-red-700' : 'text-gray-900'}`}>
          {material.minStock} {material.unit}
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
        <button
          onClick={() => onEditClick(material)}
          className="text-indigo-600 hover:text-indigo-900 ml-4"
        >
          Редактировать
        </button>
        <button
          onClick={() => onReceiveClick(material)}
          className="text-blue-600 hover:text-blue-900 ml-4"
        >
          Принять
        </button>
      </td>
    </tr>
  );
};

// Materials Page
interface MaterialsPageProps {
  materials: Material[];
  addMaterial: (m: Omit<Material, 'id'>) => Promise<void>;
  updateMaterial: (id: string, m: Partial<Omit<Material, 'id'>>) => Promise<void>;
  receiveMaterial: (id: string, quantity: number, comment: string) => Promise<void>;
  reorderMaterials: (materials: Material[]) => Promise<void>;
  dbService: IDatabaseService | null;
}

const MaterialsPage: React.FC<MaterialsPageProps> = React.memo(({ materials, addMaterial, updateMaterial, receiveMaterial, reorderMaterials, dbService }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotificationContext();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', unit: '', currentStock: 0, minStock: 0 });
  const nameInputRef = React.useRef<HTMLInputElement | null>(null);
  const [editingMaterial, setEditingMaterial] = useState<Material | null>(null);
  const [receivingMaterial, setReceivingMaterial] = useState<Material | null>(null);
  const [receiveQuantity, setReceiveQuantity] = useState(1);
  const [receiveComment, setReceiveComment] = useState('');
  const [receiveDate, setReceiveDate] = useState('');
  const [historyMaterial, setHistoryMaterial] = useState<Material | null>(null);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  React.useEffect(() => {
    if (showForm) {
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [showForm]);

  // Обработчик завершения перетаскивания
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    if (active.id !== over?.id) {
      const oldIndex = filteredMaterials.findIndex(item => item.id === active.id);
      const newIndex = filteredMaterials.findIndex(item => item.id === over?.id);

      const newOrderedMaterials = arrayMove(filteredMaterials, oldIndex, newIndex);
      
      // Обновляем порядок в базе данных
      if (reorderMaterials) {
        try {
          await reorderMaterials(newOrderedMaterials);
          showNotification('Порядок материалов изменен', 'success');
        } catch (error) {
          console.error('Error reordering materials:', error);
          showNotification('Ошибка при изменении порядка', 'error');
        }
      }
    }
  };

  const filteredMaterials = useMemo(() => {
    return materials
      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => {
        // Сначала по order (если есть), потом по имени
        if (a.order !== undefined && b.order !== undefined) {
          return a.order - b.order;
        }
        if (a.order !== undefined) return -1;
        if (b.order !== undefined) return 1;
        return a.name.localeCompare(b.name);
      });
  }, [materials, searchTerm]);

  const handleAdd = async () => {
    if (!form.name.trim()) {
      showNotification('Введите название материала', 'warning');
      return;
    }

    const payload: Omit<Material, 'id'> = {
      name: form.name.trim(),
      category: form.category.trim() || 'Без категории',
      unit: form.unit.trim() || 'шт',
      currentStock: Number(form.currentStock) || 0,
      minStock: Number(form.minStock) || 0,
    };

    try {
      if (editingMaterial) {
        if (updateMaterial) await updateMaterial(editingMaterial.id, payload);
        showNotification('Материал обновлен', 'success');
      } else {
        if (addMaterial) {
            await addMaterial({ ...payload, order: materials.length + 1 });
        }
        showNotification('Материал добавлен', 'success');
      }
      setForm({ name: '', category: '', unit: '', currentStock: 0, minStock: 0 });
      setEditingMaterial(null);
      setShowForm(false);
    } catch (err) {
      console.error(err);
      showNotification('Ошибка при сохранении материала', 'error');
    }
  };

  const handleEditClick = (material: Material) => {
    setEditingMaterial(material);
    setForm({ 
      name: material.name, 
      category: material.category, 
      unit: material.unit, 
      currentStock: material.currentStock, 
      minStock: material.minStock 
    });
    setShowForm(true);
  };

  const handleReceiveClick = (material: Material) => {
    setReceivingMaterial(material);
    setReceiveQuantity(1);
    setReceiveComment('');
    setReceiveDate('');
  };

  const handleReceiveSubmit = async () => {
    if (!receivingMaterial || receiveQuantity <= 0) {
      showNotification('Введите корректное количество для приемки', 'warning');
      return;
    }
    try {
      if (receiveMaterial) await receiveMaterial(receivingMaterial.id, receiveQuantity, receiveComment);
      showNotification(`Принято ${receiveQuantity} ${receivingMaterial.unit} ${receivingMaterial.name}`, 'success');
      setReceivingMaterial(null);
      setReceiveQuantity(1);
      setReceiveComment('');
      setReceiveDate('');
    } catch (err) {
      console.error(err);
      showNotification('Ошибка при приемке материала', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Материалы на складе</h1>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setEditingMaterial(null); setShowForm(true); }}
            className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Добавить материал
          </button>
          <ImportMaterials addMaterial={addMaterial} showNotification={showNotification} />
        </div>
      </div>

      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Поиск материалов..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-2 pl-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <Modal isOpen={showForm} title={editingMaterial ? 'Редактировать материал' : 'Новый материал'} onClose={() => setShowForm(false)}>
        <NewMaterialForm
          initial={form}
          onCancel={() => setShowForm(false)}
          onSave={handleAdd}
        />
      </Modal>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Категория
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Остаток
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Мин. запас
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <SortableContext 
              items={filteredMaterials.map(m => m.id)}
              strategy={verticalListSortingStrategy}
            >
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMaterials.map(material => {
                  const isLowStock = material.currentStock <= material.minStock;
                  return (
                    <SortableMaterialRow
                      key={material.id}
                      material={material}
                      isLowStock={isLowStock}
                      onHistoryClick={setHistoryMaterial}
                      onEditClick={handleEditClick}
                      onReceiveClick={handleReceiveClick}
                    />
                  );
                })}
              </tbody>
            </SortableContext>
          </table>
        </DndContext>
        
        {filteredMaterials.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Материалы не найдены.
          </div>
        )}
      </div>

      <Modal isOpen={showForm} title={editingMaterial ? 'Редактировать материал' : 'Новый материал'} onClose={() => setShowForm(false)}>
        <NewMaterialForm
          initial={form}
          onCancel={() => setShowForm(false)}
          onSave={handleAdd}
        />
      </Modal>
      {historyMaterial && (
        <ReceptionHistoryModal
          isOpen={!!historyMaterial}
          onClose={() => setHistoryMaterial(null)}
          materialId={historyMaterial.id}
          materialName={historyMaterial.name}
          dbService={dbService}
        />
      )}

      <Modal isOpen={!!receivingMaterial} title={`Приемка: ${receivingMaterial?.name || ''}`} onClose={() => setReceivingMaterial(null)}>
        <div className="space-y-4">
          <p>Введите количество для приемки:</p>
          <input
            type="number"
            value={receiveQuantity}
            onChange={e => setReceiveQuantity(Number(e.target.value))}
            className="border p-2 rounded w-full"
            min="1"
          />
          <p>Комментарий:</p>
          <textarea
            value={receiveComment}
            onChange={e => setReceiveComment(e.target.value)}
            className="border p-2 rounded w-full"
            placeholder="Например, номер накладной или примечание"
          />
          <p>Дата приемки:</p>
          <input
            type="date"
            value={receiveDate}
            onChange={e => setReceiveDate(e.target.value)}
            className="border p-2 rounded w-full"
          />
          <div className="flex justify-end gap-2">
            <button onClick={handleReceiveSubmit} className="px-3 py-2 bg-blue-600 text-white rounded">Принять</button>
            <button onClick={() => setReceivingMaterial(null)} className="px-3 py-2 bg-gray-200 rounded">Отмена</button>
          </div>
        </div>
      </Modal>
    </div>
  );
});

// Orders Page
const OrdersPage: React.FC<{ 
  orders: Order[]; 
  materials: Material[]; 
  addOrder: (o: Omit<Order, 'id' | 'createdAt'>) => Promise<void>; 
  updateOrder: (id: string, o: Partial<Order>) => Promise<void>;
  updateMaterial: (id: string, updates: Partial<Material>) => Promise<void>;
}> = React.memo(({ orders, materials, addOrder, updateOrder, updateMaterial }) => {
  const [showCreate, setShowCreate] = useState(false);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);

  const sortedOrders = useMemo(() => 
    [...orders].sort((a, b) => {
      const aTime = a.createdAt ? (typeof a.createdAt.toMillis === 'function' ? a.createdAt.toMillis() : a.createdAt.seconds * 1000) : 0;
      const bTime = b.createdAt ? (typeof b.createdAt.toMillis === 'function' ? b.createdAt.toMillis() : b.createdAt.seconds * 1000) : 0;
      return bTime - aTime;
    }), 
    [orders]
  );

  const handleCreate = async (payload: Omit<Order, 'id' | 'createdAt'>) => {
    if (!addOrder) return;
    try {
      await addOrder(payload);
      setShowCreate(false);
    } catch (err) {
      console.error('Create order failed', err);
      alert('Ошибка при создании заказа');
    }
  };

  const handleEdit = async (payload: Partial<Order>) => {
    if (!updateOrder || !editingOrder) return;
    try {
      await updateOrder(editingOrder.id, payload);
      setEditingOrder(null);
    } catch (err) {
      console.error('Update order failed', err);
      alert('Ошибка при обновлении заказа');
    }
  };

  const handleOrderClick = (order: Order) => {
    setEditingOrder(order);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
        <div>
          <button onClick={() => setShowCreate(true)} className="px-3 py-2 bg-green-600 text-white rounded">Создать заказ</button>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Номер Заказа
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Дата
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Статус
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {sortedOrders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleOrderClick(order)}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-blue-700 hover:text-blue-900">
                    {order.orderNumber}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {formatDate(order.createdAt)}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    order.status === ORDER_STATUSES.COMPLETED
                      ? 'bg-green-100 text-green-800'
                      : order.status === ORDER_STATUSES.IN_PROGRESS
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {sortedOrders.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Заказы отсутствуют.
          </div>
        )}
      </div>

      {/* Create Order Modal */}
      <Modal isOpen={showCreate} title="Создать заказ" onClose={() => setShowCreate(false)}>
        <NewOrderForm
          materials={materials.map(m => ({ 
            id: m.id, 
            name: m.name, 
            unit: m.unit,
            currentStock: m.currentStock,
            minStock: m.minStock
          }))}
          updateMaterial={updateMaterial}
          onCancel={() => setShowCreate(false)}
          onCreate={async (payload) => handleCreate(payload)}
        />
      </Modal>

      {/* Edit Order Modal */}
      <Modal isOpen={!!editingOrder} title={`Редактировать заказ: ${editingOrder?.orderNumber || ''}`} onClose={() => setEditingOrder(null)}>
        {editingOrder && (
          <NewOrderForm
            materials={materials.map(m => ({ 
              id: m.id, 
              name: m.name, 
              unit: m.unit,
              currentStock: m.currentStock,
              minStock: m.minStock
            }))}
            updateMaterial={updateMaterial}
            onCancel={() => setEditingOrder(null)}
            onCreate={async (payload) => handleEdit(payload)}
            initialOrder={editingOrder}
          />
        )}
      </Modal>
    </div>
  );
});

// Navigation Link Component
interface NavLinkProps {
  icon: ReactNode;
  label: string;
  pageName: PageType;
  currentPage: PageType;
  onClick: (page: PageType) => void;
}

const NavLink: React.FC<NavLinkProps> = React.memo(({ 
  icon, 
  label, 
  pageName, 
  currentPage, 
  onClick 
}) => (
  <button
    onClick={() => onClick(pageName)}
    className={`flex items-center w-full px-4 py-2 text-left rounded-lg transition-colors ${
      currentPage === pageName 
        ? 'bg-blue-600 text-white' 
        : 'text-gray-600 hover:bg-gray-200'
    }`}
  >
    {icon}
    <span className="ml-3">{label}</span>
  </button>
));

// App Content Component
interface AppContentProps {}

const AppContent: React.FC<AppContentProps> = React.memo(() => {
  const { dbService, isLoading, user } = useDatabase();
  const [page, setPage] = useState<PageType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDemo, setIsDemo] = useState(false);

  // Используем новые хуки
  const { materials, loading: materialsLoading, addMaterial, updateMaterial, receiveMaterial, reorderMaterials } = useMaterialsWithService(dbService);
  const { orders, loading: ordersLoading, addOrder, updateOrder } = useOrdersWithService(dbService);

  useEffect(() => {
    if (dbService) {
      setIsDemo(dbService.config.provider === 'demo');
    }
  }, [dbService]);

  const filteredMaterials = useMemo(() => {
    const sorted = [...materials].sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
    if (!searchTerm) return sorted;
    return sorted.filter(material =>
      material.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (material.category && material.category.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [materials, searchTerm]);

  const renderPage = useMemo(() => {
    if (materialsLoading || ordersLoading) {
        return (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
          </div>
        );
    }
    switch (page) {
      case 'dashboard':
        return <DashboardPage materials={materials} orders={orders} setPage={setPage} />;
      case 'materials':
        return <MaterialsPage materials={filteredMaterials} addMaterial={addMaterial} updateMaterial={updateMaterial} receiveMaterial={receiveMaterial} reorderMaterials={reorderMaterials} dbService={dbService} />;
      case 'orders':
        return <OrdersPage orders={orders} materials={materials} addOrder={addOrder} updateOrder={updateOrder} updateMaterial={updateMaterial} />;
      default:
        return <div>Page not found</div>;
    }
  }, [page, materials, orders, filteredMaterials, addMaterial, updateMaterial, receiveMaterial, reorderMaterials, dbService, addOrder, updateOrder, materialsLoading, ordersLoading]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-100">
      <aside className="w-64 bg-white shadow-md flex flex-col sticky top-0 h-screen">
        <div className="p-6 text-2xl font-bold text-blue-600 border-b">
          Склад Pro
        </div>
        <nav className="flex-1 p-4 space-y-2">
           <NavLink
              icon={<Home className="w-5 h-5" />}
              label="Панель"
              pageName="dashboard"
              currentPage={page}
              onClick={setPage}
            />
            <NavLink
              icon={<Package className="w-5 h-5" />}
              label="Материалы"
              pageName="materials"
              currentPage={page}
              onClick={setPage}
            />
            <NavLink
              icon={<ShoppingCart className="w-5 h-5" />}
              label="Заказы"
              pageName="orders"
              currentPage={page}
              onClick={setPage}
            />
        </nav>
        <div className="p-4 border-t space-y-4">
          <CurrencyWidget />
          <WeatherWidget />
          <DateCalendarWidget />
        </div>
        <div className="p-4 text-xs text-gray-500 border-t">
          <DemoModeBanner isDemo={isDemo} />
          {user && (
            <div className="mt-2">
              <p>Пользователь: {user.isAnonymous ? 'Аноним' : user.email}</p>
              <p>UID: {user.uid ? user.uid.substring(0, 10) + '...' : 'нет UID'}</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm p-4">
          <div className="flex items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Поиск материалов..."
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <button className="ml-4 text-gray-500 hover:text-gray-700">
              <Bell size={24} />
            </button>
          </div>
        </header>
        <div className="flex-1 p-6 overflow-auto">
          {renderPage}
        </div>
      </main>
    </div>
  );
});

// App Component
const App: React.FC = () => {
  return (
    <NotificationProvider>
      <DatabaseProvider>
        <AppContent />
      </DatabaseProvider>
    </NotificationProvider>
  );
};

export default App;