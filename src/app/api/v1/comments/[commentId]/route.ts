import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

interface Context {
  params: Promise<{ commentId: string }>;
}

/**
 * PUT /api/v1/comments/[commentId]
 * 댓글 내용 수정 API
 */
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { commentId: cId } = await params;
    const commentId = parseInt(cId, 10);

    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 댓글 ID입니다.' }, { status: 400 });
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
    const { content } = body;

    if (!content) {
      return NextResponse.json({ error: 'invalid_request', message: '수정할 content(내용)은 필수입니다.' }, { status: 400 });
    }

    const checkSql = `SELECT COMPANY_ID FROM API_COMMENTS WHERE COMMENT_ID = :commentId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { commentId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '수정할 댓글이 존재하지 않습니다.' }, { status: 404 });
    }

    const comment = checkResult.rows[0];
    if (companyInfo && comment.COMPANY_ID && comment.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인이 작성한 댓글만 수정할 수 있습니다.' }, { status: 403 });
    }

    const updateSql = `
      UPDATE API_COMMENTS
      SET CONTENT = :content,
          UPDATED_AT = CURRENT_TIMESTAMP
      WHERE COMMENT_ID = :commentId
    `;

    await executeQuery(updateSql, { content, commentId }, { autoCommit: true });

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/comments/${commentId}`, 'PUT', 200);
    }

    return NextResponse.json({
      success: true,
      message: '댓글이 성공적으로 수정되었습니다.',
      data: { commentId, content },
    });
  } catch (error: any) {
    console.error('Update comment failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/comments/[commentId]
 * 댓글 논리 삭제 API
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { commentId: cId } = await params;
    const commentId = parseInt(cId, 10);

    if (isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 댓글 ID입니다.' }, { status: 400 });
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

    const checkSql = `SELECT COMPANY_ID FROM API_COMMENTS WHERE COMMENT_ID = :commentId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { commentId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '삭제할 댓글이 존재하지 않습니다.' }, { status: 404 });
    }

    const comment = checkResult.rows[0];
    if (companyInfo && comment.COMPANY_ID && comment.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인이 작성한 댓글만 삭제할 수 있습니다.' }, { status: 403 });
    }

    const deleteSql = `UPDATE API_COMMENTS SET IS_DELETED = 'Y', UPDATED_AT = CURRENT_TIMESTAMP WHERE COMMENT_ID = :commentId`;
    await executeQuery(deleteSql, { commentId }, { autoCommit: true });

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/comments/${commentId}`, 'DELETE', 200);
    }

    return NextResponse.json({
      success: true,
      message: '댓글이 성공적으로 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete comment failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
