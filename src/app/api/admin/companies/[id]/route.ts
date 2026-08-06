import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

/**
 * PATCH /api/admin/companies/[id]
 * 파트너 업체 상태 변경 (ACTIVE / SUSPENDED)
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id, 10);
    const body = await req.json().catch(() => ({}));
    const { status } = body;

    if (isNaN(companyId) || !status) {
      return NextResponse.json({ error: 'invalid_request', message: 'companyId 및 status 필수' }, { status: 400 });
    }

    await executeQuery(
      'UPDATE API_COMPANIES SET STATUS = :status WHERE COMPANY_ID = :companyId',
      { status, companyId },
      { autoCommit: true }
    );

    return NextResponse.json({
      success: true,
      message: `업체 상태가 [${status}]로 변경되었습니다.`,
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '상태 변경 실패' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/companies/[id]
 * 파트너 업체 삭제
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const companyId = parseInt(id, 10);

    if (isNaN(companyId)) {
      return NextResponse.json({ error: 'invalid_request', message: '유효하지 않은 업체 ID' }, { status: 400 });
    }

    await executeQuery(
      'DELETE FROM API_COMPANIES WHERE COMPANY_ID = :companyId',
      { companyId },
      { autoCommit: true }
    );

    return NextResponse.json({
      success: true,
      message: '업체가 성공적으로 삭제되었습니다.',
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '업체 삭제 실패' }, { status: 500 });
  }
}
