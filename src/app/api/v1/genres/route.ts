import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

/**
 * GET /api/v1/genres
 * 장르 목록 조회 API
 */
export async function GET() {
  try {
    const result = await executeQuery('SELECT * FROM API_GENRES ORDER BY GENRE_ID ASC');
    return NextResponse.json({
      success: true,
      count: result.rows?.length || 0,
      data: result.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '장르 목록 조회 실패' }, { status: 500 });
  }
}
