# 📄 OpenAPI 3.0 (Swagger) B2B API 표준 명세서

이 문서는 외부 개발사나 타 개발자에게 **통째로 전달(Copy & Paste)하여 자동 코드 생성(Swagger Codegen, Postman Import, OpenAPI UI 등) 및 연동 구현에 바로 사용할 수 있는 OpenAPI 3.0 표준 규격서**입니다.

---

## 🛠️ 1. Postman / Swagger UI Import용 OpenAPI 3.0 JSON Spec

아래 JSON 전체를 복사하여 **Postman (Import > Raw text)** 또는 **Swagger Editor**에 붙여넣으면 즉시 모든 API 컬렉션과 클라이언트 코드가 자동 생성됩니다.

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "B2B Partner OAuth 2.0 Movie API Specification",
    "description": "B2B 파트너 연동을 위한 OAuth 2.0 Client Credentials 기반 영화 REST API 규격서입니다.",
    "version": "1.0.0"
  },
  "servers": [
    {
      "url": "http://localhost:3000",
      "description": "Local Development Server"
    }
  ],
  "paths": {
    "/api/oauth/token": {
      "post": {
        "summary": "B2B 업체 Access Token 발급 (Client Credentials Grant)",
        "description": "발급받은 업체 Client ID와 Client Secret으로 24시간 유효한 업체 전용 Bearer Access Token을 발급받습니다.",
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["grant_type", "client_id", "client_secret"],
                "properties": {
                  "grant_type": { "type": "string", "example": "client_credentials" },
                  "client_id": { "type": "string", "example": "partner_minstudio" },
                  "client_secret": { "type": "string", "example": "secret_minstudio_key123" }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "Access Token 발급 성공",
            "content": {
              "application/json": {
                "example": {
                  "access_token": "comp_at_89f21a...",
                  "token_type": "Bearer",
                  "expires_in": 86400,
                  "scope": "read,write",
                  "company_name": "민스튜디오 엔터테인먼트",
                  "company_id": 1
                }
              }
            }
          },
          "401": { "description": "인증 실패" }
        }
      }
    },
    "/api/v1/movies": {
      "get": {
        "summary": "업체 영화 목록 조회",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": {
            "description": "조회 성공",
            "content": {
              "application/json": {
                "example": {
                  "success": true,
                  "message": "[민스튜디오 엔터테인먼트] 업체 전용 영화 목록 조회 완료",
                  "count": 2,
                  "data": [
                    {
                      "MOVIE_ID": 1,
                      "TITLE": "인터스텔라 (민스튜디오 배급)",
                      "ORIGINAL_TITLE": "Interstellar",
                      "RUNNING_TIME": 169,
                      "PLOT": "시공간을 탐험하는 인류의 이야기"
                    }
                  ]
                }
              }
            }
          }
        }
      },
      "post": {
        "summary": "자사 신규 영화 데이터 등록",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["title"],
                "properties": {
                  "title": { "type": "string", "example": "오펜하이머" },
                  "original_title": { "type": "string", "example": "Oppenheimer" },
                  "running_time": { "type": "integer", "example": 180 },
                  "plot": { "type": "string", "example": "줄거리 내용..." }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "등록 성공" }
        }
      }
    },
    "/api/v1/companies/me": {
      "get": {
        "summary": "내 업체 프로필 & API 호출 실시간 로그 조회",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "프로필 및 호출 로그 조회 성공" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT/OAuth2 Token"
      }
    }
  }
}
```

---

## 📋 2. 엔드포인트별 Swagger 규격 요약표

### 1. `POST /api/oauth/token` (Access Token 발급)
- **Content-Type**: `application/json`
- **Request Body**:
  ```json
  {
    "grant_type": "client_credentials",
    "client_id": "발급받은_CLIENT_ID",
    "client_secret": "발급받은_CLIENT_SECRET"
  }
  ```
- **Response (200 OK)**:
  ```json
  {
    "access_token": "comp_at_...",
    "token_type": "Bearer",
    "expires_in": 86400,
    "company_name": "업체명"
  }
  ```

### 2. `GET /api/v1/movies` (영화 목록 조회)
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
- **Response (200 OK)**:
  ```json
  {
    "success": true,
    "count": 1,
    "data": [
      {
        "MOVIE_ID": 1,
        "TITLE": "영화 제목",
        "RUNNING_TIME": 169
      }
    ]
  }
  ```

### 3. `POST /api/v1/movies` (자사 영화 등록)
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`, `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "title": "영화 제목 (필수)",
    "original_title": "영화 원제",
    "running_time": 120,
    "plot": "영화 상세 줄거리"
  }
  ```

### 4. `GET /api/v1/companies/me` (업체 정보 및 호출 로그 조회)
- **Headers**: `Authorization: Bearer <ACCESS_TOKEN>`
