import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  createContext,
  useContext,
  ReactNode
} from 'react';
import { 
  initializeApp, 
  FirebaseApp 
} from 'firebase/app';
import { 
  getAuth, 
  Auth,
  signInAnonymously, 
  onAuthStateChanged, 
  User as FirebaseUser 
} from 'firebase/auth';
import { 
  getFirestore, 
  Firestore,
  collection, 
  onSnapshot, 
  addDoc,
  setLogLevel,
  Timestamp,
  DocumentData,
  QuerySnapshot
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

import DemoModeBanner from './components/DemoModeBanner';

// ========== TYPES ==========
interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
}

interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  createdAt: Timestamp;
}

interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

interface NotificationContextType {
  showNotification: (message: string, type?: NotificationType) => void;
}

type OrderStatus = 'В работе' | 'Выполнен' | 'Отменен';
type NotificationType = 'success' | 'error' | 'warning' | 'info';
type PageType = 'dashboard' | 'materials' | 'orders';

// ========== CONSTANTS ==========
const ORDER_STATUSES: Record<string, OrderStatus> = {
  IN_PROGRESS: 'В работе',
  COMPLETED: 'Выполнен',
  CANCELLED: 'Отменен'
} as const;

const NOTIFICATION_DURATION = 5000;

// Конфигурация Firebase
const firebaseConfig: FirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || 'demo-key',
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || 'demo-project.firebaseapp.com',
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || 'demo-project',
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || 'demo-project.appspot.com',
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || '123456789',
  appId: process.env.REACT_APP_FIREBASE_APP_ID || '1:123456789:web:demo'
};

// Простая валидация API-ключа Firebase чтобы избежать попыток использовать placeholder'ы
function isValidFirebaseApiKey(key?: string) {
  if (!key) return false;
  const trimmed = key.trim();
  if (!trimmed) return false;
  // Отбросим явно демонстрационные и явно неправильные плейсхолдеры
  const lower = trimmed.toLowerCase();
  if (lower === 'demo-key') return false;
  if (lower.includes('your') || lower.includes('demo') || lower.includes('replace') || lower.includes('api_key')) return false;
  // Обычные веб-ключи Firebase обычно имеют длину > 20 символов
  if (trimmed.length < 20) return false;
  return true;
}

// ========== CONTEXTS ==========
const NotificationContext = createContext<NotificationContextType>({
  showNotification: () => {}
});

// ========== HOOKS ==========
const useNotificationContext = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotificationContext must be used within NotificationProvider');
  }
  return context;
};

const useMaterials = (db: Firestore | null): { 
  materials: Material[]; 
  loading: boolean;
  addMaterial: (m: Omit<Material, 'id'>) => Promise<void>;
} => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      // Демо данные если Firebase не подключен
      const demoMaterials: Material[] = [
        {
          id: '1',
          name: 'Цемент М400',
          category: 'Строительные материалы',
          unit: 'мешок',
          currentStock: 5,
          minStock: 10
        },
        {
          id: '2',
          name: 'Арматура 12мм',
          category: 'Металлоконструкции',
          unit: 'м',
          currentStock: 150,
          minStock: 100
        },
        {
          id: '3',
          name: 'Кирпич красный',
          category: 'Строительные материалы',
          unit: 'шт',
          currentStock: 1000,
          minStock: 200
        },
        {
          id: '4',
          name: 'Краска белая',
          category: 'Отделочные материалы',
          unit: 'л',
          currentStock: 3,
          minStock: 15
        },
        {
          id: '5',
          name: 'Гвозди 100мм',
          category: 'Крепеж',
          unit: 'кг',
          currentStock: 2,
          minStock: 5
        }
      ];
      setMaterials(demoMaterials);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'materials'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const materialsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Material[];
        setMaterials(materialsData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching materials:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db]);

  const addMaterial = async (m: Omit<Material, 'id'>) => {
    if (!db) {
      // Просто добавляем в локальный стейт (demo)
      const newItem: Material = { id: Date.now().toString(), ...m };
      setMaterials(prev => [...prev, newItem]);
      return;
    }

    try {
      await addDoc(collection(db, 'materials'), m as any);
    } catch (error) {
      console.error('Error adding material:', error);
      throw error;
    }
  };

  return { materials, loading, addMaterial };
};

