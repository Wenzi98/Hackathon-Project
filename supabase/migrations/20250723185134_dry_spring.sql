/*
  # Initial SnipRewards Database Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text, unique)
      - `full_name` (text, nullable)
      - `phone` (text, nullable)
      - `role` (enum: salon_owner, barber, customer)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `salons`
      - `id` (uuid, primary key)
      - `name` (text)
      - `address` (text)
      - `phone` (text)
      - `owner_id` (uuid, references profiles)
      - `qr_code` (text, unique)
      - `loyalty_threshold` (integer, default 10)
      - `reward_description` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `visits`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles)
      - `salon_id` (uuid, references salons)
      - `barber_id` (uuid, references profiles, nullable)
      - `service_type` (text)
      - `amount` (decimal)
      - `points_earned` (integer)
      - `visit_date` (timestamp)
      - `created_at` (timestamp)
    
    - `loyalty_cards`
      - `id` (uuid, primary key)
      - `customer_id` (uuid, references profiles)
      - `salon_id` (uuid, references salons)
      - `total_visits` (integer, default 0)
      - `total_points` (integer, default 0)
      - `rewards_redeemed` (integer, default 0)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users to manage their own data
    - Salon owners can manage their salon data
    - Customers can view their loyalty cards and visits
</sql>

-- Create custom types
CREATE TYPE user_role AS ENUM ('salon_owner', 'barber', 'customer');

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  phone text,
  role user_role NOT NULL DEFAULT 'customer',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create salons table
CREATE TABLE IF NOT EXISTS salons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  address text NOT NULL,
  phone text NOT NULL,
  owner_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  qr_code text UNIQUE NOT NULL,
  loyalty_threshold integer DEFAULT 10,
  reward_description text DEFAULT 'Free service after completing loyalty card',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create visits table
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  barber_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  amount decimal(10,2) NOT NULL,
  points_earned integer NOT NULL DEFAULT 0,
  visit_date timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Create loyalty_cards table
CREATE TABLE IF NOT EXISTS loyalty_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  salon_id uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  total_visits integer DEFAULT 0,
  total_points integer DEFAULT 0,
  rewards_redeemed integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(customer_id, salon_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE salons ENABLE ROW LEVEL SECURITY;
ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE loyalty_cards ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can read own profile"
  ON profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create policies for salons
CREATE POLICY "Salon owners can manage their salons"
  ON salons
  FOR ALL
  TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Users can read salon data"
  ON salons
  FOR SELECT
  TO authenticated
  USING (true);

-- Create policies for visits
CREATE POLICY "Users can read their own visits"
  ON visits
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM salons WHERE salons.id = visits.salon_id AND salons.owner_id = auth.uid()
  ));

CREATE POLICY "Users can create visits"
  ON visits
  FOR INSERT
  TO authenticated
  WITH CHECK (customer_id = auth.uid());

-- Create policies for loyalty_cards
CREATE POLICY "Users can read their own loyalty cards"
  ON loyalty_cards
  FOR SELECT
  TO authenticated
  USING (customer_id = auth.uid() OR EXISTS (
    SELECT 1 FROM salons WHERE salons.id = loyalty_cards.salon_id AND salons.owner_id = auth.uid()
  ));

CREATE POLICY "Users can manage their own loyalty cards"
  ON loyalty_cards
  FOR ALL
  TO authenticated
  USING (customer_id = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_salons_owner_id ON salons(owner_id);
CREATE INDEX IF NOT EXISTS idx_visits_customer_id ON visits(customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_salon_id ON visits(salon_id);
CREATE INDEX IF NOT EXISTS idx_visits_visit_date ON visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_loyalty_cards_customer_salon ON loyalty_cards(customer_id, salon_id);

-- Create function to handle profile creation
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user registration
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();