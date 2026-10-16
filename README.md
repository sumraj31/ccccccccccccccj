# AnmolKala — Handmade Art, Tradition & Craft

A modern React & TypeScript web application for AnmolKala, showcasing handmade crafts, gifts, jewellery, personalised photo frames, name plates, wall clocks, diya & candle holders, trays, and home décor.

## Key Features

- **Storefront & Catalog**:
  - Browse 170+ categorized handmade products (Puja Thali, Photo Frames, Wall Clocks, Tray Sets, Jewellery, Personalized Name Plates, Rakhi, Home Decor, Keychains).
  - Instant search across product names, categories, tags, and descriptions.
  - Sorting (Featured, Name A–Z, Name Z–A).
  - Client-side pagination (10 products per page).
- **Product Pages (`/product/:slug`)**:
  - Full details, product IDs, and image displays with fallback handling.
  - One-click **Direct WhatsApp Enquiry** with pre-filled product details.
  - Quick actions: Add to Wishlist, Save for Later, Copy Link, and Native Share.
  - Related items section matching the same collection.
- **Client Features & Drawers**:
  - **Wishlist** (`♡`) with persistent badge counters via `localStorage`.
  - **Saved for Later / Cart** (`🛒`).
  - **Side-by-Side Product Comparison** (`⇄`) for up to 4 products with specs and direct enquiry.
  - **Recently Viewed** history (`◷`).
- **Media & Videos (`/videos`)**:
  - Video gallery showing handmade products in motion.
- **Admin Portal & Complete Dashboard**:
  - Discreetly accessible via the minimal gold circular **`A`** icon at the bottom of the footer.
  - Separate dedicated **Admin Login** page (`/admin/login`) with session management.
  - Dedicated **Admin Dashboard** with 12 independent sections: Overview, Products, Categories, Images, Videos, Upload Center, Media Gallery, Availability, Recently Updated, Activity Logs, Admin & Security, Website Settings.
  - **Zero manual image URL fields**: All photos and videos upload directly through native device file pickers (gallery/file manager).
  - Permanent unique IDs for all products and media.
  - Self-service admin password update with current password verification.

## Tech Stack

- **Framework**: React 19 + TypeScript
- **Bundler**: Vite
- **Styling**: Tailored responsive CSS preserving original design and branding
- **Hosting / Dev**: Port 3000, Node.js 22
