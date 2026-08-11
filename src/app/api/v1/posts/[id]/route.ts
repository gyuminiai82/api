import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

interface Context {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/v1/posts/[id]
 * 게시글 상세 조회 및 조회수 증가 API
 */
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id } = await params;
    const postId = parseInt(id, 10);

    if (isNaN(postId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 게시글 ID입니다.' }, { status: 400 });
    }

    // 1. 조회수 1 증가 (비동기 커밋)
    await executeQuery(
      `UPDATE API_POSTS SET VIEW_COUNT = VIEW_COUNT + 1 WHERE POST_ID = :postId AND IS_DELETED = 'N'`,
      { postId },
      { autoCommit: true }
    );

    // 2. 게시글 상세 정보 조회
    const sql = `
      SELECT 
        POST_ID,
        COMPANY_ID,
        TITLE,
        CONTENT,
        AUTHOR_NAME,
        PARENT_ID,
        GROUP_ID,
        DEPTH,
        VIEW_COUNT,
        IS_DELETED,
        TO_CHAR(CREATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS CREATED_AT,
        TO_CHAR(UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT,
        (SELECT COUNT(*) FROM API_COMMENTS c WHERE c.POST_ID = p.POST_ID AND c.IS_DELETED = 'N') AS COMMENT_COUNT
      FROM API_POSTS p
      WHERE POST_ID = :postId AND IS_DELETED = 'N'
    `;

    const result = await executeQuery<any>(sql, { postId });

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'not_found', message: '게시글을 찾을 수 없거나 이미 삭제되었습니다.' },
        { status: 404 }
      );
    }

    // Bearer 토큰이 있을 경우 호출 로그 기록
    const authHeader = req.headers.get('authorization');
    if (authHeader) {
      try {
        const companyInfo = await verifyCompanyToken(authHeader);
        await logCompanyApiCall(companyInfo.companyId, `/api/v1/posts/${postId}`, 'GET', 200);
      } catch {
        // 무시
      }
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Fetch post detail failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '게시글 상세 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/posts/[id]
 * 게시글 수정 API
 */
export async function PUT(req: NextRequest, { params }: Context) {
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
        // 인증 실패 시 무시
      }
    }

    const body = await req.json().catch(() => ({}));
    const { title, content } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: 'invalid_request', message: '수정할 title(제목)과 content(내용)을 입력해주세요.' },
        { status: 400 }
      );
    }

    // 게시글 존재 및 권한 체크
    const checkSql = `SELECT COMPANY_ID FROM API_POSTS WHERE POST_ID = :postId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { postId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '수정할 게시글이 존재하지 않습니다.' }, { status: 404 });
    }

    const post = checkResult.rows[0];
    if (companyInfo && post.COMPANY_ID && post.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인이 작성한 게시글만 수정할 수 있습니다.' }, { status: 403 });
    }

    const updateSql = `
      UPDATE API_POSTS
      SET TITLE = :title,
          CONTENT = :content,
          UPDATED_AT = CURRENT_TIMESTAMP
      WHERE POST_ID = :postId
    `;

    await executeQuery(updateSql, { title, content, postId }, { autoCommit: true });

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/posts/${postId}`, 'PUT', 200);
    }

    return NextResponse.json({
      success: true,
      message: '게시글이 성공적으로 수정되었습니다.',
      data: { postId, title, content },
    });
  } catch (error: any) {
    console.error('Update post failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '게시글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/posts/[id]
 * 게시글 논리 삭제 API
 */
export async function DELETE(req: NextRequest, { params }: Context) {
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

    const checkSql = `SELECT COMPANY_ID FROM API_POSTS WHERE POST_ID = :postId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { postId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '삭제할 게시글이 존재하지 않거나 이미 삭제되었습니다.' }, { status: 404 });
    }

    const post = checkResult.rows[0];
    if (companyInfo && post.COMPANY_ID && post.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인이 작성한 게시글만 삭제할 수 있습니다.' }, { status: 403 });
    }

    const deleteSql = `UPDATE API_POSTS SET IS_DELETED = 'Y', UPDATED_AT = CURRENT_TIMESTAMP WHERE POST_ID = :postId`;
    await executeQuery(deleteSql, { postId }, { autoCommit: true });

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/posts/${postId}`, 'DELETE', 200);
    }

    return NextResponse.json({
      success: true,
      message: '게시글이 성공적으로 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete post failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '게시글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
