export interface Store {
  id: string;
  name: string;
  owner_name: string;
  phone_number: string;
  user_id: string;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  store_id: string;
  created_at: string;
}

export interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  stock: number;
  category_id: string | null;
  store_id: string;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Transaction {
  id: string;
  order_id: string;
  subtotal: number;
  tax: number;
  total: number;
  payment_method: 'Cash' | 'QRIS' | 'Bank Transfer';
  status: 'Completed' | 'Pending';
  sync_status?: 'Pending' | 'Synced';
  cash_received?: number;
  change_amount?: number;
  store_id: string;
  user_id: string | null;
  created_at: string;
}

export interface TransactionItem {
  id: string;
  transaction_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}
