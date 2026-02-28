-- ==========================================
-- Ba Na Hoc - E-commerce Layer (Domain A & B)
-- ==========================================
-- 1. Transaction Log
-- 2. Shop Items
-- 3. Inventory
-- 4. RPC: purchase_item

CREATE TYPE transaction_type AS ENUM ('lesson_reward', 'shop_purchase', 'daily_bonus', 'admin_grant');
CREATE TYPE currency_type AS ENUM ('gongs', 'gems');

-- ==========================================
-- TABLE: transaction_log (Domain A)
-- Audit trail for all currency changes
-- ==========================================
CREATE TABLE public.transaction_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    amount INT NOT NULL, -- Negative for purchases, positive for rewards
    currency currency_type NOT NULL,
    type transaction_type NOT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quickly retrieving user's history
CREATE INDEX idx_transaction_log_user_id ON public.transaction_log(user_id);

-- Enable RLS
ALTER TABLE public.transaction_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transaction log."
    ON public.transaction_log FOR SELECT
    USING (auth.uid() = user_id);
-- Insert/Update is restricted strictly to security definer functions / backend service role.

-- ==========================================
-- TABLE: shop_items (Domain B)
-- Virtual goods catalog
-- ==========================================
CREATE TABLE public.shop_items (
    id TEXT PRIMARY KEY, -- Slug format like 'ao-truyen-thong', 'non-la'
    name TEXT NOT NULL,
    price_gongs INT NOT NULL DEFAULT 0 CHECK (price_gongs >= 0),
    price_gems INT NOT NULL DEFAULT 0 CHECK (price_gems >= 0),
    category TEXT NOT NULL,
    assets JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_shop_items_updated_at
BEFORE UPDATE ON public.shop_items
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active shop items."
    ON public.shop_items FOR SELECT
    USING (is_active = true);

-- ==========================================
-- TABLE: inventory (Domain A)
-- The User's Warehouse
-- ==========================================
CREATE TABLE public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    item_id TEXT NOT NULL REFERENCES public.shop_items(id) ON DELETE RESTRICT,
    is_equipped BOOLEAN NOT NULL DEFAULT false,
    acquired_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Rule: Users only own one of each unique item
    UNIQUE(user_id, item_id)
);

CREATE INDEX idx_inventory_user_item ON public.inventory(user_id, item_id);

-- Enable RLS
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own inventory."
    ON public.inventory FOR SELECT
    USING (auth.uid() = user_id);
-- Only functions/admins can insert/update

-- ==========================================
-- FUNCTION: purchase_item
-- Strict Atomic Transaction for "E-Commerce" reliability
-- ==========================================
CREATE OR REPLACE FUNCTION public.purchase_item(p_user_id UUID, p_item_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Exceeds RLS limits to safely deduct profiles and insert inventory
AS $$
DECLARE
    v_item RECORD;
    v_user_gongs INT;
BEGIN
    -- 1. Check if item exists, is active, and fetch its price
    SELECT * INTO v_item FROM public.shop_items WHERE id = p_item_id AND is_active = true;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Item not found or not currently active.';
    END IF;

    -- 2. Check if user already owns it (Optional depending on design, but usually enforced for unique digital goods)
    IF EXISTS (SELECT 1 FROM public.inventory WHERE user_id = p_user_id AND item_id = p_item_id) THEN
        RAISE EXCEPTION 'User already owns this item.';
    END IF;

    -- 3. Strict Locking: Lock the user's profile row to prevent Race Conditions (Double Spend)
    SELECT gongs INTO v_user_gongs FROM public.profiles WHERE id = p_user_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User profile not found.';
    END IF;

    -- 4. Check Funds
    IF v_user_gongs < v_item.price_gongs THEN
        RAISE EXCEPTION 'Insufficient Gongs.';
    END IF;

    -- 5. Deduct Currency (This is safe due to FOR UPDATE row lock and CHECK constraints on profiles)
    UPDATE public.profiles 
    SET gongs = gongs - v_item.price_gongs 
    WHERE id = p_user_id;

    -- 6. Grant Item to Inventory
    INSERT INTO public.inventory (user_id, item_id) 
    VALUES (p_user_id, p_item_id);

    -- 7. Audit Logging
    IF v_item.price_gongs > 0 THEN
        INSERT INTO public.transaction_log (user_id, amount, currency, type, metadata)
        VALUES (
            p_user_id, 
            -v_item.price_gongs, 
            'gongs', 
            'shop_purchase', 
            jsonb_build_object('item_id', p_item_id, 'item_name', v_item.name)
        );
    END IF;

    RETURN TRUE;
END;
$$;
