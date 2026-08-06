# 📋 B2B 파트너 API 복사 전용(Copy & Paste) 연동 가이드

본 가이드는 외부 개발자가 코드를 **복사해서 붙여넣기(Copy & Paste)** 하면 토큰 발급 및 API 호출이 자동으로 처리되도록 설계된 **완성형 연동 클라이언트 모듈 코드**를 제공합니다.

---

## 🔑 테스트용 API 자격 증명 키 (Credentials)

```javascript
const CLIENT_ID = "partner_minstudio";
const CLIENT_SECRET = "secret_minstudio_key123";
const API_BASE_URL = "http://localhost:3000";
```

---

## 📦 1. JavaScript / Node.js 복사 전용 모듈 (`MovieApiClient.js`)

아래 코드를 복사하여 프로젝트에 `MovieApiClient.js`로 저장 후 바로 사용하세요.

```javascript
/**
 * B2B Movie API 연동 클라이언트 SDK
 * 토큰 자동 발급 및 갱신 기능 포함
 */
class MovieApiClient {
  constructor(baseUrl, clientId, clientSecret) {
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.accessToken = null;
  }

  // 1. 업체 Access Token 발급
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
    console.log(`[${data.company_name}] OAuth 2.0 인증 성공!`);
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

  // 2. 영화 목록 조회
  async getMovies() {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/movies`, { headers });
    const data = await res.json();

    if (res.status === 401) { // 토큰 만료 시 자동 재인증 후 1회 재시도
      await this.authenticate();
      const retryHeaders = await this.getAuthHeaders();
      const retryRes = await fetch(`${this.baseUrl}/api/v1/movies`, { headers: retryHeaders });
      return await retryRes.json();
    }

    return data;
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

  // 4. 내 업체 정보 및 API 호출 로그 조회
  async getMyCompanyProfile() {
    const headers = await this.getAuthHeaders();
    const res = await fetch(`${this.baseUrl}/api/v1/companies/me`, { headers });
    return await res.json();
  }
}

// =========================================================
// 🚀 복사해서 바로 실행하는 테스트 예제 코드
// =========================================================
async function runExample() {
  const client = new MovieApiClient(
    'http://localhost:3000',
    'partner_minstudio',
    'secret_minstudio_key123'
  );

  console.log('--- 1. 영화 목록 조회 ---');
  const movies = await client.getMovies();
  console.log('조회된 영화:', movies);

  console.log('\n--- 2. 신규 영화 등록 ---');
  const newMovie = await client.createMovie({
    title: '오펜하이머 (민스튜디오 배급)',
    original_title: 'Oppenheimer',
    running_time: 180,
    plot: '세상을 바꾼 천재 과학자의 이야기',
  });
  console.log('등록 결과:', newMovie);

  console.log('\n--- 3. 내 업체 API 호출 로그 조회 ---');
  const profile = await client.getMyCompanyProfile();
  console.log('업체 프로필 & 로그:', profile);
}

runExample();
```

---

## 🐍 2. Python 복사 전용 모듈 (`movie_api_client.py`)

```python
import requests

class MovieApiClient:
    def __init__(self, base_url, client_id, client_secret):
        self.base_url = base_url.rstrip('/')
        self.client_id = client_id
        self.client_secret = client_secret
        self.access_token = None

    def authenticate(self):
        url = f"{self.base_url}/api/oauth/token"
        payload = {
            "grant_type": "client_credentials",
            "client_id": self.client_id,
            "client_secret": self.client_secret
        }
        res = requests.post(url, json=payload)
        data = res.json()
        
        if res.status_code != 200:
            raise Exception(f"인증 실패: {data.get('error_description')}")
            
        self.access_token = data["access_token"]
        print(f"[{data.get('company_name')}] OAuth 2.0 인증 성공!")
        return self.access_token

    def _get_headers(self):
        if not self.access_token:
            self.authenticate()
        return {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }

    def get_movies(self):
        url = f"{self.base_url}/api/v1/movies"
        res = requests.get(url, headers=self._get_headers())
        
        if res.status_code == 401:
            self.authenticate()
            res = requests.get(url, headers=self._get_headers())
            
        return res.json()

    def create_movie(self, title, original_title=None, running_time=None, plot=None):
        url = f"{self.base_url}/api/v1/movies"
        payload = {
            "title": title,
            "original_title": original_title,
            "running_time": running_time,
            "plot": plot
        }
        res = requests.post(url, json=payload, headers=self._get_headers())
        return res.json()

if __name__ == "__main__":
    client = MovieApiClient("http://localhost:3000", "partner_minstudio", "secret_minstudio_key123")
    movies = client.get_movies()
    print("영화 목록:", movies)
```
