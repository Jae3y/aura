const { createClient } = require('@supabase/supabase-js');
const sb = createClient(
  'https://alqgntqtugmzcglnisrx.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFscWdudHF0dWdtemNnbG5pc3J4Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MTg2NDUwNywiZXhwIjoyMDk3NDQwNTA3fQ.cGuVoqwndhD4963ijHhscLaU3jPhQuIBw7KttmjgKuE'
);
sb.from('profiles').select('id').limit(1).then(r => {
  if (r.error) {
    console.log('ERROR:', JSON.stringify(r.error));
  } else {
    console.log('OK - profiles table EXISTS, count:', r.data.length);
  }
}).catch(e => console.error(e.message));
