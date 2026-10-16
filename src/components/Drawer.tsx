import React from 'react';
import { DrawerType, Product } from '../types';
import { handleImageError, getWaUrl } from '../utils/helpers';

interface DrawerProps {
  type: DrawerType;
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  whatsappNumber: string;
  onOpenProduct: (product: Product) => void;
  onRemoveItem: (id: string, drawerType: NonNullable<DrawerType>) => void;
  onOpenCompareModal?: () => void;
}

export const Drawer: React.FC<DrawerProps> = ({
  type,
  isOpen,
  onClose,
  products,
  whatsappNumber,
  onOpenProduct,
  onRemoveItem,
  onOpenCompareModal,
}) => {
  if (!isOpen || !type) return null;

  const titles: Record<NonNullable<DrawerType>, string> = {
    wish: 'Wishlist',
    saved: 'Saved Products (Cart)',
    compare: 'Compare Products',
    recent: 'Recently Viewed',
  };

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <div className={`drawer open`} aria-modal="true" role="dialog">
        <div className="dhead">
          <h2>{titles[type]}</h2>
          <button type="button" onClick={onClose} aria-label="Close drawer">
            ×
          </button>
        </div>

        {type === 'compare' && products.length > 1 && onOpenCompareModal && (
          <div style={{ marginBottom: '14px' }}>
            <button
              type="button"
              className="ak-primary"
              style={{ width: '100%', padding: '10px' }}
              onClick={() => {
                onClose();
                onOpenCompareModal();
              }}
            >
              ⇄ View Side-by-Side Comparison
            </button>
          </div>
        )}

        {products.length === 0 ? (
          <p className="muted" style={{ padding: '20px 0' }}>Nothing here yet.</p>
        ) : (
          <div>
            {products.map((p) => (
              <div key={p.id} className="row">
                <img
                  src={p.image_url || p.image || '/logo.png'}
                  alt={p.name}
                  onError={handleImageError}
                />
                <main>
                  <b>{p.name}</b>
                  <div className="muted">{p.category} · {p.id}</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '6px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenProduct(p);
                      }}
                    >
                      View
                    </button>
                    <a
                      href={getWaUrl(p, whatsappNumber)}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        border: '1px solid #159447',
                        background: '#159447',
                        color: '#fff',
                        padding: '6px 8px',
                        borderRadius: '3px',
                        fontSize: '10px',
                        marginTop: '7px',
                        marginRight: '6px',
                        textDecoration: 'none',
                        fontWeight: 'bold',
                        display: 'inline-block',
                      }}
                    >
                      WhatsApp
                    </a>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(p.id, type)}
                      style={{ color: '#b42318' }}
                      title="Remove"
                    >
                      Remove
                    </button>
                  </div>
                </main>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
