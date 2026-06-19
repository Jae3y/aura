import { createClient } from '@supabase/supabase-js';
import { config } from '../config';

// Server client uses the service-role key — bypasses RLS for backend writes.
// We intentionally omit the Database generic here: the typed safety layer is
// provided by the explicit return types on each db/* helper function instead,
// which avoids Supabase v2's strict index-signature constraint on GenericTable.
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);

// Browser/anon client — used only to verify user JWTs server-side.
export const supabaseAnon = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_ANON_KEY,
  {
    auth: { autoRefreshToken: false, persistSession: false },
  }
);
