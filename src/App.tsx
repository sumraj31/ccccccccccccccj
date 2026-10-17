import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Product, StoreItem, DrawerType, AdminSession, CategoryItem } from './types';
import { brandInfo, defaultCategories } from './data/products';
import { loadStorage, saveStorage } from './utils/helpers';
import { parsePath, slugifyCategory, matchCategoryFromSlug } from './utils/routing';
import { Header } from './components/Header';
import { CategoryNav } from './components/CategoryNav';
import { Hero } from './components/Hero';
import { Services } from './components/Services';
import { ProductCard } from './components/ProductCard';
import { ProductDetail } from './components/ProductDetail';
import { VideoGallery } from './components/VideoGallery';
import { Drawer } from './components/Drawer';
import { CompareModal } from './components/CompareModal';
import { AdminModal } from './components/AdminModal';
import { Footer } from './components/Footer';
import { Toast } from './components/Toast';
import { AdminLogin } from './components/admin/AdminLogin';
import { AdminDashboard } from './components/admin/AdminDashboard';
import {
  getAdminSession,
  logoutAdmin,
  clearAdminSession,
  fetchProducts,
  fetchCategories,
  saveProduct,
  deleteProduct,
  subscribeToProducts,
  subscribeToCategories,
  cleanLegacyStorage,
  baselineProducts,
} from './services/catalogService';

const STORAGE_KEYS = {
  WISHLIST: 'ak_w',
  SAVED: 'ak_s',
  COMPARE: 'ak_c',
  RECENT: 'ak_r',
};

const ITEMS_PER_PAGE = 10;

