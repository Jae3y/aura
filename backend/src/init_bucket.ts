import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') });
dotenv.config({ override: true });

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_KEY || 'dummy'
);

async function initBucket() {
  const { data, error } = await supabaseAdmin.storage.createBucket('reports', {
    public: true,
  });
  if (error) {
    console.error('Error creating bucket:', error);
  } else {
    console.log('Bucket created:', data);
  }
}

initBucket();
