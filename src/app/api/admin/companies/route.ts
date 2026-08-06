import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateTokenString } from '@/lib/auth';

/**
 * GET /api/admin/companies
 * 관리자용 전체 파트너 업체 목록 및 통계 조회
 */
export async function GET() {
  try {
    const companiesResult = await executeQuery<any>(
      `SELECT c.*, 
              (SELECT COUNT(*) FROM API_CALL_LOGS l WHERE l.COMPANY_ID = c.COMPANY_ID) AS TOTAL_CALLS
       FROM API_COMPANIES c
       ORDER BY c.COMPANY_ID DESC`
    );

    const logsResult = await executeQuery<any>(
      `SELECT l.LOG_ID, l.ENDPOINT, l.HTTP_METHOD, l.STATUS_CODE, l.CREATED_AT, c.COMPANY_NAME
       FROM API_CALL_LOGS l
       JOIN API_COMPANIES c ON l.COMPANY_ID = c.COMPANY_ID
       ORDER BY l.LOG_ID DESC`
    );

    return NextResponse.json({
      success: true,
      companies: companiesResult.rows || [],
      recentLogs: logsResult.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '관리자 업체 목록 조회 실패' }, { status: 500 });
  }
}

/**
 * POST /api/admin/companies
 * 관리자 신규 파트너 업체 등록 및 Client ID / Secret 발급
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { company_name, business_number, daily_limit } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'company_name(업체명) 항목은 필수입니다.' },
        { status: 400 }
      );
    }

    const clientId = generateTokenString('partner');
    const clientSecret = generateTokenString('secret');

    await executeQuery(
      `INSERT INTO API_COMPANIES (COMPANY_NAME, BUSINESS_NUMBER, CLIENT_ID, CLIENT_SECRET, DAILY_LIMIT, STATUS)
       VALUES (:company_name, :business_number, :client_id, :client_secret, :daily_limit, 'ACTIVE')`,
      {
        company_name,
        business_number: business_number || '000-00-00000',
        client_id: clientId,
        client_secret: clientSecret,
        daily_limit: daily_limit || 10000,
      },
      { autoCommit: true }
    );

    return NextResponse.json({
      success: true,
      message: `[${company_name}] 파트너 업체가 성공적으로 등록되었습니다.`,
      company: {
        company_name,
        business_number,
        client_id: clientId,
        client_secret: clientSecret,
        daily_limit: daily_limit || 10000,
        status: 'ACTIVE',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '업체 등록 실패' }, { status: 500 });
  }
}
