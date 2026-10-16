import React from 'react';
import { Product } from '../types';
import { handleImageError, getWaUrl } from '../utils/helpers';

interface CompareModalProps {
  products: Product[];
  whatsappNumber: string;
  onClose: () => void;
  onRemoveProduct: (id: string) => void;
  onOpenProduct: (product: Product) => void;
}

export const CompareModal: React.FC<CompareModalProps> = ({
  products,
  whatsappNumber,
  onClose,
  onRemoveProduct,
  onOpenProduct,
}) => {
  return (
    <div className="overlay" style={{ display: 'flex' }} onClick={onClose}>
      <div
        className="modal"
        style={{ maxWidth: '1100px', width: '96%' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="close" onClick={onClose} aria-label="Close">
          ×
        </button>
        <h2 style={{ margin: '0 0 10px' }}>Product Comparison ({products.length} / 4)</h2>
        <p className="muted" style={{ margin: '0 0 20px' }}>
          Compare specifications, design and styling side by side.
        </p>

        {products.length === 0 ? (
          <p className="muted">No products selected for comparison.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="compare-table">
              <tbody>
                <tr>
                  <th>Product</th>
                  {products.map((p) => (
                    <td key={p.id} className="compare-col-header">
                      <img
                        src={p.image_url || p.image || '/logo.png'}
                        alt={p.name}
                        onError={handleImageError}
                      />
                      <div style={{ fontWeight: 'bold', fontSize: '13px' }}>{p.name}</div>
                      <button
                        type="button"
                        onClick={() => onRemoveProduct(p.id)}
                        style={{
                          marginTop: '6px',
                          border: '1px solid #ddd',
                          background: '#fff',
                          borderRadius: '3px',
                          padding: '3px 8px',
                          fontSize: '11px',
                          color: '#b42318',
                        }}
                      >
                        Remove
                      </button>
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Category</th>
                  {products.map((p) => (
                    <td key={p.id} style={{ fontWeight: 600 }}>
                      {p.category}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Product ID</th>
                  {products.map((p) => (
                    <td key={p.id} style={{ fontFamily: 'monospace' }}>
                      {p.id}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Description</th>
                  {products.map((p) => (
                    <td key={p.id} style={{ lineHeight: 1.5, fontSize: '12px' }}>
                      {p.description}
                    </td>
                  ))}
                </tr>
                <tr>
                  <th>Actions</th>
                  {products.map((p) => (
                    <td key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenProduct(p);
                        }}
                        style={{
                          display: 'block',
                          width: '100%',
                          marginBottom: '6px',
                          border: '1px solid #ccc',
                          padding: '6px',
                          borderRadius: '3px',
                          fontWeight: 'bold',
                        }}
                      >
                        View Details
                      </button>
                      <a
                        href={getWaUrl(p, whatsappNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block',
                          width: '100%',
                          textAlign: 'center',
                          boxSizing: 'border-box',
                          background: '#159447',
                          color: '#fff',
                          padding: '6px',
                          borderRadius: '3px',
                          textDecoration: 'none',
                          fontWeight: 'bold',
                          fontSize: '12px',
                        }}
                      >
                        WhatsApp
                      </a>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
