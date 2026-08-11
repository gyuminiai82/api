import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/posts/[id]/comments
 * 특정 게시글의 계층형 댓글 목록 조회 및 페이징 API
 */
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 게시글 ID입니다.' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));

    const minRow = (page - 1) * limit;
    const maxRow = page * limit;

    // 1. 해당 게시글 존재 여부 확인
    const postCheck = await executeQuery<{ POST_ID: number }>(
      `SELECT POST_ID FROM API_POSTS WHERE POST_ID = :postId AND IS_DELETED = 'N'`,
      { postId }
    );
    if (!postCheck.rows || postCheck.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '해당 게시글을 찾을 수 없습니다.' }, { status: 404 });
    }

    // 2. 총 댓글 수 조회
    const countSql = `
      SELECT COUNT(*) AS TOTAL_COUNT
      FROM API_COMMENTS
      WHERE POST_ID = :postId AND IS_DELETED = 'N'
    `;
    const countResult = await executeQuery<{ TOTAL_COUNT: number }>(countSql, { postId });
    const totalCount = countResult.rows?.[0]?.TOTAL_COUNT || 0;
    const totalPages = Math.ceil(totalCount / limit) || 1;

    // 3. 계층형 댓글 페이징 쿼리 (START WITH PARENT_ID IS NULL CONNECT BY PRIOR COMMENT_ID = PARENT_ID ORDER SIBLINGS BY COMMENT_ID ASC)
    const listSql = `
      SELECT * FROM (
        SELECT a.*, ROWNUM rnum FROM (
          SELECT
            COMMENT_ID,
            POST_ID,
            COMPANY_ID,
            AUTHOR_NAME,
            CONTENT,
            PARENT_ID,
            GROUP_ID,
            DEPTH,
            SORT_ORDER,
            IS_DELETED,
            TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
            TO_CHAR(UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT,
            LEVEL AS HIERARCHY_LEVEL
          FROM API_COMMENTS
          WHERE POST_ID = :postId AND IS_DELETED = 'N'
          START WITH PARENT_ID IS NULL
          CONNECT BY NOCYCLE PRIOR COMMENT_ID = PARENT_ID
          ORDER SIBLINGS BY COMMENT_ID ASC
        ) a WHERE ROWNUM <= :maxRow
      ) WHERE rnum > :minRow
    `;

    const listResult = await executeQuery<any>(listSql, { postId, maxRow, minRow });

    return NextResponse.json({
      success: true,
      message: '계층형 댓글 목록 조회 성공',
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
    console.error('Fetch comments failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 목록 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/v1/posts/[id]/comments
 * 계층형 댓글 / 답글 댓글 작성 API
 */
export async function POST(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 게시글 ID입니다.' }, { status: 400 });
    }

    let companyInfo = null;
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        companyInfo = await verifyCompanyToken(authHeader);
      } catch {
        // 무시
      }
    }

    const body = await req.json().catch(() => ({}));
    const { content, author_name, parent_id } = body;

    if (!content) {
      return NextResponse.json({ error: 'invalid_request', message: 'content(댓글 내용)은 필수입니다.' }, { status: 400 });
    }

    // 게시글 존재 확인
    const postCheck = await executeQuery<{ POST_ID: number }>(
      `SELECT POST_ID FROM API_POSTS WHERE POST_ID = :postId AND IS_DELETED = 'N'`,
      { postId }
    );
    if (!postCheck.rows || postCheck.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '댓글을 작성할 게시글이 존재하지 않습니다.' }, { status: 404 });
    }

    const authorName = author_name || companyInfo?.companyName || '익명';
    const companyId = companyInfo?.companyId || null;

    let depth = 0;
    let groupId: number | null = null;
    let parentIdNum: number | null = null;

    // 답글 댓글(대댓글) 작성인 경우
    if (parent_id) {
      parentIdNum = parseInt(parent_id, 10);
      const parentResult = await executeQuery<any>(
        `SELECT COMMENT_ID, GROUP_ID, DEPTH FROM API_COMMENTS WHERE COMMENT_ID = :parentId AND POST_ID = :postId AND IS_DELETED = 'N'`,
        { parentId: parentIdNum, postId }
      );

      if (!parentResult.rows || parentResult.rows.length === 0) {
        return NextResponse.json(
          { error: 'not_found', message: '답글을 작성할 상위 댓글이 존재하지 않습니다.' },
          { status: 404 }
        );
      }

      const parentComment = parentResult.rows[0];
      depth = parentComment.DEPTH + 1;
      groupId = parentComment.GROUP_ID;
    }

    const insertSql = `
      INSERT INTO API_COMMENTS (POST_ID, COMPANY_ID, AUTHOR_NAME, CONTENT, PARENT_ID, GROUP_ID, DEPTH)
      VALUES (:postId, :companyId, :authorName, :content, :parentId, :groupId, :depth)
    `;

    await executeQuery(
      insertSql,
      {
        postId,
        companyId,
        authorName,
        content,
        parentId: parentIdNum,
        groupId,
        depth,
      },
      { autoCommit: true }
    );

    // 최상위 댓글인 경우 생성된 COMMENT_ID를 GROUP_ID로 업데이트
    if (!groupId) {
      await executeQuery(
        `UPDATE API_COMMENTS SET GROUP_ID = COMMENT_ID WHERE GROUP_ID IS NULL AND POST_ID = :postId`,
        { postId },
        { autoCommit: true }
      );
    }

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/posts/${postId}/comments`, 'POST', 201);
    }

    return NextResponse.json(
      {
        success: true,
        message: parent_id ? '대댓글(답글)이 등록되었습니다.' : '댓글이 등록되었습니다.',
        data: {
          postId,
          content,
          author_name: authorName,
          parent_id: parentIdNum,
          depth,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('Create comment failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 등록 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
