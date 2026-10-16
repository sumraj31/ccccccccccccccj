import { Product } from '../types';

export function getProductUrl(product: Product): string {
  if (typeof window === 'undefined') return `/product/${product.slug}`;
  return `${window.location.origin}/product/${product.slug}`;
}

export function getWaUrl(product: Product, whatsappNumber: string): string {
  const url = getProductUrl(product);
  const msg = `Hello AnmolKala,

I want to enquire about this product.

Product: ${product.name}
Category: ${product.category}
Product ID: ${product.id}
Product Link: ${url}

Please share availability, price and customization options.`;

  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

export function loadStorage<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (e) {
    return defaultValue;
  }
}

export function saveStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.error('Failed to save to localStorage', e);
  }
}

export function handleImageError(e: React.SyntheticEvent<HTMLImageElement, Event>) {
  const target = e.currentTarget;
  const currentSrc = target.getAttribute('src') || '';
  if (currentSrc.startsWith('/products/') && !currentSrc.startsWith('http')) {
    target.src = `https://www.anmolkala.in${currentSrc}`;
    return;
  }
  target.onerror = null;
  target.src = '/logo.png';
  target.alt = 'Image unavailable';
}
