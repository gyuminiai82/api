# 📋 B2B 파트너 API 사용자 연동 매뉴얼 (토큰 유효시간 정책 포함)

본 가이드는 B2B 파트너 외부 개발자가 **OAuth 2.0 Access Token의 유효시간 및 만료 정책**을 이해하고 복사해서 바로 활용할 수 있도록 작성된 연동 매뉴얼입니다.

---

## ⏰ 토큰 유효시간 & 만료 정책 (Token Lifetime Policy)

| 토큰 종류 | 유효시간 (TTL) | 응답 필드 | 만료 시 동작 및 대응 방안 |
| :--- | :--- | :--- | :--- |
| **Access Token** | **24시간** (86,400초) | `expires_in: 86400` | • 만료 시 API 호출 시 `HTTP 401 Unauthorized` 에러 반환<br>• 대응: `POST /api/oauth/token` (grant_type: `client_credentials`)을 다시 호출하여 24시간 새 토큰 발급 |
| **Client Credentials** | 영구 보관 (관리자 재발급 전까지) | - | • 파트너 업체의 `Client ID` 및 `Client Secret`은 만료되지 않으며 언제든 새 Access Token 발급 가능 |

---

## 🔑 테스트용 API 자격 증명 키 (Credentials)

```javascript
const CLIENT_ID = "partner_minstudio";
const CLIENT_SECRET = "secret_minstudio_key123";
const API_BASE_URL = "http://localhost:3000";
```

---

## 📦 1. JavaScript / Node.js 복사 전용 모듈 (`MovieApiClient.js`)

```javascript
/**
 * B2B Movie API 연동 클라이언트 SDK
 * 토큰 유효시간(24시간) 만료 시 자동 재인증 모듈 포함
 */
class MovieApiClient {
  constructor(baseUrl, clientId, clientSecret) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
  }

  // 1. 업체 Access Token 발급 (24시간 유효)
  async authenticate() {
    const res = await fetch(`${this.baseUrl}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: this.clientId,
        client_secret: this.clientSecret,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`인증 실패: ${data.error_description || data.message}`);
    }

    this.accessToken = data.access_token;
    console.log(`[${data.company_name}] OAuth 2.0 24시간 Access Token 발급 완료! (Expires in: ${data.expires_in}초)`);
    return this.accessToken;
  }

  // 인증 헤더 생성 헬퍼
  async getAuthHeaders() {
    if (!this.accessToken) {
      await this.authenticate();
    }
    return {
      'Authorization': `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json',
    };
  }

  // 2. 영화 목록 조회 (토큰 24시간 만료 시 자동 재발급 후 재시도)
  async getMovies() {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/movies`, { headers });

    if (res.status === 401) {
      console.log('Access Token 만료됨. 자동으로 새 토큰을 재발급받습니다...');
      await this.authenticate();
      const retryHeaders = await this.getAuthHeaders();
      const retryRes = await fetch(`${this.baseUrl}/api/v1/movies`, { headers: retryHeaders });
      return await retryRes.json();
    }

    return await res.json();
  }

  // 3. 자사 영화 데이터 신규 등록
  async createMovie(movieData) {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/movies`, {
      method: 'POST',
      headers,
      body: JSON.stringify(movieData),
    });
    return await res.json();
  }
}
```
