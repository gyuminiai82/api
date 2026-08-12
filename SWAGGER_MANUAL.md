# 📄 OpenAPI 3.0 (Swagger) Board & OAuth 2.0 API 표준 명세서

이 문서는 외부 개발사나 타 개발자에게 **통째로 전달(Copy & Paste)하여 자동 코드 생성(Swagger Codegen, Postman Import, OpenAPI UI 등) 및 연동 구현에 바로 사용할 수 있는 OpenAPI 3.0 표준 규격서**입니다.

---

## 🛠️ 1. Postman / Swagger UI Import용 OpenAPI 3.0 JSON Spec

아래 JSON 전체를 복사하여 **Postman (Import > Raw text)** 또는 **Swagger Editor**에 붙여넣으면 즉시 모든 API 컬렉션과 클라이언트 코드가 자동 생성됩니다.

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Hierarchical Board & Comments REST API Specification",
    "description": "페이징 처리 및 계층형 게시판, 계층형 답글/댓글을 제공하는 REST API 규격서입니다.",
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
            "description": "Access Token 발급 성공"
          }
        }
      }
    },
    "/api/v1/posts": {
      "get": {
        "summary": "계층형 게시글 목록 조회 (페이징 & 검색)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 10 } },
          { "name": "search", "in": "query", "schema": { "type": "string" } },
          { "name": "searchType", "in": "query", "schema": { "type": "string", "enum": ["title", "content", "author", "all"], "default": "all" } }
        ],
        "responses": {
          "200": { "description": "조회 성공 (계층 구조 및 페이징 객체 포함)" },
          "401": { "description": "인증 실패 (Bearer 토큰 미제출 또는 만료)" }
        }
      },
      "post": {
        "summary": "게시글 또는 계층형 답글 작성",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["title", "content"],
                "properties": {
                  "title": { "type": "string", "example": "게시글 제목" },
                  "content": { "type": "string", "example": "게시글 내용입니다." },
                  "author_name": { "type": "string", "example": "작성자" },
                  "parent_id": { "type": "integer", "description": "답글 작성을 위한 상위 게시글 ID (원글인 경우 생략)", "example": null }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "작성 성공" },
          "401": { "description": "인증 실패 (Bearer 토큰 미제출 또는 만료)" }
        }
      }
    },
    "/api/v1/posts/{id}": {
      "get": {
        "summary": "게시글 상세 조회 (조회수 1 증가)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "상세 정보 반환" },
          "401": { "description": "인증 실패" },
          "404": { "description": "게시글 없음" }
        }
      },
      "put": {
        "summary": "게시글 수정",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": { "type": "string" },
                  "content": { "type": "string" },
                  "author_name": { "type": "string" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "수정 성공" },
          "401": { "description": "인증 실패" },
          "403": { "description": "타 업체 게시글 수정 권한 없음" }
        }
      },
      "delete": {
        "summary": "게시글 및 하위 답글 삭제 (논리 삭제)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "삭제 성공" },
          "401": { "description": "인증 실패" },
          "403": { "description": "타 업체 게시글 삭제 권한 없음" }
        }
      }
    },
    "/api/v1/posts/{id}/comments": {
      "get": {
        "summary": "게시글 하위 계층형 댓글 목록 조회 (페이징)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } },
          { "name": "page", "in": "query", "schema": { "type": "integer", "default": 1 } },
          { "name": "limit", "in": "query", "schema": { "type": "integer", "default": 20 } }
        ],
        "responses": {
          "200": { "description": "조회 성공" },
          "401": { "description": "인증 실패" }
        }
      },
      "post": {
        "summary": "댓글 또는 계층형 답글 댓글(대댓글) 작성",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["content"],
                "properties": {
                  "content": { "type": "string", "example": "댓글 내용입니다." },
                  "author_name": { "type": "string", "example": "댓글작성자" },
                  "parent_id": { "type": "integer", "description": "상위 댓글 ID (대댓글인 경우 입력)", "example": null }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "댓글 작성 성공" },
          "401": { "description": "인증 실패" }
        }
      }
    },
    "/api/v1/comments/{commentId}": {
      "get": {
        "summary": "댓글 / 대댓글 상세 조회",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "commentId", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "조회 성공" },
          "401": { "description": "인증 실패" }
        }
      },
      "put": {
        "summary": "댓글 수정",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "commentId", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "content": { "type": "string", "example": "수정할 댓글 내용" },
                  "author_name": { "type": "string", "example": "수정자명" }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "수정 성공" },
          "401": { "description": "인증 실패" },
          "403": { "description": "타 업체 댓글 수정 권한 없음" }
        }
      },
      "delete": {
        "summary": "댓글 및 하위 대댓글 삭제 (논리 삭제)",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "commentId", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "삭제 성공" },
          "401": { "description": "인증 실패" },
          "403": { "description": "타 업체 댓글 삭제 권한 없음" }
        }
      }
    },
    "/api/v1/todos": {
      "get": {
        "summary": "B2B 파트너 TODO 목록 조회",
        "security": [{ "bearerAuth": [] }],
        "responses": {
          "200": { "description": "조회 성공" }
        }
      },
      "post": {
        "summary": "신규 TODO 항목 등록",
        "security": [{ "bearerAuth": [] }],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "required": ["title"],
                "properties": {
                  "title": { "type": "string", "example": "할일 내용" }
                }
              }
            }
          }
        },
        "responses": {
          "201": { "description": "등록 성공" }
        }
      }
    },
    "/api/v1/todos/{id}": {
      "put": {
        "summary": "TODO 항목 완료 상태 / 제목 수정",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "type": "object",
                "properties": {
                  "title": { "type": "string" },
                  "is_completed": { "type": "string", "enum": ["Y", "N"] }
                }
              }
            }
          }
        },
        "responses": {
          "200": { "description": "수정 성공" }
        }
      },
      "delete": {
        "summary": "TODO 항목 삭제",
        "security": [{ "bearerAuth": [] }],
        "parameters": [
          { "name": "id", "in": "path", "required": true, "schema": { "type": "integer" } }
        ],
        "responses": {
          "200": { "description": "삭제 성공" }
        }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "bearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      }
    }
  }
}
```
