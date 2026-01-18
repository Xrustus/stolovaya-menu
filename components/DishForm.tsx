
import React, { useRef, useState } from 'react';
import { Category, Dish, DishStatus, DishBadge } from '../types';
import { generateDishImage, improveDescription } from '../services/geminiService';
import { uploadDishImage } from '../services/uploadService';

interface DishFormProps {
  categories: Category[];
  initialData?: Dish;
  onSave: (dish: Dish) => void;
  onCancel: () => void;
}

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_DIMENSION = 1280;
const OUTPUT_MIME_TYPE = 'image/jpeg';
const OUTPUT_QUALITY = 0.82;

const readFileAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

const loadImageFromDataUrl = (dataUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('image_load_failed'));
    image.src = dataUrl;
  });

const getTargetSize = (width: number, height: number) => {
  if (width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION) {
    return { width, height };
  }
  const scale = Math.min(MAX_IMAGE_DIMENSION / width, MAX_IMAGE_DIMENSION / height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
};

const renderToDataUrl = (source: CanvasImageSource, width: number, height: number) => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas_context_failed');
  ctx.drawImage(source, 0, 0, width, height);
  return canvas.toDataURL(OUTPUT_MIME_TYPE, OUTPUT_QUALITY);
};

const prepareImageForUpload = async (file: File) => {
  if ('createImageBitmap' in window) {
    const bitmap = await createImageBitmap(file);
    const { width, height } = getTargetSize(bitmap.width, bitmap.height);
    const dataUrl = renderToDataUrl(bitmap, width, height);
    if ('close' in bitmap) bitmap.close();
    return dataUrl;
  }
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(dataUrl);
  const { width, height } = getTargetSize(image.naturalWidth, image.naturalHeight);
  return renderToDataUrl(image, width, height);
};