const useOrders = (db: Firestore | null): { 
  orders: Order[]; 
  loading: boolean 
} => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!db) {
      // Демо данные если Firebase не подключен
      const demoOrders: Order[] = [
        {
          id: '1',
          orderNumber: 'ORD-2024-001',
          status: 'В работе',
          createdAt: { toMillis: () => Date.now(), toDate: () => new Date() } as Timestamp
        },
        {
          id: '2',
          orderNumber: 'ORD-2024-002',
          status: 'Выполнен',
          createdAt: { toMillis: () => Date.now() - 86400000, toDate: () => new Date(Date.now() - 86400000) } as Timestamp
        },
        {
          id: '3',
          orderNumber: 'ORD-2024-003',
          status: 'В работе',
          createdAt: { toMillis: () => Date.now() - 172800000, toDate: () => new Date(Date.now() - 172800000) } as Timestamp
        }
      ];
      setOrders(demoOrders);
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      collection(db, 'orders'),
      (snapshot: QuerySnapshot<DocumentData>) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Order[];
        setOrders(ordersData);
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching orders:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, [db]);

  return { orders, loading };
};

// ========== UTILITY FUNCTIONS ==========
const formatDate = (timestamp: Timestamp | null): string => {
  if (!timestamp) return 'Неизвестно';
  return timestamp.toDate().toLocaleDateString('ru-RU');
};

// ========== COMPONENTS ==========

// Simple Modal component
interface ModalProps {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ open, title, onClose, children }) => {
  const modalRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black opacity-50" onClick={onClose}></div>
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-lg z-10 max-w-2xl w-full p-6 transform transition-all duration-150 ease-out scale-100 opacity-100"
        style={{ animation: 'modal-in 150ms ease-out' }}
      >
        {title && <h2 className="text-xl font-semibold mb-4">{title}</h2>}
        {children}
      </div>
      <style>{`@keyframes modal-in { from { transform: translateY(-8px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }`}</style>
    </div>
  );
};

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

// Firebase Provider
interface FirebaseProviderProps {
  children: (context: {
    db: Firestore | null;
    auth: Auth | null; 
    user: FirebaseUser | null;
    loading: boolean;
  }) => ReactNode;
}

const FirebaseProvider: React.FC<FirebaseProviderProps> = ({ children }) => {
  const [db, setDb] = useState<Firestore | null>(null);
  const [auth, setAuth] = useState<Auth | null>(null);
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Проверяем, есть ли настроенный и валидный Firebase API-ключ
    if (!isValidFirebaseApiKey(firebaseConfig.apiKey)) {
      console.warn('Firebase не настроен или API-ключ невалиден. Используются демо данные.');
      setUser({ uid: 'demo-user' } as FirebaseUser);
      setLoading(false);
      return;
    }

    try {
      const app: FirebaseApp = initializeApp(firebaseConfig);
      const firestoreDb = getFirestore(app);
      const firebaseAuth = getAuth(app);

      setDb(firestoreDb);
      setAuth(firebaseAuth);
      setLogLevel('error');

      const unsubscribe = onAuthStateChanged(firebaseAuth, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);
        } else {
          try {
            await signInAnonymously(firebaseAuth);
          } catch (error) {
            console.error("Ошибка анонимной аутентификации:", error);
          }
        }
        setLoading(false);
      });

      return unsubscribe;
    } catch (error) {
      console.error("Ошибка инициализации Firebase:", error);
      setUser({ uid: 'demo-user' } as FirebaseUser);
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <>
      {children({ db, auth, user, loading })}
    </>
  );
};

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
    materials.filter(m => m.currentStock <= m.minStock), 
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

