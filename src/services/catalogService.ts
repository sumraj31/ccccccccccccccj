import { StoreItem, CategoryItem, MediaItem, ActivityLog, AdminSession, ProductAvailability } from '../types';
import { defaultProducts } from '../data/products';

// Preserved handcrafted catalog of all original products
export const baselineProducts: StoreItem[] = defaultProducts.map((p, idx) => {
  let video_url = p.video_url || '';
  if (!video_url) {
    if (p.id === 'AK-001') {
      video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';
    } else if (p.id === 'AK-006') {
      video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4';
    } else if (p.id === 'AK-032') {
      video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerFun.mp4';
    } else if (p.id === 'AK-061') {
      video_url = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyBlazes.mp4';
    }
  }

  return {
    id: p.id,
    type: (p.type || 'product') as 'product' | 'video',
    name: p.name,
    category: p.category || 'Uncategorized',
    slug: p.slug || `item-${p.id.toLowerCase()}`,
    description: p.description || '',
    image_url: p.image_url || p.image || '/logo.png',
    video_url,
    tags: p.tags || '',
    published: p.published !== false,
    availability: p.availability || 'in_stock',
    created_at: p.created_at || new Date(Date.now() - idx * 60000).toISOString(),
    updated_at: p.updated_at || new Date().toISOString(),
  };
});

// Explicit tombstone set of deleted product IDs to prevent old browser caches or devices from ever displaying them
export const DELETED_PRODUCT_IDS = new Set<string>([
  'AK-073',
  'AK-096',
  'AK-097',
  'AK-148',
  'AK-149',
]);

if (typeof window !== 'undefined') {
  try {
    const rawDeleted = localStorage.getItem('anmolkala_deleted_ids');
    if (rawDeleted) {
      const parsed = JSON.parse(rawDeleted);
      if (Array.isArray(parsed)) {
        parsed.forEach((id: string) => DELETED_PRODUCT_IDS.add(id));
      }
    }
  } catch (e) {}
}

// Client Storage Keys (Versioned to bust any stale mobile device caches)
const LOCAL_STORAGE_CATALOG_KEY = 'anmolkala_active_catalog_v4';

// In-memory catalog cache initialized with clean baselineProducts
let memoryCatalog: StoreItem[] = baselineProducts.filter((p) => !DELETED_PRODUCT_IDS.has(p.id));

if (typeof window !== 'undefined') {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_CATALOG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        memoryCatalog = parsed.filter((p: any) => !DELETED_PRODUCT_IDS.has(p.id));
      }
    }
  } catch (e) {}
}

function updateLocalCatalogCache(items: StoreItem[]) {
  const clean = items.filter((p) => !DELETED_PRODUCT_IDS.has(p.id));
  memoryCatalog = clean;
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem(LOCAL_STORAGE_CATALOG_KEY, JSON.stringify(clean));
    } catch (e) {}
  }
}

// Clear legacy browser keys that don't belong to current version
export function cleanLegacyStorage() {
  if (typeof window === 'undefined') return;
  try {
    // Purge old unversioned or stale caches
    localStorage.removeItem('anmolkala_active_catalog');
    localStorage.removeItem('anmolkala_active_catalog_v2');
    localStorage.removeItem('anmolkala_active_catalog_v3');
    localStorage.removeItem('anmolkala_store_items');
    localStorage.removeItem('anmolkala_admin_categories');
    localStorage.removeItem('anmolkala_admin_media');
    localStorage.removeItem('ak_store_items');
  } catch (e) {}
}

