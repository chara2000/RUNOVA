import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

interface AiRequestBody {
  prompt: string;
  athleteContext: {
    full_name: string;
    vo2_max: number | null;
    threshold_pace: string | null;
    acwr: number | null;
    ready_score: number | null;
    compliance_rate: number | null;
    chronic_load: number | null;
    acute_load: number | null;
    hr_max: number | null;
    hr_resting: number | null;
    level: string | null;
  };
  statsContext: {
    vol7: number;
    vol30: number;
    sessions7: number;
    avgHr7: number;
    lastActivityTitle: string;
    lastActivityPace: string;
    lastActivityDist: number;
    atRiskCount: number;
    todayWorkoutTitle: string;
    todayWorkoutDist: number;
    todayWorkoutPace: string;
  };
}

const SYSTEM_PROMPT = `You are RUNOVA Intelligence, an elite AI sports coach for endurance runners.
You respond in the same language the user writes in (Spanish by default).
You are concise, data-driven, and professional. Use metric units.
When responding, structure your answer in 2-3 short paragraphs maximum.
Never fabricate data — only reference the athlete context provided.
Always sign-post key metrics with numbers.`;

function buildUserPrompt(body: AiRequestBody): string {
  const { prompt, athleteContext: a, statsContext: s } = body;
  return `
ATHLETE PROFILE:
Name: ${a.full_name}
VO₂ max: ${a.vo2_max ?? 'N/A'} ml/kg/min
Threshold pace: ${a.threshold_pace ?? 'N/A'} /km
HR max: ${a.hr_max ?? 'N/A'} bpm / HR resting: ${a.hr_resting ?? 'N/A'} bpm
Level: ${a.level ?? 'N/A'}
Ready Score: ${a.ready_score ?? 'N/A'}/100
ACWR: ${a.acwr?.toFixed(2) ?? 'N/A'}
Compliance: ${a.compliance_rate ? Math.round(a.compliance_rate) + '%' : 'N/A'}
CTL (chronic load): ${Math.round(a.chronic_load ?? 0)} / ATL (acute load): ${Math.round(a.acute_load ?? 0)}

WEEKLY & MONTHLY STATS:
Last 7 days: ${s.vol7} km in ${s.sessions7} session(s), avg HR ${s.avgHr7 || 'N/A'} bpm
Last 30 days: ${s.vol30} km
Last activity: "${s.lastActivityTitle}" — ${s.lastActivityDist} km at ${s.lastActivityPace || 'N/A'} /km
At-risk athletes in club: ${s.atRiskCount}
Today's planned workout: "${s.todayWorkoutTitle}" — ${s.todayWorkoutDist} km target @ ${s.todayWorkoutPace || 'N/A'} /km

ATHLETE QUESTION:
${prompt}
`.trim();
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'OpenAI API key not configured on server.' },
        { status: 500 }
      );
    }

    const body: AiRequestBody = await req.json();

    if (!body.prompt?.trim()) {
      return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(body) },
        ],
        max_tokens: 350,
        temperature: 0.4,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: (err as { error?: { message?: string } }).error?.message || 'OpenAI request failed' },
        { status: response.status }
      );
    }

    const data = await response.json() as {
      choices: Array<{ message: { content: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim() ?? '';

    return NextResponse.json({ text });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
