/*
  # POS System Database Schema
  
  ## Overview
  Complete database schema for a Mobile POS (Point of Sale) system with stores, products, inventory, and transaction management.
  
  ## New Tables
  
  ### 1. stores
  - `id` (uuid, primary key) - Unique store identifier
  - `name` (text) - Store name
  - `owner_name` (text) - Owner's full name
  - `phone_number` (text) - Contact phone number
  - `user_id` (uuid, foreign key) - Link to auth.users
  - `created_at` (timestamptz) - Store creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 2. categories
  - `id` (uuid, primary key) - Category identifier
  - `name` (text) - Category name (e.g., Food, Drinks, Snacks)
  - `icon` (text) - Icon name for UI display
  - `store_id` (uuid, foreign key) - Link to stores
  - `created_at` (timestamptz) - Creation timestamp
  
  ### 3. products
  - `id` (uuid, primary key) - Product identifier
  - `name` (text) - Product name
  - `sku` (text) - Stock Keeping Unit (unique per store)
  - `price` (decimal) - Product price
  - `stock` (integer) - Current stock quantity
  - `category_id` (uuid, foreign key) - Link to categories
  - `store_id` (uuid, foreign key) - Link to stores
  - `image_url` (text, optional) - Product image URL
  - `created_at` (timestamptz) - Creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp
  
  ### 4. transactions
  - `id` (uuid, primary key) - Transaction identifier
  - `order_id` (text) - Human-readable order ID
  - `subtotal` (decimal) - Subtotal before tax
  - `tax` (decimal) - Tax amount (11%)
  - `total` (decimal) - Grand total
  - `payment_method` (text) - Payment method (Cash, QRIS, Bank Transfer)
  - `status` (text) - Transaction status (Completed, Pending)
  - `store_id` (uuid, foreign key) - Link to stores
  - `user_id` (uuid, foreign key) - Cashier who processed the sale
  - `created_at` (timestamptz) - Transaction timestamp
  
  ### 5. transaction_items
  - `id` (uuid, primary key) - Line item identifier
  - `transaction_id` (uuid, foreign key) - Link to transactions
  - `product_id` (uuid, foreign key) - Link to products
  - `product_name` (text) - Product name snapshot
  - `quantity` (integer) - Quantity purchased
  - `price` (decimal) - Price at time of sale
  - `subtotal` (decimal) - Line item subtotal (quantity × price)
  
  ## Security
  - Enable Row Level Security (RLS) on all tables
  - Policies ensure users can only access data for their own store
  - Store owners have full access to their store data
  - Authenticated users required for all operations
  
  ## Indexes
  - Fast lookups on frequently queried columns
  - Optimized for product search and transaction history
*/

-- Create stores table
CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_name text NOT NULL,
  phone_number text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create categories table
CREATE TABLE IF NOT EXISTS categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  icon text DEFAULT 'package',
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create products table
CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  sku text NOT NULL,
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  category_id uuid REFERENCES categories(id) ON DELETE SET NULL,
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(sku, store_id)
);

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id text NOT NULL,
  subtotal decimal(10, 2) NOT NULL CHECK (subtotal >= 0),
  tax decimal(10, 2) NOT NULL CHECK (tax >= 0),
  total decimal(10, 2) NOT NULL CHECK (total >= 0),
  payment_method text NOT NULL CHECK (payment_method IN ('Cash', 'QRIS', 'Bank Transfer')),
  status text DEFAULT 'Completed' CHECK (status IN ('Completed', 'Pending')),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE IF NOT EXISTS transaction_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid REFERENCES transactions(id) ON DELETE CASCADE NOT NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  product_name text NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  price decimal(10, 2) NOT NULL CHECK (price >= 0),
  subtotal decimal(10, 2) NOT NULL CHECK (subtotal >= 0)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_stores_user_id ON stores(user_id);
CREATE INDEX IF NOT EXISTS idx_categories_store_id ON categories(store_id);
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_id);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON products(sku);
CREATE INDEX IF NOT EXISTS idx_transactions_store_id ON transactions(store_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transaction_items_transaction_id ON transaction_items(transaction_id);

-- Enable Row Level Security
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE transaction_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for stores
CREATE POLICY "Users can view their own store"
  ON stores FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own store"
  ON stores FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store"
  ON stores FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store"
  ON stores FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- RLS Policies for categories
CREATE POLICY "Users can view categories in their store"
  ON categories FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = categories.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create categories in their store"
  ON categories FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = categories.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update categories in their store"
  ON categories FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = categories.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = categories.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete categories in their store"
  ON categories FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = categories.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for products
CREATE POLICY "Users can view products in their store"
  ON products FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create products in their store"
  ON products FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update products in their store"
  ON products FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete products in their store"
  ON products FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = products.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for transactions
CREATE POLICY "Users can view transactions in their store"
  ON transactions FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = transactions.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transactions in their store"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = transactions.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transactions in their store"
  ON transactions FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = transactions.store_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = transactions.store_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transactions in their store"
  ON transactions FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM stores
      WHERE stores.id = transactions.store_id
      AND stores.user_id = auth.uid()
    )
  );

-- RLS Policies for transaction_items
CREATE POLICY "Users can view transaction items from their store"
  ON transaction_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      JOIN stores ON stores.id = transactions.store_id
      WHERE transactions.id = transaction_items.transaction_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create transaction items in their store"
  ON transaction_items FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      JOIN stores ON stores.id = transactions.store_id
      WHERE transactions.id = transaction_items.transaction_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update transaction items in their store"
  ON transaction_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      JOIN stores ON stores.id = transactions.store_id
      WHERE transactions.id = transaction_items.transaction_id
      AND stores.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM transactions
      JOIN stores ON stores.id = transactions.store_id
      WHERE transactions.id = transaction_items.transaction_id
      AND stores.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete transaction items in their store"
  ON transaction_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM transactions
      JOIN stores ON stores.id = transactions.store_id
      WHERE transactions.id = transaction_items.transaction_id
      AND stores.user_id = auth.uid()
    )
  );

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_stores_updated_at
  BEFORE UPDATE ON stores
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();