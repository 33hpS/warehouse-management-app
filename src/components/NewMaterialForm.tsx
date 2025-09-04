import React from 'react';
import { Material } from '../types';

interface Props {
  initial?: Omit<Material, 'id'>;
  onCancel: () => void;
  onSave: (m: Omit<Material, 'id'>) => Promise<void> | void;
}

const NewMaterialForm: React.FC<Props> = ({ initial, onCancel, onSave }) => {
  const [form, setForm] = React.useState<Omit<Material, 'id'>>(initial || { name: '', category: '', unit: '', currentStock: 0, minStock: 0 });
  const [errors, setErrors] = React.useState<{[key: string]: string}>({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const nameRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setTimeout(() => nameRef.current?.focus(), 50);
  }, []);

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};
    
    if (!form.name.trim()) {
      newErrors.name = 'Название материала обязательно для заполнения';
    }
    
    if (!form.unit.trim()) {
      newErrors.unit = 'Единица измерения обязательна для заполнения';
    }
    
    if (form.currentStock < 0) {
      newErrors.currentStock = 'Остаток не может быть отрицательным';
    }
    
    if (form.minStock < 0) {
      newErrors.minStock = 'Минимальный запас не может быть отрицательным';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onSave({ ...form, name: form.name.trim() });
    } catch (error) {
      console.error('Error saving material:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="material-name" className="block text-sm font-medium text-gray-700 mb-1">
            Название материала *
          </label>
          <input 
            id="material-name"
            ref={nameRef} 
            className={`w-full border p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.name ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="Например: Гвозди 100мм" 
            value={form.name} 
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))} 
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        
        <div>
          <label htmlFor="material-category" className="block text-sm font-medium text-gray-700 mb-1">
            Категория
          </label>
          <input 
            id="material-category"
            className="w-full border border-gray-300 p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
            placeholder="Например: Крепеж" 
            value={form.category} 
            onChange={e => setForm(f => ({ ...f, category: e.target.value }))} 
          />
        </div>
        
        <div>
          <label htmlFor="material-unit" className="block text-sm font-medium text-gray-700 mb-1">
            Единица измерения *
          </label>
          <input 
            id="material-unit"
            className={`w-full border p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.unit ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="шт, м, кг, л" 
            value={form.unit} 
            onChange={e => setForm(f => ({ ...f, unit: e.target.value }))} 
          />
          {errors.unit && <p className="mt-1 text-sm text-red-600">{errors.unit}</p>}
        </div>
        
        <div>
          <label htmlFor="material-stock" className="block text-sm font-medium text-gray-700 mb-1">
            Текущий остаток
          </label>
          <input 
            id="material-stock"
            type="number" 
            min="0"
            className={`w-full border p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
              errors.currentStock ? 'border-red-500 bg-red-50' : 'border-gray-300'
            }`}
            placeholder="0" 
            value={form.currentStock} 
            onChange={e => setForm(f => ({ ...f, currentStock: Number(e.target.value) }))} 
          />
          {errors.currentStock && <p className="mt-1 text-sm text-red-600">{errors.currentStock}</p>}
        </div>
        
        <div className="md:col-span-2">
          <label htmlFor="material-minstock" className="block text-sm font-medium text-gray-700 mb-1">
            Минимальный запас
          </label>
          <div className="flex items-start space-x-3">
            <div className="flex-1">
              <input 
                id="material-minstock"
                type="number" 
                min="0"
                className={`w-full border p-3 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.minStock ? 'border-red-500 bg-red-50' : 'border-gray-300'
                }`}
                placeholder="0" 
                value={form.minStock} 
                onChange={e => setForm(f => ({ ...f, minStock: Number(e.target.value) }))} 
              />
              {errors.minStock && <p className="mt-1 text-sm text-red-600">{errors.minStock}</p>}
            </div>
            <div className="text-sm text-gray-500 mt-3 max-w-xs">
              При достижении этого уровня материал будет подсвечен красным
            </div>
          </div>
        </div>
      </div>
      
      <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
        <button 
          onClick={onCancel} 
          disabled={isSubmitting}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Отмена
        </button>
        <button 
          onClick={handleSave} 
          disabled={isSubmitting}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center space-x-2"
        >
          {isSubmitting && (
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          )}
          <span>{isSubmitting ? 'Сохранение...' : 'Сохранить'}</span>
        </button>
      </div>
    </div>
  );
};

export default NewMaterialForm;
