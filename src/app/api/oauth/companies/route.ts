import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateTokenString } from '@/lib/auth';

/**
 * POST /api/oauth/companies
 * 신규 파트너 업체 등록 및 Client ID / Secret 발급 API
 * Body: { company_name, business_number }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { company_name, business_number } = body;

    if (!company_name) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'company_name(업체명) 항목은 필수입니다.' },
        { status: 400 }
      );
    }

    const clientId = generateTokenString('partner');
    const clientSecret = generateTokenString('secret');

    await executeQuery(
      `INSERT INTO API_COMPANIES (COMPANY_NAME, BUSINESS_NUMBER, CLIENT_ID, CLIENT_SECRET)
       VALUES (:company_name, :business_number, :client_id, :client_secret)`,
      {
        company_name,
        business_number: business_number || '000-00-00000',
        client_id: clientId,
        client_secret: clientSecret,
      },
      { autoCommit: true }
    );

    return NextResponse.json({
      success: true,
      message: `[${company_name}] 업체의 OAuth 2.0 API 자격증명이 발급되었습니다.`,
      credentials: {
        company_name,
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: 'client_credentials',
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '업체 등록 실패' }, { status: 500 });
  }
}
