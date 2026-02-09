import { NextResponse } from 'next/server';
import { searchVinyls } from '@/lib/db';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    
    if (!query) {
      return NextResponse.json({ error: 'Search query is required' }, { status: 400 });
    }
    
    const vinyls = searchVinyls(query);
    return NextResponse.json(vinyls);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to search vinyls' }, { status: 500 });
  }
}
