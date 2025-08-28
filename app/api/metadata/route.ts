import { NextResponse } from 'next/server';

export async function GET() {
  try {
    return NextResponse.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Server error' }, 
      { status: 500 }
    );
  }
}