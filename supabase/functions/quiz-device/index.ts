import { corsHeaders } from 'npm:@supabase/supabase-js@^2/cors'
import { createClient } from 'npm:@supabase/supabase-js@^2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const DEVICE_TABLE = 'quiz_resena_dispositivos'
const RESULT_TABLE = 'quiz_resena_resultados'

const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } })
const cleanStudent = (v: unknown) => String(v ?? '').trim().replace(/\s+/g, ' ').toLowerCase()
const cleanDevice = (v: unknown) => String(v ?? '').trim()
const reply = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return reply({ ok: true })
  if (req.method !== 'POST') return reply({ ok: false, error: 'Método no permitido' }, 405)
  try {
    const body = await req.json()
    const student = cleanStudent(body.student)
    const deviceId = cleanDevice(body.device_id)
    if (student.length < 2) return reply({ ok: false, error: 'Estudiante inválido' }, 400)
    if (!/^MM-[A-Z0-9-]{10,70}$/.test(deviceId)) return reply({ ok: false, error: 'ID de dispositivo inválido' }, 400)

    const { data: result, error: resultError } = await admin.from(RESULT_TABLE).select('id').eq('student', student).maybeSingle()
    if (resultError) throw resultError
    if (result) return reply({ ok: false, authorized: false, status: 'completed', error: 'Este estudiante ya tiene un resultado registrado.' }, 409)

    const { data: existing, error: lookupError } = await admin.from(DEVICE_TABLE).select('student, device_id').eq('student', student).maybeSingle()
    if (lookupError) throw lookupError

    if (!existing) {
      const { data: owner, error: ownerError } = await admin.from(DEVICE_TABLE).select('student').eq('device_id', deviceId).maybeSingle()
      if (ownerError) throw ownerError
      if (owner && owner.student !== student) return reply({ ok: false, authorized: false, status: 'blocked', error: 'Este dispositivo ya está vinculado a otro estudiante.' }, 403)
      const { error: insertError } = await admin.from(DEVICE_TABLE).insert({ student, device_id: deviceId })
      if (insertError) {
        if (insertError.code === '23505') {
          const { data: retry } = await admin.from(DEVICE_TABLE).select('student, device_id').eq('student', student).maybeSingle()
          if (retry?.device_id === deviceId) return reply({ ok: true, authorized: true, status: 'recognized' })
          return reply({ ok: false, authorized: false, status: 'blocked', error: 'Este estudiante ya está vinculado a otro dispositivo.' }, 403)
        }
        throw insertError
      }
      return reply({ ok: true, authorized: true, status: 'registered' })
    }

    if (existing.device_id === deviceId) return reply({ ok: true, authorized: true, status: 'recognized' })
    return reply({ ok: false, authorized: false, status: 'blocked', error: 'Este estudiante está vinculado a otro dispositivo.' }, 403)
  } catch (error) {
    console.error('quiz-device', error)
    return reply({ ok: false, error: error instanceof Error ? error.message : String(error) }, 500)
  }
})
