import React from 'react';
import { DrawerType } from '../types';

interface HeaderProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  onSearchSubmit: (e: React.FormEvent) => void;
  onGoHome: () => void;
  wishCount: number;
  compareCount: number;
  savedCount: number;
  onOpenDrawer: (type: NonNullable<DrawerType>) => void;
}

export const Header: React.FC<HeaderProps> = ({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  onGoHome,
  wishCount,
  compareCount,
  savedCount,
  onOpenDrawer,
}) => {
  return (
    <>
      <div className="top">
        AnmolKala • <b>Direct WhatsApp Enquiry</b> • Handmade &amp; Personalised Products
      </div>
      <header>
        <nav className="nav">
          <button
            type="button"
            className="brand"
            onClick={onGoHome}
            aria-label="AnmolKala Home"
          >
            <img src="/logo.png" alt="AnmolKala logo" />
            <span>
              <strong>AnmolKala</strong>
              <small>ART · TRADITION · CRAFT</small>
            </span>
          </button>

          <form className="search" onSubmit={onSearchSubmit}>
            <input
              id="q"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              autoComplete="off"
              placeholder="Search tissue, diya, candle, jewellery, earring, bracelet, photo frame, name plate, clock, tray, rakhi..."
            />
            <button type="submit" aria-label="Search">⌕</button>
          </form>

          <button
            type="button"
            className="navbtn"
            onClick={() => onOpenDrawer('wish')}
            aria-label="Wishlist"
            title="Wishlist"
          >
            ♡<span className="badge" id="wb">{wishCount}</span>
          </button>

          <button
            type="button"
            className="navbtn"
            onClick={() => onOpenDrawer('compare')}
            aria-label="Compare"
            title="Compare"
          >
            ⇄<span className="badge" id="cb">{compareCount}</span>
          </button>

          <button
            type="button"
            className="navbtn"
            onClick={() => onOpenDrawer('saved')}
            aria-label="Saved products"
            title="Saved products"
          >
            🛒<span className="badge" id="sb">{savedCount}</span>
          </button>

          <button
            type="button"
            className="navbtn"
            onClick={() => onOpenDrawer('recent')}
            aria-label="Recently viewed"
            title="Recently viewed"
          >
            ◷
          </button>
        </nav>
      </header>
    </>
  );
};