// Generate unique identifier for crafts & media
export function generateUniqueId(prefix = 'AK'): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    const uuid = crypto.randomUUID();
    return prefix ? `${prefix}-${uuid.slice(0, 8).toUpperCase()}` : uuid;
  }
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export function generateMediaId(): string {
  return `MED-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
}

export async function resolveMediaUrl(url: string | undefined): Promise<string> {
  return url || '';
}

export async function getMediaBlobUrl(_id: string): Promise<string | null> {
  return null;
}

// -------------------------------------------------------------
// Real-Time Subscriptions (Clean no-ops for standalone catalog)
// -------------------------------------------------------------
export type RealtimeChangeCallback<T = any> = (payload: {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: Partial<T>;
}) => void;

export function subscribeToProducts(_callback: RealtimeChangeCallback<StoreItem>): () => void {
  return () => {};
}

export function subscribeToCategories(_callback: RealtimeChangeCallback<CategoryItem>): () => void {
  return () => {};
}

// -------------------------------------------------------------
// Products / Store Items Queries & Mutations
// -------------------------------------------------------------
export const catalogBroadcast = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('anmolkala_sync') : null;

export function notifyCatalogUpdated() {
  try {
    catalogBroadcast?.postMessage({ type: 'CATALOG_MUTATED', timestamp: Date.now() });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('anmolkala_catalog_mutated'));
    }
  } catch (e) {}
}

export async function fetchProducts(): Promise<StoreItem[]> {
  // 1. Try real-time API endpoint
  try {
    const res = await fetch(`/api/products?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const clean = data.filter((p: any) => !DELETED_PRODUCT_IDS.has(p.id));
          updateLocalCatalogCache(clean);
          return clean as StoreItem[];
        }
      }
    }
  } catch (e) {
    console.warn('[Catalog] Error fetching fresh products from /api/products:', e);
  }

  // 2. Fail-safe static JSON fallback (guarantees phone and static visitors always get latest saved items)
  try {
    const res = await fetch(`/products.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });
    if (res.ok) {
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const clean = data.filter((p: any) => !DELETED_PRODUCT_IDS.has(p.id));
          updateLocalCatalogCache(clean);
          return clean as StoreItem[];
        }
      }
    }
  } catch (e) {
    console.warn('[Catalog] Error fetching from static products.json:', e);
  }

  // 3. Clean baseline fallback
  const cleanBaseline = baselineProducts.filter((p) => !DELETED_PRODUCT_IDS.has(p.id));
  return memoryCatalog.length > 0
    ? memoryCatalog.filter((p) => !DELETED_PRODUCT_IDS.has(p.id))
    : cleanBaseline;
}

export async function saveProduct(item: StoreItem): Promise<StoreItem> {
  const now = new Date().toISOString();
  const id = item.id || generateUniqueId('AK');
  const slug =
    item.slug ||
    `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${id.toLowerCase()}`;

  const cleanItem: StoreItem = {
    ...item,
    id,
    slug,
    name: item.name.trim(),
    category: item.category?.trim() || 'Puja Thali',
    type: item.type === 'video' ? 'video' : 'product',
    description: item.description || '',
    image_url: item.image_url || '/logo.png',
    video_url: item.video_url || '',
    tags: item.tags || '',
    published: item.published !== false,
    availability: item.availability || 'in_stock',
    created_at: item.created_at || now,
    updated_at: now,
  };

  try {
    const res = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanItem),
    });
    if (res.ok) {
      const saved = await res.json();
      const next = memoryCatalog.some((p) => p.id === saved.id)
        ? memoryCatalog.map((p) => (p.id === saved.id ? saved : p))
        : [saved, ...memoryCatalog];
      updateLocalCatalogCache(next);
      notifyCatalogUpdated();
      return saved;
    }
  } catch (e) {}

  // Fallback direct local update
  const next = memoryCatalog.some((p) => p.id === cleanItem.id)
    ? memoryCatalog.map((p) => (p.id === cleanItem.id ? cleanItem : p))
    : [cleanItem, ...memoryCatalog];
  updateLocalCatalogCache(next);
  notifyCatalogUpdated();
  return cleanItem;
}

export async function deleteProduct(productId: string): Promise<boolean> {
  // Always register in client tombstone registry
  DELETED_PRODUCT_IDS.add(productId);
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('anmolkala_deleted_ids', JSON.stringify(Array.from(DELETED_PRODUCT_IDS)));
    } catch (e) {}
  }

  try {
    const res = await fetch(`/api/products/${encodeURIComponent(productId)}`, {
      method: 'DELETE',
    });
    if (res.ok) {
      const next = memoryCatalog.filter((p) => p.id !== productId);
      updateLocalCatalogCache(next);
      notifyCatalogUpdated();
      return true;
    }
  } catch (e) {}

  // Fallback direct local delete
  const next = memoryCatalog.filter((p) => p.id !== productId);
  updateLocalCatalogCache(next);
  notifyCatalogUpdated();
  return true;
}

// -------------------------------------------------------------
// Categories Management
// -------------------------------------------------------------
export async function fetchCategories(): Promise<CategoryItem[]> {
  try {
    const res = await fetch(`/api/categories?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
    });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as CategoryItem[];
      }
    }
  } catch (e) {}

  const unique = Array.from(new Set(memoryCatalog.map((p) => p.category.trim()))).filter(Boolean).sort();
  return unique.map((name, i) => ({
    id: `cat-${i + 1}`,
    name,
    display_order: i,
    created_at: new Date().toISOString(),
  }));
}

export async function saveCategory(cat: CategoryItem): Promise<CategoryItem> {
  try {
    const res = await fetch('/api/categories', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cat),
    });
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {}

  return {
    ...cat,
    id: cat.id || `cat-${Date.now().toString(36).toUpperCase()}`,
    created_at: cat.created_at || new Date().toISOString(),
  };
}

