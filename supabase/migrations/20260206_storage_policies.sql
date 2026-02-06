-- Create the 'reports' bucket if it doesn't already exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO NOTHING;

-- COMMENTED OUT: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
-- This table is managed by Supabase storage API and RLS is already enabled.
-- Running this command manually can cause permission errors (42501).

-------------------------------------------------------------------------------
-- HELPER FUNCTIONS
-------------------------------------------------------------------------------

-- Helper to extract the organization ID from the storage path
-- Assumes path format: 'organization_id/...'
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[] LANGUAGE plpgsql AS $$
DECLARE
    _parts text[];
BEGIN
    SELECT string_to_array(name, '/') INTO _parts;
    RETURN _parts;
END
$$;

-------------------------------------------------------------------------------
-- POLICIES
-------------------------------------------------------------------------------

-- Drop policies if they exist to allow re-running this migration
DROP POLICY IF EXISTS "Org Admins can upload reports" ON storage.objects;
DROP POLICY IF EXISTS "Org members can view reports" ON storage.objects;
DROP POLICY IF EXISTS "Org Admins can update reports" ON storage.objects;
DROP POLICY IF EXISTS "Org Admins can delete reports" ON storage.objects;

-- 1. UPLOAD (INSERT) Policy
-- Allow Org Admins to upload files only to their own organization's folder
CREATE POLICY "Org Admins can upload reports"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('org_admin', 'super_admin')
  )
);

-- 2. VIEW (SELECT) Policy
-- Allow Org Admins (and members if we wanted) to view files in their org folder
CREATE POLICY "Org members can view reports"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

-- 3. UPDATE Policy
-- Allow Org Admins to update (overwrite) files in their org folder
CREATE POLICY "Org Admins can update reports"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('org_admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('org_admin', 'super_admin')
  )
);

-- 4. DELETE Policy
-- Allow Org Admins to delete files in their org folder
CREATE POLICY "Org Admins can delete reports"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'reports' AND
  (storage.foldername(name))[1] IN (
    SELECT organization_id::text 
    FROM public.users 
    WHERE id = auth.uid() 
    AND role IN ('org_admin', 'super_admin')
  )
);
