export const formatPrice = (price: number): string => {
  return price.toLocaleString('ru-RU', { 
    minimumFractionDigits: 2, 
    maximumFractionDigits: 2 
  });
};

export const formatDate = (timestamp: any): string => {
  if (!timestamp) return 'Неизвестно';
  return timestamp.toDate().toLocaleDateString('ru-RU');
};

export const validateMaterial = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (!data.name?.trim()) errors.name = 'Название обязательно';
  if (!data.category?.trim()) errors.category = 'Категория обязательна';
  if (!data.unit?.trim()) errors.unit = 'Единица измерения обязательна';
  if (data.minStock < 0) errors.minStock = 'Минимальный запас не может быть отрицательным';
  
  return { 
    isValid: Object.keys(errors).length === 0, 
    errors 
  };
};

export const validateReceipt = (data: any) => {
  const errors: Record<string, string> = {};
  
  if (data.quantity <= 0) errors.quantity = 'Количество должно быть больше нуля';
  if (data.price < 0) errors.price = 'Цена не может быть отрицательной';
  
  return { 
    isValid: Object.keys(errors).length === 0, 
    errors 
  };
};