export const App: React.FC = () => {
  // Synchronously compute initial route from window.location.pathname on first mount
  const initialRoute = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        view: 'home' as const,
        category: 'All',
        productSlug: null,
        isCategoryNotFound: false,
        categorySlugParam: null,
      };
    }
    return parsePath(window.location.pathname, defaultCategories);
  }, []);

  // Navigation & View state
  const [currentView, setCurrentView] = useState<
    'home' | 'catalog' | 'product' | 'videos' | 'admin-login' | 'admin-dashboard'
  >(() => initialRoute.view);
  const [adminSession, setAdminSession] = useState<AdminSession | null>(() => getAdminSession());
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(() => {
    if (initialRoute.view === 'product' && initialRoute.productSlug) {
      const match = baselineProducts.find(
        (p) =>
          p.slug === initialRoute.productSlug ||
          p.id.toLowerCase() === initialRoute.productSlug?.toLowerCase()
      );
      if (match) {
        return {
          id: match.id,
          name: match.name,
          category: match.category,
          slug: match.slug,
          image: match.image_url || '/logo.png',
          image_url: match.image_url,
          video_url: match.video_url,
          tags: match.tags,
          description: match.description,
          type: match.type === 'video' ? 'video' : 'product',
          published: match.published,
          availability: match.availability || 'in_stock',
          created_at: match.created_at,
          updated_at: match.updated_at,
        };
      }
    }
    return null;
  });
  const [activeCategory, setActiveCategory] = useState<string>(() => initialRoute.category);
  const [categoryNotFound, setCategoryNotFound] = useState<string | null>(() =>
    initialRoute.isCategoryNotFound ? (initialRoute.categorySlugParam || initialRoute.category) : null
  );
  const [homeVideoCategory, setHomeVideoCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'featured' | 'az' | 'za'>('featured');
  const [page, setPage] = useState<number>(1);

  // Modals & Drawers
  const [activeDrawer, setActiveDrawer] = useState<DrawerType>(null);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // User state (Client-side wishlist / compare / saved only)
  const [wishlist, setWishlist] = useState<string[]>(() =>
    loadStorage<string[]>(STORAGE_KEYS.WISHLIST, [])
  );
  const [savedList, setSavedList] = useState<string[]>(() =>
    loadStorage<string[]>(STORAGE_KEYS.SAVED, [])
  );
  const [compareList, setCompareList] = useState<string[]>(() =>
    loadStorage<string[]>(STORAGE_KEYS.COMPARE, [])
  );
  const [recentList, setRecentList] = useState<string[]>(() =>
    loadStorage<string[]>(STORAGE_KEYS.RECENT, [])
  );

  // Products initialized with preserved handcrafted catalog
  const [products, setProducts] = useState<StoreItem[]>(() => baselineProducts);
  const [dbCategories, setDbCategories] = useState<CategoryItem[]>([]);
  const [isCatalogLoading, setIsCatalogLoading] = useState<boolean>(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2000);
  }, []);

  // Sync user client preference lists to local storage
  useEffect(() => {
    saveStorage(STORAGE_KEYS.WISHLIST, wishlist);
  }, [wishlist]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.SAVED, savedList);
  }, [savedList]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.COMPARE, compareList);
  }, [compareList]);

  useEffect(() => {
    saveStorage(STORAGE_KEYS.RECENT, recentList);
  }, [recentList]);

  // Authoritative catalogue: Derived from preserved handcrafted catalog
  const allProducts: Product[] = useMemo(() => {
    return products
      .filter((item) => (item.type || 'product') === 'product' && item.published !== false)
      .map((item): Product => ({
        id: item.id,
        name: item.name,
        category: item.category,
        slug: item.slug || `item-${item.id.toLowerCase()}`,
        image: item.image_url || '/logo.png',
        image_url: item.image_url,
        video_url: item.video_url,
        tags: item.tags,
        description: item.description,
        type: (item.type === 'video' ? 'video' : 'product'),
        published: item.published,
        availability: item.availability || 'in_stock',
        created_at: item.created_at,
        updated_at: item.updated_at,
      }));
  }, [products]);

  // All published craft videos from active catalogue
  const allProductVideos = useMemo(() => {
    const list: Array<{
      id: string;
      name: string;
      category: string;
      video_url: string;
      image_url?: string;
      description?: string;
      product?: Product;
    }> = [];
    const seen = new Set<string>();

    for (const p of allProducts) {
      if (p.video_url && !seen.has(p.video_url)) {
        seen.add(p.video_url);
        list.push({
          id: p.id,
          name: p.name,
          category: p.category,
          video_url: p.video_url,
          image_url: p.image || p.image_url,
          description: p.description,
          product: p,
        });
      }
    }

    return list;
  }, [allProducts]);

  // Unique categories - includes requested primary categories, database categories, and products
  const categories = useMemo(() => {
    const primary = ['Puja Thali', 'Photo Frames', 'Tray Sets', 'Wall Clocks'];
    const other = new Set<string>();
    for (const c of dbCategories) {
      if (c.name && c.name !== 'Product Image Requires Review' && !primary.includes(c.name)) {
        other.add(c.name);
      }
    }
    for (const p of allProducts) {
      if (p.category && p.category !== 'Product Image Requires Review' && !primary.includes(p.category)) {
        other.add(p.category);
      }
    }
    return ['All', ...primary, ...Array.from(other)];
  }, [allProducts, dbCategories]);

  // Helper to convert category to URL slug
  const categoryToSlug = useCallback((cat: string) => {
    return slugifyCategory(cat);
  }, []);

  // Up-to-date refs for listener without re-binding effects on every state update
  const allProductsRef = useRef(allProducts);
  allProductsRef.current = allProducts;
  const categoriesRef = useRef(categories);
  categoriesRef.current = categories;

  // URL resolution logic
  const resolvePath = useCallback((pathname: string) => {
    const parsed = parsePath(pathname, categoriesRef.current);
    setCurrentView(parsed.view);
    if (parsed.view === 'catalog') {
      setActiveCategory(parsed.category);
      setCategoryNotFound(parsed.isCategoryNotFound ? (parsed.categorySlugParam || parsed.category) : null);
      setSelectedProduct(null);
      setPage(1);
    } else if (parsed.view === 'product') {
      if (parsed.productSlug) {
        const found = allProductsRef.current.find(
          (p) =>
            p.slug === parsed.productSlug ||
            p.id.toLowerCase() === parsed.productSlug?.toLowerCase()
        );
        if (found) {
          setSelectedProduct(found);
        }
      }
      setCategoryNotFound(null);
    } else {
      setSelectedProduct(null);
      setCategoryNotFound(null);
    }
  }, []);

  // Handle browser back/forward buttons seamlessly
  useEffect(() => {
    const handlePopState = () => {
      resolvePath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [resolvePath]);

  // Dynamic document title and meta description for SEO
  useEffect(() => {
    let title = 'AnmolKala — Handmade Art & Crafts';
    let desc =
      'Handmade crafts, personalized gifts, puja thalis, photo frames, resin art clocks and home décor with WhatsApp enquiry.';

    if (currentView === 'catalog') {
      title = `${activeCategory} Collection — AnmolKala`;
      desc = `Browse handcrafted ${activeCategory} collection from AnmolKala. Custom resin art, personalized orders and WhatsApp enquiry.`;
    } else if (currentView === 'product' && selectedProduct) {
      title = `${selectedProduct.name} — AnmolKala`;
      desc = selectedProduct.description || `Handcrafted ${selectedProduct.name} by AnmolKala.`;
    } else if (currentView === 'videos') {
      title = 'Handmade Craft Demonstration Videos — AnmolKala';
      desc = 'Watch real handmade craft demonstration videos of resin art, puja thalis, photo frames, and wall clocks.';
    } else if (currentView === 'admin-login' || currentView === 'admin-dashboard') {
      title = 'Admin Portal — AnmolKala';
    }

    document.title = title;
    const metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc) {
      metaDesc.setAttribute('content', desc);
    }
  }, [currentView, activeCategory, selectedProduct]);

  // If page was loaded directly on a product page, link selectedProduct once catalog is ready
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/product/') && !selectedProduct && allProducts.length > 0) {
      const slug = decodeURIComponent(path.replace('/product/', '').replace(/\/$/, ''));
      const found = allProducts.find(
        (p) => p.slug === slug || p.id.toLowerCase() === slug.toLowerCase()
      );
      if (found) {
        setSelectedProduct(found);
      }
    }
  }, [allProducts, selectedProduct]);

  // Resolve category if URL was requested directly or if catalog finished loading
  useEffect(() => {
    const path = window.location.pathname;
    if (path.startsWith('/category/') && categories.length > 0) {
      const rawSlug = path.replace('/category/', '').replace(/\/$/, '');
      const matched = matchCategoryFromSlug(rawSlug, categories);
      if (matched) {
        setActiveCategory(matched);
        setCategoryNotFound(null);
      } else if (!isCatalogLoading) {
        // Check if any product directly matches the formatted category slug
        const formatted = decodeURIComponent(rawSlug).replace(/-/g, ' ').trim();
        const matchedProductCat = allProducts.find(
          (p) => p.category.toLowerCase() === formatted.toLowerCase()
        )?.category;

        if (matchedProductCat) {
          setActiveCategory(matchedProductCat);
          setCategoryNotFound(null);
        } else {
          setCategoryNotFound(rawSlug);
        }
      }
    }
  }, [categories, isCatalogLoading, allProducts]);

  // Refresh products & categories from catalog
  const refreshProducts = useCallback(async () => {
    setIsCatalogLoading(true);
    try {
      const [items, cats] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ]);
      setProducts(items || []);
      if (cats && cats.length > 0) {
        setDbCategories(cats);
      }
    } catch (err) {
      console.warn('[AnmolKala] Error fetching products:', err);
    } finally {
      setIsCatalogLoading(false);
    }
  }, []);

  // Fetch initial products on mount
  useEffect(() => {
    // 1. Wipe any legacy browser-specific product storage
    cleanLegacyStorage();

    // 2. Initial fetch from catalog
    refreshProducts();

    // 3. Bind real-time catalog subscriptions if available
    const unsubProducts = subscribeToProducts((payload) => {
      if (payload.eventType === 'INSERT') {
        const item = payload.new;
        setProducts((prev) => {
          const exists = prev.some((p) => p.id === item.id);
          if (exists) {
            return prev.map((p) => (p.id === item.id ? item : p));
          }
          return [item, ...prev];
        });
      } else if (payload.eventType === 'UPDATE') {
        const item = payload.new;
        setProducts((prev) => prev.map((p) => (p.id === item.id ? item : p)));
        setSelectedProduct((curr) =>
          curr?.id === item.id
            ? {
                ...curr,
                ...item,
                image: item.image_url || '/logo.png',
                slug: item.slug || curr.slug,
              }
            : curr
        );
      } else if (payload.eventType === 'DELETE') {
        const deletedId = payload.old.id;
        if (deletedId) {
          setProducts((prev) => prev.filter((p) => p.id !== deletedId));
          setSelectedProduct((curr) => (curr?.id === deletedId ? null : curr));
        }
      }
    });

    const unsubCategories = subscribeToCategories(() => {
      fetchCategories().then((cats) => setDbCategories(cats));
    });

    // 4. Handle reconnection and tab visibility
    const handleReconnection = () => {
      refreshProducts();
    };

    window.addEventListener('online', handleReconnection);
    window.addEventListener('focus', handleReconnection);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        handleReconnection();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      unsubProducts();
      unsubCategories();
      window.removeEventListener('online', handleReconnection);
      window.removeEventListener('focus', handleReconnection);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refreshProducts]);

  // Navigation handlers
  const handleGoHome = useCallback(() => {
    try {
      window.history.pushState({ view: 'home' }, '', '/');
    } catch (e) {}
    setCurrentView('home');
    setSelectedProduct(null);
    setSearchQuery('');
    setActiveCategory('All');
    setCategoryNotFound(null);
    setPage(1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleOpenProduct = useCallback((product: Product) => {
    try {
      window.history.pushState({ view: 'product', slug: product.slug }, '', `/product/${product.slug}`);
    } catch (e) {}
    setSelectedProduct(product);
    setCurrentView('product');
    // Add to recently viewed
    setRecentList((prev) => [product.id, ...prev.filter((id) => id !== product.id)].slice(0, 12));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSelectCategory = useCallback(
    (cat: string) => {
      setActiveCategory(cat);
      setCategoryNotFound(null);
      setSearchQuery('');
      setPage(1);
      setCurrentView('catalog');
      setSelectedProduct(null);
      try {
        if (cat === 'All') {
          window.history.pushState({ view: 'catalog', category: 'All' }, '', '/catalog');
        } else {
          const slug = slugifyCategory(cat);
          window.history.pushState({ view: 'catalog', category: cat }, '', `/category/${slug}`);
        }
      } catch (err) {
        console.warn('pushState error:', err);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    []
  );

  const handleShowAllProducts = useCallback(() => {
    setActiveCategory('All');
    setCategoryNotFound(null);
    setSearchQuery('');
    setPage(1);
    setCurrentView('catalog');
    setSelectedProduct(null);
    try {
      window.history.pushState({ view: 'catalog', category: 'All' }, '', '/catalog');
    } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleShowVideos = useCallback(() => {
    try {
      window.history.pushState({ view: 'videos' }, '', '/videos');
    } catch (e) {}
    setCurrentView('videos');
    setSelectedProduct(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handleSearchChange = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim()) {
      setActiveCategory('All');
      setPage(1);
      setCurrentView('catalog');
    }
  }, []);

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (searchQuery.trim()) {
        setActiveCategory('All');
        setPage(1);
        setCurrentView('catalog');
      }
    },
    [searchQuery]
  );

  // Wishlist toggle
  const handleToggleWishlist = useCallback(
    (id: string) => {
      setWishlist((prev) => {
        const isExists = prev.includes(id);
        const updated = isExists ? prev.filter((item) => item !== id) : [...prev, id];
        showToast(isExists ? 'Removed from wishlist' : 'Added to wishlist');
        return updated;
      });
    },
    [showToast]
  );

  // Save for later toggle
  const handleToggleSave = useCallback(
    (id: string) => {
      setSavedList((prev) => {
        const isExists = prev.includes(id);
        const updated = isExists ? prev.filter((item) => item !== id) : [...prev, id];
        showToast(isExists ? 'Removed from saved' : 'Added to saved');
        return updated;
      });
    },
    [showToast]
  );

  // Compare toggle
  const handleToggleCompare = useCallback(
    (id: string) => {
      setCompareList((prev) => {
        if (prev.includes(id)) {
          showToast('Removed from compare');
          return prev.filter((item) => item !== id);
        }
        if (prev.length >= 4) {
          showToast('Compare up to 4 products');
          return prev;
        }
        showToast('Added to compare');
        return [...prev, id];
      });
    },
    [showToast]
  );

  // Filtered & Sorted products for catalog
  const filteredProducts = useMemo(() => {
    let list = allProducts;
    if (activeCategory === 'product video' || activeCategory === 'Product Videos') {
      list = list.filter((p) => Boolean(p.video_url));
    } else if (activeCategory !== 'All') {
      const targetNorm = activeCategory.trim().toLowerCase();
      list = list.filter((p) => (p.category || '').trim().toLowerCase() === targetNorm);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p) => {
        const text = `${p.name || ''} ${p.category || ''} ${p.tags || ''} ${p.description || ''}`.toLowerCase();
        return text.includes(q);
      });
    }

    const sorted = [...list];
    if (sortBy === 'az') {
      sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortBy === 'za') {
      sorted.sort((a, b) => (b.name || '').localeCompare(a.name || ''));
    }
    return sorted;
  }, [allProducts, activeCategory, searchQuery, sortBy]);

  // Paginated catalog items
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / ITEMS_PER_PAGE));
  const validPage = Math.min(page, totalPages);
  const catalogSlice = useMemo(() => {
    const start = (validPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, validPage]);

  // Items for active drawer
  const drawerProducts = useMemo(() => {
    if (!activeDrawer) return [];
    let ids: string[] = [];
    if (activeDrawer === 'wish') ids = wishlist;
    else if (activeDrawer === 'saved') ids = savedList;
    else if (activeDrawer === 'compare') ids = compareList;
    else if (activeDrawer === 'recent') ids = recentList;

    return ids
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [activeDrawer, wishlist, savedList, compareList, recentList, allProducts]);

  // Products for compare modal
  const compareModalProducts = useMemo(() => {
    return compareList
      .map((id) => allProducts.find((p) => p.id === id))
      .filter((p): p is Product => Boolean(p));
  }, [compareList, allProducts]);

  // Featured products (one per category)
  const featuredProducts = useMemo(() => {
    const valid = allProducts.filter((p) => p.category !== 'Product Image Requires Review');
    const seenCats = new Set<string>();
    const res: Product[] = [];
    for (const p of valid) {
      if (!seenCats.has(p.category)) {
        seenCats.add(p.category);
        res.push(p);
      }
    }
    return res;
  }, [allProducts]);

  // Popular products
  const popularProducts = useMemo(() => {
    const valid = allProducts.filter((p) => p.category !== 'Product Image Requires Review');
    const wishItems = valid.filter((p) => wishlist.includes(p.id));
    const combined = [...wishItems];
    for (const p of valid) {
      if (combined.length >= 10) break;
      if (!combined.some((item) => item.id === p.id)) {
        combined.push(p);
      }
    }
    return combined.slice(0, 10);
  }, [allProducts, wishlist]);

  // Category counts for "Shop by Category"
  const categorySummary = useMemo(() => {
    const valid = allProducts.filter((p) => p.category !== 'Product Image Requires Review');
    const map = new Map<string, number>();

    // Count products per category
    for (const p of valid) {
      const cat = p.category ? p.category.trim() : '';
      if (cat) {
        map.set(cat, (map.get(cat) || 0) + 1);
      }
    }

    // Include database categories if present
    for (const c of dbCategories) {
      if (c.name && c.name !== 'Product Image Requires Review' && !map.has(c.name.trim())) {
        if (c.product_count && c.product_count > 0) {
          map.set(c.name.trim(), c.product_count);
        }
      }
    }

    return Array.from(map.entries())
      .filter(([_, count]) => count > 0)
      .map(([cat, count]) => ({ cat, count }));
  }, [allProducts, dbCategories]);

  // Distinct categories present in videos for home filter
  const homeVideoCategories = useMemo(() => {
    const set = new Set<string>();
    allProductVideos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['All', ...Array.from(set)];
  }, [allProductVideos]);

  // Videos displayed on Home Page (1 per category when 'All' to ensure broad representation across categories)
  const homeDisplayedVideos = useMemo(() => {
    if (homeVideoCategory === 'All') {
      const catMap = new Map<string, (typeof allProductVideos)[0]>();
      allProductVideos.forEach((v) => {
        if (!catMap.has(v.category)) {
          catMap.set(v.category, v);
        }
      });
      const distinct = Array.from(catMap.values());
      return distinct.slice(0, 4);
    }
    return allProductVideos.filter((v) => v.category === homeVideoCategory).slice(0, 4);
  }, [allProductVideos, homeVideoCategory]);

  // Admin save handler
  const handleSaveAdminItem = useCallback(
    async (item: StoreItem) => {
      try {
        const saved = await saveProduct(item);
        setProducts((prev) => {
          const idx = prev.findIndex((i) => i.id === saved.id);
          if (idx >= 0) {
            const copy = [...prev];
            copy[idx] = saved;
            return copy;
          }
          return [saved, ...prev];
        });
        showToast('Item saved');
      } catch (err: any) {
        showToast(err?.message || 'Error saving item');
      }
    },
    [showToast]
  );

  // Admin delete handler
  const handleDeleteAdminItem = useCallback(
    async (id: string) => {
      try {
        await deleteProduct(id);
        setProducts((prev) => prev.filter((i) => i.id !== id));
        showToast('Item deleted');
      } catch (err: any) {
        showToast(err?.message || 'Error deleting item');
      }
    },
    [showToast]
  );

  // Admin open handler (triggered from tiny 'A' icon in footer)
  const handleOpenAdmin = useCallback(() => {
    const sess = getAdminSession();
    if (sess) {
      setAdminSession(sess);
      setCurrentView('admin-dashboard');
      window.history.pushState({}, '', '/admin/dashboard');
    } else {
      setCurrentView('admin-login');
      window.history.pushState({}, '', '/admin/login');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Dedicated Admin Login view
  if (currentView === 'admin-login') {
    return (
      <AdminLogin
        onLoginSuccess={() => {
          const sess = getAdminSession();
          setAdminSession(sess);
          setCurrentView('admin-dashboard');
          window.history.pushState({}, '', '/admin/dashboard');
        }}
        onBackToStore={handleGoHome}
      />
    );
  }

  // Dedicated Admin Dashboard view
  if (currentView === 'admin-dashboard') {
    if (!adminSession) {
      return (
        <AdminLogin
          onLoginSuccess={() => {
            const sess = getAdminSession();
            setAdminSession(sess);
            setCurrentView('admin-dashboard');
            window.history.pushState({}, '', '/admin/dashboard');
          }}
          onBackToStore={handleGoHome}
        />
      );
    }
    return (
      <AdminDashboard
        session={adminSession}
        onLogout={async () => {
          await logoutAdmin();
          clearAdminSession();
          setAdminSession(null);
          setCurrentView('admin-login');
          window.history.pushState({}, '', '/admin/login');
          showToast('Logged out. Please enter ID and password to log in again.');
        }}
        onBackToStore={() => {
          refreshProducts();
          handleGoHome();
        }}
      />
    );
  }

  return (
    <div>
      <Header
        searchQuery={searchQuery}
        onSearchChange={handleSearchChange}
        onSearchSubmit={handleSearchSubmit}
        onGoHome={handleGoHome}
        wishCount={wishlist.length}
        compareCount={compareList.length}
        savedCount={savedList.length}
        onOpenDrawer={setActiveDrawer}
      />

      <main className="wrap">
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onSelectCategory={handleSelectCategory}
        />

        {currentView === 'home' && (
          <div>
            <Hero
              onExplore={() => {
                const el = document.getElementById('homeCollections');
                if (el) el.scrollIntoView({ behavior: 'smooth' });
              }}
            />

            <Services />

            <div id="homeCollections">
              

              {/* Shop by Category */}
              <section className="section home-section">
                <div className="head">
                  <div>
                    <h2>Shop by Category</h2>
                    <div className="muted">Choose a collection to see only matching products.</div>
                  </div>
                </div>
                <div className="homegrid">
                  {categorySummary.map(({ cat, count }) => (
                    <button
                      key={cat}
                      type="button"
                      className="category-card"
                      onClick={() => handleSelectCategory(cat)}
                    >
                      <strong>{cat}</strong>
                      <span>{count} products · View collection →</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Featured Products */}
              <section className="section home-section">
                <div className="head">
                  <div>
                    <h2>Featured Products</h2>
                    <div className="muted">One carefully selected product from each collection.</div>
                  </div>
                </div>
                <div className="homegrid">
                  {featuredProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      whatsappNumber={brandInfo.whatsapp}
                      isWishlisted={wishlist.includes(p.id)}
                      onToggleWishlist={handleToggleWishlist}
                      onOpenProduct={handleOpenProduct}
                      variant="compact"
                    />
                  ))}
                </div>
              </section>

              {/* Popular Products */}
              <section className="section home-section">
                <div className="head">
                  <div>
                    <h2>Popular Products</h2>
                    <div className="muted">A selection from across the AnmolKala catalogue.</div>
                  </div>
                  <button type="button" className="select" onClick={handleShowAllProducts}>
                    View All Products
                  </button>
                </div>
                <div className="homegrid">
                  {popularProducts.map((p) => (
                    <ProductCard
                      key={p.id}
                      product={p}
                      whatsappNumber={brandInfo.whatsapp}
                      isWishlisted={wishlist.includes(p.id)}
                      onToggleWishlist={handleToggleWishlist}
                      onOpenProduct={handleOpenProduct}
                      variant="compact"
                    />
                  ))}
                </div>
              </section>

              {/* More Collections */}
              <section className="section home-section">
                <div className="head">
                  <div>
                    <h2>More Collections</h2>
                    <div className="muted">
                      Explore every available collection without mixing product types.
                    </div>
                  </div>
                </div>
                <div className="homegrid">
                  {categorySummary.slice(Math.ceil(categorySummary.length / 2)).map(({ cat }) => (
                    <button
                      key={cat}
                      type="button"
                      className="category-card"
                      onClick={() => handleSelectCategory(cat)}
                    >
                      <strong>{cat}</strong>
                      <span>Browse {cat} →</span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Product Videos  Showcase */}
              <section className="section home-section">
                <div className="head" style={{ flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '20px' }}>🎬</span>
                      <h2>Product Videos </h2>
                    </div>
                    <div className="muted">
                      (Watch real handmade craft demonstration videos).
                    </div>
                  </div>
                  <button type="button" className="select" onClick={handleShowVideos}>
                    View All Videos ({allProductVideos.length}) →
                  </button>
                </div>

                {/* Category Filter Tabs for Home Videos */}
                {homeVideoCategories.length > 1 && (
                  <div
                    style={{
                      display: 'flex',
                      gap: '8px',
                      overflowX: 'auto',
                      paddingBottom: '10px',
                      marginBottom: '16px',
                      WebkitOverflowScrolling: 'touch',
                    }}
                  >
                    {homeVideoCategories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setHomeVideoCategory(cat)}
                        style={{
                          background: homeVideoCategory === cat ? '#182235' : '#f1f5f9',
                          color: homeVideoCategory === cat ? '#ffffff' : '#334155',
                          border: homeVideoCategory === cat ? '1px solid #182235' : '1px solid #cbd5e1',
                          borderRadius: '20px',
                          padding: '6px 14px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {cat === 'All' ? ' (All)' : cat}
                      </button>
                    ))}
                  </div>
                )}

                <div className="homegrid">
                  {homeDisplayedVideos.length > 0 ? (
                    homeDisplayedVideos.map((vid) => {
                      const waText = encodeURIComponent(
                        `Hello AnmolKala, I watched the video for "${vid.name}" on your website and would like to place an order or ask for price/details.`
                      );
                      const waLink = `https://wa.me/${brandInfo.whatsapp}?text=${waText}`;

                      return (
                        <article key={vid.id} className="card ak-video-card" style={{ overflow: 'hidden' }}>
                          <div style={{ position: 'relative', background: '#000', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
                            <video
                              controls
                              playsInline
                              preload="metadata"
                              poster={vid.image_url || ''}
                              src={vid.video_url}
                              style={{ width: '100%', maxHeight: '220px', display: 'block', objectFit: 'contain' }}
                            />
                            {vid.category && (
                              <span
                                style={{
                                  position: 'absolute',
                                  top: '8px',
                                  left: '8px',
                                  background: 'rgba(15, 23, 42, 0.85)',
                                  color: '#f8fafc',
                                  padding: '3px 8px',
                                  borderRadius: '4px',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  pointerEvents: 'none',
                                }}
                              >
                                {vid.category}
                              </span>
                            )}
                          </div>
                          <div className="info" style={{ padding: '14px' }}>
                            <div className="name" style={{ fontWeight: 800, fontSize: '15px', color: '#0f172a' }}>
                              {vid.name}
                            </div>
                            {vid.description && (
                              <div className="desc" style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 12px' }}>
                                {vid.description}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
                              <a
                                href={waLink}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  flex: 1,
                                  background: '#25D366',
                                  color: '#ffffff',
                                  textDecoration: 'none',
                                  padding: '8px 12px',
                                  borderRadius: '6px',
                                  fontSize: '12px',
                                  fontWeight: 700,
                                  textAlign: 'center',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  gap: '6px',
                                  boxShadow: '0 2px 6px rgba(37, 211, 102, 0.25)',
                                }}
                              >
                                <span>💬 WhatsApp Order</span>
                              </a>
                              {vid.product && (
                                <button
                                  type="button"
                                  onClick={() => handleOpenProduct(vid.product!)}
                                  style={{
                                    background: '#182235',
                                    color: '#ffffff',
                                    border: 'none',
                                    padding: '8px 12px',
                                    borderRadius: '6px',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                    cursor: 'pointer',
                                  }}
                                >
                                  Details →
                                </button>
                              )}
                            </div>
                          </div>
                        </article>
                      );
                    })
                  ) : (
                    <p className="muted" style={{ gridColumn: '1/-1', padding: '24px 0', textAlign: 'center' }}>
                      No videos available for this category yet.
                    </p>
                  )}
                </div>
              </section>

              {/* Contact AnmolKala */}
              <section className="section home-section">
                <div className="head">
                  <div>
                    <h2>Contact AnmolKala</h2>
                    <div className="muted">Ask about availability, price and customization.</div>
                  </div>
                </div>
                <div className="contact">
                  <a
                    href={`https://wa.me/${brandInfo.whatsapp}?text=Hello%20AnmolKala%2C%20I%20want%20to%20enquire%20about%20your%20products.`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <b>WhatsApp</b>
                    <br />
                    <span className="muted">+91 98101 16510</span>
                  </a>
                  <a href={`tel:+${brandInfo.phone}`}>
                    <b>Call</b>
                    <br />
                    <span className="muted">+91 97178 87313</span>
                  </a>
                  <a href={`mailto:${brandInfo.email}`}>
                    <b>Email</b>
                    <br />
                    <span className="muted">{brandInfo.email}</span>
                  </a>
                </div>
              </section>
            </div>
          </div>
        )}

        {currentView === 'catalog' && (
          <section className="section" id="catalog">
            {isCatalogLoading && filteredProducts.length === 0 ? (
              <div style={{ padding: '20px 0' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                  <div style={{ height: '28px', width: '220px', background: '#e2e8f0', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
                  <div style={{ height: '36px', width: '130px', background: '#e2e8f0', borderRadius: '6px', animation: 'pulse 1.5s infinite' }} />
                </div>
                <div className="grid">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="card" style={{ padding: '10px' }}>
                      <div style={{ aspectRatio: '1/1', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                      <div style={{ height: '12px', width: '40%', background: '#f1f5f9', margin: '10px 0 6px', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                      <div style={{ height: '16px', width: '85%', background: '#f1f5f9', borderRadius: '4px', animation: 'pulse 1.5s infinite' }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : categoryNotFound ? (
              <div
                style={{
                  textAlign: 'center',
                  padding: '50px 20px',
                  background: '#faf8f5',
                  borderRadius: '8px',
                  border: '1px solid #e7e2d8',
                }}
              >
                <div style={{ fontSize: '38px', marginBottom: '10px' }}>🔍</div>
                <h2 style={{ fontSize: '22px', fontWeight: 800, margin: '0 0 8px', color: '#182235' }}>
                  Collection "{categoryNotFound}" Not Found
                </h2>
                <p style={{ color: '#64748b', fontSize: '14px', maxWidth: '480px', margin: '0 auto 20px', lineHeight: 1.5 }}>
                  We couldn't find a category matching this name. Choose any collection below or browse all handcrafted products.
                </p>
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap', maxWidth: '650px', margin: '0 auto 24px' }}>
                  {categories.filter((c) => c !== 'All').slice(0, 8).map((c) => (
                    <button
                      key={c}
                      type="button"
                      className="cat"
                      onClick={() => handleSelectCategory(c)}
                      style={{ fontSize: '12px', padding: '6px 14px' }}
                    >
                      {c}
                    </button>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    className="cta"
                    onClick={handleShowAllProducts}
                    style={{ padding: '10px 18px', fontSize: '13px' }}
                  >
                    View All Products →
                  </button>
                  <button
                    type="button"
                    className="select"
                    onClick={handleGoHome}
                    style={{ padding: '10px 18px', fontSize: '13px', border: '1px solid #cbd5e1' }}
                  >
                    Return Home
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="head">
                  <div>
                    <h2>{activeCategory === 'All' ? 'All Products' : activeCategory}</h2>
                    <div className="muted">
                      {filteredProducts.length
                        ? `${filteredProducts.length} products · Showing ${
                            (validPage - 1) * ITEMS_PER_PAGE + 1
                          }-${Math.min(validPage * ITEMS_PER_PAGE, filteredProducts.length)}`
                        : '0 products'}
                    </div>
                  </div>

                  <select
                    className="select"
                    value={sortBy}
                    onChange={(e) => {
                      setSortBy(e.target.value as 'featured' | 'az' | 'za');
                      setPage(1);
                    }}
                  >
                    <option value="featured">Featured</option>
                    <option value="az">Name A–Z</option>
                    <option value="za">Name Z–A</option>
                  </select>
                </div>

                <div className="grid">
                  {catalogSlice.length > 0 ? (
                    catalogSlice.map((p) => (
                      <ProductCard
                        key={p.id}
                        product={p}
                        whatsappNumber={brandInfo.whatsapp}
                        isWishlisted={wishlist.includes(p.id)}
                        onToggleWishlist={handleToggleWishlist}
                        onOpenProduct={handleOpenProduct}
                        onCompare={handleToggleCompare}
                        variant="full"
                      />
                    ))
                  ) : (
                    <div
                      style={{
                        gridColumn: '1/-1',
                        textAlign: 'center',
                        padding: '60px 20px',
                        background: '#f8fafc',
                        borderRadius: '8px',
                        border: '1px dashed #cbd5e1',
                      }}
                    >
                      <div style={{ fontSize: '32px', marginBottom: '8px' }}>📦</div>
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#1e293b', marginBottom: '4px' }}>
                        No items in {activeCategory}
                      </div>
                      <p style={{ color: '#64748b', fontSize: '13px', margin: '0 0 16px' }}>
                        Products for this category are being prepared. Check our other collections.
                      </p>
                      <button
                        type="button"
                        className="cta"
                        onClick={handleShowAllProducts}
                        style={{ padding: '8px 16px', fontSize: '12px' }}
                      >
                        Browse All Products
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            {totalPages > 1 && (
              <div className="pager">
                <button
                  type="button"
                  disabled={validPage === 1}
                  onClick={() => {
                    setPage((p) => Math.max(1, p - 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  ← Previous
                </button>
                <span className="pageinfo">
                  Page {validPage} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={validPage === totalPages}
                  onClick={() => {
                    setPage((p) => Math.min(totalPages, p + 1));
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Next →
                </button>
              </div>
            )}
          </section>
        )}

        {currentView === 'product' && selectedProduct && (
          <ProductDetail
            product={selectedProduct}
            allProducts={allProducts}
            whatsappNumber={brandInfo.whatsapp}
            isWishlisted={wishlist.includes(selectedProduct.id)}
            isSaved={savedList.includes(selectedProduct.id)}
            onToggleWishlist={handleToggleWishlist}
            onToggleSave={handleToggleSave}
            onBack={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                handleGoHome();
              }
            }}
            onOpenProduct={handleOpenProduct}
            onToast={showToast}
          />
        )}

        {currentView === 'videos' && (
          <VideoGallery
            videos={allProductVideos}
            whatsappNumber={brandInfo.whatsapp}
            onGoHome={handleGoHome}
            onOpenProduct={handleOpenProduct}
          />
        )}
      </main>

      <Footer
        brand={brandInfo}
        onSelectCategory={handleSelectCategory}
        onOpenAdmin={handleOpenAdmin}
      />

      <Drawer
        type={activeDrawer}
        isOpen={Boolean(activeDrawer)}
        onClose={() => setActiveDrawer(null)}
        products={drawerProducts}
        whatsappNumber={brandInfo.whatsapp}
        onOpenProduct={handleOpenProduct}
        onRemoveItem={(id, type) => {
          if (type === 'wish') handleToggleWishlist(id);
          else if (type === 'saved') handleToggleSave(id);
          else if (type === 'compare') handleToggleCompare(id);
          else if (type === 'recent') setRecentList((prev) => prev.filter((i) => i !== id));
        }}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
      />

      {isCompareModalOpen && (
        <CompareModal
          products={compareModalProducts}
          whatsappNumber={brandInfo.whatsapp}
          onClose={() => setIsCompareModalOpen(false)}
          onRemoveProduct={handleToggleCompare}
          onOpenProduct={handleOpenProduct}
        />
      )}

      <AdminModal
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        items={products}
        onSaveItem={handleSaveAdminItem}
        onDeleteItem={handleDeleteAdminItem}
        onToast={showToast}
      />

      <Toast message={toastMessage} />
    </div>
  );
};

export default App;
