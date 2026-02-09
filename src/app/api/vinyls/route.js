import { NextResponse } from 'next/server';
import { getAllVinyls, createVinyl } from '@/lib/db';

export async function GET() {
  try {
    const vinyls = getAllVinyls();
    return NextResponse.json(vinyls);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vinyls' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    
    if (!data.title || !data.artist) {
      return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
    }
    
    const vinyl = createVinyl(data);
    return NextResponse.json(vinyl, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create vinyl' }, { status: 500 });
  }
}
