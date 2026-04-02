import { NextRequest, NextResponse } from 'next/server'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const AI_URL = process.env.AMLINE_AI_URL || 'https://chabroknet.de01.lexoya.com/ai/langchain'

const FALLBACK_REPLY =
  'سرویس هوش مصنوعی در این محیط در دسترس نیست. برای پاسخ‌های واقعی، OPENAI_API_KEY را تنظیم کنید یا اتصال به AMLINE_AI_URL را بررسی کنید.'

function buildContext(gscSummary: string): string {
  return `شما دستیار هوشمند Agent Windsurf Amline برای داشبورد سئو هستید. داده‌های زیر از گوگل سرچ کنسول (GSC) استخراج شده‌اند. به سوالات مدیر درباره عملکرد سئو، کلیک‌ها، نمایش‌ها، کلمات کلیدی، صفحات برتر و توصیه‌ها پاسخ دهید. پاسخ‌ها را به فارسی و مختصر و کاربردی بنویسید.

=== داده‌های GSC ===
${gscSummary}
=== پایان داده‌ها ===
`
}

async function callOpenAI(systemPrompt: string, message: string): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI: ${err}`)
  }

  const data = await res.json()
  return data?.choices?.[0]?.message?.content?.trim() ?? ''
}

async function callLegacyAI(systemPrompt: string, message: string): Promise<string> {
  const res = await fetch(AI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      system_prompt: systemPrompt,
      stream: false,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`AI service: ${err}`)
  }

  const data = await res.json()
  return (
    data?.response ??
    data?.message ??
    data?.output ??
    data?.text ??
    data?.result ??
    (typeof data === 'string' ? data : JSON.stringify(data))
  )
}

export async function POST(req: NextRequest) {
  try {
    const { message, gscContext } = await req.json()
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'message required' }, { status: 400 })
    }

    const systemPrompt = buildContext(gscContext || 'داده‌ای در دسترس نیست.')

    let reply = ''
    if (OPENAI_API_KEY) {
      try {
        reply = await callOpenAI(systemPrompt, message)
      } catch (e) {
        console.error('OpenAI chat error:', e)
        try {
          reply = await callLegacyAI(systemPrompt, message)
        } catch (e2) {
          console.error('Legacy AI chat error:', e2)
        }
      }
    } else {
      try {
        reply = await callLegacyAI(systemPrompt, message)
      } catch (e) {
        console.error('Legacy AI chat error:', e)
      }
    }

    const trimmed = (reply || '').trim()
    if (trimmed) {
      return NextResponse.json({ reply: trimmed })
    }
    return NextResponse.json({ reply: FALLBACK_REPLY, fallback: true })
  } catch (e) {
    console.error('AI chat error:', e)
    return NextResponse.json({ reply: FALLBACK_REPLY, fallback: true, error: 'ai_unavailable' })
  }
}
