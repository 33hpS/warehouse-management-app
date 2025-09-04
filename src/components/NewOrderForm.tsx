import React, { useState, useEffect } from 'react';
import { useNotificationContext } from '../App';
import * as XLSX from 'xlsx';

interface MaterialOption {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minStock: number;
}

interface NewOrderFormProps {
  materials: MaterialOption[];
  onCancel: () => void;
  onCreate: (payload: { orderNumber: string; status: 'В работе' | 'Выполнен' | 'Отменен'; items: { materialId: string; quantity: number }[] }) => Promise<void>;
  updateMaterial?: (id: string, updates: { currentStock: number }) => Promise<void>;
  initialOrder?: {
    id?: string;
    orderNumber: string;
    status: 'В работе' | 'Выполнен' | 'Отменен';
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
  };
}


const NewOrderForm: React.FC<NewOrderFormProps> = ({ materials, onCancel, onCreate, updateMaterial, initialOrder }) => {
  const { showNotification } = useNotificationContext();
  const [orderNumber, setOrderNumber] = useState(initialOrder?.orderNumber || '');
  const [items, setItems] = useState<Array<{ materialId: string; quantity: number; name?: string; unit?: string; article?: string; sourceFile?: string }>>(() => {
    // Initialize with existing items if editing
    if (initialOrder?.items) {
      return initialOrder.items.map(item => {
        const material = materials.find(m => m.id === item.materialId);
        return {
          materialId: item.materialId,
          quantity: item.quantity,
          name: material?.name,
          unit: material?.unit,
          sourceFile: item.techCardName || undefined
        };
      });
    }
    return [];
  });
  const [creating, setCreating] = useState(false);
  const [techCards, setTechCards] = useState<Array<{ name: string; customName?: string; rows: any[] }>>(() => {
    // Initialize with existing tech cards if editing
    if (initialOrder?.techCards) {
      return initialOrder.techCards.map(tc => ({
        name: tc.name,
        customName: tc.name,
        rows: tc.data || []
      }));
    }
    return [];
  });

  const isEditing = !!initialOrder?.id;

  // Add empty manual row
  const addEmptyRow = () => {
    setItems(prev => [...prev, { materialId: materials[0]?.id || '', quantity: 1 }]);
  };

  // Update manual row
  const updateRow = (index: number, field: 'materialId' | 'quantity', value: any) => {
    setItems(prev => prev.map((it, i) => i === index ? { ...it, [field]: value } : it));
  };

  // Remove manual row
  const removeRow = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  // Handle tech card upload
  const handleTechCardUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    let anySuccess = false;
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][];
        // Find header row (robust: look for row with at least 2 of the expected headers)
        const headerCandidates = ['Артикул', 'Наименование материала', 'Количество в заказе', 'Ед. изм.'];
        let headerIdx = rows.findIndex(r => Array.isArray(r) && headerCandidates.filter(h => r.includes(h)).length >= 2);
        if (headerIdx === -1) {
          showNotification(`Не удалось найти заголовки в файле ${file.name}`, 'error');
          continue;
        }
        const header = rows[headerIdx] as string[];
        // Find column indices (robust)
        const idxArticle = header.findIndex(h => h.toLowerCase().includes('артикул'));
        const idxName = header.findIndex(h => h.toLowerCase().includes('наименование'));
        const idxQty = header.findIndex(h => h.toLowerCase().includes('кол') && h.toLowerCase().includes('заказ'));
        const idxUnit = header.findIndex(h => h.toLowerCase().includes('ед')); // flexible
        if (idxArticle === -1 || idxName === -1 || idxQty === -1) {
          showNotification(`Не найдены нужные столбцы в файле ${file.name}`, 'error');
          continue;
        }
        // Parse material rows
        const parsed: Array<{ article: string; name: string; quantity: number; unit?: string; sourceFile: string; materialId?: string }> = [];
        for (let j = headerIdx + 1; j < rows.length; j++) {
          const row = rows[j] as string[];
          if (!row || typeof row[idxArticle] !== 'string' || typeof row[idxName] !== 'string' || row[idxQty] == null) continue;
          // Auto-match to warehouse materials
          let foundMaterial = materials.find(m =>
            (row[idxArticle] && m.id === row[idxArticle]) ||
            (row[idxArticle] && m.name.toLowerCase().includes(row[idxName].toLowerCase())) ||
            (row[idxName] && m.name.toLowerCase() === row[idxName].toLowerCase())
          );
          parsed.push({
            article: row[idxArticle],
            name: row[idxName],
            quantity: Number(row[idxQty]),
            unit: idxUnit !== -1 ? row[idxUnit] : undefined,
            sourceFile: file.name,
            materialId: foundMaterial ? foundMaterial.id : ''
          });
        }
        setTechCards(prev => [...prev, { name: file.name, rows: parsed }]);
        setItems(prev => [
          ...prev,
          ...parsed.map(mat => ({
            materialId: mat.materialId || '',
            quantity: mat.quantity,
            name: mat.name,
            unit: mat.unit,
            article: mat.article,
            sourceFile: file.name
          }))
        ]);
        showNotification(`Техкарта ${file.name} успешно загружена`, 'success');
        anySuccess = true;
      } catch (err) {
        showNotification(`Ошибка загрузки файла ${file.name}: ${err}`, 'error');
      }
    }
    if (!anySuccess) {
      showNotification('Не удалось загрузить ни одну техкарту', 'error');
    }
    e.target.value = '';
  };

  // Allow custom name editing for each tech card
  const handleTechCardNameChange = (idx: number, value: string) => {
    setTechCards(prev => prev.map((card, i) => i === idx ? { ...card, customName: value } : card));
  };

  // Render grouped items list with structured table per tech card
  const renderGroupedItemsList = () => {
    // Group items by source file
    const itemsBySource: { [key: string]: typeof items } = {};
    const manualItems: typeof items = [];

    items.forEach(item => {
      if (item.sourceFile) {
        if (!itemsBySource[item.sourceFile]) {
          itemsBySource[item.sourceFile] = [];
        }
        itemsBySource[item.sourceFile].push(item);
      } else {
        manualItems.push(item);
      }
    });

    return (
      <div className="p-2">
        {/* Manual items section */}
        {manualItems.length > 0 && (
          <div className="mb-4">
            <div className="text-sm font-semibold mb-2 text-gray-700">Ручные позиции</div>
            <table className="w-full border border-gray-300 text-sm">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border px-2 py-1 text-left">Материал</th>
                  <th className="border px-2 py-1 text-center w-24">Кол-во</th>
                  <th className="border px-2 py-1 text-center w-20">Действия</th>
                </tr>
              </thead>
              <tbody>
                {manualItems.map((row, localIdx) => {
                  const globalIdx = items.indexOf(row);
                  return (
                    <tr key={globalIdx}>
                      <td className="border px-2 py-1">
                        <select 
                          value={row.materialId} 
                          onChange={e => updateRow(globalIdx, 'materialId', e.target.value)} 
                          className="w-full border-0 bg-transparent"
                        >
                          <option value="">-- не выбрано --</option>
                          {materials.map(m => (
                            <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                          ))}
                        </select>
                      </td>
                      <td className="border px-2 py-1">
                        <input 
                          type="number" 
                          min={0.0001} 
                          step={0.0001} 
                          value={row.quantity} 
                          onChange={e => updateRow(globalIdx, 'quantity', Number(e.target.value))} 
                          className="w-full border-0 bg-transparent text-center"
                        />
                      </td>
                      <td className="border px-2 py-1 text-center">
                        <button onClick={() => removeRow(globalIdx)} className="text-red-600 text-xs">Удалить</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Tech card sections */}
        {Object.entries(itemsBySource).map(([sourceFile, sourceItems]) => {
          const techCard = techCards.find(tc => tc.name === sourceFile);
          const displayName = techCard?.customName || sourceFile;
          
          return (
            <div key={sourceFile} className="mb-4">
              <div className="text-sm font-semibold mb-2 text-blue-700">
                Техкарта: {displayName}
              </div>
              <table className="w-full border border-gray-300 text-sm">
                <thead className="bg-blue-50">
                  <tr>
                    <th className="border px-2 py-1 text-left">Артикул</th>
                    <th className="border px-2 py-1 text-left">Наименование</th>
                    <th className="border px-2 py-1 text-left">Материал склада</th>
                    <th className="border px-2 py-1 text-center w-20">Кол-во</th>
                    <th className="border px-2 py-1 text-center w-16">Ед.изм.</th>
                    <th className="border px-2 py-1 text-center w-20">На складе</th>
                    <th className="border px-2 py-1 text-center w-20">Не хватает</th>
                    <th className="border px-2 py-1 text-center w-20">Действия</th>
                  </tr>
                </thead>
                <tbody>
                  {sourceItems.map((row, localIdx) => {
                    const globalIdx = items.indexOf(row);
                    const selectedMaterial = materials.find(m => m.id === row.materialId);
                    const stockQuantity = selectedMaterial?.currentStock || 0;
                    const shortage = Math.max(0, row.quantity - stockQuantity);
                    const hasShortage = shortage > 0;

                    return (
                      <tr key={globalIdx} className={hasShortage ? 'bg-red-50' : ''}>
                        <td className="border px-2 py-1 text-xs">{row.article || '-'}</td>
                        <td className="border px-2 py-1 text-xs">{row.name || '-'}</td>
                        <td className="border px-2 py-1">
                          <select 
                            value={row.materialId} 
                            onChange={e => updateRow(globalIdx, 'materialId', e.target.value)} 
                            className="w-full border-0 bg-transparent text-xs"
                          >
                            <option value="">-- не выбрано --</option>
                            {materials.map(m => (
                              <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                            ))}
                          </select>
                        </td>
                        <td className="border px-2 py-1">
                          <input 
                            type="number" 
                            min={0.0001} 
                            step={0.0001} 
                            value={row.quantity} 
                            onChange={e => updateRow(globalIdx, 'quantity', Number(e.target.value))} 
                            className="w-full border-0 bg-transparent text-center"
                          />
                        </td>
                        <td className="border px-2 py-1 text-xs text-center">{row.unit || '-'}</td>
                        <td className="border px-2 py-1 text-center text-xs">
                          <span className={stockQuantity < (selectedMaterial?.minStock || 0) ? 'text-red-600 font-bold' : ''}>
                            {stockQuantity}
                          </span>
                        </td>
                        <td className="border px-2 py-1 text-center text-xs">
                          {hasShortage ? (
                            <span className="text-red-600 font-bold">-{shortage.toFixed(4)}</span>
                          ) : (
                            <span className="text-green-600">✓</span>
                          )}
                        </td>
                        <td className="border px-2 py-1 text-center">
                          <button onClick={() => removeRow(globalIdx)} className="text-red-600 text-xs">Удалить</button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="text-sm text-gray-500 p-4 text-center">Пока нет позиций</div>
        )}
      </div>
    );
  };

  // Show preview of tech cards (scrollable, structured, custom name)
  const renderTechCardPreview = () => (
    <div className="space-y-2 max-h-64 overflow-auto border rounded bg-white p-2">
      {techCards.map((card, idx) => (
        <div key={card.name} className="border rounded mb-2 bg-gray-50">
          <div className="flex items-center gap-2 p-2">
            <span className="font-semibold text-sm">Файл: {card.name}</span>
            <input
              type="text"
              value={card.customName || ''}
              onChange={e => handleTechCardNameChange(idx, e.target.value)}
              placeholder="Название техкарты"
              className="border p-1 rounded text-xs flex-1"
              style={{ minWidth: 120 }}
            />
          </div>
          <div className="overflow-auto">
            <table className="text-xs w-full border border-gray-300">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="border px-2 py-1">Артикул</th>
                  <th className="border px-2 py-1">Наименование</th>
                  <th className="border px-2 py-1">Кол-во</th>
                  <th className="border px-2 py-1">Ед. изм.</th>
                </tr>
              </thead>
              <tbody>
                {card.rows.map((row, rowIdx) => (
                  <tr key={rowIdx}>
                    <td className="border px-2 py-1">{row.article}</td>
                    <td className="border px-2 py-1">{row.name}</td>
                    <td className="border px-2 py-1">{row.quantity}</td>
                    <td className="border px-2 py-1">{row.unit}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  );

  // Final create
  const handleCreate = async () => {
    if (!orderNumber.trim()) {
      alert('Введите номер заказа');
      return;
    }
    if (items.length === 0) {
      alert('Добавьте хотя бы один материал');
      return;
    }
    
    // Проверяем остатки материалов
    const insufficientItems = [];
    for (const item of items) {
      const material = materials.find(m => m.id === item.materialId);
      if (material && material.currentStock < item.quantity) {
        const shortage = item.quantity - material.currentStock;
        insufficientItems.push({
          name: material.name,
          needed: item.quantity,
          available: material.currentStock,
          shortage: shortage
        });
      }
    }
    
    if (insufficientItems.length > 0) {
      const message = insufficientItems.map(item => 
        `${item.name}: нужно ${item.needed}, в наличии ${item.available}, не хватает ${item.shortage}`
      ).join('\n');
      
      if (!window.confirm(`Недостаточно материалов на складе:\n${message}\n\nПродолжить создание заказа?`)) {
        return;
      }
    }
    
    setCreating(true);
    try {
      // Создаем заказ
      await onCreate({ orderNumber: orderNumber.trim(), status: 'В работе', items });
      
      // Списываем материалы со склада
      if (updateMaterial) {
        for (const item of items) {
          const material = materials.find(m => m.id === item.materialId);
          if (material) {
            const newStock = Math.max(0, material.currentStock - item.quantity);
            await updateMaterial(item.materialId, { currentStock: newStock });
          }
        }
        showNotification(`Заказ ${orderNumber.trim()} создан. Материалы списаны со склада.`, 'success');
      }
      
      setOrderNumber('');
      setItems([]);
      setTechCards([]);
    } catch (err) {
      console.error(err);
      showNotification('Ошибка при создании заказа', 'error');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Номер заказа</label>
        <input value={orderNumber} onChange={e => setOrderNumber(e.target.value)} className="border p-2 rounded w-full" />
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Позиции</h3>
          <button onClick={addEmptyRow} className="text-sm text-blue-600">Добавить позицию</button>
        </div>
        <input type="file" multiple accept=".xlsx,.xls" onChange={handleTechCardUpload} className="mb-2" />
        <div className="text-xs text-gray-500 mb-2">Загрузите одну или несколько техкарт (Excel)</div>
        {renderTechCardPreview()}
        <div className="mt-2">
          <div className="text-sm font-medium mb-1">Список позиций (из техкарт и ручные)</div>
          <div className="border rounded max-h-56 overflow-auto bg-white">
            {renderGroupedItemsList()}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <button onClick={onCancel} disabled={creating} className="px-3 py-2 bg-gray-200 rounded">Отмена</button>
        <button onClick={handleCreate} disabled={creating} className="px-3 py-2 bg-blue-600 text-white rounded">
          {creating ? (isEditing ? 'Сохранение...' : 'Создание...') : (isEditing ? 'Сохранить' : 'Создать заказ')}
        </button>
      </div>
    </div>
  );
};

export default NewOrderForm;
