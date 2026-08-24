-- ==============================================================================
-- React Editor Studio: Subscription-Based Block Permissions Schema
-- ==============================================================================

-- 1. Subscription Plans Table
CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- 'free', 'pro', 'enterprise'
  display_name TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Initial Plans Seed
INSERT INTO subscription_plans (name, slug, display_name, sort_order)
VALUES
  ('Free Plan', 'free', 'Free', 1),
  ('Pro Plan', 'pro', 'Pro', 2),
  ('Enterprise Plan', 'enterprise', 'Enterprise', 3)
ON CONFLICT (slug) DO UPDATE
SET
  name = EXCLUDED.name,
  display_name = EXCLUDED.display_name,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW();

-- 2. Block Permissions Table (Master registry of editor blocks)
CREATE TABLE IF NOT EXISTS block_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  block_type TEXT UNIQUE NOT NULL, -- e.g. 'paragraph', 'gallery', 'election'
  block_label TEXT NOT NULL,
  category TEXT NOT NULL,          -- 'text', 'media', 'layout', 'embed', 'content'
  is_enabled BOOLEAN DEFAULT TRUE, -- Global on/off toggle for Super Admin
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Plan-Block Permissions (Junction Table)
CREATE TABLE IF NOT EXISTS plan_block_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES subscription_plans(id) ON DELETE CASCADE,
  block_permission_id UUID NOT NULL REFERENCES block_permissions(id) ON DELETE CASCADE,
  is_allowed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plan_id, block_permission_id)
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_subscription_plans_slug ON subscription_plans(slug);
CREATE INDEX IF NOT EXISTS idx_block_permissions_type ON block_permissions(block_type);
CREATE INDEX IF NOT EXISTS idx_plan_block_permissions_plan ON plan_block_permissions(plan_id);
CREATE INDEX IF NOT EXISTS idx_plan_block_permissions_block ON plan_block_permissions(block_permission_id);

-- Enable RLS (Row Level Security) - customize according to your auth policies
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE block_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE plan_block_permissions ENABLE ROW LEVEL SECURITY;

-- Default Read Policies (Public read for active configurations)
CREATE POLICY "Allow public read on subscription_plans"
  ON subscription_plans FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on block_permissions"
  ON block_permissions FOR SELECT
  USING (true);

CREATE POLICY "Allow public read on plan_block_permissions"
  ON plan_block_permissions FOR SELECT
  USING (true);
