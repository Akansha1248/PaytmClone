/*
  # Paytm Clone Database Schema

  ## Overview
  This migration creates the core database structure for a Paytm-like payment application
  with user profiles, digital wallets, and transaction tracking.

  ## 1. New Tables
  
  ### `profiles`
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text, unique) - User email
  - `full_name` (text) - User's full name
  - `phone` (text, unique) - Phone number for payments
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update
  
  ### `wallets`
  - `id` (uuid, primary key) - Wallet identifier
  - `user_id` (uuid, foreign key) - Owner of the wallet
  - `balance` (numeric) - Current wallet balance
  - `currency` (text) - Currency code (default: INR)
  - `is_active` (boolean) - Wallet status
  - `created_at` (timestamptz) - Wallet creation timestamp
  - `updated_at` (timestamptz) - Last balance update

  ### `transactions`
  - `id` (uuid, primary key) - Transaction identifier
  - `from_user_id` (uuid) - Sender user ID
  - `to_user_id` (uuid) - Receiver user ID
  - `amount` (numeric) - Transaction amount
  - `currency` (text) - Currency code
  - `type` (text) - Transaction type (transfer, deposit, withdrawal)
  - `status` (text) - Transaction status (pending, completed, failed)
  - `description` (text) - Transaction description/note
  - `created_at` (timestamptz) - Transaction timestamp
  - `completed_at` (timestamptz) - Completion timestamp

  ### `transaction_history`
  - `id` (uuid, primary key) - History record identifier
  - `transaction_id` (uuid, foreign key) - Related transaction
  - `user_id` (uuid) - User viewing this history
  - `wallet_balance_before` (numeric) - Balance before transaction
  - `wallet_balance_after` (numeric) - Balance after transaction
  - `created_at` (timestamptz) - Record timestamp

  ## 2. Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Profiles: Users can view and update their own profile
  - Wallets: Users can view their own wallet
  - Transactions: Users can view transactions they're involved in
  - Transaction History: Users can view their own history

  ## 3. Important Notes
  - All monetary amounts use numeric type for precision
  - Default currency is INR (Indian Rupees)
  - Transactions are immutable once completed
  - Balance updates are handled through Edge Functions for atomicity
  - Phone numbers must be unique for payment identification
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text NOT NULL,
  phone text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create wallets table
CREATE TABLE IF NOT EXISTS wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance numeric(15, 2) DEFAULT 0.00 CHECK (balance >= 0),
  currency text DEFAULT 'INR' NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE wallets ENABLE ROW LEVEL SECURITY;

-- Create transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  to_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  amount numeric(15, 2) NOT NULL CHECK (amount > 0),
  currency text DEFAULT 'INR' NOT NULL,
  type text NOT NULL CHECK (type IN ('transfer', 'deposit', 'withdrawal')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed')),
  description text DEFAULT '',
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Create transaction history table
CREATE TABLE IF NOT EXISTS transaction_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  wallet_balance_before numeric(15, 2) NOT NULL,
  wallet_balance_after numeric(15, 2) NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transaction_history ENABLE ROW LEVEL SECURITY;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_from_user ON transactions(from_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_to_user ON transactions(to_user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transaction_history_user ON transaction_history(user_id);
CREATE INDEX IF NOT EXISTS idx_transaction_history_transaction ON transaction_history(transaction_id);

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- RLS Policies for wallets
CREATE POLICY "Users can view own wallet"
  ON wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own wallet"
  ON wallets FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- RLS Policies for transactions
CREATE POLICY "Users can view own transactions"
  ON transactions FOR SELECT
  TO authenticated
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "Users can insert transactions"
  ON transactions FOR INSERT
  TO authenticated
  WITH CHECK (from_user_id = auth.uid());

-- RLS Policies for transaction history
CREATE POLICY "Users can view own transaction history"
  ON transaction_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_wallets_updated_at
  BEFORE UPDATE ON wallets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();