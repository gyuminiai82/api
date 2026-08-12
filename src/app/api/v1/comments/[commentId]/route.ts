import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

interface Context {
  params: Promise<{ commentId: string }>;
}

/**
 * GET /api/v1/comments/[commentId]
 * OAuth 2.0 Bearer 인증 기반 댓글 / 대댓글 단건 상세 조회 API
 */
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'unauthorized', message: '댓글 조회를 위해 Authorization: Bearer <company_token> 이 필요합니다.' },
        { status: 401 }
      );
    }

    const companyInfo = await verifyCompanyToken(authHeader);

    const { commentId: cId } = await params;
    const commentId = parseInt(cId, 10);

    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 댓글 ID입니다.' }, { status: 400 });
    }

    const sql = `
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
        TO_CHAR(UPDATED_AT, 'YYYY-MM-DD HH24:MI:SS') AS UPDATED_AT
      FROM API_COMMENTS
      WHERE COMMENT_ID = :commentId AND IS_DELETED = 'N'
    `;

    const result = await executeQuery<any>(sql, { commentId });

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'not_found', message: '댓글을 찾을 수 없거나 삭제되었습니다.' },
        { status: 404 }
      );
    }

    await logCompanyApiCall(companyInfo.companyId, `/api/v1/comments/${commentId}`, 'GET', 200);

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Fetch comment detail failed:', error);
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || '댓글 조회 중 인증 오류가 발생했습니다.' },
      { status: 401 }
    );
  }
}

/**
 * PUT /api/v1/comments/[commentId]
 * OAuth 2.0 Bearer 인증 기반 댓글 / 대댓글 수정 API
 */
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'unauthorized', message: '댓글 수정을 위해 Authorization: Bearer <company_token> 이 필요합니다.' },
        { status: 401 }
      );
    }

    const companyInfo = await verifyCompanyToken(authHeader);

    const { commentId: cId } = await params;
    const commentId = parseInt(cId, 10);

    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 댓글 ID입니다.' }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { content, author_name } = body;

    if (!content && !author_name) {
      return NextResponse.json(
        { error: 'invalid_request', message: '수정할 content(내용) 또는 author_name(작성자)을 입력해주세요.' },
        { status: 400 }
      );
    }

    const checkSql = `SELECT COMPANY_ID, CONTENT, AUTHOR_NAME FROM API_COMMENTS WHERE COMMENT_ID = :commentId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { commentId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '수정할 댓글이 존재하지 않거나 삭제되었습니다.' }, { status: 404 });
    }

    const comment = checkResult.rows[0];
    if (comment.COMPANY_ID && comment.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인 업체가 작성한 댓글만 수정할 수 있습니다.' }, { status: 403 });
    }

    const newContent = content !== undefined ? content : comment.CONTENT;
    const newAuthorName = author_name !== undefined ? author_name : comment.AUTHOR_NAME;

    const updateSql = `
      UPDATE API_COMMENTS
      SET CONTENT = :content,
          AUTHOR_NAME = :authorName,
          UPDATED_AT = CURRENT_TIMESTAMP
      WHERE COMMENT_ID = :commentId
    `;

    await executeQuery(updateSql, { content: newContent, authorName: newAuthorName, commentId }, { autoCommit: true });

    await logCompanyApiCall(companyInfo.companyId, `/api/v1/comments/${commentId}`, 'PUT', 200);

    return NextResponse.json({
      success: true,
      message: '댓글이 성공적으로 수정되었습니다.',
      data: { commentId, content: newContent, author_name: newAuthorName },
    });
  } catch (error: any) {
    console.error('Update comment failed:', error);
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || '댓글 수정 중 인증 오류가 발생했습니다.' },
      { status: 401 }
    );
  }
}

/**
 * DELETE /api/v1/comments/[commentId]
 * OAuth 2.0 Bearer 인증 기반 댓글 및 하위 대댓글 논리 삭제 API
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { error: 'unauthorized', message: '댓글 삭제를 위해 Authorization: Bearer <company_token> 이 필요합니다.' },
        { status: 401 }
      );
    }

    const companyInfo = await verifyCompanyToken(authHeader);

    const { commentId: cId } = await params;
    const commentId = parseInt(cId, 10);

    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 댓글 ID입니다.' }, { status: 400 });
    }

    const checkSql = `SELECT COMPANY_ID FROM API_COMMENTS WHERE COMMENT_ID = :commentId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { commentId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '삭제할 댓글이 존재하지 않거나 이미 삭제되었습니다.' }, { status: 404 });
    }

    const comment = checkResult.rows[0];
    if (comment.COMPANY_ID && comment.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인 업체가 작성한 댓글만 삭제할 수 있습니다.' }, { status: 403 });
    }

    // 댓글 및 하위 대댓글 함께 논리 삭제
    const deleteSql = `UPDATE API_COMMENTS SET IS_DELETED = 'Y', UPDATED_AT = CURRENT_TIMESTAMP WHERE COMMENT_ID = :commentId OR PARENT_ID = :commentId`;
    await executeQuery(deleteSql, { commentId }, { autoCommit: true });

    await logCompanyApiCall(companyInfo.companyId, `/api/v1/comments/${commentId}`, 'DELETE', 200);

    return NextResponse.json({
      success: true,
      message: '댓글(및 하위 대댓글)이 성공적으로 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete comment failed:', error);
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || '댓글 삭제 중 인증 오류가 발생했습니다.' },
      { status: 401 }
    );
  }
}
