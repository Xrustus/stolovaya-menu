
export enum DishStatus {
  AVAILABLE = 'AVAILABLE',
  SOLD_OUT = 'SOLD_OUT',
  HIDDEN = 'HIDDEN'
}

export type DishBadge = 'none' | 'new' | 'hit' | 'spicy' | 'vegan';

export type AppTheme = 'default' | 'new-year' | 'spring' | 'autumn';

export interface Dish {
  id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  discountPrice?: number;
  status: DishStatus;
  badge: DishBadge;
  order: number;
  imageUrl?: string;
  isSpecial?: boolean;
  calories?: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
  isVisible: boolean;
}

export interface Promotion {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
  animationStyle: 'fade' | 'slide-up' | 'bounce';
  active: boolean;
  frequency: number; // seconds
  duration: number; // seconds
}

export interface AppState {
  dishes: Dish[];
  categories: Category[];
  promotions: Promotion[];
  footerMessage: string;
  theme: AppTheme;
  lastUpdated?: number; 
}
