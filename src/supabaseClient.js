import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://xqymncgeustfsbanmofu.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_QOC1yE3yRx42FFv1Kkcr-w_MnTh8ISt'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)