import oracledb from 'oracledb';

// node-oracledb 6.0 이상에서는 기본적으로 Thin mode가 사용됩니다.
// 별도의 Oracle Instant Client 설치 없이 순수 JS 모드로 연결 가능합니다.
oracledb.outFormat = oracledb.OUT_FORMAT_OBJECT;
// 실(운영) DB 안전을 위해 자동 커밋(autoCommit)을 기본적으로 끕니다.
oracledb.autoCommit = false;

let pool: oracledb.Pool | null = null;

export async function getDbPool(): Promise<oracledb.Pool> {
  if (pool) {
    return pool;
  }

  const user = process.env.DB_USER;
  const password = process.env.DB_PASSWORD;
  const connectString = process.env.DB_CONNECT_STRING;

  if (!user || !password || !connectString) {
    throw new Error(
      '환경 변수(process.env)에 DB_USER, DB_PASSWORD, DB_CONNECT_STRING이 설정되지 않았습니다. Vercel Settings > Environment Variables 설정을 확인 후 Redeploy(재배포)해 주세요.'
    );
  }

  pool = await oracledb.createPool({
    user,
    password,
    connectString,
    poolMin: 1,
    poolMax: 10,
    poolIncrement: 1,
    poolTimeout: 60,
  });

  return pool;
}

/**
 * 파라미터화된 쿼리를 실행하는 헬퍼 함수
 */
export async function executeQuery<T = any>(
  sql: string,
  binds: oracledb.BindParameters = {},
  options: oracledb.ExecuteOptions = {}
): Promise<{ rows?: T[]; rowsAffected?: number }> {
  let connection: oracledb.Connection | null = null;

  try {
    const dbPool = await getDbPool();
    connection = await dbPool.getConnection();
    const result = await connection.execute<T>(sql, binds, {
      outFormat: oracledb.OUT_FORMAT_OBJECT,
      autoCommit: false,
      ...options,
    });

    return {
      rows: result.rows,
      rowsAffected: result.rowsAffected,
    };
  } catch (error) {
    console.error('Database Query Error:', error);
    throw error;
  } finally {
    if (connection) {
      try {
        await connection.close();
      } catch (err) {
        console.error('Error closing connection:', err);
      }
    }
  }
}
