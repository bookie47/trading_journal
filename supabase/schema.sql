-- ========================================================================
-- Supabase Schema for Trading Journal System
-- Run this SQL in your Supabase SQL Editor to set up tables, RLS, and Storage
-- ========================================================================

-- 1. Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Portfolios Table
CREATE TABLE IF NOT EXISTS public.portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    initial_balance NUMERIC(15, 2) NOT NULL DEFAULT 10000.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    description TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Strategies Table
CREATE TABLE IF NOT EXISTS public.strategies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    color VARCHAR(30) DEFAULT '#6366f1',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Trades Table
CREATE TABLE IF NOT EXISTS public.trades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID NOT NULL REFERENCES public.portfolios(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    asset VARCHAR(50) NOT NULL, -- e.g., 'EURUSD', 'BTCUSDT', 'XAUUSD', 'AAPL'
    side VARCHAR(10) NOT NULL CHECK (side IN ('long', 'short')),
    entry_price NUMERIC(18, 6) NOT NULL,
    sl NUMERIC(18, 6),
    tp NUMERIC(18, 6),
    exit_price NUMERIC(18, 6),
    size NUMERIC(18, 4) NOT NULL DEFAULT 1.0, -- Lot / Unit size
    fee NUMERIC(12, 2) DEFAULT 0.00,
    entry_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    exit_time TIMESTAMPTZ,
    strategy_id UUID REFERENCES public.strategies(id) ON DELETE SET NULL,
    emotion_tag VARCHAR(50), -- e.g. 'Disciplined', 'FOMO', 'Revenge', 'Greedy', 'Patient', 'Hesitant'
    notes TEXT,
    lessons_learned TEXT,
    status VARCHAR(10) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'cancelled')),
    pnl NUMERIC(15, 2) DEFAULT 0.00,
    pnl_percentage NUMERIC(8, 2) DEFAULT 0.00,
    r_multiple NUMERIC(8, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Trade Images Table
CREATE TABLE IF NOT EXISTS public.trade_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    trade_id UUID NOT NULL REFERENCES public.trades(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    type VARCHAR(20) NOT NULL DEFAULT 'setup' CHECK (type IN ('setup', 'result', 'other')),
    caption TEXT,
    uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_trades_portfolio ON public.trades(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_trades_user ON public.trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON public.trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_entry_time ON public.trades(entry_time DESC);
CREATE INDEX IF NOT EXISTS idx_trade_images_trade ON public.trade_images(trade_id);

-- 7. Enable Row Level Security (RLS)
ALTER TABLE public.portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strategies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trade_images ENABLE ROW LEVEL SECURITY;

-- 8. RLS Policies
-- Portfolios
CREATE POLICY "Users can manage their own portfolios" 
ON public.portfolios FOR ALL 
USING (auth.uid() = user_id);

-- Strategies
CREATE POLICY "Users can manage their own strategies" 
ON public.strategies FOR ALL 
USING (auth.uid() = user_id);

-- Trades
CREATE POLICY "Users can manage their own trades" 
ON public.trades FOR ALL 
USING (auth.uid() = user_id);

-- Trade Images
CREATE POLICY "Users can manage images for their trades" 
ON public.trade_images FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM public.trades 
        WHERE public.trades.id = public.trade_images.trade_id 
        AND public.trades.user_id = auth.uid()
    )
);

-- 9. Storage Bucket Setup (Storage bucket for screenshots)
-- Insert storage bucket if not exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('trade-images', 'trade-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS Policies
CREATE POLICY "Public Read Access on trade-images" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'trade-images');

CREATE POLICY "Authenticated users can upload trade images" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'trade-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their trade images" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'trade-images' AND auth.uid() = owner);
