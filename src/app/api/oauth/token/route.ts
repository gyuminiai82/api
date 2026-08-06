import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateTokenString } from '@/lib/auth';

/**
 * POST /api/oauth/token
 * B2B 업체 전용 OAuth 2.0 토큰 발급 엔드포인트
 * Body: { grant_type: "client_credentials", client_id, client_secret }
 */
export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get('content-type') || '';
    let body: any = {};

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await req.formData();
      body = Object.fromEntries(formData.entries());
    } else {
      body = await req.json().catch(() => ({}));
    }

    const { grant_type, client_id, client_secret } = body;

    if (!grant_type || !client_id || !client_secret) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'grant_type, client_id, client_secret 필수 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    if (grant_type !== 'client_credentials') {
      return NextResponse.json(
        { error: 'unsupported_grant_type', error_description: 'B2B 업체 인증은 grant_type="client_credentials" 방식을 사용합니다.' },
        { status: 400 }
      );
    }

    // 1. 업체 (API_COMPANIES) 검증
    const companyResult = await executeQuery<any>(
      'SELECT * FROM API_COMPANIES WHERE CLIENT_ID = :client_id AND CLIENT_SECRET = :client_secret',
      { client_id, client_secret }
    );

    if (!companyResult.rows || companyResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'invalid_client', error_description: '인증에 실패한 client_id 또는 client_secret입니다.' },
        { status: 401 }
      );
    }

    const company = companyResult.rows[0];

    if (company.STATUS !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'unauthorized_client', error_description: '해당 업체 계정이 비활성화 상태입니다. 관리자에게 문의하세요.' },
        { status: 403 }
      );
    }

    // 2. Access Token (24시간 = 86,400초) 및 Refresh Token (30일 = 2,592,000초) 발급
    const accessToken = generateTokenString('comp_at');
    const refreshToken = generateTokenString('comp_rt');
    const accessExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24시간
    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30일

    await executeQuery(
      `INSERT INTO API_COMPANY_TOKENS 
       (ACCESS_TOKEN, REFRESH_TOKEN, COMPANY_ID, CLIENT_ID, SCOPE, ACCESS_TOKEN_EXPIRES_AT, IS_REVOKED)
       VALUES (:access_token, :refresh_token, :company_id, :client_id, 'read,write', :expires_at, 'N')`,
      {
        access_token: accessToken,
        refresh_token: refreshToken,
        company_id: company.COMPANY_ID,
        client_id,
        expires_at: accessExpiresAt,
      },
      { autoCommit: true }
    );

    return NextResponse.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 86400, // 24시간 (초 단위)
      refresh_token: refreshToken,
      refresh_token_expires_in: 2592000, // 30일 (초 단위)
      scope: 'read,write',
      company_name: company.COMPANY_NAME,
      company_id: company.COMPANY_ID,
    });
  } catch (error: any) {
    console.error('B2B OAuth Token Issue Error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: error?.message || '업체 토큰 발급 실패' },
      { status: 500 }
    );
  }
}
