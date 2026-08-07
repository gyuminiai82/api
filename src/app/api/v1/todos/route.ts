import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

/**
 * GET /api/v1/todos
 * OAuth 2.0 Bearer 인증 기반 업체별 TODO 목록 조회 API
 */
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: '업체 전용 API 호출을 위해 Authorization: Bearer <company_token> 이 필요합니다.',
        },
        { status: 401 }
      );
    }

    const companyInfo = await verifyCompanyToken(authHeader);
    const { searchParams } = new URL(req.url);
    const isCompleted = searchParams.get('is_completed')?.toUpperCase();

    let query = `
      SELECT TODO_ID, COMPANY_ID, TITLE, IS_COMPLETED, CREATED_AT, COMPLETED_AT
      FROM API_TODO
      WHERE COMPANY_ID = :companyId
    `;
    const binds: any = { companyId: companyInfo.companyId };

    if (isCompleted === 'Y' || isCompleted === 'N') {
      query += ` AND IS_COMPLETED = :isCompleted`;
      binds.isCompleted = isCompleted;
    }

    query += ` ORDER BY TODO_ID DESC`;

    const result = await executeQuery<any>(query, binds);

    await logCompanyApiCall(companyInfo.companyId, '/api/v1/todos', 'GET', 200);

    return NextResponse.json({
      success: true,
      message: `[${companyInfo.companyName}] 업체의 TODO 목록 조회가 완료되었습니다.`,
      company: {
        id: companyInfo.companyId,
        name: companyInfo.companyName,
        clientId: companyInfo.clientId,
      },
      count: result.rows?.length || 0,
      data: result.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || 'TODO 목록 조회 실패' },
      { status: 401 }
    );
  }
}

/**
 * POST /api/v1/todos
 * OAuth 2.0 Bearer 인증 기반 신규 TODO 등록 API
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        {
          error: 'unauthorized',
          message: '업체 전용 API 호출을 위해 Authorization: Bearer <company_token> 이 필요합니다.',
        },
        { status: 401 }
      );
    }

    const companyInfo = await verifyCompanyToken(authHeader);
    const body = await req.json().catch(() => ({}));
    const { title } = body;

    if (!title || typeof title !== 'string' || !title.trim()) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'title(할일 내용)은 필수 문자열 항목입니다.' },
        { status: 400 }
      );
    }

    await executeQuery(
      `INSERT INTO API_TODO (COMPANY_ID, TITLE, IS_COMPLETED)
       VALUES (:companyId, :title, 'N')`,
      {
        companyId: companyInfo.companyId,
        title: title.trim(),
      },
      { autoCommit: true }
    );

    await logCompanyApiCall(companyInfo.companyId, '/api/v1/todos', 'POST', 201);

    return NextResponse.json(
      {
        success: true,
        message: `[${companyInfo.companyName}] 신규 TODO가 성공적으로 등록되었습니다.`,
        todo: {
          company_name: companyInfo.companyName,
          title: title.trim(),
          is_completed: 'N',
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || 'TODO 등록 실패' },
      { status: 401 }
    );
  }
}
