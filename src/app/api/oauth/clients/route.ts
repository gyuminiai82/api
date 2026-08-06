import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { generateTokenString } from '@/lib/auth';

/**
 * POST /api/oauth/clients
 * 신규 OAuth 클라이언트 앱 등록
 * Body: { client_name, redirect_uri }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { client_name, redirect_uri } = body;

    if (!client_name || !redirect_uri) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'client_name, redirect_uri 항목은 필수입니다.' },
        { status: 400 }
      );
    }

    const clientId = generateTokenString('client');
    const clientSecret = generateTokenString('secret');

    await executeQuery(
      `INSERT INTO API_OAUTH_CLIENTS (CLIENT_ID, CLIENT_SECRET, CLIENT_NAME, REDIRECT_URI, GRANT_TYPES, SCOPE)
       VALUES (:client_id, :client_secret, :client_name, :redirect_uri, 'authorization_code,refresh_token,client_credentials', 'read,write')`,
      {
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uri,
      },
      { autoCommit: true }
    );

    return NextResponse.json({
      success: true,
      message: 'OAuth 클라이언트 애플리케이션이 발급되었습니다.',
      client: {
        client_id: clientId,
        client_secret: clientSecret,
        client_name,
        redirect_uri,
        grant_types: ['authorization_code', 'refresh_token', 'client_credentials'],
        scope: ['read', 'write'],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '클라이언트 앱 등록 실패' }, { status: 500 });
  }
}
