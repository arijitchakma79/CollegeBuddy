const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const supabaseUrl =
  process.env.SUPABASE_PROJECT_URL || process.env.SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_API_KEY || process.env.SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

// Verify Connection
(async () => {
  try {
    const { error } = await supabase
      .from('users')
      .select('count', { count: 'exact', head: true });
    if (error) throw error;
    console.log('Supabase connection successful');
  } catch (err) {
    console.error('Supabase connection failed:', err.message);
  }
})();

module.exports = supabase;