import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateTokenString, generateAccessTokenJWT } from '@/lib/auth';

/**
 * POST /api/oauth/token
 * B2B 업체 전용 OAuth 2.0 토큰 발급 / 갱신 엔드포인트
 * 
 * 1) Client Credentials 방식:
 *    Body: { grant_type: "client_credentials", client_id, client_secret }
 * 
 * 2) Refresh Token 갱신 방식:
 *    Body: { grant_type: "refresh_token", refresh_token, client_id, client_secret }
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

    const { grant_type, client_id, client_secret, refresh_token } = body;

    if (!grant_type) {
      return NextResponse.json(
        { error: 'invalid_request', error_description: 'grant_type 항목이 누락되었습니다.' },
        { status: 400 }
      );
    }

    // ==========================================
    // 1. Refresh Token 방식 (grant_type === 'refresh_token')
    // ==========================================
    if (grant_type === 'refresh_token') {
      if (!refresh_token) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'refresh_token 파라미터가 누락되었습니다.' },
          { status: 400 }
        );
      }

      // Refresh Token 조회
      const tokenResult = await executeQuery<any>(
        `SELECT t.*, c.COMPANY_NAME, c.STATUS AS COMPANY_STATUS 
         FROM API_COMPANY_TOKENS t
         JOIN API_COMPANIES c ON t.COMPANY_ID = c.COMPANY_ID
         WHERE t.REFRESH_TOKEN = :refresh_token`,
        { refresh_token }
      );

      if (!tokenResult.rows || tokenResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: '유효하지 않거나 존재하지 않는 refresh_token입니다.' },
          { status: 400 }
        );
      }

      const tokenRow = tokenResult.rows[0];

      if (tokenRow.IS_REVOKED === 'Y') {
        return NextResponse.json(
          { error: 'invalid_grant', error_description: '이미 폐기(Revoked)된 refresh_token입니다.' },
          { status: 400 }
        );
      }

      if (tokenRow.COMPANY_STATUS !== 'ACTIVE') {
        return NextResponse.json(
          { error: 'unauthorized_client', error_description: '해당 업체 계정이 비활성화 상태입니다.' },
          { status: 403 }
        );
      }

      // Refresh Token 만료 확인 (10분 유효)
      if (tokenRow.REFRESH_TOKEN_EXPIRES_AT) {
        const refreshExpiresAt = new Date(tokenRow.REFRESH_TOKEN_EXPIRES_AT);
        if (refreshExpiresAt.getTime() < Date.now()) {
          return NextResponse.json(
            { error: 'invalid_grant', error_description: '만료된 refresh_token입니다. 다시 인증하여 토큰을 발급받으세요.' },
            { status: 400 }
          );
        }
      }

      // 새 JWT Access Token 발급 (유효시간: 10초)
      const newAccessToken = generateAccessTokenJWT(
        {
          companyId: tokenRow.COMPANY_ID,
          companyName: tokenRow.COMPANY_NAME,
          clientId: tokenRow.CLIENT_ID,
          scope: tokenRow.SCOPE || 'read,write',
        },
        10
      );
      const accessExpiresAt = new Date(Date.now() + 10 * 1000); // 10초 후 만료 (DB 기록용)

      await executeQuery(
        `UPDATE API_COMPANY_TOKENS 
         SET ACCESS_TOKEN = :new_access_token, 
             ACCESS_TOKEN_EXPIRES_AT = :expires_at
         WHERE REFRESH_TOKEN = :refresh_token`,
        {
          new_access_token: newAccessToken,
          expires_at: accessExpiresAt,
          refresh_token,
        },
        { autoCommit: true }
      );

      return NextResponse.json({
        access_token: newAccessToken,
        token_type: 'Bearer',
        expires_in: 10, // 10초
        refresh_token: refresh_token,
        refresh_token_expires_in: 600, // 10분 (600초)
        scope: tokenRow.SCOPE || 'read,write',
        company_name: tokenRow.COMPANY_NAME,
        company_id: tokenRow.COMPANY_ID,
      });
    }

    // ==========================================
    // 2. Client Credentials 방식 (grant_type === 'client_credentials')
    // ==========================================
    if (grant_type === 'client_credentials') {
      if (!client_id || !client_secret) {
        return NextResponse.json(
          { error: 'invalid_request', error_description: 'client_id 및 client_secret 필수 항목이 누락되었습니다.' },
          { status: 400 }
        );
      }

      // 업체 (API_COMPANIES) 검증
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

      // JWT Access Token (10초) 및 Refresh Token (10분) 발급
      const accessToken = generateAccessTokenJWT(
        {
          companyId: company.COMPANY_ID,
          companyName: company.COMPANY_NAME,
          clientId: client_id,
          scope: 'read,write',
        },
        10
      );
      const refreshToken = generateTokenString('comp_rt');
      const accessExpiresAt = new Date(Date.now() + 10 * 1000); // 10초
      const refreshExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10분 (600초)

      await executeQuery(
        `INSERT INTO API_COMPANY_TOKENS 
         (ACCESS_TOKEN, REFRESH_TOKEN, COMPANY_ID, CLIENT_ID, SCOPE, ACCESS_TOKEN_EXPIRES_AT, REFRESH_TOKEN_EXPIRES_AT, IS_REVOKED)
         VALUES (:access_token, :refresh_token, :company_id, :client_id, 'read,write', :expires_at, :refresh_expires_at, 'N')`,
        {
          access_token: accessToken,
          refresh_token: refreshToken,
          company_id: company.COMPANY_ID,
          client_id,
          expires_at: accessExpiresAt,
          refresh_expires_at: refreshExpiresAt,
        },
        { autoCommit: true }
      );

      return NextResponse.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 10, // 10초 (테스트용)
        refresh_token: refreshToken,
        refresh_token_expires_in: 600, // 10분 (600초)
        scope: 'read,write',
        company_name: company.COMPANY_NAME,
        company_id: company.COMPANY_ID,
      });
    }

    return NextResponse.json(
      { error: 'unsupported_grant_type', error_description: '지원하지 않는 grant_type입니다. (client_credentials 또는 refresh_token 사용 가능)' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('B2B OAuth Token Issue/Refresh Error:', error);
    return NextResponse.json(
      { error: 'server_error', error_description: error?.message || '업체 토큰 발급/갱신 실패' },
      { status: 500 }
    );
  }
}

