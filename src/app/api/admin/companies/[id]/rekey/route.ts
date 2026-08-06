import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateTokenString } from '@/lib/auth';

/**
 * POST /api/admin/companies/[id]/rekey
 * 특정 파트너 업체의 Client Secret 키 재발급 API
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id, 10);

    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'invalid_request', message: '유효하지 않은 업체 ID' }, { status: 400 });
    }

    const newSecret = generateTokenString('secret');

    await executeQuery(
      'UPDATE API_COMPANIES SET CLIENT_SECRET = :newSecret WHERE COMPANY_ID = :companyId',
      { newSecret, companyId },
      { autoCommit: true }
    );

    return NextResponse.json({
      success: true,
      message: '새로운 Client Secret이 발급되었습니다.',
      new_client_secret: newSecret,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '키 재발급 실패' }, { status: 500 });
  }
}
