-- Products table with real-time stock
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,;;
  price DECIMAL NOT NULL,
  stock INT NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  category TEXT NOT NULL DEFAULT 'Uncategorized'
);

-- Orders table to track customer purchases
CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  total_amount DECIMAL NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, shipped, delivered
  payment_id TEXT, -- Midtrans ID
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  shipping_address TEXT
);

-- Order items to track specific products in an order
CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  quantity INT NOT NULL,
  price_at_purchase DECIMAL NOT NULL
);

-- Profiles for user or admin
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'user', -- user or admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  address TEXT
);
