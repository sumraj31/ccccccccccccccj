import React, { useState } from 'react';
import { StoreItem, Product } from '../types';
import { handleImageError } from '../utils/helpers';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StoreItem[];
  onSaveItem: (item: StoreItem) => void;
  onDeleteItem: (id: string) => void;
  onToast: (msg: string) => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({
  isOpen,
  onClose,
  items,
  onSaveItem,
  onDeleteItem,
  onToast,
}) => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [authError, setAuthError] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'product' | 'video'>('product');
  const [editingItem, setEditingItem] = useState<StoreItem | null>(null);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');

    // Attempt backend login if available, otherwise allow client admin session
    try {
      const res = await fetch('/api/admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'login', username, password }),
      });
      if (res.ok) {
        setIsLoggedIn(true);
        onToast('Logged in successfully');
        return;
      }
    } catch {
      // Offline / standalone client mode fallback
    }

    // Client-side authentication check fallback
    if (
      (username.trim().toLowerCase() === 'admin' ||
        username.trim().toLowerCase() === 'anmolkala.in@gmail.com') &&
      password.length >= 4
    ) {
      setIsLoggedIn(true);
      onToast('Logged in as Admin');
    } else {
      setAuthError('Invalid credentials. Use admin username or anmolkala.in@gmail.com');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setEditingItem(null);
    onToast('Logged out');
  };

  const handleCreateNew = () => {
    const newId = `AK-${Date.now().toString(36).toUpperCase()}`;
    const newItem: StoreItem = {
      id: newId,
      type: activeTab,
      name: '',
      category: activeTab === 'video' ? 'Craft Videos' : 'Puja Thali',
      slug: '',
      description: '',
      image_url: '/logo.png',
      video_url: '',
      tags: '',
      published: true,
      availability: 'in_stock',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setEditingItem(newItem);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, field: 'image_url' | 'video_url') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      onToast('File size exceeds 5MB limit. Please choose a smaller file.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result && editingItem) {
        setEditingItem({
          ...editingItem,
          [field]: String(reader.result),
        });
        onToast('Media selected');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    if (!editingItem.name.trim()) {
      onToast('Please provide a name');
      return;
    }

    const slug =
      editingItem.slug ||
      editingItem.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') +
        '-' +
        editingItem.id.toLowerCase();

    const finalizedItem: StoreItem = {
      ...editingItem,
      slug,
      category: editingItem.category.trim() || 'Uncategorized',
    };

    onSaveItem(finalizedItem);
    setEditingItem(null);
    onToast(`Saved ${finalizedItem.type === 'video' ? 'video' : 'product'} successfully`);
  };

  const tabItems = items.filter((i) => i.type === activeTab);

  return (
    <div className="ak-admin-modal open" role="dialog" aria-modal="true">
      <div className="ak-admin-box">
        <button type="button" className="ak-admin-close" onClick={onClose} aria-label="Close">
          ×
        </button>

        {!isLoggedIn ? (
          <div>
            <h2>Admin Login</h2>
            <p>Sign in to manage products and videos.</p>
            <form onSubmit={handleLogin}>
              <label>
                Admin ID
                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin or anmolkala.in@gmail.com"
                  required
                />
              </label>

              <label>
                Password
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </label>

              <button className="ak-primary" type="submit" style={{ marginTop: '10px' }}>
                Login
              </button>

              {authError && <div className="ak-admin-error">{authError}</div>}
            </form>
          </div>
        ) : (
          <div>
            <h2>Anmol Kala · Admin</h2>
            <p>
              Manage product photos, details, videos and publishing. Changes appear publicly
              instantly when published.
            </p>

            <div className="ak-admin-toolbar">
              <button
                type="button"
                className={activeTab === 'product' ? 'active' : ''}
                onClick={() => {
                  setActiveTab('product');
                  setEditingItem(null);
                }}
              >
                Products
              </button>
              <button
                type="button"
                className={activeTab === 'video' ? 'active' : ''}
                onClick={() => {
                  setActiveTab('video');
                  setEditingItem(null);
                }}
              >
                Product Videos
              </button>
              <button type="button" onClick={handleCreateNew} className="ak-primary">
                ＋ Add {activeTab === 'video' ? 'Video' : 'Product'}
              </button>
              <button type="button" onClick={handleLogout}>
                Logout
              </button>
            </div>

            {editingItem && (
              <form onSubmit={handleSaveForm} style={{ marginBottom: '24px', border: '1px solid #c8d8cd', padding: '16px', borderRadius: '12px', background: '#f8fbf9' }}>
                <h3>
                  {items.some((i) => i.id === editingItem.id) ? 'Edit' : 'Add'}{' '}
                  {editingItem.type === 'video' ? 'Video' : 'Product'} ({editingItem.id})
                </h3>

                <label>
                  Name / Title
                  <input
                    type="text"
                    required
                    maxLength={180}
                    value={editingItem.name}
                    onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                  />
                </label>

                <div className="ak-admin-row">
                  <label>
                    Category
                    <input
                      type="text"
                      value={editingItem.category}
                      onChange={(e) => setEditingItem({ ...editingItem, category: e.target.value })}
                    />
                  </label>
                  <label>
                    Tags / Search Keywords
                    <input
                      type="text"
                      value={editingItem.tags}
                      onChange={(e) => setEditingItem({ ...editingItem, tags: e.target.value })}
                    />
                  </label>
                </div>

                <label>
                  Description
                  <textarea
                    value={editingItem.description}
                    onChange={(e) => setEditingItem({ ...editingItem, description: e.target.value })}
                  />
                </label>

                {editingItem.type === 'product' ? (
                  <div>
                    <label>
                      Product Image (Upload File)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'image_url')}
                      />
                    </label>
                    <label>
                      Or Image URL
                      <input
                        type="text"
                        value={editingItem.image_url}
                        placeholder="https://... or /products/p001.webp"
                        onChange={(e) => setEditingItem({ ...editingItem, image_url: e.target.value })}
                      />
                    </label>
                    {editingItem.image_url && (
                      <div style={{ marginTop: '8px' }}>
                        <img
                          src={editingItem.image_url}
                          alt="Preview"
                          style={{ maxHeight: '100px', borderRadius: '6px' }}
                          onError={handleImageError}
                        />
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label>
                      Product Video (Upload or URL)
                      <input
                        type="file"
                        accept="video/mp4,video/webm,video/quicktime"
                        onChange={(e) => handleFileUpload(e, 'video_url')}
                      />
                    </label>
                    <label>
                      Video URL
                      <input
                        type="text"
                        value={editingItem.video_url}
                        placeholder="https://... or video URL"
                        onChange={(e) => setEditingItem({ ...editingItem, video_url: e.target.value })}
                      />
                    </label>
                    <label>
                      Video Poster / Thumbnail (Upload image or URL)
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileUpload(e, 'image_url')}
                      />
                    </label>
                  </div>
                )}

                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '14px 0' }}>
                  <input
                    type="checkbox"
                    checked={editingItem.published}
                    onChange={(e) => setEditingItem({ ...editingItem, published: e.target.checked })}
                    style={{ width: 'auto', margin: 0 }}
                  />
                  <span>Publish publicly</span>
                </label>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button className="ak-primary" type="submit">
                    Save {editingItem.type === 'video' ? 'Video' : 'Product'}
                  </button>
                  <button type="button" onClick={() => setEditingItem(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            )}

            <div className="ak-admin-grid">
              {tabItems.length === 0 ? (
                <p>No records in this section yet.</p>
              ) : (
                tabItems.map((item) => (
                  <article key={item.id} className="ak-admin-item">
                    {item.type === 'video' ? (
                      <video controls preload="metadata" src={item.video_url} poster={item.image_url} />
                    ) : (
                      <img src={item.image_url || '/logo.png'} alt={item.name} onError={handleImageError} />
                    )}
                    <h3>{item.name}</h3>
                    <div className="muted">{item.id} · {item.category}</div>
                    <p className="ak-admin-status">{item.published ? 'PUBLISHED' : 'DRAFT'}</p>
                    <div className="ak-admin-row">
                      <button type="button" onClick={() => setEditingItem(item)}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (confirm(`Delete ${item.name} permanently?`)) {
                            onDeleteItem(item.id);
                          }
                        }}
                        style={{ color: '#b42318' }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
