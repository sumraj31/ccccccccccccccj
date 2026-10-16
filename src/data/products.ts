import initialData from './initialData.json';
import { Product, BrandData } from '../types';

export const brandInfo: BrandData = {
  brand: initialData.brand || 'AnmolKala',
  whatsapp: initialData.whatsapp || '919810116510',
  phone: initialData.phone || '919717887313',
  email: initialData.email || 'anmolkala.in@gmail.com',
};

export const defaultProducts: Product[] = (initialData.products as Product[]).map(p => ({
  ...p,
  type: 'product',
  published: true,
}));

const primaryCategories = ['Puja Thali', 'Photo Frames', 'Tray Sets', 'Wall Clocks'];
const distinctCategories = Array.from(
  new Set(
    defaultProducts
      .map((p) => p.category)
      .filter((c) => Boolean(c) && c !== 'Product Image Requires Review' && !primaryCategories.includes(c))
  )
);
export const defaultCategories: string[] = ['All', ...primaryCategories, ...distinctCategories];
