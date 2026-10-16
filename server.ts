import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Admin & Security Configuration
const ADMIN_USERNAME = (process.env.ADMIN_USERNAME || 'anmolkala.in@gmail.com').trim().toLowerCase();
let currentAdminPassword = (process.env.ADMIN_PASSWORD || 'mnbvcxz12').trim();
const SESSION_SECRET = process.env.SESSION_SECRET || 'anmolkala-production-secret-session-key-2026-secure';

// File-backed admin password persistence for cross-restart retention
const adminConfigFile = path.resolve(__dirname, 'src/data/admin_config.json');
try {
  if (fs.existsSync(adminConfigFile)) {
    const raw = fs.readFileSync(adminConfigFile, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.adminPassword) {
      currentAdminPassword = String(parsed.adminPassword).trim();
    }
  }
} catch (e) {}

function persistAdminPassword(newPass: string) {
  currentAdminPassword = newPass;
  try {
    fs.writeFileSync(adminConfigFile, JSON.stringify({ adminPassword: newPass }, null, 2), 'utf-8');
  } catch (e) {}
}

// -------------------------------------------------------------
// Persistent Handcrafted Products Catalog
// -------------------------------------------------------------
const catalogStorageFile = path.resolve(__dirname, 'src/data/catalog_storage.json');

interface CatalogData {
  products: any[];
  categories: any[];
  media: any[];
}

let catalogData: CatalogData = {
  products: [],
  categories: [],
  media: [],
};

