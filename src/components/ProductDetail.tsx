import React, { useState } from 'react';
import { Product } from '../types';
import { handleImageError, getWaUrl, getProductUrl } from '../utils/helpers';
import { ProductCard } from './ProductCard';

interface ProductDetailProps {
  product: Product;
  allProducts: Product[];
  whatsappNumber: string;
  isWishlisted: boolean;
  isSaved: boolean;
  onToggleWishlist: (id: string) => void;
  onToggleSave: (id: string) => void;
  onBack: () => void;
  onOpenProduct: (product: Product) => void;
  onToast: (msg: string) => void;
}

export const ProductDetail: React.FC<ProductDetailProps> = ({
  product,
  allProducts,
  whatsappNumber,
  isWishlisted,
  isSaved,
  onToggleWishlist,
  onToggleSave,
  onBack,
  onOpenProduct,
  onToast,
}) => {
  const [relPage, setRelPage] = useState<number>(1);
  const [showVideo, setShowVideo] = useState<boolean>(false);
  const perPage = 10;

  const isReview = product.category === 'Product Image Requires Review';
  const related = allProducts.filter(
    (p) => p.category === product.category && p.id !== product.id
  );
  const totalRelPages = Math.max(1, Math.ceil(related.length / perPage));
  const currentPage = Math.min(relPage, totalRelPages);
  const start = (currentPage - 1) * perPage;
  const currentRelated = related.slice(start, start + perPage);

  const handleCopyLink = () => {
    const url = getProductUrl(product);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(url).then(() => {
        onToast('Product link copied to clipboard');
      });
    } else {
      onToast(`Link: ${url}`);
    }
  };

  const handleShare = () => {
    const url = getProductUrl(product);
    if (navigator.share) {
      navigator
        .share({
          title: product.name,
          text: `AnmolKala handcrafted piece: ${product.name}`,
          url,
        })
        .catch(() => {});
    } else {
      handleCopyLink();
    }
  };

  const availabilityLabel =
    product.availability === 'out_of_stock'
      ? 'Out of Stock'
      : product.availability === 'made_to_order'
      ? 'Made to Order'
      : 'In Stock / Ready to Ship';

  const availabilityBg =
    product.availability === 'out_of_stock'
      ? '#fef2f2'
      : product.availability === 'made_to_order'
      ? '#eff6ff'
      : '#f0fdf4';

  const availabilityColor =
    product.availability === 'out_of_stock'
      ? '#991b1b'
      : product.availability === 'made_to_order'
      ? '#1d4ed8'
      : '#15803d';

  const availabilityBorder =
    product.availability === 'out_of_stock'
      ? '#fca5a5'
      : product.availability === 'made_to_order'
      ? '#bfdbfe'
      : '#bbf7d0';

  return (
    <section className="product-page">
      <button type="button" className="backbtn" onClick={onBack}>
        ← Back to products
      </button>

      <div className="product-top">
        <div>
          {/* Media Switcher Tab if video is attached */}
          {product.video_url && (
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <button
                type="button"
                onClick={() => setShowVideo(false)}
                style={{
                  background: !showVideo ? '#182235' : '#f1f5f9',
                  color: !showVideo ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>📷</span> Photo
              </button>
              <button
                type="button"
                onClick={() => setShowVideo(true)}
                style={{
                  background: showVideo ? '#182235' : '#f1f5f9',
                  color: showVideo ? '#ffffff' : '#334155',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  padding: '7px 14px',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>🎬</span> Craft Video (Demonstration)
              </button>
            </div>
          )}

          {showVideo && product.video_url ? (
            <div
              style={{
                background: '#090d16',
                borderRadius: '8px',
                overflow: 'hidden',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              }}
            >
              <video
                src={product.video_url}
                controls
                autoPlay
                playsInline
                poster={product.image_url || product.image}
                style={{ width: '100%', maxHeight: '480px', display: 'block', objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <img
                className="product-image"
                src={product.image_url || product.image || '/logo.png'}
                alt={product.name}
                onError={handleImageError}
              />
              {product.video_url && !showVideo && (
                <button
                  type="button"
                  onClick={() => setShowVideo(true)}
                  style={{
                    position: 'absolute',
                    bottom: '12px',
                    right: '12px',
                    background: 'rgba(15, 23, 42, 0.88)',
                    color: '#f8fafc',
                    border: '1px solid rgba(255,255,255,0.2)',
                    borderRadius: '20px',
                    padding: '6px 12px',
                    fontSize: '11px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <span>▶ Play Video</span>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="product-meta">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span className="ct">{product.category}</span>
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px',
                background: availabilityBg,
                color: availabilityColor,
                border: `1px solid ${availabilityBorder}`,
              }}
            >
              {availabilityLabel}
            </span>
            {product.video_url && (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: '#f0f9ff',
                  color: '#0284c7',
                  border: '1px solid #bae6fd',
                }}
              >
                🎥 Video Available
              </span>
            )}
          </div>

          <h1>{product.name}</h1>

          {/* Product Specifications & Admin Reference Attributes */}
          <div
            style={{
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              padding: '12px 14px',
              margin: '12px 0 16px',
              fontSize: '12px',
              lineHeight: 1.6,
            }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
              <div>
                <span style={{ color: '#64748b' }}>Item ID:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{product.id}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Category:</span>{' '}
                <strong style={{ color: '#0f172a' }}>{product.category || 'Not provided'}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Availability:</span>{' '}
                <strong style={{ color: availabilityColor }}>{availabilityLabel}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Listed Date:</span>{' '}
                <strong style={{ color: '#0f172a' }}>
                  {product.created_at ? new Date(product.created_at).toLocaleDateString() : 'Not provided'}
                </strong>
              </div>
            </div>
          </div>

          {isReview ? (
            <div className="review">
              <b>Product Image Requires Review</b>
              <br />
              This image appears to be a company/brand graphic rather than a clearly
              identifiable physical product, so no product type has been invented for it.
            </div>
          ) : (
            <p className="lead" style={{ whiteSpace: 'pre-line' }}>
              {product.description || 'Handcrafted bespoke resin art item made with high quality materials.'}
            </p>
          )}

          <div className="product-actions">
            <button type="button" onClick={() => onToggleWishlist(product.id)}>
              {isWishlisted ? '♥ In Wishlist' : '♡ Add to Wishlist'}
            </button>
            <button type="button" onClick={() => onToggleSave(product.id)}>
              {isSaved ? '🛒 In Saved' : '🛒 Save for Later'}
            </button>
            <button type="button" onClick={handleCopyLink}>
              🔗 Copy Link
            </button>
            <button type="button" onClick={handleShare}>
              ↗ Share
            </button>
            {!isReview && (
              <a
                className="wa"
                href={getWaUrl(product, whatsappNumber)}
                target="_blank"
                rel="noopener noreferrer"
              >
                💬 Order on WhatsApp
              </a>
            )}
          </div>
        </div>
      </div>

      {!isReview && (
        <div className="related">
          <div className="head">
            <div>
              <h2>More from {product.category}</h2>
              <div className="muted">{related.length} matching products · 10 per page</div>
            </div>
          </div>

          <div className="grid">
            {currentRelated.length > 0 ? (
              currentRelated.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  whatsappNumber={whatsappNumber}
                  isWishlisted={false}
                  onToggleWishlist={onToggleWishlist}
                  onOpenProduct={onOpenProduct}
                  variant="compact"
                />
              ))
            ) : (
              <div style={{ gridColumn: '1/-1', padding: '30px' }} className="muted">
                No other products in this category.
              </div>
            )}
          </div>

          {totalRelPages > 1 && (
            <div className="pager">
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setRelPage((p) => Math.max(1, p - 1))}
              >
                ← Previous
              </button>
              <span className="pageinfo">
                Page {currentPage} of {totalRelPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalRelPages}
                onClick={() => setRelPage((p) => Math.min(totalRelPages, p + 1))}
              >
                Next →
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};
