# Anmol Kala — Admin Guide

This guide explains how to access, use, and deploy the secure Admin Dashboard for **Anmol Kala**.

---

## 1. Accessing the Admin Login ("A" Icon in Footer)

- Scroll to the **very bottom of the website footer** on any page.
- At the absolute bottom center, below the copyright and tagline, you will see a **small, discreet circular icon containing the letter `A`**.
- It is designed with subtle gold accents matching the Anmol Kala brand.
- Tapping or clicking this icon immediately opens the **Dedicated Admin Login Page** (`/admin/login`).

---

## 2. Administrator Credentials

- **Admin Username / Email**: `anmolkala.in@gmail.com`
- **Initial Password**: `mnbvcxz12`

---

## 3. Updating the Admin Password

The administrator can change their password at any time:
1. Log in to the Admin Dashboard.
2. In the sidebar or navigation menu, select **Admin & Security** (🛡️).
3. Under **Change Admin Password**:
   - Enter your **Current Password** (e.g. `mnbvcxz12`).
   - Enter your **New Password** (minimum 8 characters).
   - Re-enter to **Confirm New Password**.
4. Click **Update Password**.

---

## 4. Admin Dashboard Sections

The dashboard is organized into 12 independent, dedicated sections with a desktop sidebar and responsive mobile drawer:

1. **📊 Overview Dashboard**:
   - Real metrics for the craft catalogue: Total Products, Categories, Images, Videos, Available Products, and Unavailable Products.
   - Quick administrative action shortcuts.
   - Recently updated products table and recently uploaded media thumbnails.

2. **📦 Product Management**:
   - View, search, and filter the entire craft catalogue.
   - Search by **Product Name** or **Unique Product ID** (e.g. `AK-001`, `AK-032`).
   - Filter by Category and Availability Status.
   - **Unique Product IDs**: Every product has a permanent unique ID.
   - **Add New Product**: Generates a unique product ID, accepts title, category, description, and tags.
   - **Native Device Image Picker**: Photo uploads use your device's native file picker.
   - **Delete Product**: Requires explicit confirmation in a modal before deleting.

3. **🗂️ Category Management**:
   - View all active categories with product counts.
   - Create new categories.
   - Rename existing categories (automatically cascades to products).
   - Safe deletion: Deletion is blocked if a category still contains products to prevent orphaned items.

4. **🖼️ Product Image Management**:
   - Dedicated workspace for product photos.
   - Browse images linked to specific products.
   - Tap "Upload Image from Device" to upload directly from phone gallery or laptop.

5. **🎬 Product Video Management**:
   - Independent workspace exclusively for videos.
   - HTML5 video player previews.
   - Upload MP4/MOV demonstration videos directly from your file manager.
   - Assign video demonstrations to products.

6. **⬆️ Upload Center**:
   - Centralized media workstation.
   - Real-time drag & drop, file size & MIME type validation, preview thumbnails, and upload progress.

7. **🎨 Media Gallery**:
   - High-resolution visual grid of all photos and videos.
   - Filter by All, Images, or Videos.

8. **⚡ Availability Manager**:
   - Fast batch toggle between "In Stock / Available", "Made to Order", and "Out of Stock / Unavailable".
   - Updates storefront badges immediately.

9. **🕒 Recently Updated Products**:
   - Chronological audit table of products modified during sessions.

10. **📋 Activity Logs**:
    - Operation log (Logins, Product Edits, Media Uploads, Password Changes).

11. **🛡️ Admin & Security**:
    - Session status, expiration details, password change form, and secure logout.

12. **⚙️ Website Settings**:
    - Verified contact details: Brand name, WhatsApp (+91 98101 16510), Support Phone (+91 97178 87313), and Email (anmolkala.in@gmail.com).

---

## 5. Automatic Real-Time Database Connection (DATABASE_URL)

The application now supports **instant zero-configuration database connection**:
- As soon as you set `DATABASE_URL` (in your `.env` or Vercel Environment Variables), the server automatically connects to your PostgreSQL database in real time.
- If your database is new, it automatically creates the required tables (`store_items`, `categories`, `product_media`) and auto-seeds all 174 handcrafted products so you never start with an empty catalogue.
- If `DATABASE_URL` is omitted, the application operates smoothly with local file storage.

---

## 6. Environment Variables for Deployment

Add the following environment variables in your deployment settings:

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string (Supabase, Neon, etc.) | `postgres://postgres:...@...:5432/postgres` |
| `ADMIN_USERNAME` | Admin email | `anmolkala.in@gmail.com` |
| `ADMIN_PASSWORD` | Initial admin password | `mnbvcxz12` |
| `SESSION_SECRET` | Secret string for HMAC session tokens | `anmolkala-production-secret...` |
| `PORT` | Web server port | `3000` |
