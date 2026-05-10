import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { logs } = await req.json()

    if (!Array.isArray(logs) || logs.length === 0) {
      return new Response(
        JSON.stringify({ logged: 0, skipped: 0, failed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    let logged = 0
    let skipped = 0
    let failed = 0

    for (const log of logs) {
      try {
        const { error } = await supabase.from('alert_digest_log').insert({
          alert_type: log.alert_type,
          entity_type: log.entity_type,
          entity_id: log.entity_id,
          details: log.details ?? {},
          logged_at: new Date().toISOString(),
        })

        if (error) {
          // جدول alert_digest_log قد لا يكون موجوداً - تجاهل بصمت
          skipped++
        } else {
          logged++
        }
      } catch {
        failed++
      }
    }

    return new Response(
      JSON.stringify({ logged, skipped, failed }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err), logged: 0, skipped: 0, failed: 0 }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