// Materials Page
const MaterialsPage: React.FC<{ materials: Material[]; addMaterial?: (m: Omit<Material, 'id'>) => Promise<void> }> = React.memo(({ materials, addMaterial }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { showNotification } = useNotificationContext();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', category: '', unit: '', currentStock: 0, minStock: 0 });

  const filteredMaterials = useMemo(() => {
    return materials
      .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name));
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
      if (addMaterial) await addMaterial(payload);
      showNotification('Материал добавлен', 'success');
      setForm({ name: '', category: '', unit: '', currentStock: 0, minStock: 0 });
      setShowForm(false);
    } catch (err) {
      console.error(err);
      showNotification('Ошибка при добавлении материала', 'error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Материалы на складе</h1>
        <div>
          <button
            onClick={() => setShowForm(s => !s)}
            className="ml-4 inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
          >
            Добавить материал
          </button>
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

      <Modal open={showForm} title="Новый материал" onClose={() => setShowForm(false)}>
        <div className="grid grid-cols-2 gap-3">
          <input className="border p-2 rounded" placeholder="Название" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          <input className="border p-2 rounded" placeholder="Категория" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} />
          <input className="border p-2 rounded" placeholder="Единица (e.g. шт, м, л)" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} />
          <input type="number" className="border p-2 rounded" placeholder="Остаток" value={form.currentStock} onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} />
          <input type="number" className="border p-2 rounded" placeholder="Мин. запас" value={form.minStock} onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))} />
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={handleAdd} className="px-3 py-2 bg-blue-600 text-white rounded">Сохранить</button>
          <button onClick={() => setShowForm(false)} className="px-3 py-2 bg-gray-200 rounded">Отмена</button>
        </div>
      </Modal>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
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
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredMaterials.map(material => (
              <tr key={material.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
                    {material.name}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{material.category}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className={`text-sm ${material.currentStock <= material.minStock ? 'text-red-600 font-medium' : 'text-gray-900'}`}>
                    {material.currentStock} {material.unit}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {material.minStock} {material.unit}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {filteredMaterials.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            Материалы не найдены.
          </div>
        )}
      </div>
    </div>
  );
});

// Orders Page
const OrdersPage: React.FC<{ orders: Order[]; materials: Material[] }> = React.memo(({ orders }) => {
  const sortedOrders = useMemo(() => 
    [...orders].sort((a, b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0)), 
    [orders]
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Заказы</h1>
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
            {sortedOrders.map(order => (
              <tr key={order.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">
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
interface AppContentProps {
  db: Firestore | null;
  user: FirebaseUser;
}

const AppContent: React.FC<AppContentProps> = React.memo(({ db }) => {
  const [page, setPage] = useState<PageType>('dashboard');
  
  const { materials, loading: materialsLoading, addMaterial } = useMaterials(db);
  const { orders, loading: ordersLoading } = useOrders(db);
  
  const isDemoMode = !db || !process.env.REACT_APP_FIREBASE_API_KEY;

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
        return <MaterialsPage materials={materials} addMaterial={addMaterial} />;
      case 'orders':
        return <OrdersPage orders={orders} materials={materials} />;
      default:
        return <DashboardPage materials={materials} orders={orders} setPage={setPage} />;
    }
  }, [page, materials, orders, materialsLoading, ordersLoading]);

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <DemoModeBanner isDemo={isDemoMode} />
      <div className="flex flex-1">
        {/* Sidebar */}
        <div className="w-64 bg-white shadow-md">
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900">Склад-Учет</h1>
            {isDemoMode && (
              <p className="text-xs text-blue-600 mt-1">Демо версия</p>
            )}
          </div>
          <nav className="px-4 space-y-2">
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
        </div>

        {/* Main content */}
        <div className="flex-1 overflow-y-auto p-8">
          {renderPage}
        </div>
      </div>
    </div>
  );
});

// Test Notification Button
const TestNotificationButton: React.FC = () => {
  const { showNotification } = useNotificationContext();
  
  const handleTest = () => {
    showNotification('Уведомление работает! ✅', 'success');
  };

  return (
    <button
      onClick={handleTest}
      className="fixed bottom-4 right-4 bg-blue-600 text-white p-3 rounded-full shadow-lg hover:bg-blue-700 transition-colors"
      title="Тест уведомления"
    >
      <Bell className="w-5 h-5" />
    </button>
  );
};

// Main App Component
const App: React.FC = () => {
  return (
    <NotificationProvider>
      <FirebaseProvider>
        {({ db, user }) => {
          if (!user) {
            return (
              <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Загрузка приложения...</p>
                </div>
              </div>
            );
          }
          return (
            <>
              <AppContent db={db} user={user} />
              <TestNotificationButton />
            </>
          );
        }}
      </FirebaseProvider>
    </NotificationProvider>
  );
};

export default App;