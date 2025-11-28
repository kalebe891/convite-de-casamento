-- Drop existing restrictive policies and create new ones for complete-user-invite flow

-- ============================================================================
-- PROFILES TABLE - Allow service role to insert/update profiles
-- ============================================================================

-- Drop existing service role policy if exists
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Service role can update profiles" ON public.profiles;

-- Create comprehensive service role policies for profiles
CREATE POLICY "Service role can insert profiles" 
ON public.profiles
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Service role can update profiles" 
ON public.profiles
FOR UPDATE
USING (true)
WITH CHECK (true);

-- ============================================================================
-- USER_ROLES TABLE - Allow service role to insert roles
-- ============================================================================

-- Drop existing service role policy if exists
DROP POLICY IF EXISTS "Service role can insert user roles" ON public.user_roles;

-- Create service role policy for user_roles
CREATE POLICY "Service role can insert user roles" 
ON public.user_roles
FOR INSERT
WITH CHECK (true);

-- ============================================================================
-- PENDING_USERS TABLE - Allow service role to delete after completion
-- ============================================================================

-- Drop existing service role policy if exists
DROP POLICY IF EXISTS "Service role can delete pending users" ON public.pending_users;

-- Create service role policy for pending_users deletion
CREATE POLICY "Service role can delete pending users" 
ON public.pending_users
FOR DELETE
USING (true);