import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

interface Context {
  params: Promise<{ id: string; commentId: string }>;
}

/**
 * GET /api/v1/posts/[id]/comments/[commentId]
 * 특정 게시글의 특정 댓글/대댓글 상세 조회 API
 */
export async function GET(req: NextRequest, { params }: Context) {
  try {
    const { id, commentId: cId } = await params;
    const postId = parseInt(id, 10);
    const commentId = parseInt(cId, 10);

    if (isNaN(postId) || isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 ID입니다.' }, { status: 400 });
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
      WHERE COMMENT_ID = :commentId AND POST_ID = :postId AND IS_DELETED = 'N'
    `;

    const result = await executeQuery<any>(sql, { commentId, postId });

    if (!result.rows || result.rows.length === 0) {
      return NextResponse.json(
        { error: 'not_found', message: '댓글을 찾을 수 없거나 이미 삭제되었습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Fetch nested comment detail failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 조회 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/v1/posts/[id]/comments/[commentId]
 * 특정 게시글의 특정 댓글/대댓글 수정 API
 */
export async function PUT(req: NextRequest, { params }: Context) {
  try {
    const { id, commentId: cId } = await params;
    const postId = parseInt(id, 10);
    const commentId = parseInt(cId, 10);

    if (isNaN(postId) || isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 ID입니다.' }, { status: 400 });
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
    const { content, author_name } = body;

    if (!content && !author_name) {
      return NextResponse.json(
        { error: 'invalid_request', message: '수정할 content(내용) 또는 author_name(작성자)을 입력해주세요.' },
        { status: 400 }
      );
    }

    const checkSql = `SELECT COMPANY_ID, CONTENT, AUTHOR_NAME FROM API_COMMENTS WHERE COMMENT_ID = :commentId AND POST_ID = :postId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { commentId, postId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '수정할 댓글이 존재하지 않습니다.' }, { status: 404 });
    }

    const comment = checkResult.rows[0];
    if (companyInfo && comment.COMPANY_ID && comment.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인이 작성한 댓글만 수정할 수 있습니다.' }, { status: 403 });
    }

    const newContent = content !== undefined ? content : comment.CONTENT;
    const newAuthorName = author_name !== undefined ? author_name : comment.AUTHOR_NAME;

    const updateSql = `
      UPDATE API_COMMENTS
      SET CONTENT = :content,
          AUTHOR_NAME = :authorName,
          UPDATED_AT = CURRENT_TIMESTAMP
      WHERE COMMENT_ID = :commentId AND POST_ID = :postId
    `;

    await executeQuery(updateSql, { content: newContent, authorName: newAuthorName, commentId, postId }, { autoCommit: true });

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/posts/${postId}/comments/${commentId}`, 'PUT', 200);
    }

    return NextResponse.json({
      success: true,
      message: '댓글이 성공적으로 수정되었습니다.',
      data: { postId, commentId, content: newContent, author_name: newAuthorName },
    });
  } catch (error: any) {
    console.error('Update nested comment failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 수정 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/v1/posts/[id]/comments/[commentId]
 * 특정 게시글의 특정 댓글/대댓글 삭제 API (논리 삭제)
 */
export async function DELETE(req: NextRequest, { params }: Context) {
  try {
    const { id, commentId: cId } = await params;
    const postId = parseInt(id, 10);
    const commentId = parseInt(cId, 10);

    if (isNaN(postId) || isNaN(commentId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 ID입니다.' }, { status: 400 });
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

    const checkSql = `SELECT COMPANY_ID FROM API_COMMENTS WHERE COMMENT_ID = :commentId AND POST_ID = :postId AND IS_DELETED = 'N'`;
    const checkResult = await executeQuery<any>(checkSql, { commentId, postId });

    if (!checkResult.rows || checkResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '삭제할 댓글이 존재하지 않거나 이미 삭제되었습니다.' }, { status: 404 });
    }

    const comment = checkResult.rows[0];
    if (companyInfo && comment.COMPANY_ID && comment.COMPANY_ID !== companyInfo.companyId) {
      return NextResponse.json({ error: 'forbidden', message: '본인이 작성한 댓글만 삭제할 수 있습니다.' }, { status: 403 });
    }

    const deleteSql = `UPDATE API_COMMENTS SET IS_DELETED = 'Y', UPDATED_AT = CURRENT_TIMESTAMP WHERE (COMMENT_ID = :commentId OR PARENT_ID = :commentId) AND POST_ID = :postId`;
    await executeQuery(deleteSql, { commentId, postId }, { autoCommit: true });

    if (companyInfo) {
      await logCompanyApiCall(companyInfo.companyId, `/api/v1/posts/${postId}/comments/${commentId}`, 'DELETE', 200);
    }

    return NextResponse.json({
      success: true,
      message: '댓글(및 하위 대댓글)이 성공적으로 삭제되었습니다.',
    });
  } catch (error: any) {
    console.error('Delete nested comment failed:', error);
    return NextResponse.json(
      { error: 'server_error', message: error?.message || '댓글 삭제 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
