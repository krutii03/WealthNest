-- Migration: Create admin tables for WealthNest Admin Portal
-- Safe to run multiple times (idempotent)

-- Create enum type for admin roles
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE admin_role AS ENUM ('superadmin', 'employee');
  END IF;
END $$;

-- Create enum type for admin log events
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_log_event') THEN
    CREATE TYPE admin_log_event AS ENUM ('login_success', 'login_failed', 'logout', 'action_performed');
  END IF;
END $$;

-- Create admins table
CREATE TABLE IF NOT EXISTS public.admins (
  admin_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  role admin_role DEFAULT 'employee' NOT NULL,
  supabase_user_id UUID NULL,
  password_hash VARCHAR(255) NULL,
  is_active BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT admins_supabase_user_id_fkey FOREIGN KEY (supabase_user_id) 
    REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create admin_log table
CREATE TABLE IF NOT EXISTS public.admin_log (
  id BIGSERIAL PRIMARY KEY,
  admin_id UUID NULL,
  email VARCHAR(255) NOT NULL,
  event admin_log_event NOT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT admin_log_admin_id_fkey FOREIGN KEY (admin_id) 
    REFERENCES public.admins(admin_id) ON DELETE SET NULL
);

-- Create admin_audit_log table (using log_id UUID as per user's schema)
CREATE TABLE IF NOT EXISTS public.admin_audit_log (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NULL,
  action VARCHAR(100) NOT NULL,
  details TEXT NULL,
  ip_address INET NULL,
  user_agent TEXT NULL,
  timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT admin_audit_log_admin_id_fkey FOREIGN KEY (admin_id) 
    REFERENCES public.admins(admin_id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);
CREATE INDEX IF NOT EXISTS idx_admins_supabase_user_id ON public.admins(supabase_user_id);
CREATE INDEX IF NOT EXISTS idx_admins_role ON public.admins(role);
CREATE INDEX IF NOT EXISTS idx_admins_is_active ON public.admins(is_active);

CREATE INDEX IF NOT EXISTS idx_admin_log_admin_id ON public.admin_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_log_email ON public.admin_log(email);
CREATE INDEX IF NOT EXISTS idx_admin_log_event ON public.admin_log(event);
CREATE INDEX IF NOT EXISTS idx_admin_log_timestamp ON public.admin_log(timestamp DESC);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_id ON public.admin_audit_log(admin_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_timestamp ON public.admin_audit_log(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON public.admin_audit_log(action);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger for admins table updated_at
DROP TRIGGER IF EXISTS update_admins_updated_at ON public.admins;
CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON public.admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE public.admins IS 'Admin users for WealthNest admin portal';
COMMENT ON TABLE public.admin_log IS 'Logs admin login attempts and events';
COMMENT ON TABLE public.admin_audit_log IS 'Audit trail for all admin-sensitive actions';

