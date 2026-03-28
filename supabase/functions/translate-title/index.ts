/**
 * translate-title — LIVORIA Edge Function
 *
 * Menerjemahkan judul anime/donghua ke Bahasa Indonesia menggunakan Groq AI.
 * Menggunakan GROQ_API_KEY dari Supabase secrets.
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
}

const GROQ_MODELS = [
  'llama-3.3-70b-versatile',
  'llama3-8b-8192',
  'gemma2-9b-it',
]

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY')
    if (!GROQ_API_KEY) {
      return new Response(JSON.stringify({ error: 'GROQ_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    const body = await req.json()
    const { titles, mediaType = 'anime' } = body

    if (!titles || !Array.isArray(titles) || titles.length === 0) {
      return new Response(JSON.stringify({ error: 'titles array required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    // Build translation entries
    const toTranslate = titles.slice(0, 10) // max 10 at a time
    const isJapanese = mediaType === 'anime'
    const mediaLabel = isJapanese ? 'anime Jepang' : 'donghua China'

    const titlesInfo = toTranslate.map((t: any, i: number) => {
      const parts = []
      if (t.title_english) parts.push(`EN: "${t.title_english}"`)
      if (t.title_romaji) parts.push(`${isJapanese ? 'Romaji' : 'Pinyin'}: "${t.title_romaji}"`)
      if (t.title_native) parts.push(`Native: "${t.title_native}"`)
      if (t.stored_title && t.stored_title !== t.title_english) parts.push(`Stored: "${t.stored_title}"`)
      return `${i + 1}. ${parts.join(' | ') || `"${t.stored_title || 'Unknown'}"`}`
    }).join('\n')

    const prompt = `Kamu adalah penerjemah judul ${mediaLabel} ke Bahasa Indonesia yang ahli.

JUDUL YANG PERLU DITERJEMAHKAN:
${titlesInfo}

TUGAS: Berikan judul TERBAIK dalam Bahasa Indonesia untuk setiap ${mediaLabel}.

ATURAN:
[WAJIB TERJEMAHKAN jika judulnya berupa kalimat/frasa deskriptif:]
• "That Time I Got Reincarnated as a Slime" → "Saat Aku Bereinkarnasi Menjadi Slime"
• "The Rising of the Shield Hero" → "Kebangkitan Pahlawan Perisai"
• "The Daily Life of the Immortal King" → "Kehidupan Sehari-hari Raja Abadi"
• "So I'm a Spider, So What?" → "Jadi Aku Seekor Laba-laba, Terus Kenapa?"
• "Mushoku Tensei: Jobless Reincarnation" → "Mushoku Tensei: Reinkarnasi Pengangguran"

[PERTAHANKAN nama asli HANYA jika merupakan nama diri murni:]
• "Naruto", "Bleach", "One Piece", "Dragon Ball" → tetap
• "Sword Art Online", "Attack on Titan" → tetap (franchise besar)

[KUALITAS:]
• Gunakan bahasa Indonesia yang natural, bukan terjemahan kaku
• Pertahankan nama karakter dalam judul
• Panjang terjemahan tidak boleh > 2x judul asli

Jawab HANYA dengan JSON array. Contoh: ["Judul ID 1", "Judul ID 2"]
Jangan tulis penjelasan apapun.`

    for (const model of GROQ_MODELS) {
      try {
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model,
            max_tokens: 500,
            temperature: 0.15,
            messages: [{ role: 'user', content: prompt }],
          }),
        })

        if (!res.ok) continue
        const data = await res.json()
        const text = (data.choices?.[0]?.message?.content || '[]').trim().replace(/```json|```/g, '')
        
        const start = text.indexOf('[')
        const end = text.lastIndexOf(']')
        if (start === -1 || end === -1) continue
        
        const translated: string[] = JSON.parse(text.substring(start, end + 1))

        if (Array.isArray(translated) && translated.length > 0) {
          // Build result map
          const result: Record<string, string> = {}
          toTranslate.forEach((t: any, i: number) => {
            const key = t.stored_title || t.title_english || t.title_romaji || ''
            if (translated[i]?.trim()) {
              result[key] = translated[i].trim()
                .replace(/^["'`«»„"‟'‛]+|["'`«»„"‟'‛]+$/g, '')
                .replace(/^(Jawaban|Terjemahan|Judul)[:\s-]+/i, '')
            }
          })

          return new Response(JSON.stringify({ translations: result }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          })
        }
      } catch {
        continue
      }
    }

    return new Response(JSON.stringify({ translations: {} }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})
