import { executeQuery } from './db';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'study_api_jwt_secret_key_2026';

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
 * JWT Access Token 발급 함수
 */
export function generateAccessTokenJWT(
  payload: {
    companyId: number;
    companyName: string;
    clientId: string;
    scope: string;
  },
  expiresInSeconds: number = 10
): string {
  return jwt.sign(
    {
      companyId: payload.companyId,
      companyName: payload.companyName,
      clientId: payload.clientId,
      scope: payload.scope,
      type: 'access_token',
    },
    JWT_SECRET,
    { expiresIn: expiresInSeconds }
  );
}

/**
 * Authorization: Bearer <company_access_token> JWT 검증 함수 (B2B 업체용)
 */
export async function verifyCompanyToken(authHeader: string | null): Promise<CompanyTokenInfo> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new Error('Authorization 헤더에 Bearer 토큰이 존재하지 않습니다.');
  }

  const token = authHeader.substring(7).trim();

  // 1. JWT 서명 및 만료시간 1차 검증
  let decodedPayload: any;
  try {
    decodedPayload = jwt.verify(token, JWT_SECRET);
  } catch (err: any) {
    if (err.name === 'TokenExpiredError') {
      throw new Error('만료된 업체 Access Token입니다. 토큰을 재발급받으세요.');
    }
    throw new Error('유효하지 않은 JWT Access Token입니다.');
  }

  // 2. DB 조회를 통한 폐기 여부(IS_REVOKED) 및 업체 상태(STATUS) 2차 검증
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

  return {
    tokenId: row.TOKEN_ID,
    accessToken: token,
    clientId: decodedPayload.clientId || row.CLIENT_ID,
    companyId: decodedPayload.companyId || row.COMPANY_ID,
    companyName: decodedPayload.companyName || row.COMPANY_NAME,
    status: row.STATUS,
    scope: decodedPayload.scope || row.SCOPE,
    expiresAt: new Date(decodedPayload.exp * 1000),
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

