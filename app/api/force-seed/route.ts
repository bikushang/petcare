import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const apiBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.API_BASE_URL ||
    'http://localhost:3001';

  try {
    const res = await fetch(`${apiBase}/api/force-seed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return NextResponse.json(
        { error: data.message || `Backend returned ${res.status}` },
        { status: res.status },
      );
    }

    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : 'Could not reach the backend server. Make sure the API server is running.',
      },
      { status: 502 },
    );
  }
}

export async function POST() {
  return GET();
}
