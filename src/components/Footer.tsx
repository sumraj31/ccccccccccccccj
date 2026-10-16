import React from 'react';
import { BrandData } from '../types';

interface FooterProps {
  brand: BrandData;
  onSelectCategory: (cat: string) => void;
  onOpenAdmin: () => void;
}

export const Footer: React.FC<FooterProps> = ({ brand, onSelectCategory, onOpenAdmin }) => {
  return (
    <footer className="footer">
      <div className="foot">
        <div>
          <div className="foot-brand">
            <img src="/logo.png" alt="AnmolKala logo" />
            <div>
              <strong>AnmolKala</strong>
              <small>ART · TRADITION · CRAFT</small>
            </div>
          </div>
          <p>Handmade crafts, gifts, personalised products and home décor.</p>
          <div className="social-row">
            <a
              className="social"
              href="https://www.instagram.com/anmolkala.in/"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Instagram"
            >
              ◎
            </a>
            <a
              className="social"
              href={`https://wa.me/${brand.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp"
            >
              ◉
            </a>
          </div>
        </div>

        <div>
          <h3>Collections</h3>
          <p>
            <button type="button" onClick={() => onSelectCategory('Puja Thali')}>
              ◈ <span>Puja Thali</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Photo Frames')}>
              ▣ <span>Photo Frames</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Personalized Name Plates')}>
              ⌑ <span>Name Plates</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Wall Clocks')}>
              ◷ <span>Wall Clocks</span>
            </button>
          </p>
        </div>

        <div>
          <h3>More</h3>
          <p>
            <button type="button" onClick={() => onSelectCategory('Jewellery')}>
              ◇ <span>Jewellery</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Rakhi')}>
              ✦ <span>Rakhi</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Diya & Candle Holders')}>
              ◉ <span>Diya &amp; Candles</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Keychains & Key Holders')}>
              ⌘ <span>Keychains</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Home Decor & Tissue Holders')}>
              ▱ <span>Tissue Holders</span>
            </button>
            <button type="button" onClick={() => onSelectCategory('Home Decor')}>
              ✧ <span>Home Decor</span>
            </button>
          </p>
        </div>

        <div>
          <h3>Contact AnmolKala</h3>
          <div className="contact-links">
            <a
              className="contact-link"
              href={`https://wa.me/${brand.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">◉</span>
              <div>
                <b>WhatsApp</b>
                <span>+91 98101 16510</span>
              </div>
            </a>
            <a className="contact-link" href={`tel:+${brand.phone}`}>
              <span className="icon">☎</span>
              <div>
                <b>Call</b>
                <span>+91 97178 87313</span>
              </div>
            </a>
            <a className="contact-link" href={`mailto:${brand.email}`}>
              <span className="icon">✉</span>
              <div>
                <b>Email</b>
                <span>{brand.email}</span>
              </div>
            </a>
            <a
              className="contact-link"
              href="https://www.instagram.com/anmolkala.in/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span className="icon">◎</span>
              <div>
                <b>Instagram</b>
                <span>@anmolkala.in</span>
              </div>
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© 2026 AnmolKala. All rights reserved.</span>
        <span>Handmade • Personalised • Crafted with care</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '16px 0 6px' }}>
        <button
          type="button"
          onClick={onOpenAdmin}
          aria-label="Admin Portal"
          title="A"
          style={{
            all: 'unset',
            cursor: 'pointer',
            width: '22px',
            height: '22px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, rgba(201, 162, 77, 0.25), rgba(24, 34, 53, 0.8))',
            border: '1px solid rgba(201, 162, 77, 0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#e5c46e',
            fontSize: '11px',
            fontWeight: 800,
            fontFamily: 'serif',
            opacity: 0.65,
            transition: 'all 0.25s ease',
            boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.borderColor = '#e5c46e';
            e.currentTarget.style.transform = 'scale(1.08)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.65';
            e.currentTarget.style.borderColor = 'rgba(201, 162, 77, 0.45)';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          A
        </button>
      </div>
    </footer>
  );
};