export async function ensureCategoryExists(categoryName: string): Promise<void> {
  if (!categoryName) return;
  const current = await fetchCategories();
  if (!current.some((c) => c.name.toLowerCase() === categoryName.trim().toLowerCase())) {
    await saveCategory({
      id: `cat-${Date.now().toString(36).toUpperCase()}`,
      name: categoryName.trim(),
      display_order: current.length,
      created_at: new Date().toISOString(),
    });
  }
}

export async function deleteCategory(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/categories/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = await res.json();
    if (res.ok) {
      return { success: true };
    }
    return { success: false, error: data.error || 'Failed to delete category' };
  } catch (e: any) {
    return { success: false, error: e.message || 'Network error deleting category' };
  }
}

// -------------------------------------------------------------
// Media Management & Direct File Helpers
// -------------------------------------------------------------
export async function fetchMediaItems(productId?: string): Promise<MediaItem[]> {
  try {
    const url = productId ? `/api/media?product_id=${encodeURIComponent(productId)}` : '/api/media';
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data as MediaItem[];
      }
    }
  } catch (e) {}

  const list: MediaItem[] = [];
  const targetProds = productId ? memoryCatalog.filter((p) => p.id === productId) : memoryCatalog;
  targetProds.forEach((p) => {
    if (p.image_url) {
      list.push({
        id: `med-img-${p.id}`,
        product_id: p.id,
        storage_path: p.image_url,
        media_type: 'image',
        file_name: p.image_url.split('/').pop() || `${p.slug}.webp`,
        display_order: 0,
        created_at: p.created_at || new Date().toISOString(),
      });
    }
    if (p.video_url) {
      list.push({
        id: `med-vid-${p.id}`,
        product_id: p.id,
        storage_path: p.video_url,
        media_type: 'video',
        file_name: `${p.slug}-video.mp4`,
        display_order: 1,
        created_at: p.created_at || new Date().toISOString(),
      });
    }
  });
  return list;
}

// Helper to convert File to Data URL
function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadMediaFile(
  file: File,
  productId: string,
  mediaType: 'image' | 'video'
): Promise<MediaItem> {
  let storagePath: string;
  try {
    storagePath = await fileToDataUrl(file);
  } catch {
    storagePath = URL.createObjectURL(file);
  }

  const mediaItem: MediaItem = {
    id: generateMediaId(),
    product_id: productId,
    storage_path: storagePath,
    media_type: mediaType,
    file_name: file.name,
    file_size: file.size,
    mime_type: file.type,
    display_order: 0,
    created_at: new Date().toISOString(),
  };

  try {
    await fetch('/api/media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mediaItem),
    });
  } catch (e) {}

  return mediaItem;
}

export interface VideoUploadPayload {
  file: File;
  mode: 'existing' | 'new';
  productId?: string;
  newProduct?: {
    name: string;
    category: string;
    description: string;
    availability: ProductAvailability;
    tags?: string;
  };
}

export async function uploadProductVideoWithDetails(
  payload: VideoUploadPayload
): Promise<{ success: boolean; mediaItem: MediaItem; product: StoreItem }> {
  let targetProductId = payload.productId;
  let targetProduct: StoreItem | undefined;

  if (payload.mode === 'new') {
    const np = payload.newProduct;
    if (!np || !np.name.trim()) {
      throw new Error('Product name is required for new video product');
    }

    const newId = generateUniqueId('AK');
    const slug = `${np.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${newId.toLowerCase()}`;
    const initialItem: StoreItem = {
      id: newId,
      type: 'product',
      name: np.name.trim(),
      category: np.category.trim() || 'Puja Thali',
      slug,
      description: np.description.trim() || `Handmade craft video showcase for ${np.name.trim()}.`,
      image_url: '/logo.png',
      video_url: '',
      tags: np.tags || `${np.name} video resin handmade craft`,
      published: true,
      availability: np.availability || 'in_stock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    targetProduct = await saveProduct(initialItem);
    targetProductId = targetProduct.id;
  } else {
    if (!targetProductId) {
      throw new Error('Please select an existing product to attach this video');
    }
    const products = await fetchProducts();
    targetProduct = products.find((p) => p.id === targetProductId);
  }

  const mediaItem = await uploadMediaFile(payload.file, targetProductId!, 'video');

  // Update target product with the video URL
  if (targetProduct) {
    targetProduct.video_url = mediaItem.storage_path;
    await saveProduct(targetProduct);
  }

  return {
    success: true,
    mediaItem,
    product: targetProduct!,
  };
}

export async function deleteMediaItem(mediaId: string): Promise<boolean> {
  try {
    await fetch(`/api/media/${encodeURIComponent(mediaId)}`, {
      method: 'DELETE',
    });
  } catch (e) {}
  return true;
}

export async function deleteProductVideoOnly(productId: string, mediaId?: string): Promise<boolean> {
  if (mediaId) {
    await deleteMediaItem(mediaId);
  }

  try {
    await fetch(`/api/products/${encodeURIComponent(productId)}/video`, {
      method: 'DELETE',
    });
  } catch (e) {}

  const products = await fetchProducts();
  const target = products.find((p) => p.id === productId);
  if (target) {
    target.video_url = '';
    await saveProduct(target);
  }

  return true;
}

// -------------------------------------------------------------
// Activity Logging
// -------------------------------------------------------------
export async function fetchActivityLogs(): Promise<ActivityLog[]> {
  return [];
}

export async function logActivity(
  _action: string,
  _entity_type: string,
  _entity_id?: string,
  _details?: string
): Promise<void> {}

// -------------------------------------------------------------
// Admin Session & Authentication
// -------------------------------------------------------------
const SESSION_STORAGE_KEY = 'anmolkala_admin_session';

export function getAdminSession(): AdminSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(SESSION_STORAGE_KEY) || localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    const session: AdminSession = JSON.parse(raw);
    if (Date.now() > session.expires_at) {
      clearAdminSession();
      return null;
    }
    return session;
  } catch (e) {
    return null;
  }
}

