import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { Material } from '../types';

interface Props {
  addMaterial?: (m: Omit<Material, 'id'>) => Promise<void>;
  showNotification?: (message: string, type?: 'success'|'error'|'warning'|'info') => void;
}

const guessKey = (header: string) => {
  const h = header.toLowerCase();
  if (h.includes('name') || h.includes('назв') || h.includes('article name')) return 'name';
  if (h.includes('unit') || h.includes('ед')) return 'unit';
  if (h.includes('price') || h.includes('цена')) return 'price';
  if (h.includes('article') || h.includes('артик')) return 'article';
  return header;
};

const ImportMaterials: React.FC<Props> = ({ addMaterial, showNotification }) => {
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const notify = (msg: string, type: 'success'|'error'|'warning'|'info' = 'info') => {
    if (typeof showNotification === 'function') {
      showNotification(msg, type);
    } else {
      if (type === 'error') window.alert(msg);
      else console.log(`[import] ${type}: ${msg}`);
    }
  };

  const handleFile = async (file: File | null) => {
    if (!file) return;
    setFileName(file.name);
    const data = await file.arrayBuffer();
    const wb = XLSX.read(data, { type: 'array' });
    const sheet = wb.Sheets[wb.SheetNames[0]];

    // try to parse as objects using headers
    const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });
    if (raw.length === 0) {
      setRows([]);
      notify('Файл пуст или не удалось распарсить', 'warning');
      return;
    }

    // normalize keys
    const parsed = raw.map((r: any) => {
      const entry: any = {};
      Object.keys(r).forEach(k => {
        const key = guessKey(String(k));
        entry[key] = r[k];
      });
      return entry;
    });

    setRows(parsed);
    notify(`Распарсено ${parsed.length} строк`, 'info');
  };

  const handleUpload = async () => {
    if (!addMaterial) {
      notify('Загрузка недоступна: addMaterial не передан', 'error');
      return;
    }
    if (rows.length === 0) {
      notify('Нет данных для загрузки', 'warning');
      return;
    }
    setLoading(true);
    let success = 0;
    for (const r of rows) {
      try {
        const item: Omit<Material, 'id'> = {
          name: (r.name || r['Article Name'] || r['article name'] || r['Название'] || '').toString().trim(),
          category: (r.category || r['category'] || '').toString().trim() || 'Без категории',
          unit: (r.unit || r['unit'] || r['ед'] || '').toString().trim() || 'шт',
          currentStock: Number(r.currentStock || r['currentStock'] || r['qty'] || 0) || 0,
          minStock: Number(r.minStock || r['minStock'] || 0) || 0,
        };

        if (!item.name) {
          // skip rows without name
          continue;
        }
        await addMaterial(item);
        success++;
      } catch (e) {
        console.error('Import row failed', e, r);
      }
    }
    setLoading(false);
    notify(`Импорт завершён: ${success}/${rows.length}`, 'success');
    setRows([]);
    setFileName(null);
  };

  return (
    <div className="inline-block ml-3">
      <label className="flex items-center gap-2">
        <input
          type="file"
          accept=".xls,.xlsx"
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
          className="hidden"
          id="import-materials-file"
        />
        <label htmlFor="import-materials-file" className="px-3 py-2 bg-gray-200 rounded cursor-pointer text-sm">Загрузить Excel</label>
      </label>

      {fileName && (
        <div className="mt-2">
          <div className="text-xs text-gray-600">Файл: {fileName}</div>
          <div className="max-h-40 overflow-auto border rounded mt-2 bg-white p-2">
            {rows.length === 0 ? (
              <div className="text-sm text-gray-500">Нет превью</div>
            ) : (
              <table className="text-sm w-full">
                <thead>
                  <tr>
                    {Object.keys(rows[0]).slice(0, 6).map((h, i) => <th key={i} className="text-left pr-2">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.slice(0, 10).map((r, i) => (
                    <tr key={i}>
                      {Object.keys(rows[0]).slice(0, 6).map((k, j) => <td key={j} className="pr-2">{String(r[k])}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="mt-2 flex gap-2">
            <button disabled={loading} onClick={handleUpload} className="px-3 py-1 bg-green-600 text-white rounded text-sm">Импортировать</button>
            <button disabled={loading} onClick={() => { setRows([]); setFileName(null); }} className="px-3 py-1 bg-gray-200 rounded text-sm">Отмена</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImportMaterials;
