/**
 * Robust Category and URL Routing Utilities for AnmolKala
 * Handles slugs, category IDs, query parameters, trailing slashes, and edge cases.
 */

export function slugifyCategory(cat: string): string {
  if (!cat || cat.toLowerCase() === 'all') return 'all';
  return cat
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Normalizes any category string or slug to a pure alphanumeric key
 * Stripping "and", hyphens, spaces, ampersands, punctuation
 */
function toAlphaKey(str: string): string {
  return str
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\band\b/g, '')
    .replace(/[^a-z0-9]/g, '');
}

export function matchCategoryFromSlug(slugOrName: string, categoriesList: string[]): string | null {
  if (!slugOrName) return 'All';
  const cleanInput = decodeURIComponent(slugOrName).trim();
  if (cleanInput.toLowerCase() === 'all') return 'All';

  const cleanSlug = cleanInput.toLowerCase().replace(/^-+|-+$/g, '');

  // 1. Direct exact or case-insensitive match against list
  for (const cat of categoriesList) {
    if (cat.toLowerCase().trim() === cleanInput.toLowerCase()) return cat;
  }

  // 2. Exact slugified match (e.g. "puja-thali" matches "Puja Thali")
  for (const cat of categoriesList) {
    if (slugifyCategory(cat) === cleanSlug) return cat;
  }

  // 3. Match with or without "-and-" (e.g. "diya-candle-holders" vs "diya-and-candle-holders")
  const noAndInputSlug = cleanSlug.replace(/-and-/g, '-');
  for (const cat of categoriesList) {
    const s = slugifyCategory(cat);
    const sNoAnd = s.replace(/-and-/g, '-');
    if (sNoAnd === noAndInputSlug || s === noAndInputSlug || sNoAnd === cleanSlug) {
      return cat;
    }
  }

  // 4. Match ignoring spaces and hyphens
  const inputWords = cleanInput.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(' ');
  for (const cat of categoriesList) {
    const catWords = cat.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean).join(' ');
    if (catWords === inputWords) return cat;
  }

  // 5. Normalized alphanumeric key match
  const targetKey = toAlphaKey(cleanInput);
  if (targetKey) {
    for (const cat of categoriesList) {
      if (toAlphaKey(cat) === targetKey) return cat;
    }
  }

  // 6. Substring match for compound categories (e.g. "Tissue Holders" matching "Home Decor & Tissue Holders")
  for (const cat of categoriesList) {
    const normCat = toAlphaKey(cat);
    if (normCat.includes(targetKey) || targetKey.includes(normCat)) {
      if (Math.abs(normCat.length - targetKey.length) < 10) {
        return cat;
      }
    }
  }

  return null;
}

export interface ParsedRoute {
  view: 'home' | 'catalog' | 'product' | 'videos' | 'admin-login' | 'admin-dashboard';
  category: string;
  productSlug: string | null;
  isCategoryNotFound: boolean;
  categorySlugParam: string | null;
}

export function parsePath(pathname: string, categoriesList: string[] = []): ParsedRoute {
  // Strip query strings and hash if present in pathname
  const cleanPath = (pathname || '/').split('?')[0].split('#')[0];
  const clean = cleanPath.toLowerCase().replace(/\/$/, '') || '/';

  if (clean === '/videos') {
    return {
      view: 'videos',
      category: 'All',
      productSlug: null,
      isCategoryNotFound: false,
      categorySlugParam: null,
    };
  }

  if (clean === '/admin/login' || clean === '/admin') {
    return {
      view: 'admin-login',
      category: 'All',
      productSlug: null,
      isCategoryNotFound: false,
      categorySlugParam: null,
    };
  }

  if (clean.startsWith('/admin/dashboard')) {
    return {
      view: 'admin-dashboard',
      category: 'All',
      productSlug: null,
      isCategoryNotFound: false,
      categorySlugParam: null,
    };
  }

  if (clean.startsWith('/category/')) {
    const rawSlug = clean.replace('/category/', '').replace(/\/$/, '');
    if (!rawSlug || rawSlug === 'all') {
      return {
        view: 'catalog',
        category: 'All',
        productSlug: null,
        isCategoryNotFound: false,
        categorySlugParam: null,
      };
    }

    const matched = categoriesList.length > 0 ? matchCategoryFromSlug(rawSlug, categoriesList) : null;

    if (matched) {
      return {
        view: 'catalog',
        category: matched,
        productSlug: null,
        isCategoryNotFound: false,
        categorySlugParam: rawSlug,
      };
    } else {
      // Decode human-readable category label for fallback display
      const formatted = decodeURIComponent(rawSlug)
        .replace(/-/g, ' ')
        .split(' ')
        .filter(Boolean)
        .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
        .join(' ');

      return {
        view: 'catalog',
        category: formatted,
        productSlug: null,
        isCategoryNotFound: false,
        categorySlugParam: rawSlug,
      };
    }
  }

  if (clean === '/catalog' || clean === '/products') {
    return {
      view: 'catalog',
      category: 'All',
      productSlug: null,
      isCategoryNotFound: false,
      categorySlugParam: null,
    };
  }

  if (clean.startsWith('/product/')) {
    const slug = decodeURIComponent(cleanPath.replace(/^\/product\//i, '').replace(/\/$/, ''));
    return {
      view: 'product',
      category: 'All',
      productSlug: slug,
      isCategoryNotFound: false,
      categorySlugParam: null,
    };
  }

  return {
    view: 'home',
    category: 'All',
    productSlug: null,
    isCategoryNotFound: false,
    categorySlugParam: null,
  };
}
