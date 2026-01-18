
import { AppState, DishStatus } from './types';

export const INITIAL_DATA: AppState = {
  lastUpdated: Date.now(),
  footerMessage: 'Приятного аппетита! • Время работы: 08:00 – 20:00 • Наличный и безналичный расчет',
  theme: 'default',
  categories: [
    { id: 'cat1', name: 'Первые блюда', order: 1, isVisible: true },
    { id: 'cat2', name: 'Вторые блюда', order: 2, isVisible: true },
    { id: 'cat3', name: 'Гарниры', order: 3, isVisible: true },
    { id: 'cat4', name: 'Напитки', order: 4, isVisible: true }
  ],
  dishes: [
    {
      id: 'd1',
      name: 'Борщ Украинский',
      description: 'Традиционный борщ со сметаной и пампушкой',
      category: 'cat1',
      price: 180,
      status: DishStatus.AVAILABLE,
      // Added missing badge property
      badge: 'none',
      order: 1,
      imageUrl: 'https://picsum.photos/seed/borsch/400/300'
    },
    {
      id: 'd2',
      name: 'Котлета По-Киевски',
      description: 'Сочная куриная грудка с маслом внутри',
      category: 'cat2',
      price: 250,
      discountPrice: 220,
      status: DishStatus.AVAILABLE,
      // Added missing badge property
      badge: 'hit',
      order: 1,
      imageUrl: 'https://picsum.photos/seed/kiev/400/300'
    }
  ],
  promotions: [
    {
      id: 'p1',
      title: 'Счастливые часы!',
      description: 'С 16:00 до 18:00 скидка 20% на все меню',
      animationStyle: 'slide-up',
      active: true,
      frequency: 60,
      duration: 10
    }
  ]
};

export const AUTH_TOKEN_STORAGE_KEY = 'stolovaya_token';
export const DATA_STORAGE_KEY = 'stolovaya_data';

export const REMOTE_DATA_URL = '/api/menu';
