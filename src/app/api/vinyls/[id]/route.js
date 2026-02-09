import { NextResponse } from 'next/server';
import { getVinylById, updateVinyl, deleteVinyl } from '@/lib/db';

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const vinyl = getVinylById(id);
    
    if (!vinyl) {
      return NextResponse.json({ error: 'Vinyl not found' }, { status: 404 });
    }
    
    return NextResponse.json(vinyl);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch vinyl' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const data = await request.json();
    
    const existing = getVinylById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Vinyl not found' }, { status: 404 });
    }
    
    if (!data.title || !data.artist) {
      return NextResponse.json({ error: 'Title and artist are required' }, { status: 400 });
    }
    
    const vinyl = updateVinyl(id, data);
    return NextResponse.json(vinyl);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update vinyl' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    const vinyl = getVinylById(id);
    
    if (!vinyl) {
      return NextResponse.json({ error: 'Vinyl not found' }, { status: 404 });
    }
    
    deleteVinyl(id);
    return NextResponse.json({ message: 'Vinyl deleted successfully' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete vinyl' }, { status: 500 });
  }
}
