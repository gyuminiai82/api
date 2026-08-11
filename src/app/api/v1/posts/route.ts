import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

/**
 * GET /api/v1/posts
 * 페이징 처리 및 검색 기능이 포함된 계층형 게시글 목록 조회 API
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '10', 10)));
    const search = searchParams.get('search')?.trim() || '';
    const searchType = searchParams.get('searchType') || 'all'; // title, content, author, all

    // 1. Bearer 토큰 검증 (선택사항)
    let companyInfo = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        companyInfo = await verifyCompanyToken(authHeader);
        await logCompanyApiCall(companyInfo.companyId, '/api/v1/posts', 'GET', 200);
      } catch {
        // 토큰이 없거나 유효하지 않아도 공개 게시글 목록 조회가 가능합니다.
      }
    }

    const minRow = (page - 1) * limit;
    const maxRow = page * limit;

    // 검색 조건절 생성
    let searchCondition = '';
    const binds: Record<string, any> = {};

    if (search) {
      binds.searchPattern = `%${search}%`;
      if (searchType === 'title') {
        searchCondition = 'AND TITLE LIKE :searchPattern';
      } else if (searchType === 'content') {
        searchCondition = 'AND DBMS_LOB.INSTR(CONTENT, :searchPattern) > 0';
      } else if (searchType === 'author') {
        searchCondition = 'AND AUTHOR_NAME LIKE :searchPattern';
      } else {
        searchCondition = 'AND (TITLE LIKE :searchPattern OR DBMS_LOB.INSTR(CONTENT, :searchPattern) > 0 OR AUTHOR_NAME LIKE :searchPattern)';
      }
    }

    // 2. 전체 건수 조회
    const countSql = `
      SELECT COUNT(*) AS TOTAL_COUNT
      FROM API_POSTS
      WHERE IS_DELETED = 'N' ${searchCondition}
    `;
    const countResult = await executeQuery<{ TOTAL_COUNT: number }>(countSql, binds);
    const totalCount = countResult.rows?.[0]?.TOTAL_COUNT || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 3. 계층형 정렬 + 페이징 쿼리 (Oracle START WITH ... CONNECT BY)
    binds.maxRow = maxRow;
    binds.minRow = minRow;

    const listSql = `
      SELECT * FROM (
        SELECT a.*, ROWNUM rnum FROM (
          SELECT 
            POST_ID,
            COMPANY_ID,
            TITLE,
            AUTHOR_NAME,
            PARENT_ID,
            GROUP_ID,
            DEPTH,
            SORT_ORDER,
            VIEW_COUNT,
            IS_DELETED,
            TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
            TO_CHAR(UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT,
            LEVEL AS HIERARCHY_LEVEL,
            (SELECT COUNT(*) FROM API_COMMENTS c WHERE c.POST_ID = p.POST_ID AND c.IS_DELETED = 'N') AS COMMENT_COUNT
          FROM API_POSTS p
          WHERE IS_DELETED = 'N' ${searchCondition}
          START WITH PARENT_ID IS NULL
          CONNECT BY PRIOR POST_ID = PARENT_ID
          ORDER SIBLINGS BY POST_ID DESC
        ) a WHERE ROWNUM <= :maxRow
      ) WHERE rnum > :minRow
    `;

    const listResult = await executeQuery<any>(listSql, binds);

    return NextResponse.json({
      success: true,
      message: '계층형 게시글 목록 조회 성공',
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
      data: listResult.rows || [],
    });
  } catch (error: any) {
    console.error('Fetch posts failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '게시글 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/posts
 * 신규 게시글 작성 또는 계층형 답글 작성 API
 */
export async function POST(req: NextRequest) {
  try {
    let companyInfo = null;
    const authHeader = req.headers.get('authorization');

    if (authHeader) {
      try {
        companyInfo = await verifyCompanyToken(authHeader);
      } catch {
        // Bearer 토큰이 비필수라면 일반 작성자로 생성 가능
      }
    }

    const body = await req.json().catch(() => ({}));
    const { title, content, author_name, parent_id } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'invalid_request', message: 'title(제목)과 content(내용)은 필수 입력 항목입니다.' },
        { status: 400 }
      );
    }

    const authorName = author_name || companyInfo?.companyName || '익명';
    const companyId = companyInfo?.companyId || null;

    let depth = 0;
    let groupId: number | null = null;
    let parentIdNum: number | null = null;

    // 1. 답글 작성인 경우 부모 글 확인
    if (parent_id) {
      parentIdNum = parseInt(parent_id, 10);
      const parentResult = await executeQuery<any>(
        `SELECT POST_ID, GROUP_ID, DEPTH FROM API_POSTS WHERE POST_ID = :parentId AND IS_DELETED = 'N'`,
        { parentId: parentIdNum }
      );

      if (!parentResult.rows || parentResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'not_found', message: '답글을 달 부모 게시글이 존재하지 않거나 삭제되었습니다.' },
          { status: 404 }
        );
      }

      const parentPost = parentResult.rows[0];
      depth = parentPost.DEPTH + 1;
      groupId = parentPost.GROUP_ID;
    }

    // 2. 게시글 등록 (INSERT)
    const insertSql = `
      INSERT INTO API_POSTS (COMPANY_ID, TITLE, CONTENT, AUTHOR_NAME, PARENT_ID, GROUP_ID, DEPTH)
      VALUES (:companyId, :title, :content, :authorName, :parentId, :groupId, :depth)
    `;

    await executeQuery(
      insertSql,
      {
        companyId,
        title,
        content,
        authorName,
        parentId: parentIdNum,
        groupId,
        depth,
      },
      { autoCommit: true }
    );

    // 3. 최상위 원글인 경우, 생성된 POST_ID를 GROUP_ID로 업데이트
    if (!groupId) {
      await executeQuery(
        `UPDATE API_POSTS SET GROUP_ID = POST_ID WHERE GROUP_ID IS NULL`,
        {},
        { autoCommit: true }
      );
    }

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, '/api/v1/posts', 'POST', 201);
    }

    return NextResponse.json(
      {
        success: true,
        message: parent_id ? '계층형 답글 게시글이 작성되었습니다.' : '신규 게시글이 등록되었습니다.',
        data: {
          title,
          author_name: authorName,
          parent_id: parentIdNum,
          depth,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create post failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '게시글 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
