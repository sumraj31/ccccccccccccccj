import React, { useState, useMemo } from 'react';
import { Product } from '../types';

export interface VideoItemDisplay {
  id: string;
  name: string;
  category: string;
  video_url: string;
  image_url?: string;
  description?: string;
  product?: Product;
}

interface VideoGalleryProps {
  videos: VideoItemDisplay[];
  whatsappNumber: string;
  onGoHome: () => void;
  onOpenProduct?: (product: Product) => void;
}

export const VideoGallery: React.FC<VideoGalleryProps> = ({
  videos,
  whatsappNumber,
  onGoHome,
  onOpenProduct,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');

  // Categories present in videos
  const categories = useMemo(() => {
    const set = new Set<string>();
    videos.forEach((v) => {
      if (v.category) set.add(v.category);
    });
    return ['All', ...Array.from(set)];
  }, [videos]);

  const filteredVideos = useMemo(() => {
    if (activeCategory === 'All') return videos;
    return videos.filter((v) => v.category === activeCategory);
  }, [videos, activeCategory]);

  return (
    <section className="section">
      <div className="head" style={{ flexWrap: 'wrap', gap: '14px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '24px' }}>🎬</span>
            <h2 style={{ margin: 0 }}>Product Videos (Product Videos)</h2>
          </div>
          <div className="muted" style={{ marginTop: '4px' }}>
            Watch real craftsmanship videos of our handmade resin creations, Puja Thalis, frames, clocks, and tray sets.
          </div>
        </div>
        <button type="button" className="select" onClick={onGoHome}>
          ← Back to Storefront
        </button>
      </div>

      {/* Category Filter Tabs */}
      {categories.length > 1 && (
        <div
          style={{
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            paddingBottom: '12px',
            marginBottom: '20px',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              style={{
                background: activeCategory === cat ? '#182235' : '#f1f5f9',
                color: activeCategory === cat ? '#ffffff' : '#334155',
                border: activeCategory === cat ? '1px solid #182235' : '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '6px 14px',
                fontSize: '12px',
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {cat === 'All' ? 'सभी वीडियो (All)' : cat}
            </button>
          ))}
        </div>
      )}

      <div className="homegrid">
        {filteredVideos.length === 0 ? (
          <div
            style={{
              gridColumn: '1/-1',
              padding: '60px 20px',
              textAlign: 'center',
              background: '#f8fafc',
              borderRadius: '8px',
              border: '1px dashed #cbd5e1',
            }}
          >
            <span style={{ fontSize: '40px', display: 'block', marginBottom: '12px' }}>🎬</span>
            <h3 style={{ margin: '0 0 8px', color: '#0f172a' }}>No Videos in this Category</h3>
            <p className="muted" style={{ margin: '0 0 16px' }}>
              Upload new product videos via the Admin Dashboard.
            </p>
            <button
              type="button"
              className="select"
              onClick={() => setActiveCategory('All')}
            >
              View All Videos
            </button>
          </div>
        ) : (
          filteredVideos.map((vid) => {
            const waText = encodeURIComponent(
              `Hello AnmolKala, I watched the video for "${vid.name}" and would like to order or customize it.`
            );
            const waLink = `https://wa.me/${whatsappNumber}?text=${waText}`;

            return (
              <article key={vid.id} className="card ak-video-card" style={{ overflow: 'hidden' }}>
                <div style={{ position: 'relative', background: '#000', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}>
                  <video
                    controls
                    playsInline
                    preload="metadata"
                    poster={vid.image_url || ''}
                    src={vid.video_url}
                    style={{ width: '100%', maxHeight: '240px', display: 'block', objectFit: 'contain' }}
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
                        boxShadow: '0 2px 6px rgba(37, 211, 102, 0.3)',
                      }}
                    >
                      <span>💬 WhatsApp Inquiry</span>
                    </a>

                    {vid.product && onOpenProduct && (
                      <button
                        type="button"
                        onClick={() => onOpenProduct(vid.product!)}
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
        )}
      </div>
    </section>
  );
};
