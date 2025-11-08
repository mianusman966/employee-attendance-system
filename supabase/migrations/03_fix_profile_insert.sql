-- Allow service role to insert profiles (for user creation from admin API)
-- This policy allows inserts when bypassing RLS with service role
CREATE POLICY "Service role can insert profiles"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Also allow admins to insert profiles
CREATE POLICY "Admins can insert profiles"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
