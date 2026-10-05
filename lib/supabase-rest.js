function env() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_KEY;
  if (!url || !key) {
    throw new Error('Supabase environment variables are not configured.');
  }
  return { url: url.replace(/\/$/, ''), key };
}

function headers(extra = {}) {
  const { key } = env();
  return {
    apikey: key,
    'Content-Type': 'application/json',
    ...extra,
  };
}

export async function insertHandoff(row) {
  const { url } = env();
  const response = await fetch(`${url}/rest/v1/handoffs`, {
    method: 'POST',
    headers: headers({ Prefer: 'return=minimal' }),
    body: JSON.stringify(row),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase insert failed: ${response.status} ${detail}`);
  }
}

export async function countVisitorRequests(visitorId) {
  const { url } = env();
  const params = new URLSearchParams({
    select: 'id',
    visitor_id: `eq.${visitorId}`,
    limit: '1',
  });

  const response = await fetch(`${url}/rest/v1/handoffs?${params}`, {
    method: 'GET',
    headers: headers({ Prefer: 'count=exact', Range: '0-0' }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase count failed: ${response.status} ${detail}`);
  }

  const contentRange = response.headers.get('content-range') || '*/0';
  return Number(contentRange.split('/')[1]) || 0;
}

export async function getUsageStats() {
  const { url } = env();
  const params = new URLSearchParams({
    select: 'action_count',
    refused: 'eq.false',
    limit: '1000',
  });

  const response = await fetch(`${url}/rest/v1/handoffs?${params}`, {
    method: 'GET',
    headers: headers({ Prefer: 'count=exact' }),
    cache: 'no-store',
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase stats failed: ${response.status} ${detail}`);
  }

  const rows = await response.json();
  const contentRange = response.headers.get('content-range') || `0-${Math.max(rows.length - 1, 0)}/${rows.length}`;
  const count = Number(contentRange.split('/')[1]) || rows.length;
  const actions = rows.reduce((sum, row) => sum + (Number(row.action_count) || 0), 0);
  return { count, actions };
}
