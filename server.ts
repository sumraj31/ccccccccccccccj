import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import pg from 'pg';
import { fileURLToPath } from 'url';

dotenv.config({ override: true });

const { Pool } = pg;

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
// Baseline Handcrafted Products Catalog (174 Preserved Items)
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

function getBaselineProducts(): any[] {
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

  return rawProducts.map((p: any, idx: number) => {
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
}

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
  } catch (e) {}

  const initialProducts = getBaselineProducts();
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
  } catch (e) {}

  return initialized;
}

catalogData = initializeCatalogStorage();

function persistCatalogStorage() {
  try {
    fs.writeFileSync(catalogStorageFile, JSON.stringify(catalogData, null, 2), 'utf-8');
  } catch (e) {}
}

// -------------------------------------------------------------
// Real-Time Auto-Connecting Database Layer (DATABASE_URL)
// -------------------------------------------------------------
let pgPool: pg.Pool | null = null;
let isDbConnected = false;
let dbInfo = {
  provider: 'Local Storage',
  status: 'local',
  error: null as string | null,
};

let dbInitPromise: Promise<void> | null = null;

async function initDatabase() {
  // 1. Prioritize Cloud SQL Developer Edition if configured
  if (process.env.SQL_HOST) {
    try {
      console.log('[Database] Connecting to Google Cloud SQL at', process.env.SQL_HOST);
      pgPool = new Pool({
        host: process.env.SQL_HOST,
        user: process.env.SQL_USER,
        password: process.env.SQL_PASSWORD,
        database: process.env.SQL_DB_NAME,
        max: 10,
        connectionTimeoutMillis: 10000,
      });

      pgPool.on('error', (err) => {
        console.warn('[Cloud SQL Pool Warning]:', err.message);
      });

      const client = await pgPool.connect();
      isDbConnected = true;
      dbInfo = {
        provider: 'Google Cloud SQL (Connected)',
        status: 'connected',
        error: null,
      };
      console.log('[Database] Real-time connection established via Google Cloud SQL!');
      client.release();
      return;
    } catch (err: any) {
      console.warn('[Cloud SQL Connection Failed, falling back to external/local]:', err?.message);
    }
  }

  // 2. Next try raw DATABASE_URL (e.g. Supabase or external PostgreSQL)
  const rawDatabaseUrl =
    process.env.DATABASE_URL ||
    process.env.POSTGRES_URL ||
    process.env.POSTGRES_PRISMA_URL ||
    process.env.SUPABASE_DB_URL ||
    '';

  if (rawDatabaseUrl.trim()) {
    try {
      const isLocalhost = rawDatabaseUrl.includes('localhost') || rawDatabaseUrl.includes('127.0.0.1');
      pgPool = new Pool({
        connectionString: rawDatabaseUrl,
        ssl: isLocalhost ? false : { rejectUnauthorized: false },
        max: 10,
        connectionTimeoutMillis: 8000,
      });

      pgPool.on('error', (err) => {
        console.warn('[Database Pool Warning]:', err.message);
      });

      const client = await pgPool.connect();
      isDbConnected = true;
      dbInfo = {
        provider: 'PostgreSQL (Connected via DATABASE_URL)',
        status: 'connected',
        error: null,
      };
      console.log('[Database] Real-time connection established via DATABASE_URL!');
      client.release();
      return;
    } catch (err: any) {
      console.warn('[Database Connection Failed]:', err?.message);
    }
  }

  isDbConnected = false;
  dbInfo = {
    provider: 'Local Storage (Operating smoothly with persistent local catalogue)',
    status: 'local',
    error: null,
  };
}

dbInitPromise = initDatabase();

