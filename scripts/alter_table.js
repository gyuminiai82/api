const oracledb = require('oracledb');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envConfig = fs.readFileSync(envPath, 'utf8');
  envConfig.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      let value = match[2].trim();
      if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
      process.env[match[1].trim()] = value;
    }
  });
}

async function run() {
  let conn;
  try {
    conn = await oracledb.getConnection({
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      connectString: process.env.DB_CONNECT_STRING,
    });
    console.log('Connected to Oracle DB.');
    
    // API_COMPANY_TOKENS 테이블에 REFRESH_TOKEN_EXPIRES_AT 컬럼 추가
    await conn.execute('ALTER TABLE API_COMPANY_TOKENS ADD (REFRESH_TOKEN_EXPIRES_AT TIMESTAMP)');
    console.log('[SUCCESS] REFRESH_TOKEN_EXPIRES_AT column added to API_COMPANY_TOKENS table.');
  } catch (err) {
    if (err.message && err.message.includes('ORA-01430')) {
      console.log('[INFO] Column REFRESH_TOKEN_EXPIRES_AT already exists in API_COMPANY_TOKENS.');
    } else {
      console.error('[ERROR]', err.message);
    }
  } finally {
    if (conn) {
      await conn.close();
    }
  }
}

run();
