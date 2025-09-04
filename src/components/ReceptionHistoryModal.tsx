import React, { useEffect, useState } from "react";
import Modal from "./Modal";
import { IDatabaseService } from "../services";
import { Reception } from "../types";
import { Timestamp } from "firebase/firestore";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  materialId: string;
  materialName: string;
  dbService: IDatabaseService | null;
}

const ReceptionHistoryModal: React.FC<Props> = ({ isOpen, onClose, materialId, materialName, dbService }) => {
  const [history, setHistory] = useState<Reception[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Edit flow state
  const [editingItem, setEditingItem] = useState<Reception | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [editQuantity, setEditQuantity] = useState<number | ''>('');
  const [editComment, setEditComment] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  // Temporary client-side password (for demo). Replace with real auth in production.
  const ADMIN_PASSWORD = process.env.REACT_APP_ADMIN_PASSWORD || 'admin123';

  useEffect(() => {
    if (!isOpen) return;
    if (!dbService) {
      setLoading(false);
      setError(null);
      // demo data
      if (materialName?.toLowerCase().includes('арматура')) {
        setHistory([
          {
            id: 'demo-1',
            materialId,
            materialName,
            quantity: 50,
            date: { toDate: () => new Date(Date.now() - 86400000) } as any,
            comment: 'Поставка от поставщика A (демо)',
            userId: 'demo-user'
          },
          {
            id: 'demo-2',
            materialId,
            materialName,
            quantity: 100,
            date: { toDate: () => new Date(Date.now() - 259200000) } as any,
            comment: 'Приемка на складе (демо)',
            userId: 'demo-user'
          }
        ]);
      } else {
        setHistory([]);
      }
      return;
    }

    setLoading(true);
    setError(null);
    const fetchHistory = async () => {
      try {
        const items = await dbService.getReceptionHistory(materialId);
        setHistory(items.sort((a, b) => ((b.date as Timestamp)?.toMillis() || 0) - ((a.date as Timestamp)?.toMillis() || 0)));
      } catch (e) {
        setError("Ошибка загрузки истории приёмок");
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchHistory();
  }, [dbService, isOpen, materialId, materialName]);

  const handleSaveEdit = async () => {
    if (!editingItem || editQuantity === '') return;
    try {
      if (dbService && editingItem.id) {
        const updates: Partial<Reception> = {
            quantity: Number(editQuantity),
            comment: editComment
        };
        await dbService.updateReception(editingItem.id, updates);
        // Update local state
        setHistory(prev => prev.map(h => h.id === editingItem.id ? { ...h, ...updates } : h));
      } else {
        // demo mode: update local state only
        setHistory(prev => prev.map(h => h.id === editingItem.id ? { ...h, quantity: Number(editQuantity), comment: editComment } : h));
      }
      setPasswordModalOpen(false);
      setEditingItem(null);
    } catch (e) {
      setAuthError('Ошибка при сохранении изменений');
      console.error(e);
    }
  };


  return (
    <Modal isOpen={isOpen} title={`История приёмок: ${materialName}`} onClose={onClose}>
      {loading ? (
        <div>Загрузка...</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : history.length === 0 ? (
        <div className="text-gray-500">Нет данных о приёмках</div>
      ) : (
        <div className="space-y-2">
          {history.map(item => (
                <div key={item.id} className="border-b pb-2 mb-2">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{item.quantity} шт</div>
                      <div className="text-xs text-gray-700">{item.comment}</div>
                      <div className="text-xs text-gray-500">{(item.date as Timestamp)?.toDate?.().toLocaleString?.("ru-RU")}</div>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => {
                          setPasswordInput('');
                          setAuthError(null);
                          setEditingItem(item);
                          setPasswordModalOpen(true);
                        }}
                        className="inline-flex items-center px-2 py-1 bg-red-600 text-white rounded shadow-sm hover:bg-red-700"
                        title="Редактировать запись приемки"
                      >
                        ✏️ Редактировать
                      </button>
                    </div>
                  </div>
                </div>
              ))}

          {/* Password prompt modal */}
          <Modal isOpen={passwordModalOpen} title={editingItem ? 'Требуется пароль для редактирования' : 'Пароль'} onClose={() => { setPasswordModalOpen(false); setEditingItem(null); }}>
            <div className="space-y-3">
              <p>Введите пароль администратора для редактирования записи приемки.</p>
              {authError && <div className="text-red-600">{authError}</div>}
              <input type="password" value={passwordInput} onChange={e => setPasswordInput(e.target.value)} className="border p-2 rounded w-full" />
              <div className="flex justify-end gap-2">
                <button onClick={() => {
                  if (!editingItem) return;
                  if (passwordInput === ADMIN_PASSWORD) {
                    setAuthError(null);
                    setEditQuantity(editingItem.quantity);
                    setEditComment(editingItem.comment || '');
                    setPasswordInput('AUTH_OK');
                  } else {
                    setAuthError('Неверный пароль');
                  }
                }} className="px-3 py-2 bg-blue-600 text-white rounded">Подтвердить</button>
                <button onClick={() => { setPasswordModalOpen(false); setEditingItem(null); }} className="px-3 py-2 bg-gray-200 rounded">Отмена</button>
              </div>

              {/* If authenticated, show edit fields */}
              {passwordInput === 'AUTH_OK' && editingItem && (
                <div className="mt-4 space-y-2">
                  <label className="block text-sm font-medium">Количество</label>
                  <input type="number" value={String(editQuantity)} onChange={e => setEditQuantity(Number(e.target.value))} className="border p-2 rounded w-full" />
                  <label className="block text-sm font-medium">Комментарий</label>
                  <textarea value={editComment} onChange={e => setEditComment(e.target.value)} className="border p-2 rounded w-full" />
                  <div className="flex justify-end gap-2">
                    <button onClick={handleSaveEdit} className="px-3 py-2 bg-green-600 text-white rounded">Сохранить</button>
                    <button onClick={() => { setPasswordModalOpen(false); setEditingItem(null); }} className="px-3 py-2 bg-gray-200 rounded">Отмена</button>
                  </div>
                </div>
              )}
            </div>
          </Modal>
        </div>
      )}
    </Modal>
  );
};

export default ReceptionHistoryModal;
