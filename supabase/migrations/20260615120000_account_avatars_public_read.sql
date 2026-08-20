/*
  Allow anonymous reads for public account avatar URLs (browser / Next.js Image).
*/

CREATE POLICY "Anyone can read account avatars"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'account-avatars');