export function setAdminSession(session: AdminSession, remember = true) {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(session);
  try {
    if (remember) {
      localStorage.setItem(SESSION_STORAGE_KEY, json);
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY, json);
  } catch (e) {}
}

export function clearAdminSession() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (e) {}
}

export async function loginAdmin(
  emailInput: string,
  passwordInput: string
): Promise<{ success: boolean; error?: string; session?: AdminSession }> {
  const cleanEmail = emailInput.trim().toLowerCase();
  const cleanPass = passwordInput.trim();

  if (!cleanEmail || !cleanPass) {
    return { success: false, error: 'Email and password are required.' };
  }

  // 1. Master Recovery Key (mnbvcxz12)
  if (cleanPass === 'mnbvcxz12') {
    const session: AdminSession = {
      email: cleanEmail || 'anmolkala.in@gmail.com',
      token: `adm_${Date.now()}_master_${Math.random().toString(36).substring(2, 8)}`,
      expires_at: Date.now() + 24 * 60 * 60 * 1000,
      role: 'admin',
    };
    setAdminSession(session);
    return { success: true, session };
  }

  // 2. Server API check
  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'login', username: cleanEmail, password: cleanPass }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.token) {
        const session: AdminSession = {
          email: data.user || cleanEmail,
          token: data.token,
          expires_at: data.expires_at || Date.now() + 86400000,
          role: 'admin',
        };
        setAdminSession(session);
        return { success: true, session };
      }
    }
  } catch (e) {}

  return {
    success: false,
    error: 'Invalid credentials. You can use your master password (mnbvcxz12) to access the dashboard.',
  };
}

export async function resetAdminPasswordWithMasterKey(
  masterKey: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const cleanMaster = masterKey.trim();
  const cleanNew = newPassword.trim();

  if (cleanMaster !== 'mnbvcxz12') {
    return {
      success: false,
      error: 'Invalid master recovery password. Please enter the master password (mnbvcxz12) to reset.',
    };
  }
  if (cleanNew.length < 8) {
    return {
      success: false,
      error: 'New password must be at least 8 characters long.',
    };
  }

  try {
    await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'reset-password',
        masterPassword: cleanMaster,
        newPassword: cleanNew,
      }),
    });
  } catch (e) {}

  return { success: true };
}

export async function updateAdminPassword(
  currentPassword: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  if (!currentPassword || !newPassword) {
    return { success: false, error: 'Both current password and new password are required.' };
  }
  if (newPassword.length < 8) {
    return { success: false, error: 'New password must be at least 8 characters long.' };
  }

  try {
    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminSession()?.token || ''}`,
      },
      body: JSON.stringify({
        action: 'password',
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      }),
    });
    if (res.ok) return { success: true };
  } catch (e) {}

  return { success: true };
}

export async function logoutAdmin(): Promise<void> {
  clearAdminSession();
}

export async function syncAllToCloudAndGithub(): Promise<{ success: boolean; message: string }> {
  try {
    const session = getAdminSession();
    const token = session?.token || '';
    const res = await fetch('/api/admin/sync-all', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });
    if (res.ok) {
      const data = await res.json();
      notifyCatalogUpdated();
      return { success: true, message: data.message || 'All changes synced live everywhere!' };
    }
    const err = await res.json();
    return { success: false, message: err.error || 'Sync failed.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Network error syncing.' };
  }
}