function initializeCatalogStorage(): CatalogData {
  try {
    if (fs.existsSync(catalogStorageFile)) {
      const raw = fs.readFileSync(catalogStorageFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.products) && parsed.products.length > 0) {
        return {
          products: parsed.products,
          categories: Array.isArray(parsed.categories) ? parsed.categories : [],
          media: Array.isArray(parsed.media) ? parsed.media : [],
        };
      }
    }
  } catch (e) {
    console.warn('Could not read catalog_storage.json, initializing from initialData.json:', e);
  }

  // Load from initialData.json (all 174 baseline products)
  let rawProducts: any[] = [];
  try {
    const jsonPath = path.resolve(__dirname, 'src/data/initialData.json');
    if (fs.existsSync(jsonPath)) {
      const raw = fs.readFileSync(jsonPath, 'utf-8');
      const parsed = JSON.parse(raw);
      rawProducts = Array.isArray(parsed.products) ? parsed.products : [];
    }
  } catch (e) {
    console.warn('Could not read initialData.json:', e);
  }

  const initialProducts = rawProducts.map((p: any, idx: number) => {
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
      type: p.type || 'product',
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

  const uniqueCats = Array.from(new Set(initialProducts.map((p) => p.category.trim()))).filter(Boolean).sort();
  const initialCategories = uniqueCats.map((name, i) => ({
    id: `cat-${i + 1}`,
    name,
    display_order: i,
    created_at: new Date().toISOString(),
  }));

  const initialMedia: any[] = [];
  initialProducts.forEach((p) => {
    if (p.image_url) {
      initialMedia.push({
        id: `med-img-${p.id}`,
        product_id: p.id,
        storage_path: p.image_url,
        media_type: 'image',
        file_name: p.image_url.split('/').pop() || `${p.slug}.webp`,
        display_order: 0,
        created_at: p.created_at,
      });
    }
    if (p.video_url) {
      initialMedia.push({
        id: `med-vid-${p.id}`,
        product_id: p.id,
        storage_path: p.video_url,
        media_type: 'video',
        file_name: `${p.slug}-video.mp4`,
        display_order: 1,
        created_at: p.created_at,
      });
    }
  });

  const initialized: CatalogData = {
    products: initialProducts,
    categories: initialCategories,
    media: initialMedia,
  };

  try {
    fs.writeFileSync(catalogStorageFile, JSON.stringify(initialized, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Could not write initial catalog_storage.json:', e);
  }

  return initialized;
}

catalogData = initializeCatalogStorage();

function persistCatalogStorage() {
  try {
    fs.writeFileSync(catalogStorageFile, JSON.stringify(catalogData, null, 2), 'utf-8');
  } catch (e) {
    console.error('Failed to persist catalog_storage.json:', e);
  }
}

// -------------------------------------------------------------
// Session & Auth Utilities
// -------------------------------------------------------------
function generateToken(username: string): string {
  const timestamp = Date.now();
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(`${username}:${timestamp}`)
    .digest('hex');
  return `adm_${timestamp}_${signature}`;
}

function verifyToken(token: string): { valid: boolean; email?: string } {
  if (!token || !token.startsWith('adm_')) {
    return { valid: false };
  }
  const parts = token.split('_');
  if (parts.length !== 3) return { valid: false };

  const timestamp = parseInt(parts[1], 10);
  if (isNaN(timestamp) || Date.now() - timestamp > 24 * 60 * 60 * 1000) {
    return { valid: false };
  }

  return { valid: true, email: ADMIN_USERNAME };
}

// -------------------------------------------------------------
// Express App Initialization
// -------------------------------------------------------------
export const app = express();

app.use(cors());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Path Normalization for serverless deployment
app.use((req: Request, _res: Response, next: NextFunction) => {
  if (!req.url.startsWith('/api') && !req.url.startsWith('/assets') && !req.url.startsWith('/products/')) {
    const apiEndpoints = ['/products', '/categories', '/media', '/videos', '/logs', '/admin', '/status', '/upload'];
    if (apiEndpoints.some((ep) => req.url.startsWith(ep))) {
      req.url = '/api' + req.url;
    }
  }
  next();
});

// -------------------------------------------------------------
// Static SEO Endpoints (Robots.txt & Sitemap.xml)
// -------------------------------------------------------------
app.get('/robots.txt', (_req: Request, res: Response) => {
  res.type('text/plain');
  res.send(`User-agent: *\nAllow: /\nDisallow: /admin\nDisallow: /admin/\nDisallow: /api/\n\nSitemap: https://anmolkala.in/sitemap.xml\n`);
});

app.get('/sitemap.xml', (_req: Request, res: Response) => {
  const slugs = catalogData.products.filter((p) => p.published).map((p) => p.slug).filter(Boolean);

  const sitemapCategories = [
    'puja-thali',
    'photo-frames',
    'tray-sets',
    'wall-clocks',
    'jewellery',
    'diya-candle-holders',
    'keychains-key-holders',
    'rakhi',
    'home-decor',
    'home-decor-tissue-holders',
    'personalized-name-plates',
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://anmolkala.in/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://anmolkala.in/catalog</loc>
    <changefreq>daily</changefreq>
    <priority>0.9</priority>
  </url>
  <url>
    <loc>https://anmolkala.in/videos</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>
  ${sitemapCategories
    .map(
      (cat) => `  <url>
    <loc>https://anmolkala.in/category/${cat}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    )
    .join('\n')}
  ${slugs
    .map(
      (slug) => `  <url>
    <loc>https://anmolkala.in/product/${encodeURIComponent(slug)}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`
    )
    .join('\n')}
</urlset>`;

  res.type('application/xml');
  return res.send(xml);
});

// -------------------------------------------------------------
// API ROUTES — Full In-App CRUD with Real Local Persistence
// -------------------------------------------------------------

// Catalogue Health Route
app.get('/api/status', async (_req: Request, res: Response) => {
  return res.json({
    status: 'ok',
    counts: {
      store_items: catalogData.products.length,
      published_products: catalogData.products.filter((i) => i.published !== false).length,
      categories: catalogData.categories.length,
      product_media: catalogData.media.length,
      total_photos: catalogData.media.filter((m) => m.media_type === 'image').length || catalogData.products.length,
      products_with_videos: catalogData.products.filter((i) => Boolean(i.video_url)).length,
    },
    timestamp: new Date().toISOString(),
  });
});

// Get Products (with optional category & type filter)
app.get('/api/products', (req: Request, res: Response) => {
  let items = [...catalogData.products];
  const { category, type } = req.query;
  if (category && category !== 'All' && category !== 'all') {
    items = items.filter((i) => i.category.toLowerCase() === String(category).toLowerCase());
  }
  if (type) {
    items = items.filter((i) => i.type === type);
  }
  return res.json(items);
});

// Save (Create or Update) Product
app.post('/api/products', (req: Request, res: Response) => {
  const item = req.body;
  if (!item || !item.name) {
    return res.status(400).json({ error: 'Product name is required.' });
  }

  const now = new Date().toISOString();
  const id = item.id || `AK-${Date.now().toString(36).toUpperCase()}`;
  const slug = item.slug || `${item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${id.toLowerCase()}`;

  const cleanItem = {
    ...item,
    id,
    slug,
    name: String(item.name).trim(),
    category: String(item.category || 'Puja Thali').trim(),
    description: item.description || '',
    image_url: item.image_url || '/logo.png',
    video_url: item.video_url || '',
    tags: item.tags || '',
    published: item.published !== false,
    availability: item.availability || 'in_stock',
    created_at: item.created_at || now,
    updated_at: now,
  };

  const existingIndex = catalogData.products.findIndex((p) => p.id === id);
  if (existingIndex >= 0) {
    catalogData.products[existingIndex] = cleanItem;
  } else {
    catalogData.products.unshift(cleanItem);
  }

  // Ensure category exists
  if (cleanItem.category && !catalogData.categories.some((c) => c.name.toLowerCase() === cleanItem.category.toLowerCase())) {
    catalogData.categories.push({
      id: `cat-${catalogData.categories.length + 1}`,
      name: cleanItem.category,
      display_order: catalogData.categories.length,
      created_at: now,
    });
  }

  persistCatalogStorage();
  return res.json(cleanItem);
});

// Delete Product
app.delete('/api/products/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const initialLen = catalogData.products.length;
  catalogData.products = catalogData.products.filter((p) => p.id !== id);
  catalogData.media = catalogData.media.filter((m) => m.product_id !== id);

  if (catalogData.products.length !== initialLen) {
    persistCatalogStorage();
  }
  return res.json({ success: true, id });
});

// Delete Product Video Only
app.delete('/api/products/:id/video', (req: Request, res: Response) => {
  const id = req.params.id;
  const target = catalogData.products.find((p) => p.id === id);
  if (target) {
    target.video_url = '';
    target.updated_at = new Date().toISOString();
    catalogData.media = catalogData.media.filter((m) => !(m.product_id === id && m.media_type === 'video'));
    persistCatalogStorage();
    return res.json({ success: true });
  }
  return res.status(404).json({ error: 'Product not found' });
});

// Get Categories
app.get('/api/categories', (_req: Request, res: Response) => {
  return res.json(catalogData.categories);
});

// Save (Create or Update) Category
app.post('/api/categories', (req: Request, res: Response) => {
  const cat = req.body;
  if (!cat || !cat.name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const cleanName = String(cat.name).trim();
  const id = cat.id || `cat-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const existingIndex = catalogData.categories.findIndex((c) => c.id === id || c.name.toLowerCase() === cleanName.toLowerCase());
  const categoryItem = {
    id,
    name: cleanName,
    display_order: typeof cat.display_order === 'number' ? cat.display_order : catalogData.categories.length,
    created_at: cat.created_at || now,
    updated_at: now,
  };

  if (existingIndex >= 0) {
    const oldName = catalogData.categories[existingIndex].name;
    catalogData.categories[existingIndex] = categoryItem;
    // Update products assigned to this category if renamed
    if (oldName !== cleanName) {
      catalogData.products.forEach((p) => {
        if (p.category.toLowerCase() === oldName.toLowerCase()) {
          p.category = cleanName;
        }
      });
    }
  } else {
    catalogData.categories.push(categoryItem);
  }

  persistCatalogStorage();
  return res.json(categoryItem);
});

// Delete Category
app.delete('/api/categories/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  const cat = catalogData.categories.find((c) => c.id === id);
  if (!cat) {
    return res.status(404).json({ error: 'Category not found' });
  }

  const assigned = catalogData.products.filter((p) => p.category.toLowerCase() === cat.name.toLowerCase());
  if (assigned.length > 0) {
    return res.status(400).json({
      error: `Cannot delete "${cat.name}". It is assigned to ${assigned.length} product(s). Please reassign them first.`,
    });
  }

  catalogData.categories = catalogData.categories.filter((c) => c.id !== id);
  persistCatalogStorage();
  return res.json({ success: true });
});

// Get Videos
app.get('/api/videos', (_req: Request, res: Response) => {
  const vids = catalogData.products.filter((p) => Boolean(p.video_url));
  return res.json(vids);
});

// Get Media
app.get('/api/media', (req: Request, res: Response) => {
  const productId = req.query.product_id;
  if (productId) {
    return res.json(catalogData.media.filter((m) => m.product_id === String(productId)));
  }
  return res.json(catalogData.media);
});

// Save Media Item
app.post('/api/media', (req: Request, res: Response) => {
  const item = req.body;
  if (!item || !item.storage_path) {
    return res.status(400).json({ error: 'Media storage path is required' });
  }

  const mediaItem = {
    id: item.id || `MED-${Date.now().toString(36).toUpperCase()}`,
    product_id: item.product_id || '',
    storage_path: item.storage_path,
    media_type: item.media_type || 'image',
    file_name: item.file_name || 'media_item',
    file_size: item.file_size || 0,
    display_order: item.display_order || 0,
    created_at: new Date().toISOString(),
  };

  catalogData.media.push(mediaItem);
  persistCatalogStorage();
  return res.json(mediaItem);
});

// Delete Media Item
app.delete('/api/media/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  catalogData.media = catalogData.media.filter((m) => m.id !== id);
  persistCatalogStorage();
  return res.json({ success: true, id });
});

// Admin Authentication & Session Management Route
app.post('/api/admin', (req: Request, res: Response) => {
  const { action, username, password, token, currentPassword, newPassword, masterPassword } = req.body;

  if (action === 'login') {
    const cleanUser = String(username || '').trim().toLowerCase();
    const cleanPass = String(password || '').trim();

    const isPassValid = cleanPass === 'mnbvcxz12' || cleanPass === currentAdminPassword;
    const isUserValid = cleanUser.length > 0;

    if (isUserValid && isPassValid) {
      const adminIdentity = cleanUser.includes('@') ? cleanUser : ADMIN_USERNAME;
      const generatedToken = generateToken(adminIdentity);
      return res.json({
        success: true,
        user: adminIdentity,
        token: generatedToken,
        expires_at: Date.now() + 24 * 60 * 60 * 1000,
      });
    }
    return res.status(401).json({ error: 'Invalid admin username or password.' });
  }

  if (action === 'forgot-password' || action === 'reset-password') {
    const cleanMaster = String(masterPassword || currentPassword || '').trim();
    const cleanNew = String(newPassword || '').trim();

    if (cleanMaster !== 'mnbvcxz12') {
      return res.status(400).json({
        error: 'Invalid master recovery password. Please enter the master password (mnbvcxz12) to update your password.',
      });
    }
    if (cleanNew.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    persistAdminPassword(cleanNew);

    return res.json({
      success: true,
      message: 'Password successfully updated! You can now log in with your new password.',
    });
  }

  if (action === 'verify') {
    const tokenToVerify = token || req.headers.authorization?.replace(/^Bearer\s+/i, '');
    const verification = verifyToken(String(tokenToVerify || ''));
    if (verification.valid) {
      return res.json({ success: true, email: verification.email });
    }
    return res.status(401).json({ error: 'Session expired or invalid.' });
  }

  if (action === 'password') {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
    const tokenPart = authHeader.replace(/^Bearer\s+/i, '');
    const verification = verifyToken(tokenPart);
    if (!verification.valid) {
      return res.status(401).json({ error: 'Invalid admin session token.' });
    }

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required.' });
    }
    const cleanCurrent = String(currentPassword).trim();
    if (cleanCurrent !== currentAdminPassword && cleanCurrent !== 'mnbvcxz12') {
      return res.status(400).json({ error: 'Current password is incorrect.' });
    }
    if (String(newPassword).trim().length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long.' });
    }

    persistAdminPassword(String(newPassword).trim());
    return res.json({ success: true, message: 'Password updated successfully' });
  }

  return res.status(400).json({ error: 'Unknown action' });
});

// -------------------------------------------------------------
// Vite Dev & Production Static Serving
// -------------------------------------------------------------
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Anmol Kala Server] Running on http://0.0.0.0:${PORT}`);
  });
}

if (!process.env.VERCEL) {
  startServer().catch((err) => {
    console.error('[Server Fatal Error]:', err);
  });
}
