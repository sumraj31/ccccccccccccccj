import { pgTable, serial, text, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const storeItems = pgTable('store_items', {
  id: text('id').primaryKey(),
  type: text('type').default('product'),
  name: text('name').notNull(),
  category: text('category').notNull(),
  slug: text('slug').notNull(),
  description: text('description').default(''),
  imageUrl: text('image_url'),
  videoUrl: text('video_url'),
  tags: text('tags').default(''),
  published: boolean('published').default(true),
  availability: text('availability').default('in_stock'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const categories = pgTable('categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull().unique(),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const productMedia = pgTable('product_media', {
  id: text('id').primaryKey(),
  productId: text('product_id'),
  storagePath: text('storage_path').notNull(),
  mediaType: text('media_type').default('image'),
  fileName: text('file_name'),
  fileSize: text('file_size').default('0'),
  mimeType: text('mime_type'),
  displayOrder: integer('display_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});
