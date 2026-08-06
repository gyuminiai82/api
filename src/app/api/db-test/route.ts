import { NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

export async function GET() {
  try {
    // DB 연결 및 현재 시간 조회 테스트
    const result = await executeQuery('SELECT SYSDATE FROM DUAL');
    return NextResponse.json({
      success: true,
      message: 'Oracle Database 연결 성공!',
      data: result.rows,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        message: 'Database 연결 실패',
        error: error?.message || String(error),
      },
      { status: 500 }
    );
  }
}
