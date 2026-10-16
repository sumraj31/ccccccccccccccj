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

  return (
    <article className="card">
      <div className="pic">
        <img
          loading="lazy"
          src={product.image_url || product.image || '/logo.png'}
          alt={product.name}
          onError={handleImageError}
        />
        <button
          type="button"
          className={`fav ${isWishlisted ? 'on' : ''}`}
          onClick={(e) => {
            e.stopPropagation();
            onToggleWishlist(product.id);
          }}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
        >
          {isWishlisted ? '♥' : '♡'}
        </button>
        {product.video_url && (
          <span
            style={{
              position: 'absolute',
              bottom: '8px',
              left: '8px',
              background: 'rgba(15, 23, 42, 0.85)',
              color: '#38bdf8',
              fontSize: '10px',
              fontWeight: 700,
              padding: '3px 7px',
              borderRadius: '4px',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              backdropFilter: 'blur(4px)',
              pointerEvents: 'none',
            }}
          >
            🎥 Video
          </span>
        )}
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
