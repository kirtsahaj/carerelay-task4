import { getUsageStats } from '../../../lib/supabase-rest';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const stats = await getUsageStats();
    return Response.json({
      handoffsOrganised: stats.count,
      actionsSurfaced: stats.actions,
    });
  } catch (error) {
    console.error('CareRelay stats error:', error);
    return Response.json({ handoffsOrganised: 0, actionsSurfaced: 0 }, { status: 200 });
  }
}
