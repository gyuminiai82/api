import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

/**
 * GET /api/v1/movies
 * B2B 업체 영화 목록 조회 API
 */
export async function GET(req: NextRequest) {
  try {
    let companyInfo = null;
    const authHeader = req.headers.get('authorization');

    if (authHeader) {
      try {
        companyInfo = await verifyCompanyToken(authHeader);
        await logCompanyApiCall(companyInfo.companyId, '/api/v1/movies', 'GET', 200);
      } catch (err: any) {
        return NextResponse.json({ error: 'invalid_token', message: err.message }, { status: 401 });
      }
    }

    const query = companyInfo
      ? 'SELECT m.*, c.COMPANY_NAME FROM API_MOVIES m JOIN API_COMPANIES c ON m.COMPANY_ID = c.COMPANY_ID WHERE m.COMPANY_ID = :companyId ORDER BY m.MOVIE_ID DESC'
      : 'SELECT m.*, c.COMPANY_NAME FROM API_MOVIES m JOIN API_COMPANIES c ON m.COMPANY_ID = c.COMPANY_ID ORDER BY m.MOVIE_ID DESC';

    const binds = companyInfo ? { companyId: companyInfo.companyId } : {};
    const result = await executeQuery<any>(query, binds);

    return NextResponse.json({
      success: true,
      message: companyInfo
        ? `[${companyInfo.companyName}] 업체 전용 영화 목록 조회 완료`
        : '전체 업체 기본 영화 목록 조회 완료 (Bearer 업체 토큰 입력 시 해당 업체 데이터 필터링)',
      company: companyInfo
        ? { id: companyInfo.companyId, name: companyInfo.companyName, clientId: companyInfo.clientId }
        : null,
      count: result.rows?.length || 0,
      data: result.rows || [],
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '영화 목록 조회 실패' }, { status: 500 });
  }
}

/**
 * POST /api/v1/movies
 * B2B 업체의 신규 영화 데이터 등록 API (Bearer 업체 토큰 필수)
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'unauthorized', message: '업체 전용 API 호출을 위해 Authorization: Bearer <company_token> 이 필요합니다.' },
        { status: 401 }
      );
    }

    const companyInfo = await verifyCompanyToken(authHeader);
    const body = await req.json().catch(() => ({}));
    const { title, original_title, running_time, plot } = body;

    if (!title) {
      return NextResponse.json({ error: 'invalid_request', message: 'title(영화 제목)은 필수입니다.' }, { status: 400 });
    }

    await executeQuery(
      `INSERT INTO API_MOVIES (COMPANY_ID, TITLE, ORIGINAL_TITLE, RUNNING_TIME, PLOT)
       VALUES (:company_id, :title, :original_title, :running_time, :plot)`,
      {
        company_id: companyInfo.companyId,
        title,
        original_title: original_title || null,
        running_time: running_time || null,
        plot: plot || null,
      },
      { autoCommit: true }
    );

    await logCompanyApiCall(companyInfo.companyId, '/api/v1/movies', 'POST', 200);

    return NextResponse.json({
      success: true,
      message: `[${companyInfo.companyName}] 소유의 신규 영화 데이터가 성공적으로 등록되었습니다.`,
      movie: {
        company_name: companyInfo.companyName,
        title,
        original_title,
        running_time,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'unauthorized', message: error?.message || '영화 등록 실패' }, { status: 401 });
  }
}
