import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';
import { verifyCompanyToken, logCompanyApiCall } from '@/lib/auth';

/**
 * PATCH /api/v1/todos/[id]
 * OAuth 2.0 Bearer 인증 기반 TODO 수정 및 완료/미완료 상태 변경 API
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params;
    const todoId = parseInt(resolvedParams.id, 10);

    if (isNaN(todoId)) {
      return NextResponse.json(
        { error: 'invalid_request', message: '유효하지 않은 todo ID 형식입니다.' },
        { status: 400 }
      );
    }

    // 해당 TODO가 본인 파트너 업체 소유인지 검증
    const existing = await executeQuery<any>(
      `SELECT TODO_ID, IS_COMPLETED FROM API_TODO WHERE TODO_ID = :todoId AND COMPANY_ID = :companyId`,
      { todoId, companyId: companyInfo.companyId }
    );

    if (!existing.rows || existing.rows.length === 0) {
      return NextResponse.json(
        { error: 'not_found', message: '존재하지 않거나 접근 권한이 없는 TODO 식별자입니다.' },
        { status: 404 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { title, is_completed, checked, is_checked } = body;

    // is_completed, checked, is_checked 중 존재하는 값을 완료/체크 상태로 판단
    const completedVal = is_completed !== undefined ? is_completed : (checked !== undefined ? checked : is_checked);

    const binds: any = { todoId, companyId: companyInfo.companyId };
    const updateFields: string[] = [];

    if (title !== undefined && typeof title === 'string' && title.trim()) {
      updateFields.push('TITLE = :title');
      binds.title = title.trim();
    }

    if (completedVal !== undefined) {
      const isCompStr =
        completedVal === true || completedVal === 'Y' || completedVal === 'y' ? 'Y' : 'N';
      updateFields.push('IS_COMPLETED = :isCompleted');
      binds.isCompleted = isCompStr;

      if (isCompStr === 'Y') {
        updateFields.push('COMPLETED_AT = CURRENT_TIMESTAMP');
      } else {
        updateFields.push('COMPLETED_AT = NULL');
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json(
        { error: 'invalid_request', message: '수정할 항목(title 또는 is_completed)을 입력해주세요.' },
        { status: 400 }
      );
    }

    const updateQuery = `
      UPDATE API_TODO
      SET ${updateFields.join(', ')}
      WHERE TODO_ID = :todoId AND COMPANY_ID = :companyId
    `;

    await executeQuery(updateQuery, binds, { autoCommit: true });
    await logCompanyApiCall(companyInfo.companyId, `/api/v1/todos/${todoId}`, 'PATCH', 200);

    return NextResponse.json({
      success: true,
      message: `[${companyInfo.companyName}] TODO (ID: ${todoId})가 성공적으로 수정되었습니다.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || 'TODO 수정 실패' },
      { status: 401 }
    );
  }
}

/**
 * PUT /api/v1/todos/[id]
 * PATCH와 동일하게 수정 가능하도록 동일 핸들러 지정
 */
export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  return PATCH(req, context);
}

/**
 * DELETE /api/v1/todos/[id]
 * OAuth 2.0 Bearer 인증 기반 TODO 삭제 API
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const resolvedParams = await params;
    const todoId = parseInt(resolvedParams.id, 10);

    if (isNaN(todoId)) {
      return NextResponse.json(
        { error: 'invalid_request', message: '유효하지 않은 todo ID 형식입니다.' },
        { status: 400 }
      );
    }

    // 소유권 확인 및 삭제
    const existing = await executeQuery<any>(
      `SELECT TODO_ID FROM API_TODO WHERE TODO_ID = :todoId AND COMPANY_ID = :companyId`,
      { todoId, companyId: companyInfo.companyId }
    );

    if (!existing.rows || existing.rows.length === 0) {
      return NextResponse.json(
        { error: 'not_found', message: '존재하지 않거나 접근 권한이 없는 TODO 식별자입니다.' },
        { status: 404 }
      );
    }

    await executeQuery(
      `DELETE FROM API_TODO WHERE TODO_ID = :todoId AND COMPANY_ID = :companyId`,
      { todoId, companyId: companyInfo.companyId },
      { autoCommit: true }
    );

    await logCompanyApiCall(companyInfo.companyId, `/api/v1/todos/${todoId}`, 'DELETE', 200);

    return NextResponse.json({
      success: true,
      message: `[${companyInfo.companyName}] TODO (ID: ${todoId})가 성공적으로 삭제되었습니다.`,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'unauthorized', message: error?.message || 'TODO 삭제 실패' },
      { status: 401 }
    );
  }
}