const DishForm: React.FC<DishFormProps> = ({ categories, initialData, onSave, onCancel }) => {
  const [formData, setFormData] = useState<Partial<Dish>>(initialData || {
    id: Math.random().toString(36).substr(2, 9),
    name: '',
    description: '',
    category: categories[0]?.id || '',
    price: 0,
    status: DishStatus.AVAILABLE,
    badge: 'none',
    order: 0,
  });

  const [isGenerating, setIsGenerating] = useState(false);
  const [isImproving, setIsImproving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const handleGenerateAI = async () => {
    if (!formData.name) {
      alert('Введите название блюда для генерации');
      return;
    }
    setIsGenerating(true);
    const imageUrl = await generateDishImage(formData.name || '', formData.description || '');
    if (imageUrl) {
      setFormData(prev => ({ ...prev, imageUrl }));
    } else {
      alert('Не удалось сгенерировать изображение');
    }
    setIsGenerating(false);
  };

  const handleImproveText = async () => {
    if (!formData.name) return;
    setIsImproving(true);
    const betterDesc = await improveDescription(formData.name, formData.description || '');
    if (betterDesc) {
      setFormData(prev => ({ ...prev, description: betterDesc }));
    }
    setIsImproving(false);
  };

  const handlePickImage = () => {
    uploadInputRef.current?.click();
  };

  const handleUploadImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      alert('Выберите файл изображения.');
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      alert('Файл слишком большой. Максимум 5MB.');
      return;
    }
    setIsUploading(true);
    try {
      const dataUrl = await prepareImageForUpload(file);
      const imageUrl = await uploadDishImage(dataUrl);
      if (imageUrl) {
        setFormData(prev => ({ ...prev, imageUrl }));
      } else {
        alert('Не удалось загрузить изображение.');
      }
    } catch (error) {
      console.error('Error reading image file:', error);
      alert('Не удалось подготовить изображение.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.category) return;
    onSave(formData as Dish);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <h2 className="text-2xl font-black mb-6 text-slate-900 uppercase tracking-tighter">
        {initialData ? 'Редактировать блюдо' : 'Новое блюдо'}
      </h2>
      
      <div>
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Название</label>
        <input 
          type="text" 
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
          required
        />
      </div>

      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest">Описание</label>
          <button 
            type="button" 
            onClick={handleImproveText}
            disabled={isImproving || !formData.name}
            className="text-[9px] font-black text-blue-600 uppercase tracking-widest hover:underline disabled:opacity-30"
          >
            {isImproving ? 'Улучшаю...' : '✨ Сделать аппетитно'}
          </button>
        </div>
        <textarea 
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 focus:ring-2 focus:ring-blue-500 outline-none text-slate-900"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Бейдж</label>
          <select 
            value={formData.badge}
            onChange={e => setFormData({ ...formData, badge: e.target.value as DishBadge })}
            className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none text-slate-900 font-bold"
          >
            <option value="none">Без бейджа</option>
            <option value="new">Новинка</option>
            <option value="hit">Хит</option>
            <option value="spicy">Острое</option>
            <option value="vegan">Веган</option>
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Категория</label>
          <select 
            value={formData.category}
            onChange={e => setFormData({ ...formData, category: e.target.value })}
            className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none text-slate-900 font-bold"
          >
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Цена (₽)</label>
          <input 
            type="number" 
            value={formData.price}
            onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
            className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none text-slate-900 font-bold"
            required
          />
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mt-3 mb-1">Цена со скидкой (₽)</label>
          <input
            type="number"
            value={formData.discountPrice ?? ''}
            onChange={e => {
              const value = e.target.value;
              setFormData({
                ...formData,
                discountPrice: value === '' ? undefined : Number(value)
              });
            }}
            className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none text-slate-900 font-bold"
            placeholder="Необязательно"
            min={0}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Статус</label>
          <select 
            value={formData.status}
            onChange={e => setFormData({ ...formData, status: e.target.value as DishStatus })}
            className="w-full p-4 border border-slate-200 rounded-2xl bg-slate-50 outline-none text-slate-900 font-bold"
          >
            <option value={DishStatus.AVAILABLE}>В наличии</option>
            <option value={DishStatus.SOLD_OUT}>Закончилось</option>
            <option value={DishStatus.HIDDEN}>Скрыто</option>
          </select>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-6">
        <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Изображение</label>
        {formData.imageUrl && (
          <div className="mb-4 relative group">
            <img src={formData.imageUrl} className="w-full h-48 object-cover rounded-[2rem] shadow-xl border-4 border-white" />
            <button 
              type="button"
              onClick={() => setFormData({ ...formData, imageUrl: undefined })}
              className="absolute top-3 right-3 bg-red-600 text-white w-10 h-10 rounded-full shadow-lg flex items-center justify-center font-black text-xl active:scale-90 transition-transform"
            >
              ×
            </button>
          </div>
        )}
        <input
          ref={uploadInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleUploadImage}
        />
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handlePickImage}
            disabled={isGenerating || isUploading}
            className={`w-full flex items-center justify-center gap-3 p-5 rounded-[2rem] border-4 border-dashed font-black transition-all uppercase tracking-widest text-xs ${
              isGenerating || isUploading
                ? 'bg-slate-50 text-slate-400 border-slate-100'
                : 'bg-white border-slate-200 text-slate-700 hover:border-slate-400 hover:bg-slate-50'
            }`}
          >
            {isUploading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-4 border-slate-200 border-t-slate-600 rounded-full animate-spin" />
                Загружаю...
              </div>
            ) : 'Загрузить фото'}
          </button>
          <button 
            type="button"
            onClick={handleGenerateAI}
            disabled={isGenerating || isUploading}
            className={`w-full flex items-center justify-center gap-3 p-5 rounded-[2rem] border-4 border-dashed font-black transition-all uppercase tracking-widest text-xs ${
              isGenerating || isUploading
                ? 'bg-slate-50 text-slate-400 border-slate-100'
                : 'bg-white border-blue-100 text-blue-600 hover:border-blue-500 hover:bg-blue-50'
            }`}
          >
            {isGenerating ? (
               <div className="flex items-center gap-2">
                 <div className="w-4 h-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                 Генерация...
               </div>
            ) : '✨ Сгенерировать ИИ'}
          </button>
        </div>
        <p className="mt-2 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
          Макс 5MB. JPG/PNG/WEBP.
        </p>
      </div>

      <div className="flex gap-4 pt-6 border-t border-slate-100">
        <button 
          type="button" 
          onClick={onCancel}
          className="flex-1 py-5 text-slate-400 font-black uppercase tracking-widest text-xs"
        >
          Отмена
        </button>
        <button 
          type="submit" 
          className="flex-1 py-5 bg-slate-900 text-white rounded-[2rem] font-black uppercase tracking-widest text-xs shadow-xl active:scale-95 transition-all"
        >
          Сохранить
        </button>
      </div>
    </form>
  );
};

export default DishForm;
