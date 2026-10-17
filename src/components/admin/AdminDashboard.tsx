import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StoreItem,
  CategoryItem,
  MediaItem,
  AdminSession,
  DashboardSection,
  ProductAvailability,
} from '../../types';
import {
  fetchProducts,
  saveProduct,
  deleteProduct,
  fetchCategories,
  saveCategory,
  deleteCategory,
  fetchMediaItems,
  uploadMediaFile,
  deleteMediaItem,
  deleteProductVideoOnly,
  logoutAdmin,
  updateAdminPassword,
  generateUniqueId,
  subscribeToProducts,
  subscribeToCategories,
  baselineProducts,
} from '../../services/catalogService';
import { handleImageError } from '../../utils/helpers';

interface AdminDashboardProps {
  session: AdminSession;
  onLogout: () => void;
  onBackToStore: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  session,
  onLogout,
  onBackToStore,
}) => {
  const [activeSection, setActiveSection] = useState<DashboardSection>('overview');

  // Core Data - Initialized immediately with baseline products for instantaneous load
  const [products, setProducts] = useState<StoreItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const raw = localStorage.getItem('anmolkala_active_catalog');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {}
    }
    return baselineProducts;
  });
  const [categories, setCategories] = useState<CategoryItem[]>(() => {
    const unique = Array.from(new Set(baselineProducts.map((p: StoreItem) => p.category.trim()))).filter(Boolean).sort();
    return unique.map((name: string, i: number): CategoryItem => ({
      id: `cat-${i + 1}`,
      name: String(name),
      display_order: i,
      created_at: new Date().toISOString(),
    }));
  });
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Search & Filters in Product Management
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState<'all' | 'photo' | 'video'>('all');
  const [availabilityFilter, setAvailabilityFilter] = useState('all');
  const [publishedFilter, setPublishedFilter] = useState<'all' | 'published' | 'draft'>('all');

  // Edit / Add Photo Product State
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);
  const [photoFormName, setPhotoFormName] = useState('');
  const [photoFormCategory, setPhotoFormCategory] = useState('');
  const [photoFormDesc, setPhotoFormDesc] = useState('');
  const [photoFormAvailability, setPhotoFormAvailability] = useState<ProductAvailability>('in_stock');
  const [photoFormPublished, setPhotoFormPublished] = useState(true);
  const [photoFormTags, setPhotoFormTags] = useState('');
  const [photoFormFiles, setPhotoFormFiles] = useState<File[]>([]);
  const [photoFormPreviews, setPhotoFormPreviews] = useState<string[]>([]);
  const [photoFormCoverIndex, setPhotoFormCoverIndex] = useState(0);
  const [photoFormExistingCover, setPhotoFormExistingCover] = useState('');
  const [photoFormNewCatInline, setPhotoFormNewCatInline] = useState(false);
  const [photoFormNewCatName, setPhotoFormNewCatName] = useState('');
  const [isPhotoFormSubmitting, setIsPhotoFormSubmitting] = useState(false);
  const photoFormPickerRef = useRef<HTMLInputElement | null>(null);

  // Add Video Product State
  const [videoFormName, setVideoFormName] = useState('');
  const [videoFormCategory, setVideoFormCategory] = useState('');
  const [videoFormDesc, setVideoFormDesc] = useState('');
  const [videoFormAvailability, setVideoFormAvailability] = useState<ProductAvailability>('in_stock');
  const [videoFormPublished, setVideoFormPublished] = useState(true);
  const [videoFormTags, setVideoFormTags] = useState('');
  const [videoFormPhotoFile, setVideoFormPhotoFile] = useState<File | null>(null);
  const [videoFormPhotoPreview, setVideoFormPhotoPreview] = useState<string>('');
  const [videoFormVideoFile, setVideoFormVideoFile] = useState<File | null>(null);
  const [videoFormVideoPreview, setVideoFormVideoPreview] = useState<string>('');
  const [videoFormFileSize, setVideoFormFileSize] = useState<string>('');
  const [videoFormNewCatInline, setVideoFormNewCatInline] = useState(false);
  const [videoFormNewCatName, setVideoFormNewCatName] = useState('');
  const [videoPhotoError, setVideoPhotoError] = useState(false);
  const [isVideoFormSubmitting, setIsVideoFormSubmitting] = useState(false);
  const videoFormPhotoPickerRef = useRef<HTMLInputElement | null>(null);
  const videoFormVideoPickerRef = useRef<HTMLInputElement | null>(null);

  // Product Details Quick View Modal State
  const [viewDetailsItem, setViewDetailsItem] = useState<StoreItem | null>(null);

  // Video Player / View Modal State
  const [playingVideo, setPlayingVideo] = useState<{
    url: string;
    title: string;
    productName?: string;
    productId?: string;
    category?: string;
  } | null>(null);

  // Video Edit Modal State
  const [editingVideoItem, setEditingVideoItem] = useState<{
    id: string;
    productId: string;
    title: string;
    description: string;
    category: string;
    video_url: string;
  } | null>(null);
  const [editVideoFile, setEditVideoFile] = useState<File | null>(null);
  const [editVideoPreview, setEditVideoPreview] = useState<string>('');

  // Confirmation Modals State
  const [productToDelete, setProductToDelete] = useState<StoreItem | null>(null);
  const [videoToDelete, setVideoToDelete] = useState<{ productId: string; mediaId?: string; title: string } | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<MediaItem | null>(null);

  // Dedicated Photo Upload Center State
  const [photoUploadFiles, setPhotoUploadFiles] = useState<File[]>([]);
  const [photoUploadPreviews, setPhotoUploadPreviews] = useState<string[]>([]);
  const [photoTargetProduct, setPhotoTargetProduct] = useState<string>('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const dedicatedPhotoPickerRef = useRef<HTMLInputElement | null>(null);

  // Category Manager State
  const [categoryInputName, setCategoryInputName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');

  // Settings / Password Form State
  const [passCurrent, setPassCurrent] = useState('');
  const [passNew, setPassNew] = useState('');
  const [passConfirm, setPassConfirm] = useState('');
  const [passLoading, setPassLoading] = useState(false);

  // Notification Toast Helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((cur) => (cur === msg ? null : cur));
    }, 3500);
  };

  // Load All Data from Catalogue
  const loadData = async (isBackground = false) => {
    if (!isBackground) {
      setLoading(true);
      setDataError(null);
    }
    try {
      const [prods, cats, medias] = await Promise.all([
        fetchProducts(),
        fetchCategories(),
        fetchMediaItems(),
      ]);
      setProducts(prods);
      setCategories(cats);
      setMediaList(medias);
      setDataError(null);
    } catch (e: any) {
      if (!isBackground) {
        setDataError(e.message || 'Could not load catalogue records.');
      }
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    // Silently synchronize in background without blocking initial render
    loadData(true);
  }, []);

  // Catalogue Aggregate Counts (authoritative live count)
  const isCountsLoading = isInitialLoading || (loading && products.length === 0);
  const totalProducts = isCountsLoading
    ? null
    : products.length;
  const publishedProducts = isCountsLoading
    ? null
    : products.filter((p) => p.published !== false).length;
  const totalPhotos = isCountsLoading
    ? null
    : (mediaList.filter((m) => m.media_type === 'image').length || products.length);
  const totalVideos = isCountsLoading
    ? null
    : products.filter((p) => Boolean(p.video_url)).length;
  const totalCategories = isCountsLoading
    ? null
    : categories.length;

  // Filtered products in Manage Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.tags.toLowerCase().includes(q);

      const matchCat = categoryFilter === 'all' || p.category.toLowerCase() === categoryFilter.toLowerCase();

      const matchType =
        typeFilter === 'all' ||
        (typeFilter === 'video' && Boolean(p.video_url)) ||
        (typeFilter === 'photo' && !p.video_url);

      const matchAvail =
        availabilityFilter === 'all' ||
        (availabilityFilter === 'in_stock' && (p.availability === 'in_stock' || !p.availability)) ||
        (availabilityFilter === 'made_to_order' && p.availability === 'made_to_order') ||
        (availabilityFilter === 'out_of_stock' && p.availability === 'out_of_stock');

      const matchPublished =
        publishedFilter === 'all' ||
        (publishedFilter === 'published' && p.published !== false) ||
        (publishedFilter === 'draft' && p.published === false);

      return matchQuery && matchCat && matchType && matchAvail && matchPublished;
    });
  }, [products, searchQuery, categoryFilter, typeFilter, availabilityFilter, publishedFilter]);

  // All attached or uploaded craft videos
  const allVideos = useMemo(() => {
    const list: Array<{
      id: string;
      productId: string;
      productName: string;
      category: string;
      video_url: string;
      image_url?: string;
      description?: string;
      created_at?: string;
    }> = [];
    const seen = new Set<string>();

    for (const p of products) {
      if (p.video_url && !seen.has(p.video_url)) {
        seen.add(p.video_url);
        list.push({
          id: `vid-${p.id}`,
          productId: p.id,
          productName: p.name,
          category: p.category,
          video_url: p.video_url,
          image_url: p.image_url,
          description: p.description,
          created_at: p.created_at,
        });
      }
    }

    for (const m of mediaList) {
      if (m.media_type === 'video' && m.storage_path && !seen.has(m.storage_path)) {
        seen.add(m.storage_path);
        const parent = products.find((p) => p.id === m.product_id);
        list.push({
          id: m.id,
          productId: m.product_id,
          productName: m.product_name || parent?.name || m.product_id,
          category: parent?.category || 'General',
          video_url: m.storage_path,
          image_url: parent?.image_url,
          created_at: m.created_at,
        });
      }
    }

    return list;
  }, [products, mediaList]);

  // ==========================================
  // ADD PHOTO PRODUCT HANDLERS
  // ==========================================
  const handleOpenAddPhotoProduct = () => {
    setEditingItem(null);
    setPhotoFormName('');
    setPhotoFormCategory(categories[0]?.name || 'Puja Thali');
    setPhotoFormDesc('');
    setPhotoFormAvailability('in_stock');
    setPhotoFormPublished(true);
    setPhotoFormTags('');
    setPhotoFormFiles([]);
    setPhotoFormPreviews([]);
    setPhotoFormCoverIndex(0);
    setPhotoFormExistingCover('');
    setPhotoFormNewCatInline(false);
    setPhotoFormNewCatName('');
    setActiveSection('add-photo-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectPhotoFormFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setPhotoFormFiles((prev) => [...prev, ...files]);

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (loadEv) => {
        if (loadEv.target?.result) {
          setPhotoFormPreviews((prev) => [...prev, String(loadEv.target?.result)]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSavePhotoProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoFormName.trim()) {
      showToast('Please enter a product name.');
      return;
    }

    setIsPhotoFormSubmitting(true);
    try {
      let finalCategory = photoFormCategory;
      if (photoFormNewCatInline && photoFormNewCatName.trim()) {
        finalCategory = photoFormNewCatName.trim();
        await saveCategory({
          id: `CAT-${Date.now().toString(36).toUpperCase()}`,
          name: finalCategory,
          display_order: categories.length,
        });
      }

      const productId = editingItem ? editingItem.id : generateUniqueId('AK');
      const slug = `${photoFormName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${productId.toLowerCase()}`;

      let finalCoverUrl = photoFormExistingCover || '/logo.png';

      // Upload selected files
      if (photoFormFiles.length > 0) {
        for (let i = 0; i < photoFormFiles.length; i++) {
          const media = await uploadMediaFile(photoFormFiles[i], productId, 'image');
          if (i === photoFormCoverIndex && media.storage_path) {
            finalCoverUrl = media.storage_path;
          } else if (i === 0 && !finalCoverUrl) {
            finalCoverUrl = media.storage_path;
          }
        }
      }

      const payload: StoreItem = {
        id: productId,
        type: 'product',
        name: photoFormName.trim(),
        category: finalCategory || 'Puja Thali',
        slug,
        description: photoFormDesc.trim(),
        image_url: finalCoverUrl,
        video_url: editingItem?.video_url || '',
        tags: photoFormTags.trim() || `${photoFormName} handmade craft resin`,
        published: photoFormPublished,
        availability: photoFormAvailability,
        created_at: editingItem?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveProduct(payload);
      showToast(editingItem ? 'Product updated successfully!' : 'Photo Product added successfully!');
      setActiveSection('products');
      loadData(true);
    } catch (err: any) {
      showToast(`Error saving product: ${err.message}`);
    } finally {
      setIsPhotoFormSubmitting(false);
    }
  };

  // ==========================================
  // ADD VIDEO PRODUCT HANDLERS (WITH MANDATORY PHOTO)
  // ==========================================
  const handleOpenAddVideoProduct = () => {
    setVideoFormName('');
    setVideoFormCategory(categories[0]?.name || 'Puja Thali');
    setVideoFormDesc('');
    setVideoFormAvailability('in_stock');
    setVideoFormPublished(true);
    setVideoFormTags('');
    setVideoFormPhotoFile(null);
    setVideoFormPhotoPreview('');
    setVideoFormVideoFile(null);
    setVideoFormVideoPreview('');
    setVideoFormFileSize('');
    setVideoFormNewCatInline(false);
    setVideoFormNewCatName('');
    setVideoPhotoError(false);
    setActiveSection('add-video-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectVideoPhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFormPhotoFile(file);
    setVideoPhotoError(false);
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setVideoFormPhotoPreview(String(ev.target.result));
    };
    reader.readAsDataURL(file);
  };

  const handleSelectVideoFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setVideoFormVideoFile(file);
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    setVideoFormFileSize(`${sizeMb} MB`);
    const blobUrl = URL.createObjectURL(file);
    setVideoFormVideoPreview(blobUrl);
  };

  const handleSaveVideoProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!videoFormName.trim()) {
      showToast('Please enter a product name.');
      return;
    }

    if (!videoFormVideoFile) {
      showToast('Please select a video file.');
      return;
    }

    setIsVideoFormSubmitting(true);
    try {
      let finalCategory = videoFormCategory;
      if (videoFormNewCatInline && videoFormNewCatName.trim()) {
        finalCategory = videoFormNewCatName.trim();
        await saveCategory({
          id: `CAT-${Date.now().toString(36).toUpperCase()}`,
          name: finalCategory,
          display_order: categories.length,
        });
      }

      const productId = generateUniqueId('AK');
      const slug = `${videoFormName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${productId.toLowerCase()}`;

      // Upload photo if provided (optional)
      let photoUrl = '';
      if (videoFormPhotoFile) {
        const photoMedia = await uploadMediaFile(videoFormPhotoFile, productId, 'image');
        if (photoMedia.storage_path) photoUrl = photoMedia.storage_path;
      } else if (videoFormPhotoPreview) {
        photoUrl = videoFormPhotoPreview;
      }

      // Upload video file
      let videoUrl = '';
      if (videoFormVideoFile) {
        const videoMedia = await uploadMediaFile(videoFormVideoFile, productId, 'video');
        if (videoMedia.storage_path) videoUrl = videoMedia.storage_path;
      }

      const payload: StoreItem = {
        id: productId,
        type: 'product',
        name: videoFormName.trim(),
        category: finalCategory || 'Puja Thali',
        slug,
        description: videoFormDesc.trim() || `Handcrafted video demonstration for ${videoFormName.trim()}.`,
        image_url: photoUrl,
        video_url: videoUrl,
        tags: videoFormTags.trim() || `${videoFormName} craft video resin handmade`,
        published: videoFormPublished,
        availability: videoFormAvailability,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveProduct(payload);
      showToast('Video Product published successfully!');
      setActiveSection('products');
      loadData(true);
    } catch (err: any) {
      showToast(`Error publishing video product: ${err.message}`);
    } finally {
      setIsVideoFormSubmitting(false);
    }
  };

  // ==========================================
  // EDIT PRODUCT HANDLER
  // ==========================================
  const handleOpenEditProduct = (p: StoreItem) => {
    setEditingItem(p);
    setPhotoFormName(p.name);
    setPhotoFormCategory(p.category);
    setPhotoFormDesc(p.description);
    setPhotoFormAvailability(p.availability || 'in_stock');
    setPhotoFormPublished(p.published !== false);
    setPhotoFormTags(p.tags || '');
    setPhotoFormFiles([]);
    setPhotoFormPreviews([]);
    setPhotoFormCoverIndex(0);
    setPhotoFormExistingCover(p.image_url || '/logo.png');
    setPhotoFormNewCatInline(false);
    setPhotoFormNewCatName('');
    setActiveSection('add-photo-product');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Toggle Publish Status
  const handleTogglePublish = async (p: StoreItem) => {
    try {
      const updated: StoreItem = { ...p, published: !p.published };
      await saveProduct(updated);
      setProducts((prev) => prev.map((item) => (item.id === p.id ? updated : item)));
      showToast(updated.published ? `"${p.name}" is now Published.` : `"${p.name}" moved to Draft.`);
      loadData(true);
    } catch (e: any) {
      showToast(`Error updating publish status: ${e.message}`);
    }
  };

  // Delete Product
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      await deleteProduct(productToDelete.id);
      setProducts((prev) => prev.filter((p) => p.id !== productToDelete.id));
      showToast(`Product "${productToDelete.name}" deleted.`);
      loadData(true);
    } catch (e: any) {
      showToast(`Delete failed: ${e.message}`);
    } finally {
      setProductToDelete(null);
    }
  };

  // Delete Video Only (keeps product intact)
  const handleConfirmDeleteVideo = async () => {
    if (!videoToDelete) return;
    try {
      await deleteProductVideoOnly(videoToDelete.productId, videoToDelete.mediaId);
      setProducts((prev) =>
        prev.map((p) => (p.id === videoToDelete.productId ? { ...p, video_url: '' } : p))
      );
      showToast(`Video removed from "${videoToDelete.title}". Product remains intact.`);
      loadData(true);
    } catch (e: any) {
      showToast(`Error deleting video: ${e.message}`);
    } finally {
      setVideoToDelete(null);
    }
  };

  // Delete Photo Only
  const handleConfirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    try {
      await deleteMediaItem(photoToDelete.id);
      setMediaList((prev) => prev.filter((m) => m.id !== photoToDelete.id));
      showToast(`Photo "${photoToDelete.file_name || 'Item'}" deleted.`);
      loadData(true);
    } catch (e: any) {
      showToast(`Error deleting photo: ${e.message}`);
    } finally {
      setPhotoToDelete(null);
    }
  };

  // Set Cover Photo
  const handleSetCoverPhoto = async (m: MediaItem) => {
    try {
      const target = products.find((p) => p.id === m.product_id);
      if (target) {
        target.image_url = m.storage_path;
        await saveProduct(target);
        setProducts((prev) => prev.map((p) => (p.id === target.id ? { ...target } : p)));
        showToast('Set as main cover photo!');
      }
    } catch (e: any) {
      showToast('Could not set cover photo.');
    }
  };

  // Category Add Action
  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = categoryInputName.trim();
    if (!cleanName) return;

    if (categories.some((c) => c.name.toLowerCase() === cleanName.toLowerCase())) {
      showToast(`Category "${cleanName}" already exists.`);
      return;
    }

    try {
      const newCat: CategoryItem = {
        id: `CAT-${Date.now().toString(36).toUpperCase()}`,
        name: cleanName,
        display_order: categories.length,
      };
      await saveCategory(newCat);
      setCategories((prev) => [...prev, newCat]);
      setCategoryInputName('');
      showToast(`Category "${cleanName}" added successfully.`);
      loadData(true);
    } catch (e: any) {
      showToast(`Error adding category: ${e.message}`);
    }
  };

  // Category Rename Action
  const handleRenameCategory = async (cat: CategoryItem) => {
    const cleanName = editingCategoryName.trim();
    if (!cleanName || cleanName === cat.name) {
      setEditingCategoryId(null);
      return;
    }

    try {
      const updated: CategoryItem = { ...cat, name: cleanName };
      await saveCategory(updated);
      setCategories((prev) => prev.map((c) => (c.id === cat.id ? updated : c)));
      showToast(`Category renamed to "${cleanName}".`);
      setEditingCategoryId(null);
      loadData(true);
    } catch (e: any) {
      showToast(`Error renaming category: ${e.message}`);
    }
  };

  // Category Delete Action
  const handleDeleteCategory = async (cat: CategoryItem) => {
    const assignedCount = products.filter((p) => p.category.toLowerCase() === cat.name.toLowerCase()).length;
    if (assignedCount > 0) {
      showToast(`Cannot delete "${cat.name}". It contains ${assignedCount} product(s). Please move them first.`);
      return;
    }

    try {
      await deleteCategory(cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      showToast(`Category "${cat.name}" removed.`);
      loadData(true);
    } catch (e: any) {
      showToast(`Error deleting category: ${e.message}`);
    }
  };

  // Dedicated Photo Center Upload Action
  const handleDedicatedPhotoUpload = async () => {
    if (!photoUploadFiles.length) {
      showToast('Please select at least one photo first.');
      return;
    }

    setPhotoUploading(true);
    try {
      const targetId = photoTargetProduct || products[0]?.id || 'GENERAL';
      for (const file of photoUploadFiles) {
        await uploadMediaFile(file, targetId, 'image');
      }
      showToast(`${photoUploadFiles.length} photo(s) uploaded successfully!`);
      setPhotoUploadFiles([]);
      setPhotoUploadPreviews([]);
      loadData(true);
    } catch (e: any) {
      showToast(`Upload failed: ${e.message}`);
    } finally {
      setPhotoUploading(false);
    }
  };

  // Update Admin Password
  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!passCurrent || !passNew || !passConfirm) {
      showToast('Please fill in all password fields.');
      return;
    }
    if (passNew !== passConfirm) {
      showToast('New passwords do not match.');
      return;
    }
    if (passNew.length < 8) {
      showToast('New password must be at least 8 characters long.');
      return;
    }

    setPassLoading(true);
    try {
      const res = await updateAdminPassword(passCurrent, passNew);
      if (res.success) {
        showToast('Password updated successfully!');
        setPassCurrent('');
        setPassNew('');
        setPassConfirm('');
      } else {
        showToast(res.error || 'Failed to update password.');
      }
    } catch (e: any) {
      showToast('Could not update password. Please verify current password.');
    } finally {
      setPassLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#faf8f5',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#1e293b',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* TOP HEADER & NAVIGATION */}
      <header
        style={{
          background: '#ffffff',
          borderBottom: '1px solid #e7e2d8',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
        }}
      >
        <div
          style={{
            maxWidth: '1360px',
            margin: '0 auto',
            padding: '12px 18px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          {/* Brand */}
          <div
            onClick={() => setActiveSection('overview')}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
          >
            <img
              src="/logo.png"
              alt="Anmol Kala"
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                border: '2px solid #d8b45a',
                objectFit: 'cover',
                background: '#fff',
              }}
            />
            <div>
              <div style={{ fontWeight: 800, fontSize: '18px', color: '#0f172a', lineHeight: 1.2 }}>
                Anmol Kala
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              overflowX: 'auto',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            <button
              type="button"
              onClick={() => setActiveSection('overview')}
              style={{
                background: activeSection === 'overview' ? '#182235' : 'transparent',
                color: activeSection === 'overview' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📊 Dashboard
            </button>
            <button
              type="button"
              onClick={handleOpenAddPhotoProduct}
              style={{
                background: activeSection === 'add-photo-product' ? '#c9a24d' : '#fef3c7',
                color: activeSection === 'add-photo-product' ? '#ffffff' : '#92400e',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🖼️ Add Photo Product
            </button>
            <button
              type="button"
              onClick={handleOpenAddVideoProduct}
              style={{
                background: activeSection === 'add-video-product' ? '#c9a24d' : '#f3e8ff',
                color: activeSection === 'add-video-product' ? '#ffffff' : '#6b21a8',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🎬 Add Video Product
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('products')}
              style={{
                background: activeSection === 'products' ? '#182235' : 'transparent',
                color: activeSection === 'products' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📦 Manage Products
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('images')}
              style={{
                background: activeSection === 'images' ? '#182235' : 'transparent',
                color: activeSection === 'images' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              📷 Photos
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('videos')}
              style={{
                background: activeSection === 'videos' ? '#182235' : 'transparent',
                color: activeSection === 'videos' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🎥 Videos
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('categories')}
              style={{
                background: activeSection === 'categories' ? '#182235' : 'transparent',
                color: activeSection === 'categories' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🗂️ Categories
            </button>
            <button
              type="button"
              onClick={() => setActiveSection('settings')}
              style={{
                background: activeSection === 'settings' ? '#182235' : 'transparent',
                color: activeSection === 'settings' ? '#ffffff' : '#334155',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              ⚙️ Settings
            </button>
          </nav>

          {/* Action Links */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={onBackToStore}
              title="View live website"
              style={{
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#182235',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>👁️</span>
              <span>View Website</span>
            </button>
            <button
              type="button"
              onClick={async () => {
                await logoutAdmin();
                onLogout();
              }}
              style={{
                background: '#fee2e2',
                border: '1px solid #fca5a5',
                borderRadius: '6px',
                padding: '7px 12px',
                fontSize: '12px',
                fontWeight: 700,
                color: '#991b1b',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              🔒 Logout
            </button>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main style={{ maxWidth: '1360px', width: '100%', margin: '0 auto', padding: '24px 18px', flex: 1 }}>
        {/* Error notification banner if database request failed */}
        {dataError && (
          <div
            style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: '10px',
              padding: '14px 18px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
            }}
          >
            <div style={{ color: '#991b1b', fontSize: '14px', fontWeight: 600 }}>
              ⚠️ Unable to load latest data: {dataError}
            </div>
            <button
              type="button"
              onClick={() => loadData(false)}
              style={{
                background: '#991b1b',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '7px 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🔄 Retry
            </button>
          </div>
        )}

        {/* ============================================================
            1. OVERVIEW DASHBOARD HOME
            ============================================================ */}
        {activeSection === 'overview' && (
          <div>
            {/* Welcome banner */}
            <div
              style={{
                background: 'linear-gradient(135deg, #182235 0%, #2a3952 100%)',
                color: '#ffffff',
                padding: '28px 24px',
                borderRadius: '14px',
                marginBottom: '24px',
                boxShadow: '0 8px 20px rgba(24, 34, 53, 0.15)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <h1 style={{ fontSize: '26px', margin: '0 0 6px', fontWeight: 800 }}>
                  Welcome to Anmol Kala Admin
                </h1>
                <p style={{ margin: 0, fontSize: '14px', color: '#cbd5e1', maxWidth: '640px', lineHeight: 1.5 }}>
                  Manage your craft catalogue, upload videos with mandatory cover photos, and view catalogue totals.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenAddPhotoProduct}
                  style={{
                    background: 'linear-gradient(135deg, #d8b45a 0%, #c9a24d 100%)',
                    color: '#182235',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '11px 18px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(201, 162, 77, 0.35)',
                  }}
                >
                  ＋ Add Photo Product
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddVideoProduct}
                  style={{
                    background: '#ffffff',
                    color: '#182235',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '11px 18px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🎬 Add Video Product
                </button>
              </div>
            </div>

            {/* Database Error Alert with Retry */}
            {dataError && products.length === 0 && (
              <div
                style={{
                  background: '#fef2f2',
                  border: '1px solid #fca5a5',
                  borderRadius: '10px',
                  padding: '14px 18px',
                  marginBottom: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                }}
              >
                <div style={{ color: '#991b1b', fontSize: '13px', fontWeight: 600 }}>
                  ⚠️ Unable to load metrics: {dataError}
                </div>
                <button
                  type="button"
                  onClick={() => loadData(false)}
                  style={{
                    background: '#991b1b',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    padding: '6px 14px',
                    fontSize: '12px',
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Retry
                </button>
              </div>
            )}

            {/* REAL DATABASE TOTALS SUMMARY CARDS (NO FALSE ZERO) */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '14px',
                marginBottom: '28px',
              }}
            >
              {/* Card 1: Total Products */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e7e2d8',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Total Products
                </div>
                {totalProducts === null ? (
                  <div style={{ height: '38px', width: '80px', background: '#f1f5f9', borderRadius: '6px', margin: '6px 0', animation: 'pulse 1.5s infinite' }} />
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {totalProducts}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#16a34a', marginTop: '2px', fontWeight: 600 }}>
                  Handcrafted catalogue
                </div>
              </div>

              {/* Card 2: Published Products */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e7e2d8',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Published Products
                </div>
                {publishedProducts === null ? (
                  <div style={{ height: '38px', width: '80px', background: '#f1f5f9', borderRadius: '6px', margin: '6px 0', animation: 'pulse 1.5s infinite' }} />
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {publishedProducts}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px', fontWeight: 600 }}>
                  Visible to public visitors
                </div>
              </div>

              {/* Card 3: Photos */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e7e2d8',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Photos
                </div>
                {totalPhotos === null ? (
                  <div style={{ height: '38px', width: '80px', background: '#f1f5f9', borderRadius: '6px', margin: '6px 0', animation: 'pulse 1.5s infinite' }} />
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {totalPhotos}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Handmade product images
                </div>
              </div>

              {/* Card 4: Videos */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e7e2d8',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Videos
                </div>
                {totalVideos === null ? (
                  <div style={{ height: '38px', width: '80px', background: '#f1f5f9', borderRadius: '6px', margin: '6px 0', animation: 'pulse 1.5s infinite' }} />
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {totalVideos}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#2563eb', marginTop: '2px', fontWeight: 600 }}>
                  Craft demonstration videos
                </div>
              </div>

              {/* Card 5: Categories */}
              <div
                style={{
                  background: '#ffffff',
                  padding: '18px 20px',
                  borderRadius: '12px',
                  border: '1px solid #e7e2d8',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                }}
              >
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>
                  Categories
                </div>
                {totalCategories === null ? (
                  <div style={{ height: '38px', width: '80px', background: '#f1f5f9', borderRadius: '6px', margin: '6px 0', animation: 'pulse 1.5s infinite' }} />
                ) : (
                  <div style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', marginTop: '4px' }}>
                    {totalCategories}
                  </div>
                )}
                <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                  Thalis, Clocks, Frames, Trays...
                </div>
              </div>
            </div>

            {/* EXACT FOUR PROMINENT PRIMARY ACTION CARDS */}
            <h2 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
              Primary Actions
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                gap: '16px',
                marginBottom: '32px',
              }}
            >
              {/* Action 1: Add Photo Product */}
              <div
                onClick={handleOpenAddPhotoProduct}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2dac9',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a24d';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2dac9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#fef3c7',
                    color: '#b45309',
                    fontSize: '26px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  🖼️
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                    Add Photo Product
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    Create a new craft product with high-resolution photos and details.
                  </p>
                  <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#b45309' }}>
                    Add Photo Product →
                  </span>
                </div>
              </div>

              {/* Action 2: Add Video Product */}
              <div
                onClick={handleOpenAddVideoProduct}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2dac9',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a24d';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2dac9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#f3e8ff',
                    color: '#7e22ce',
                    fontSize: '26px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  🎬
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                    Add Video Product
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    Create a video showcase product (requires at least 1 product photo).
                  </p>
                  <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#7e22ce' }}>
                    Add Video Product →
                  </span>
                </div>
              </div>

              {/* Action 3: Manage Products */}
              <div
                onClick={() => setActiveSection('products')}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2dac9',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a24d';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2dac9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: '26px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  📦
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                    Manage Products
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    Search, edit, preview, publish, or remove catalogue items.
                  </p>
                  <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#0369a1' }}>
                    Manage Products →
                  </span>
                </div>
              </div>

              {/* Action 4: Photo & Video Library */}
              <div
                onClick={() => setActiveSection('images')}
                style={{
                  background: '#ffffff',
                  borderRadius: '12px',
                  border: '1px solid #e2dac9',
                  padding: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.18s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '16px',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#c9a24d';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#e2dac9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                <div
                  style={{
                    width: '52px',
                    height: '52px',
                    borderRadius: '12px',
                    background: '#dcfce7',
                    color: '#15803d',
                    fontSize: '26px',
                    display: 'grid',
                    placeItems: 'center',
                    flexShrink: 0,
                  }}
                >
                  🎨
                </div>
                <div>
                  <h3 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                    Photo &amp; Video Library
                  </h3>
                  <p style={{ fontSize: '13px', color: '#64748b', margin: 0, lineHeight: 1.4 }}>
                    Browse, manage, and replace all uploaded media assets.
                  </p>
                  <span style={{ display: 'inline-block', marginTop: '10px', fontSize: '13px', fontWeight: 700, color: '#15803d' }}>
                    Open Media Library →
                  </span>
                </div>
              </div>
            </div>


          </div>
        )}

        {/* ============================================================
            2. ADD PHOTO PRODUCT FORM
            ============================================================ */}
        {activeSection === 'add-photo-product' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveSection('products')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: '4px',
                  }}
                >
                  ← Back to Products
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  {editingItem ? 'Edit Product' : 'Add Photo Product'}
                </h1>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  {editingItem
                    ? `Updating "${editingItem.name}" (Permanent ID: ${editingItem.id})`
                    : 'Create a new handcrafted photo product for your public catalogue.'}
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSavePhotoProduct}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e7e2d8',
                padding: '28px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              {/* Product Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={photoFormName}
                  onChange={(e) => setPhotoFormName(e.target.value)}
                  placeholder="e.g. Royal Blue Resin Wall Clock"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 700, fontSize: '13px' }}>Category *</label>
                  <button
                    type="button"
                    onClick={() => setPhotoFormNewCatInline(!photoFormNewCatInline)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b45309',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {photoFormNewCatInline ? 'Choose Existing' : '＋ Create New Category'}
                  </button>
                </div>

                {!photoFormNewCatInline ? (
                  <select
                    value={photoFormCategory}
                    onChange={(e) => setPhotoFormCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={photoFormNewCatName}
                    onChange={(e) => setPhotoFormNewCatName(e.target.value)}
                    placeholder="Type new category name (e.g. Resin Coasters)"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #c9a24d',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: '#fffdf9',
                    }}
                  />
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Product Description
                </label>
                <textarea
                  rows={3}
                  value={photoFormDesc}
                  onChange={(e) => setPhotoFormDesc(e.target.value)}
                  placeholder="Describe your craft piece, colors, resin finish and size..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Photo Upload from device (Native Picker) */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Product Photos (from your device)
                </label>

                <input
                  type="file"
                  multiple
                  ref={photoFormPickerRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleSelectPhotoFormFiles}
                />

                <div
                  onClick={() => photoFormPickerRef.current?.click()}
                  style={{
                    border: '2px dashed #cbd5e1',
                    borderRadius: '10px',
                    padding: '24px 16px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#c9a24d';
                    e.currentTarget.style.background = '#fffdf9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#cbd5e1';
                    e.currentTarget.style.background = '#f8fafc';
                  }}
                >
                  <div style={{ fontSize: '32px', marginBottom: '6px' }}>📷</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b' }}>
                    Tap to select photos from phone gallery or computer
                  </div>
                  <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                    Supports JPG, PNG, and WEBP
                  </div>
                </div>

                {/* Previews & Cover Selection */}
                {photoFormPreviews.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#475569', marginBottom: '8px' }}>
                      Selected Photos ({photoFormPreviews.length}) — Click one to set as Cover Photo:
                    </div>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {photoFormPreviews.map((src, idx) => (
                        <div
                          key={idx}
                          onClick={() => setPhotoFormCoverIndex(idx)}
                          style={{
                            position: 'relative',
                            cursor: 'pointer',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: photoFormCoverIndex === idx ? '3px solid #c9a24d' : '1px solid #cbd5e1',
                          }}
                        >
                          <img
                            src={src}
                            alt="preview"
                            style={{ width: '90px', height: '90px', objectFit: 'cover', display: 'block' }}
                          />
                          {photoFormCoverIndex === idx && (
                            <span
                              style={{
                                position: 'absolute',
                                bottom: '0',
                                left: '0',
                                right: '0',
                                background: '#c9a24d',
                                color: '#fff',
                                fontSize: '10px',
                                fontWeight: 800,
                                textAlign: 'center',
                                padding: '2px 0',
                              }}
                            >
                              ★ COVER
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setPhotoFormPreviews((p) => p.filter((_, i) => i !== idx));
                              setPhotoFormFiles((p) => p.filter((_, i) => i !== idx));
                              if (photoFormCoverIndex >= idx) {
                                setPhotoFormCoverIndex((cur) => Math.max(0, cur - 1));
                              }
                            }}
                            style={{
                              position: 'absolute',
                              top: '4px',
                              right: '4px',
                              background: '#ef4444',
                              color: '#fff',
                              border: 'none',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              fontSize: '11px',
                              cursor: 'pointer',
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Availability & Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '22px' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    Availability
                  </label>
                  <select
                    value={photoFormAvailability}
                    onChange={(e) => setPhotoFormAvailability(e.target.value as ProductAvailability)}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      background: '#fff',
                    }}
                  >
                    <option value="in_stock">In Stock / Available</option>
                    <option value="made_to_order">Made to Order</option>
                    <option value="out_of_stock">Out of Stock</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                    Publication
                  </label>
                  <select
                    value={photoFormPublished ? 'true' : 'false'}
                    onChange={(e) => setPhotoFormPublished(e.target.value === 'true')}
                    style={{
                      width: '100%',
                      padding: '11px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      background: '#fff',
                    }}
                  >
                    <option value="true">Published (Visible on website)</option>
                    <option value="false">Draft (Hidden from website)</option>
                  </select>
                </div>
              </div>

              {/* Tags */}
              <div style={{ marginBottom: '24px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Search Tags (optional)
                </label>
                <input
                  type="text"
                  value={photoFormTags}
                  onChange={(e) => setPhotoFormTags(e.target.value)}
                  placeholder="e.g. resin blue clock gold flakes"
                  style={{
                    width: '100%',
                    padding: '11px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setActiveSection('products')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPhotoFormSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #d8b45a 0%, #c9a24d 100%)',
                    color: '#182235',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: isPhotoFormSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(201, 162, 77, 0.35)',
                  }}
                >
                  {isPhotoFormSubmitting ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            3. ADD VIDEO PRODUCT FORM (WITH MANDATORY PHOTO VALIDATION)
            ============================================================ */}
        {activeSection === 'add-video-product' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <button
                  type="button"
                  onClick={() => setActiveSection('products')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#64748b',
                    fontSize: '13px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    padding: 0,
                    marginBottom: '4px',
                  }}
                >
                  ← Back to Products
                </button>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  Add Video Product
                </h1>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '13px' }}>
                  Every video product requires at least one product photo for the storefront card and video poster.
                </p>
              </div>
            </div>

            <form
              onSubmit={handleSaveVideoProduct}
              style={{
                background: '#ffffff',
                borderRadius: '14px',
                border: '1px solid #e7e2d8',
                padding: '28px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              {/* Mandatory Photo Warning Alert if triggered */}
              {videoPhotoError && (
                <div
                  style={{
                    background: '#fef2f2',
                    border: '1px solid #f87171',
                    borderRadius: '10px',
                    padding: '14px 18px',
                    marginBottom: '20px',
                    color: '#991b1b',
                    fontSize: '14px',
                    fontWeight: 700,
                  }}
                >
                  ⚠️ Please add at least one product photo before publishing this video product.
                </div>
              )}

              {/* Product Name */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Product Name *
                </label>
                <input
                  type="text"
                  required
                  value={videoFormName}
                  onChange={(e) => setVideoFormName(e.target.value)}
                  placeholder="e.g. Handmade Resin Pooja Thali Video Showcase"
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '15px',
                    boxSizing: 'border-box',
                    outline: 'none',
                  }}
                />
              </div>

              {/* Category */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontWeight: 700, fontSize: '13px' }}>Category *</label>
                  <button
                    type="button"
                    onClick={() => setVideoFormNewCatInline(!videoFormNewCatInline)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#b45309',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      padding: 0,
                    }}
                  >
                    {videoFormNewCatInline ? 'Choose Existing' : '＋ Create New Category'}
                  </button>
                </div>

                {!videoFormNewCatInline ? (
                  <select
                    value={videoFormCategory}
                    onChange={(e) => setVideoFormCategory(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                      background: '#fff',
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={videoFormNewCatName}
                    onChange={(e) => setVideoFormNewCatName(e.target.value)}
                    placeholder="Type new category name..."
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '8px',
                      border: '1px solid #c9a24d',
                      fontSize: '14px',
                      boxSizing: 'border-box',
                    }}
                  />
                )}
              </div>

              {/* OPTIONAL PRODUCT COVER PHOTO PICKER */}
              <div
                style={{
                  marginBottom: '22px',
                  padding: '18px',
                  background: '#fefefe',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                  <label style={{ fontWeight: 800, fontSize: '14px', color: '#0f172a' }}>
                    Product Cover Photo (Optional)
                  </label>
                  <span style={{ fontSize: '12px', color: '#0284c7', fontWeight: 700 }}>
                    Optional — Video will display directly if omitted
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 12px' }}>
                  If you upload a photo, it will appear with a "Play Video" option. If you don't upload a photo, the video will be displayed directly.
                </p>

                <input
                  type="file"
                  ref={videoFormPhotoPickerRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={handleSelectVideoPhoto}
                />

                {!videoFormPhotoPreview ? (
                  <div
                    onClick={() => videoFormPhotoPickerRef.current?.click()}
                    style={{
                      border: '2px dashed #cbd5e1',
                      borderRadius: '8px',
                      padding: '20px 14px',
                      textAlign: 'center',
                      background: '#f8fafc',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '4px' }}>📷</div>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>
                      Add Optional Cover Photo
                    </div>
                    <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                      Leave blank to publish video directly without any photo
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <img
                      src={videoFormPhotoPreview}
                      alt="Product preview"
                      style={{ width: '100px', height: '100px', objectFit: 'cover', borderRadius: '8px', border: '2px solid #16a34a' }}
                    />
                    <div>
                      <div style={{ color: '#16a34a', fontWeight: 700, fontSize: '13px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        ✓ Photo attached (Will display with Play button)
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                        <button
                          type="button"
                          onClick={() => videoFormPhotoPickerRef.current?.click()}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Replace Photo
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setVideoFormPhotoFile(null);
                            setVideoFormPhotoPreview('');
                          }}
                          style={{
                            background: '#fee2e2',
                            color: '#991b1b',
                            border: '1px solid #fca5a5',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Remove Photo (Video Only)
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* VIDEO FILE PICKER */}
              <div style={{ marginBottom: '22px' }}>
                <label style={{ display: 'block', fontWeight: 800, fontSize: '14px', marginBottom: '6px', color: '#0f172a' }}>
                  Video File (MP4, WEBM, MOV) *
                </label>

                <input
                  type="file"
                  ref={videoFormVideoPickerRef}
                  accept="video/mp4,video/webm,video/quicktime"
                  style={{ display: 'none' }}
                  onChange={handleSelectVideoFile}
                />

                {!videoFormVideoPreview ? (
                  <div
                    onClick={() => videoFormVideoPickerRef.current?.click()}
                    style={{
                      border: '2px dashed #9333ea',
                      borderRadius: '10px',
                      padding: '28px 16px',
                      textAlign: 'center',
                      background: '#faf5ff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: '32px', marginBottom: '6px' }}>🎬</div>
                    <div style={{ fontSize: '14px', fontWeight: 700, color: '#581c87' }}>
                      Select Demonstration Video from device
                    </div>
                    <div style={{ fontSize: '12px', color: '#7e22ce', marginTop: '2px' }}>
                      Upload high quality craft showcase video
                    </div>
                  </div>
                ) : (
                  <div>
                    <video
                      controls
                      src={videoFormVideoPreview}
                      style={{ width: '100%', maxHeight: '320px', borderRadius: '8px', background: '#000', display: 'block' }}
                    />
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                      <span style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
                        Size: {videoFormFileSize}
                      </span>
                      <button
                        type="button"
                        onClick={() => videoFormVideoPickerRef.current?.click()}
                        style={{
                          background: '#f1f5f9',
                          border: '1px solid #cbd5e1',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Replace Video
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Description */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontWeight: 700, fontSize: '13px', marginBottom: '6px' }}>
                  Description
                </label>
                <textarea
                  rows={3}
                  value={videoFormDesc}
                  onChange={(e) => setVideoFormDesc(e.target.value)}
                  placeholder="Describe what is demonstrated in the video..."
                  style={{
                    width: '100%',
                    padding: '12px 14px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '26px' }}>
                <button
                  type="button"
                  onClick={() => setActiveSection('products')}
                  style={{
                    background: '#f1f5f9',
                    border: '1px solid #cbd5e1',
                    borderRadius: '8px',
                    padding: '12px 20px',
                    fontSize: '14px',
                    fontWeight: 700,
                    color: '#475569',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isVideoFormSubmitting}
                  style={{
                    background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 28px',
                    fontSize: '14px',
                    fontWeight: 800,
                    cursor: isVideoFormSubmitting ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(126, 34, 206, 0.35)',
                  }}
                >
                  {isVideoFormSubmitting ? 'Publishing Video...' : 'Publish Video Product'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ============================================================
            4. MANAGE PRODUCTS SECTION
            ============================================================ */}
        {activeSection === 'products' && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                marginBottom: '20px',
              }}
            >
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                  Manage Products
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  Showing {filteredProducts.length} of {products.length} products
                </p>
              </div>

              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={handleOpenAddPhotoProduct}
                  style={{
                    background: 'linear-gradient(135deg, #d8b45a 0%, #c9a24d 100%)',
                    color: '#182235',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  ＋ Add Photo Product
                </button>
                <button
                  type="button"
                  onClick={handleOpenAddVideoProduct}
                  style={{
                    background: '#182235',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  🎬 Add Video Product
                </button>
              </div>
            </div>

            {/* Search and Filters Bar */}
            <div
              style={{
                background: '#ffffff',
                border: '1px solid #e7e2d8',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '20px',
                display: 'flex',
                flexWrap: 'wrap',
                gap: '12px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                placeholder="Search by name, ID (e.g. AK-001) or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  flex: '1 1 240px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  boxSizing: 'border-box',
                }}
              />

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                }}
              >
                <option value="all">All Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                }}
              >
                <option value="all">All Media Types</option>
                <option value="photo">Photo Only</option>
                <option value="video">Has Video Showcase</option>
              </select>

              <select
                value={availabilityFilter}
                onChange={(e) => setAvailabilityFilter(e.target.value)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                }}
              >
                <option value="all">All Availability</option>
                <option value="in_stock">In Stock</option>
                <option value="made_to_order">Made to Order</option>
                <option value="out_of_stock">Out of Stock</option>
              </select>

              <select
                value={publishedFilter}
                onChange={(e) => setPublishedFilter(e.target.value as any)}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '13px',
                  background: '#fff',
                }}
              >
                <option value="all">All Status</option>
                <option value="published">Published</option>
                <option value="draft">Drafts</option>
              </select>
            </div>

            {/* Products Grid */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                gap: '16px',
              }}
            >
              {filteredProducts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e7e2d8',
                    borderRadius: '12px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
                    <div style={{ position: 'relative', width: '80px', height: '80px', flexShrink: 0 }}>
                      <img
                        src={p.image_url || '/logo.png'}
                        alt={p.name}
                        onError={handleImageError}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '8px',
                          border: '1px solid #cbd5e1',
                        }}
                      />
                      {p.video_url && (
                        <span
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            right: '4px',
                            background: '#0f172a',
                            color: '#38bdf8',
                            fontSize: '9px',
                            fontWeight: 800,
                            padding: '1px 4px',
                            borderRadius: '3px',
                          }}
                        >
                          ▶ VID
                        </span>
                      )}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, color: '#b45309', background: '#fef3c7', padding: '1px 6px', borderRadius: '4px' }}>
                          {p.category}
                        </span>
                        <span style={{ fontSize: '10px', color: '#64748b' }}>
                          ID: {p.id}
                        </span>
                      </div>
                      <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', marginTop: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.name}
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: p.published !== false ? '#dcfce7' : '#fee2e2',
                            color: p.published !== false ? '#15803d' : '#991b1b',
                          }}
                        >
                          {p.published !== false ? 'Published' : 'Draft'}
                        </span>
                        <span
                          style={{
                            fontSize: '10px',
                            fontWeight: 700,
                            padding: '2px 6px',
                            borderRadius: '4px',
                            background: p.availability === 'out_of_stock' ? '#fef2f2' : '#f0fdf4',
                            color: p.availability === 'out_of_stock' ? '#991b1b' : '#166534',
                          }}
                        >
                          {p.availability === 'out_of_stock' ? 'Out of Stock' : p.availability === 'made_to_order' ? 'Made to Order' : 'In Stock'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px', borderTop: '1px solid #f1f5f9' }}>
                    <button
                      type="button"
                      onClick={() => setViewDetailsItem(p)}
                      style={{
                        flex: 1,
                        background: '#f8fafc',
                        border: '1px solid #cbd5e1',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      👁️ Details
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(p)}
                      style={{
                        flex: 1,
                        background: '#ffffff',
                        border: '1px solid #c9a24d',
                        color: '#785617',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTogglePublish(p)}
                      style={{
                        background: p.published !== false ? '#fef3c7' : '#dcfce7',
                        border: 'none',
                        color: p.published !== false ? '#92400e' : '#166534',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      {p.published !== false ? 'Unpublish' : 'Publish'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setProductToDelete(p)}
                      style={{
                        background: '#fee2e2',
                        border: 'none',
                        color: '#991b1b',
                        borderRadius: '6px',
                        padding: '6px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            5. COMPLETE VIDEO MANAGEMENT SECTION
            ============================================================ */}
        {activeSection === 'videos' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                  Video Management
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  {allVideos.length} craft demonstration videos attached to products.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddVideoProduct}
                style={{
                  background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 18px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                ＋ Add Video Product
              </button>
            </div>

            {/* Video Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '18px' }}>
              {allVideos.map((v) => (
                <div
                  key={v.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e7e2d8',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                  }}
                >
                  <div style={{ position: 'relative', background: '#090d16', height: '180px' }}>
                    <video
                      src={v.video_url}
                      poster={v.image_url}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setPlayingVideo({
                          url: v.video_url,
                          title: v.productName,
                          productName: v.productName,
                          productId: v.productId,
                          category: v.category,
                        })
                      }
                      style={{
                        position: 'absolute',
                        inset: 0,
                        margin: 'auto',
                        width: '54px',
                        height: '54px',
                        borderRadius: '50%',
                        background: 'rgba(15, 23, 42, 0.85)',
                        border: '2px solid rgba(255,255,255,0.4)',
                        color: '#ffffff',
                        fontSize: '22px',
                        cursor: 'pointer',
                        display: 'grid',
                        placeItems: 'center',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                      }}
                    >
                      ▶
                    </button>
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
                      }}
                    >
                      {v.category}
                    </span>
                  </div>

                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>
                      {v.productName}
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                      Linked Product ID: <strong style={{ color: '#0f172a' }}>{v.productId}</strong>
                    </div>

                    <div style={{ display: 'flex', gap: '8px', marginTop: 'auto', paddingTop: '14px' }}>
                      <button
                        type="button"
                        onClick={() =>
                          setPlayingVideo({
                            url: v.video_url,
                            title: v.productName,
                            productName: v.productName,
                            productId: v.productId,
                            category: v.category,
                          })
                        }
                        style={{
                          flex: 1,
                          background: '#182235',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        ▶ Play
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setVideoToDelete({
                            productId: v.productId,
                            mediaId: v.id,
                            title: v.productName,
                          })
                        }
                        style={{
                          background: '#fee2e2',
                          color: '#991b1b',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '7px 10px',
                          fontSize: '12px',
                          fontWeight: 700,
                          cursor: 'pointer',
                        }}
                      >
                        Delete Video Only
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============================================================
            6. COMPLETE PHOTO MANAGEMENT SECTION
            ============================================================ */}
        {activeSection === 'images' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
              <div>
                <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
                  Photo Management
                </h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>
                  Browse, set covers, and manage high-resolution product photos.
                </p>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <input
                  type="file"
                  multiple
                  ref={dedicatedPhotoPickerRef}
                  accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (!files.length) return;
                    setPhotoUploadFiles(files);
                    files.forEach((f) => {
                      const r = new FileReader();
                      r.onload = (ev) => {
                        if (ev.target?.result) setPhotoUploadPreviews((prev) => [...prev, String(ev.target?.result)]);
                      };
                      r.readAsDataURL(f);
                    });
                  }}
                />
                <button
                  type="button"
                  onClick={() => dedicatedPhotoPickerRef.current?.click()}
                  style={{
                    background: '#15803d',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '9px 16px',
                    fontSize: '13px',
                    fontWeight: 800,
                    cursor: 'pointer',
                  }}
                >
                  📷 Upload Photos from Device
                </button>
              </div>
            </div>

            {/* If files selected for upload */}
            {photoUploadFiles.length > 0 && (
              <div
                style={{
                  background: '#ffffff',
                  border: '2px dashed #16a34a',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px',
                }}
              >
                <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '8px', color: '#166534' }}>
                  Ready to upload {photoUploadFiles.length} photo(s):
                </div>
                <div style={{ marginBottom: '14px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                    Assign to product (optional):
                  </label>
                  <select
                    value={photoTargetProduct}
                    onChange={(e) => setPhotoTargetProduct(e.target.value)}
                    style={{
                      width: '100%',
                      maxWidth: '360px',
                      padding: '8px 12px',
                      borderRadius: '6px',
                      border: '1px solid #cbd5e1',
                      fontSize: '13px',
                    }}
                  >
                    <option value="">General catalogue image</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.id})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    disabled={photoUploading}
                    onClick={handleDedicatedPhotoUpload}
                    style={{
                      background: '#16a34a',
                      color: '#ffffff',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {photoUploading ? 'Uploading...' : 'Confirm Upload'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPhotoUploadFiles([]);
                      setPhotoUploadPreviews([]);
                    }}
                    style={{
                      background: '#f1f5f9',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      padding: '8px 14px',
                      fontSize: '13px',
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Photos Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '14px' }}>
              {mediaList
                .filter((m) => m.media_type === 'image')
                .map((m) => {
                  const parent = products.find((p) => p.id === m.product_id);
                  const isCover = parent?.image_url === m.storage_path;

                  return (
                    <div
                      key={m.id}
                      style={{
                        background: '#ffffff',
                        border: isCover ? '2px solid #c9a24d' : '1px solid #e7e2d8',
                        borderRadius: '10px',
                        overflow: 'hidden',
                        display: 'flex',
                        flexDirection: 'column',
                      }}
                    >
                      <div style={{ position: 'relative', height: '160px', background: '#f8fafc' }}>
                        <img
                          src={m.storage_path}
                          alt={m.file_name || 'product photo'}
                          onError={handleImageError}
                          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        />
                        {isCover && (
                          <span
                            style={{
                              position: 'absolute',
                              top: '6px',
                              right: '6px',
                              background: '#c9a24d',
                              color: '#fff',
                              fontSize: '10px',
                              fontWeight: 800,
                              padding: '2px 6px',
                              borderRadius: '4px',
                            }}
                          >
                            ★ COVER PHOTO
                          </span>
                        )}
                      </div>

                      <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                        <div style={{ fontSize: '13px', fontWeight: 800, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {parent?.name || m.product_name || m.product_id}
                        </div>
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          ID: {m.product_id}
                        </div>

                        <div style={{ display: 'flex', gap: '6px', marginTop: 'auto', paddingTop: '8px' }}>
                          {!isCover && (
                            <button
                              type="button"
                              onClick={() => handleSetCoverPhoto(m)}
                              style={{
                                flex: 1,
                                background: '#fef3c7',
                                color: '#92400e',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '5px',
                                fontSize: '10px',
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                            >
                              Set Cover
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setPhotoToDelete(m)}
                            style={{
                              background: '#fee2e2',
                              color: '#991b1b',
                              border: 'none',
                              borderRadius: '4px',
                              padding: '5px 8px',
                              fontSize: '10px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* ============================================================
            7. CATEGORIES MANAGEMENT SECTION
            ============================================================ */}
        {activeSection === 'categories' && (
          <div style={{ maxWidth: '820px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Category Management
            </h1>
            <p style={{ margin: '0 0 20px', color: '#64748b', fontSize: '13px' }}>
              Organize products into collections. Categories are updated live on the storefront navigation.
            </p>

            {/* Add Category Card */}
            <form
              onSubmit={handleAddCategory}
              style={{
                background: '#ffffff',
                border: '1px solid #e7e2d8',
                borderRadius: '12px',
                padding: '18px 20px',
                marginBottom: '24px',
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <input
                type="text"
                required
                placeholder="New Category Name (e.g. Diya Holders, Resin Clocks)..."
                value={categoryInputName}
                onChange={(e) => setCategoryInputName(e.target.value)}
                style={{
                  flex: 1,
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                }}
              />
              <button
                type="submit"
                style={{
                  background: 'linear-gradient(135deg, #d8b45a 0%, #c9a24d 100%)',
                  color: '#182235',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                }}
              >
                ＋ Add Category
              </button>
            </form>

            {/* Categories List */}
            <div style={{ display: 'grid', gap: '10px' }}>
              {categories.map((cat) => {
                const count = products.filter((p) => p.category.toLowerCase() === cat.name.toLowerCase()).length;
                const isEditing = editingCategoryId === cat.id;

                return (
                  <div
                    key={cat.id}
                    style={{
                      background: '#ffffff',
                      border: '1px solid #e7e2d8',
                      borderRadius: '10px',
                      padding: '14px 18px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    {isEditing ? (
                      <div style={{ display: 'flex', gap: '8px', flex: 1 }}>
                        <input
                          type="text"
                          value={editingCategoryName}
                          onChange={(e) => setEditingCategoryName(e.target.value)}
                          style={{
                            flex: 1,
                            padding: '6px 10px',
                            borderRadius: '6px',
                            border: '1px solid #c9a24d',
                            fontSize: '14px',
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleRenameCategory(cat)}
                          style={{
                            background: '#16a34a',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '6px 12px',
                            fontSize: '12px',
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingCategoryId(null)}
                          style={{
                            background: '#f1f5f9',
                            border: '1px solid #cbd5e1',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <>
                        <div>
                          <strong style={{ fontSize: '15px', color: '#0f172a' }}>{cat.name}</strong>
                          <span style={{ fontSize: '12px', color: '#64748b', marginLeft: '10px' }}>
                            {count} products
                          </span>
                        </div>

                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingCategoryId(cat.id);
                              setEditingCategoryName(cat.name);
                            }}
                            style={{
                              background: '#f8fafc',
                              border: '1px solid #cbd5e1',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Rename
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat)}
                            style={{
                              background: count > 0 ? '#f1f5f9' : '#fee2e2',
                              color: count > 0 ? '#94a3b8' : '#991b1b',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 10px',
                              fontSize: '12px',
                              fontWeight: 700,
                              cursor: count > 0 ? 'not-allowed' : 'pointer',
                            }}
                            title={count > 0 ? 'Cannot delete category with products' : 'Delete category'}
                          >
                            Delete
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================
            8. SETTINGS & SECURITY SECTION
            ============================================================ */}
        {activeSection === 'settings' && (
          <div style={{ maxWidth: '640px', margin: '0 auto' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, margin: '0 0 4px', color: '#0f172a' }}>
              Admin Settings &amp; Security
            </h1>
            <p style={{ margin: '0 0 24px', color: '#64748b', fontSize: '13px' }}>
              Manage password, security credentials, and brand details.
            </p>

            {/* Change Password Card */}
            <form
              onSubmit={handlePasswordSubmit}
              style={{
                background: '#ffffff',
                border: '1px solid #e7e2d8',
                borderRadius: '14px',
                padding: '24px',
                marginBottom: '24px',
                boxShadow: '0 2px 10px rgba(0,0,0,0.03)',
              }}
            >
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
                Change Admin Password
              </h2>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Current Password
                </label>
                <input
                  type="password"
                  required
                  value={passCurrent}
                  onChange={(e) => setPassCurrent(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '14px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  New Password (min 8 characters)
                </label>
                <input
                  type="password"
                  required
                  value={passNew}
                  onChange={(e) => setPassNew(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 700, marginBottom: '6px' }}>
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  value={passConfirm}
                  onChange={(e) => setPassConfirm(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={passLoading}
                style={{
                  background: 'linear-gradient(135deg, #182235 0%, #2a3952 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '10px 20px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: passLoading ? 'not-allowed' : 'pointer',
                }}
              >
                {passLoading ? 'Updating Password...' : 'Update Password'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* ============================================================
          MODALS: QUICK DETAILS, VIDEO PLAYER, CONFIRMATION
          ============================================================ */}

      {/* 1. PRODUCT DETAILS QUICK VIEW MODAL */}
      {viewDetailsItem && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setViewDetailsItem(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '680px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setViewDetailsItem(null)}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                border: 'none',
                background: '#f1f5f9',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                cursor: 'pointer',
                fontSize: '16px',
              }}
            >
              ✕
            </button>

            <h2 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 16px', color: '#0f172a' }}>
              Product Details: {viewDetailsItem.name}
            </h2>

            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '16px' }}>
              <img
                src={viewDetailsItem.image_url || '/logo.png'}
                alt={viewDetailsItem.name}
                onError={handleImageError}
                style={{ width: '120px', height: '120px', objectFit: 'cover', borderRadius: '8px', border: '1px solid #cbd5e1' }}
              />

              <div style={{ flex: 1, minWidth: '220px', fontSize: '13px', lineHeight: 1.6 }}>
                <div><strong>Product ID:</strong> {viewDetailsItem.id}</div>
                <div><strong>Category:</strong> {viewDetailsItem.category || 'Not provided'}</div>
                <div><strong>Status:</strong> {viewDetailsItem.published !== false ? 'Published' : 'Draft'}</div>
                <div><strong>Availability:</strong> {viewDetailsItem.availability || 'In Stock'}</div>
                <div><strong>Created:</strong> {viewDetailsItem.created_at ? new Date(viewDetailsItem.created_at).toLocaleString() : 'Not provided'}</div>
                <div><strong>Updated:</strong> {viewDetailsItem.updated_at ? new Date(viewDetailsItem.updated_at).toLocaleString() : 'Not provided'}</div>
              </div>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b' }}>Description:</div>
              <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                {viewDetailsItem.description || 'Not provided'}
              </p>
            </div>

            {viewDetailsItem.video_url && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#64748b', marginBottom: '6px' }}>
                  Attached Demonstration Video:
                </div>
                <video
                  controls
                  src={viewDetailsItem.video_url}
                  style={{ width: '100%', maxHeight: '240px', borderRadius: '8px', background: '#000' }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '20px' }}>
              <button
                type="button"
                onClick={() => {
                  const itm = viewDetailsItem;
                  setViewDetailsItem(null);
                  handleOpenEditProduct(itm);
                }}
                style={{
                  background: '#182235',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ✏️ Edit Product
              </button>
              <button
                type="button"
                onClick={() => setViewDetailsItem(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '8px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. PLAY VIDEO MODAL */}
      {playingVideo && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setPlayingVideo(null)}
        >
          <div
            style={{
              background: '#090d16',
              borderRadius: '14px',
              maxWidth: '720px',
              width: '100%',
              overflow: 'hidden',
              position: 'relative',
              boxShadow: '0 20px 40px rgba(0,0,0,0.5)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 18px', background: '#111827', color: '#fff' }}>
              <strong style={{ fontSize: '15px' }}>{playingVideo.title}</strong>
              <button
                type="button"
                onClick={() => setPlayingVideo(null)}
                style={{
                  background: 'transparent',
                  color: '#fff',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                }}
              >
                ✕
              </button>
            </div>

            <video
              src={playingVideo.url}
              controls
              autoPlay
              playsInline
              style={{ width: '100%', maxHeight: '480px', display: 'block' }}
            />
          </div>
        </div>
      )}

      {/* 3. CONFIRM DELETE PRODUCT MODAL */}
      {productToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setProductToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: '#991b1b' }}>
              Delete Product
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to delete <strong>"{productToDelete.name}"</strong> (ID: {productToDelete.id})? This will permanently remove the item from the storefront.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProduct}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Yes, Delete Product
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. CONFIRM DELETE VIDEO MODAL (KEEPS PRODUCT INTACT) */}
      {videoToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setVideoToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: '#991b1b' }}>
              Delete Video
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to delete the video demonstration for <strong>"{videoToDelete.title}"</strong>?
              <br /><br />
              <strong style={{ color: '#15803d' }}>Note:</strong> This only removes the video file. The product and its photos will remain completely intact.
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setVideoToDelete(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteVideo}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Yes, Delete Video
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. CONFIRM DELETE PHOTO MODAL */}
      {photoToDelete && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.65)',
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
          onClick={() => setPhotoToDelete(null)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '14px',
              maxWidth: '460px',
              width: '100%',
              padding: '24px',
              position: 'relative',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: '18px', fontWeight: 800, margin: '0 0 10px', color: '#991b1b' }}>
              Delete Photo
            </h3>
            <p style={{ fontSize: '14px', color: '#475569', lineHeight: 1.5, margin: '0 0 20px' }}>
              Are you sure you want to delete this photo record?
            </p>

            <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setPhotoToDelete(null)}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletePhoto}
                style={{
                  background: '#dc2626',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  padding: '9px 16px',
                  fontSize: '13px',
                  fontWeight: 800,
                  cursor: 'pointer',
                }}
              >
                Yes, Delete Photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TOAST NOTIFICATION */}
      {toastMessage && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#182235',
            color: '#ffffff',
            padding: '12px 22px',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            zIndex: 200,
          }}
        >
          {toastMessage}
        </div>
      )}
    </div>
  );
};
