export type ProductAvailability = 'in_stock' | 'made_to_order' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  category: string;
  slug: string;
  image: string;
  image_url?: string;
  video_url?: string;
  tags: string;
  description: string;
  type?: 'product' | 'video';
  published?: boolean;
  availability?: ProductAvailability;
  created_at?: string;
  updated_at?: string;
}

export interface StoreItem {
  id: string;
  type: 'product' | 'video';
  name: string;
  category: string;
  slug: string;
  description: string;
  image_url: string;
  video_url: string;
  tags: string;
  published: boolean;
  availability?: ProductAvailability;
  created_at?: string;
  updated_at?: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  display_order?: number;
  product_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MediaItem {
  id: string;
  product_id: string;
  product_name?: string;
  storage_path: string;
  media_type: 'image' | 'video';
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  display_order?: number;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  timestamp: string;
  user_email: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details?: string;
}

export interface AdminSession {
  email: string;
  token: string;
  expires_at: number;
  role: 'admin';
}

export interface BrandData {
  brand: string;
  whatsapp: string;
  phone: string;
  email: string;
}

export type DrawerType = 'wish' | 'compare' | 'saved' | 'recent' | null;

export type DashboardSection =
  | 'overview'
  | 'add-photo-product'
  | 'add-video-product'
  | 'products'
  | 'add-product'
  | 'categories'
  | 'images'
  | 'videos'
  | 'media-gallery'
  | 'upload-center'
  | 'availability'
  | 'recently-updated'
  | 'activity-logs'
  | 'account'
  | 'settings';
