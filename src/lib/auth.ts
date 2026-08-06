import { executeQuery } from './db';
import crypto from 'crypto';

export interface CompanyTokenInfo {
  tokenId: number;
  accessToken: string;
  clientId: string;
  companyId: number;
  companyName: string;
  status: string;
  scope: string;
  expiresAt: Date;
}

export function generateTokenString(prefix: string = 'token'): string {
  return `${prefix}_${crypto.randomBytes(32).toString('hex')}`;
}

/**
 * Authorization: Bearer <company_access_token> 헤더 검증 함수 (B2B 업체용)
 */
export async function verifyCompanyToken(authHeader: string | null): Promise<CompanyTokenInfo> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization 헤더에 Bearer 토큰이 존재하지 않습니다.');
  }

  const token = authHeader.substring(7).trim();

  const query = `
    SELECT 
      t.TOKEN_ID, t.ACCESS_TOKEN, t.CLIENT_ID, t.COMPANY_ID, t.SCOPE,
      t.ACCESS_TOKEN_EXPIRES_AT, t.IS_REVOKED,
      c.COMPANY_NAME, c.STATUS
    FROM API_COMPANY_TOKENS t
    JOIN API_COMPANIES c ON t.COMPANY_ID = c.COMPANY_ID
    WHERE t.ACCESS_TOKEN = :token
  `;

  const result = await executeQuery<any>(query, { token });

  if (!result.rows || result.rows.length === 0) {
    throw new Error('유효하지 않거나 존재하지 않는 업체 Access Token입니다.');
  }

  const row = result.rows[0];

  if (row.IS_REVOKED === 'Y') {
    throw new Error('이미 폐기(Revoked)된 업체 토큰입니다.');
  }

  if (row.STATUS !== 'ACTIVE') {
    throw new Error('해당 업체 계정이 비활성화(SUSPENDED) 상태입니다.');
  }

  const expiresAt = new Date(row.ACCESS_TOKEN_EXPIRES_AT);
  if (expiresAt.getTime() < Date.now()) {
    throw new Error('만료된 업체 Access Token입니다. 토큰을 재발급받으세요.');
  }

  return {
    tokenId: row.TOKEN_ID,
    accessToken: row.ACCESS_TOKEN,
    clientId: row.CLIENT_ID,
    companyId: row.COMPANY_ID,
    companyName: row.COMPANY_NAME,
    status: row.STATUS,
    scope: row.SCOPE,
    expiresAt,
  };
}

/**
 * 업체 API 호출 로그 기록 헬퍼
 */
export async function logCompanyApiCall(companyId: number, endpoint: string, method: string, statusCode: number) {
  try {
    await executeQuery(
      `INSERT INTO API_CALL_LOGS (COMPANY_ID, ENDPOINT, HTTP_METHOD, STATUS_CODE)
       VALUES (:companyId, :endpoint, :method, :statusCode)`,
      { companyId, endpoint, method, statusCode },
      { autoCommit: true }
    );
  } catch (err) {
    console.error('API Call Logging Failed:', err);
  }
}