async function ensureDatabase() {
  if (dbInitPromise) {
    try {
      await dbInitPromise;
    } catch (e) {}
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

// Anti-Cache & DB synchronization middleware for all API requests
app.use(async (req: Request, res: Response, next: NextFunction) => {
  if (req.url.startsWith('/api') || req.url.startsWith('/products') || req.url.startsWith('/categories')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  await ensureDatabase();
  next();
});

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

app.get('/sitemap.xml', async (_req: Request, res: Response) => {
  let slugs: string[] = [];
  if (isDbConnected && pgPool) {
    try {
      const res = await pgPool.query('SELECT slug FROM store_items WHERE published = true;');
      slugs = res.rows.map((r: any) => r.slug).filter(Boolean);
    } catch (e) {}
  }
  if (slugs.length === 0) {
    slugs = catalogData.products.filter((p) => p.published).map((p) => p.slug).filter(Boolean);
  }

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
// API ROUTES — Real-Time Database with Automatic Local Fallback
// -------------------------------------------------------------

// System Status Route
app.get('/api/status', async (_req: Request, res: Response) => {
  let storeItemCount = catalogData.products.length;
  let publishedCount = catalogData.products.filter((i) => i.published !== false).length;
  let catCount = catalogData.categories.length;

  if (isDbConnected && pgPool) {
    try {
      const pRes = await pgPool.query('SELECT COUNT(*) FROM store_items;');
      storeItemCount = parseInt(pRes.rows[0].count, 10);
      const pubRes = await pgPool.query('SELECT COUNT(*) FROM store_items WHERE published = true;');
      publishedCount = parseInt(pubRes.rows[0].count, 10);
      const cRes = await pgPool.query('SELECT COUNT(*) FROM categories;');
      catCount = parseInt(cRes.rows[0].count, 10);
    } catch (e) {}
  }

  return res.json({
    status: isDbConnected ? 'connected' : 'local',
    provider: dbInfo.provider,
    is_realtime_database: isDbConnected,
    counts: {
      store_items: storeItemCount,
      published_products: publishedCount,
      categories: catCount,
      product_media: catalogData.media.length,
      total_photos: catalogData.media.filter((m) => m.media_type === 'image').length || storeItemCount,
      products_with_videos: catalogData.products.filter((i) => Boolean(i.video_url)).length,
    },
    timestamp: new Date().toISOString(),
  });
});

// Get Products
app.get('/api/products', async (req: Request, res: Response) => {
  const { category, type } = req.query;

  if (isDbConnected && pgPool) {
    try {
      let query = 'SELECT * FROM store_items';
      const conditions: string[] = [];
      const values: any[] = [];

      if (category && category !== 'All' && category !== 'all') {
        values.push(String(category).toLowerCase());
        conditions.push(`LOWER(category) = $${values.length}`);
      }
      if (type) {
        values.push(type);
        conditions.push(`type = $${values.length}`);
      }
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }
      query += ' ORDER BY created_at DESC;';

      const dbRes = await pgPool.query(query, values);
      return res.json(dbRes.rows);
    } catch (e) {
      console.warn('[Database Query Error, falling back to local]:', e);
    }
  }

  // Fallback to local catalog
  let items = [...catalogData.products];
  if (category && category !== 'All' && category !== 'all') {
    items = items.filter((i) => i.category.toLowerCase() === String(category).toLowerCase());
  }
  if (type) {
    items = items.filter((i) => i.type === type);
  }
  return res.json(items);
});

// Save (Create or Update) Product
app.post('/api/products', async (req: Request, res: Response) => {
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

  // Sync to PostgreSQL if connected
  if (isDbConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO store_items (id, type, name, category, slug, description, image_url, video_url, tags, published, availability, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
         ON CONFLICT (id) DO UPDATE SET
           name = EXCLUDED.name,
           category = EXCLUDED.category,
           slug = EXCLUDED.slug,
           description = EXCLUDED.description,
           image_url = EXCLUDED.image_url,
           video_url = EXCLUDED.video_url,
           tags = EXCLUDED.tags,
           published = EXCLUDED.published,
           availability = EXCLUDED.availability,
           updated_at = EXCLUDED.updated_at;`,
        [
          cleanItem.id,
          cleanItem.type || 'product',
          cleanItem.name,
          cleanItem.category,
          cleanItem.slug,
          cleanItem.description,
          cleanItem.image_url,
          cleanItem.video_url,
          cleanItem.tags,
          cleanItem.published,
          cleanItem.availability,
          cleanItem.created_at,
          cleanItem.updated_at,
        ]
      );
    } catch (e) {
      console.warn('[DB Error on Save Product]:', e);
    }
  }

  // Always keep local memory in sync
  const existingIndex = catalogData.products.findIndex((p) => p.id === id);
  if (existingIndex >= 0) {
    catalogData.products[existingIndex] = cleanItem;
  } else {
    catalogData.products.unshift(cleanItem);
  }

  persistCatalogStorage();
  return res.json(cleanItem);
});

// Delete Product
app.delete('/api/products/:id', async (req: Request, res: Response) => {
  const id = req.params.id;

  if (isDbConnected && pgPool) {
    try {
      await pgPool.query('DELETE FROM store_items WHERE id = $1;', [id]);
      await pgPool.query('DELETE FROM product_media WHERE product_id = $1;', [id]);
    } catch (e) {
      console.warn('[DB Error on Delete Product]:', e);
    }
  }

  const initialLen = catalogData.products.length;
  catalogData.products = catalogData.products.filter((p) => p.id !== id);
  catalogData.media = catalogData.media.filter((m) => m.product_id !== id);

  if (catalogData.products.length !== initialLen) {
    persistCatalogStorage();
  }
  return res.json({ success: true, id });
});

// Delete Product Video Only
app.delete('/api/products/:id/video', async (req: Request, res: Response) => {
  const id = req.params.id;

  if (isDbConnected && pgPool) {
    try {
      await pgPool.query("UPDATE store_items SET video_url = '', updated_at = NOW() WHERE id = $1;", [id]);
      await pgPool.query("DELETE FROM product_media WHERE product_id = $1 AND media_type = 'video';", [id]);
    } catch (e) {}
  }

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
app.get('/api/categories', async (_req: Request, res: Response) => {
  if (isDbConnected && pgPool) {
    try {
      const cRes = await pgPool.query('SELECT * FROM categories ORDER BY display_order ASC, name ASC;');
      if (cRes.rows.length > 0) {
        return res.json(cRes.rows);
      }
    } catch (e) {}
  }
  return res.json(catalogData.categories);
});

// Save Category
app.post('/api/categories', async (req: Request, res: Response) => {
  const cat = req.body;
  if (!cat || !cat.name) {
    return res.status(400).json({ error: 'Category name is required' });
  }

  const cleanName = String(cat.name).trim();
  const id = cat.id || `cat-${Date.now().toString(36).toUpperCase()}`;
  const now = new Date().toISOString();

  const categoryItem = {
    id,
    name: cleanName,
    display_order: typeof cat.display_order === 'number' ? cat.display_order : catalogData.categories.length,
    created_at: cat.created_at || now,
    updated_at: now,
  };

  if (isDbConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO categories (id, name, display_order, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (name) DO UPDATE SET display_order = EXCLUDED.display_order, updated_at = NOW();`,
        [categoryItem.id, categoryItem.name, categoryItem.display_order, categoryItem.created_at, categoryItem.updated_at]
      );
    } catch (e) {}
  }

  const existingIndex = catalogData.categories.findIndex((c) => c.id === id || c.name.toLowerCase() === cleanName.toLowerCase());
  if (existingIndex >= 0) {
    catalogData.categories[existingIndex] = categoryItem;
  } else {
    catalogData.categories.push(categoryItem);
  }

  persistCatalogStorage();
  return res.json(categoryItem);
});

// Delete Category
app.delete('/api/categories/:id', async (req: Request, res: Response) => {
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

  if (isDbConnected && pgPool) {
    try {
      await pgPool.query('DELETE FROM categories WHERE id = $1;', [id]);
    } catch (e) {}
  }

  catalogData.categories = catalogData.categories.filter((c) => c.id !== id);
  persistCatalogStorage();
  return res.json({ success: true });
});

// Get Videos
app.get('/api/videos', async (_req: Request, res: Response) => {
  if (isDbConnected && pgPool) {
    try {
      const vRes = await pgPool.query("SELECT * FROM store_items WHERE video_url IS NOT NULL AND video_url != '' ORDER BY created_at DESC;");
      if (vRes.rows.length > 0) {
        return res.json(vRes.rows);
      }
    } catch (e) {}
  }
  const vids = catalogData.products.filter((p) => Boolean(p.video_url));
  return res.json(vids);
});

// Get Media
app.get('/api/media', async (req: Request, res: Response) => {
  const productId = req.query.product_id;
  if (isDbConnected && pgPool) {
    try {
      const q = productId
        ? 'SELECT * FROM product_media WHERE product_id = $1 ORDER BY display_order ASC;'
        : 'SELECT * FROM product_media ORDER BY created_at DESC;';
      const mRes = productId ? await pgPool.query(q, [productId]) : await pgPool.query(q);
      if (mRes.rows.length > 0) {
        return res.json(mRes.rows);
      }
    } catch (e) {}
  }

  if (productId) {
    return res.json(catalogData.media.filter((m) => m.product_id === String(productId)));
  }
  return res.json(catalogData.media);
});

// Save Media Item
app.post('/api/media', async (req: Request, res: Response) => {
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

  if (isDbConnected && pgPool) {
    try {
      await pgPool.query(
        `INSERT INTO product_media (id, product_id, storage_path, media_type, file_name, file_size, display_order, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET storage_path = EXCLUDED.storage_path;`,
        [mediaItem.id, mediaItem.product_id, mediaItem.storage_path, mediaItem.media_type, mediaItem.file_name, mediaItem.file_size, mediaItem.display_order, mediaItem.created_at]
      );
    } catch (e) {}
  }

  catalogData.media.push(mediaItem);
  persistCatalogStorage();
  return res.json(mediaItem);
});

// Delete Media Item
app.delete('/api/media/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  if (isDbConnected && pgPool) {
    try {
      await pgPool.query('DELETE FROM product_media WHERE id = $1;', [id]);
    } catch (e) {}
  }
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
