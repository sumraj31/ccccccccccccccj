import React from 'react';
import { Product } from '../types';
import { handleImageError, getWaUrl } from '../utils/helpers';

interface ProductCardProps {
  product: Product;
  whatsappNumber: string;
  isWishlisted: boolean;
  onToggleWishlist: (id: string) => void;
  onOpenProduct: (product: Product) => void;
  onCompare?: (id: string) => void;
  variant?: 'full' | 'compact';
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  whatsappNumber,
  isWishlisted,
  onToggleWishlist,
  onOpenProduct,
  onCompare,
  variant = 'full',
}) => {
  const isCompact = variant === 'compact';
  const hasPhoto = Boolean(product.image_url && product.image_url !== '/logo.png' && product.image_url.trim() !== '');
  const hasVideo = Boolean(product.video_url && product.video_url.trim() !== '');

  return (
    <article className="card">
      <div className="pic" style={{ position: 'relative', overflow: 'hidden', background: '#090d16' }}>
        {/* If Video Only (No Photo): Display the video player directly */}
        {hasVideo && !hasPhoto ? (
          <div
            style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative' }}
            onClick={() => onOpenProduct(product)}
          >
            <video
              src={product.video_url}
              muted
              playsInline
              loop
              preload="metadata"
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
              onMouseEnter={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                v.play().catch(() => {});
              }}
              onMouseLeave={(e) => {
                const v = e.currentTarget as HTMLVideoElement;
                v.pause();
              }}
            />
            <span
              style={{
                position: 'absolute',
                bottom: '8px',
                left: '8px',
                background: 'rgba(15, 23, 42, 0.88)',
                color: '#38bdf8',
                fontSize: '10px',
                fontWeight: 800,
                padding: '3px 8px',
                borderRadius: '4px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                backdropFilter: 'blur(4px)',
                pointerEvents: 'none',
              }}
            >
              🎬 Video
            </span>
          </div>
        ) : (
          /* Normal Photo Display */
          <div style={{ width: '100%', height: '100%', cursor: 'pointer', position: 'relative' }} onClick={() => onOpenProduct(product)}>
            <img
              loading="lazy"
              src={product.image_url || product.image || '/logo.png'}
              alt={product.name}
              onError={handleImageError}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
            {/* If Both Photo AND Video are present: Show Play Video badge */}
            {hasVideo && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenProduct(product);
                }}
                style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(15, 23, 42, 0.92)',
                  color: '#ffffff',
                  border: '1px solid rgba(255,255,255,0.25)',
                  borderRadius: '16px',
                  padding: '4px 10px',
                  fontSize: '11px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '5px',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  zIndex: 2,
                }}
                title="Play Video"
              >
                <span>▶ Play Video</span>
              </button>
            )}
          </div>
        )}

        <button
          type="button"
          className={`fav ${isWishlisted ? 'on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          style={{ zIndex: 3 }}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>
      </div>

      <div className="info">
        <div className="ct">{product.category}</div>
        <div className="name">{product.name}</div>
        {!isCompact && (
          <div className="desc">
            {product.description}
          </div>
        )}
        <div className="actions">
          <button type="button" onClick={() => onOpenProduct(product)}>
            View Details
          </button>

          {/* If video is attached and photo exists, add Play Video action button */}
          {hasVideo && hasPhoto && (
            <button
              type="button"
              onClick={() => onOpenProduct(product)}
              style={{
                background: '#0f172a',
                color: '#38bdf8',
                border: '1px solid #0284c7',
                fontWeight: 700,
              }}
            >
              ▶ Play Video
            </button>
          )}

          {!isCompact && onCompare && (
            <button type="button" onClick={() => onCompare(product.id)}>
              ⇄ Compare
            </button>
          )}

          <a
            className="wa"
            href={getWaUrl(product, whatsappNumber)}
            target="_blank"
            rel="noopener noreferrer"
          >
            {isCompact ? 'WhatsApp' : 'Order on WhatsApp'}
          </a>
        </div>
      </div>
    </article>
  );
};
