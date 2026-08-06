import { NextRequest, NextResponse } from 'next/server';
import { executeQuery } from '@/lib/db';

/**
 * GET /api/v1/movies/[id]
 * 영화 상세 정보 및 리뷰 목록 조회
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id, 10);

    if (isNaN(movieId)) {
      return NextResponse.json({ error: 'invalid_id', message: '유효하지 않은 영화 ID입니다.' }, { status: 400 });
    }

    // 영화 기본 정보
    const movieResult = await executeQuery<any>('SELECT * FROM API_MOVIES WHERE MOVIE_ID = :movieId', { movieId });

    if (!movieResult.rows || movieResult.rows.length === 0) {
      return NextResponse.json({ error: 'not_found', message: '영화 정보를 찾을 수 없습니다.' }, { status: 404 });
    }

    const movie = movieResult.rows[0];

    // 관련 리뷰 목록
    const reviewsResult = await executeQuery<any>(
      `SELECT r.REVIEW_ID, r.RATING, r.CONTENT, r.CREATED_AT, u.NICKNAME, u.EMAIL
       FROM API_REVIEWS r
       JOIN API_USERS u ON r.USER_ID = u.USER_ID
       WHERE r.MOVIE_ID = :movieId
       ORDER BY r.REVIEW_ID DESC`,
      { movieId }
    );

    // 영화 장르 목록
    const genresResult = await executeQuery<any>(
      `SELECT g.GENRE_ID, g.NAME
       FROM API_MOVIE_GENRES mg
       JOIN API_GENRES g ON mg.GENRE_ID = g.GENRE_ID
       WHERE mg.MOVIE_ID = :movieId`,
      { movieId }
    );

    return NextResponse.json({
      success: true,
      data: {
        ...movie,
        genres: genresResult.rows || [],
        reviews: reviewsResult.rows || [],
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: 'server_error', message: error?.message || '영화 상세 조회 실패' }, { status: 500 });
  }
}
