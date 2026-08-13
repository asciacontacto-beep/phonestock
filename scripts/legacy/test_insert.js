const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://nwymdjjigfrcfzynfaiy.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53eW1kamppZ2ZyY2Z6eW5mYWl5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgyNTU0NTYsImV4cCI6MjA5MzgzMTQ1Nn0.rpKg3JdUwAHIJ4H0tWXqbIAkow7gfRcwKY790IZc0dc';
const supabase = createClient(supabaseUrl, supabaseKey, { auth: { persistSession: false } });

async function main() {
  const saleData = {
    seller_id: '123e4567-e89b-12d3-a456-426614174000',
    seller_name: 'Test',
    brand: 'Apple',
    model: 'iPhone',
    storage: '128GB',
    color: 'Black',
    imei: '123456789012345',
    cost_price: 500,
    price: 1000,
    currency: 'USD',
    payments: [{ id: 'usd_cash', label: 'U$ Billete', amount: 500 }],
    customer: { name: 'Test' },
    notes: 'Test'
  };
  
  const { data, error } = await supabase.from('sales').insert([saleData]).select();
  console.log(error || data);
}

main();
