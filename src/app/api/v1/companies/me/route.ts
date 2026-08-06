import { NextRequest, NextResponse } from 'next/server';
import { verifyCompanyToken } from '@/lib/auth';
import { executeQuery } from '@/lib/db';

/**
 * GET /api/v1/companies/me
 * 내 업체 정보 및 API 호출 로그 통계 조회
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const companyInfo = await verifyCompanyToken(authHeader);

    // 업체 기본 정보
    const companyResult = await executeQuery<any>(
      'SELECT COMPANY_ID, COMPANY_NAME, BUSINESS_NUMBER, CLIENT_ID, STATUS, DAILY_LIMIT, CREATED_AT FROM API_COMPANIES WHERE COMPANY_ID = :companyId',
      { companyId: companyInfo.companyId }
    );

    // 업체 API 호출 트랙 로그
    const logsResult = await executeQuery<any>(
      'SELECT ENDPOINT, HTTP_METHOD, STATUS_CODE, CREATED_AT FROM API_CALL_LOGS WHERE COMPANY_ID = :companyId ORDER BY LOG_ID DESC',
      { companyId: companyInfo.companyId }
    );

    return NextResponse.json({
      success: true,
      data: companyResult.rows ? companyResult.rows[0] : null,
      call_logs: logsResult.rows || [],
      token_info: {
        scope: companyInfo.scope,
        expires_at: companyInfo.expiresAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'unauthorized', message: error?.message || '인증 실패' }, { status: 401 });
  }
}
