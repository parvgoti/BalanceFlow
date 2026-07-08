import { createClient } from '@supabase/supabase-js'

const url = 'https://swhgeumzceinlagtlzhm.supabase.co'
const key = 'sb_publishable_mdAD1GOQDTUGMdoPzcTCgQ_rMc6RwX6'

const supabase = createClient(url, key)

async function run() {
  const { data, error } = await supabase.from('group_requests').select('*').limit(5)
  console.log('Data:', data)
  console.log('Error:', error)
}

run()
