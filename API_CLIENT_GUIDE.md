# 📦 Frontend & Node.js 클라이언트용 API 연동 코드 가이드 (Copy & Paste SDK)

프론트엔드(React, Next.js, Vue 등) 또는 Node.js 애플리케이션에서 **즉시 복사(Copy & Paste)하여 바로 사용할 수 있는 모듈화된 TypeScript API 서비스 코드 세트**입니다.

---

## 1. 타입 정의 및 axios/fetch 베이스 API 클라이언트 (`src/api/client.ts`)

```typescript
import axios from 'axios';

// API 기본 URL (환경변수 또는 개발서버 주소)
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export const apiClient = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Bearer Token 동적 설정 헬퍼
export const setAuthToken = (token: string | null) => {
  if (token) {
    apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete apiClient.defaults.headers.common['Authorization'];
  }
};
```

---

## 2. 계층형 게시판 & 계층형 답글 API 모듈 (`src/api/boardApi.ts`)

```typescript
import { apiClient } from './client';

// ===== [타입 정의] =====
export interface Pagination {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface Post {
  POST_ID: number;
  COMPANY_ID?: number | null;
  TITLE: string;
  CONTENT?: string;
  AUTHOR_NAME: string;
  PARENT_ID?: number | null;
  GROUP_ID?: number | null;
  DEPTH: number;
  SORT_ORDER: number;
  VIEW_COUNT: number;
  COMMENT_COUNT?: number;
  IS_DELETED: string;
  CREATED_AT: string;
  UPDATED_AT: string;
  HIERARCHY_LEVEL?: number;
}

export interface Comment {
  COMMENT_ID: number;
  POST_ID: number;
  COMPANY_ID?: number | null;
  AUTHOR_NAME: string;
  CONTENT: string;
  PARENT_ID?: number | null;
  GROUP_ID?: number | null;
  DEPTH: number;
  SORT_ORDER: number;
  IS_DELETED: string;
  CREATED_AT: string;
  UPDATED_AT: string;
  HIERARCHY_LEVEL?: number;
}

export interface GetPostsParams {
  page?: number;
  limit?: number;
  search?: string;
  searchType?: 'title' | 'content' | 'author' | 'all';
}

export interface CreatePostPayload {
  title: string;
  content: string;
  author_name?: string;
  parent_id?: number | null; // 계층형 답글 게시글 작성 시 부모 글 POST_ID 지정
}

export interface CreateCommentPayload {
  content: string;
  author_name?: string;
  parent_id?: number | null; // 대댓글(답글 댓글) 작성 시 상위 COMMENT_ID 지정
}

// ===== [API 서비스 함수 모음] =====
export const boardApi = {
  /**
   * 계층형 게시글 목록 조회 (페이징 & 검색)
   */
  async getPosts(params: GetPostsParams = {}) {
    const response = await apiClient.get<{
      success: boolean;
      pagination: Pagination;
      data: Post[];
    }>('/api/v1/posts', { params });
    return response.data;
  },

  /**
   * 게시글/계층형 답글 등록
   */
  async createPost(payload: CreatePostPayload) {
    const response = await apiClient.post('/api/v1/posts', payload);
    return response.data;
  },

  /**
   * 게시글 상세 조회 (조회수 1 증가)
   */
  async getPostDetail(postId: number) {
    const response = await apiClient.get<{
      success: boolean;
      data: Post;
    }>(`/api/v1/posts/${postId}`);
    return response.data;
  },

  /**
   * 게시글 수정
   */
  async updatePost(postId: number, payload: { title: string; content: string }) {
    const response = await apiClient.put(`/api/v1/posts/${postId}`, payload);
    return response.data;
  },

  /**
   * 게시글 삭제 (논리 삭제)
   */
  async deletePost(postId: number) {
    const response = await apiClient.delete(`/api/v1/posts/${postId}`);
    return response.data;
  },

  /**
   * 게시글 하위 계층형 댓글 목록 조회 (페이징)
   */
  async getComments(postId: number, page: number = 1, limit: number = 20) {
    const response = await apiClient.get<{
      success: boolean;
      pagination: Pagination;
      data: Comment[];
    }>(`/api/v1/posts/${postId}/comments`, {
      params: { page, limit },
    });
    return response.data;
  },

  /**
   * 댓글 또는 대댓글(답글 댓글) 등록
   */
  async createComment(postId: number, payload: CreateCommentPayload) {
    const response = await apiClient.post(`/api/v1/posts/${postId}/comments`, payload);
    return response.data;
  },

  /**
   * 댓글 수정
   */
  async updateComment(commentId: number, content: string) {
    const response = await apiClient.put(`/api/v1/comments/${commentId}`, { content });
    return response.data;
  },

  /**
   * 댓글 삭제 (논리 삭제)
   */
  async deleteComment(commentId: number) {
    const response = await apiClient.delete(`/api/v1/comments/${commentId}`);
    return response.data;
  },
};
```

---

## 3. B2B TODO API 모듈 (`src/api/todoApi.ts`)

```typescript
import { apiClient } from './client';

export interface Todo {
  TODO_ID: number;
  COMPANY_ID: number;
  TITLE: string;
  IS_COMPLETED: 'Y' | 'N';
  CREATED_AT: string;
  COMPLETED_AT?: string | null;
}

export const todoApi = {
  /**
   * TODO 목록 조회
   */
  async getTodos() {
    const response = await apiClient.get<{
      success: boolean;
      count: number;
      data: Todo[];
    }>('/api/v1/todos');
    return response.data;
  },

  /**
   * 신규 TODO 등록 (Bearer 토큰 헤더 필요)
   */
  async createTodo(title: string) {
    const response = await apiClient.post('/api/v1/todos', { title });
    return response.data;
  },

  /**
   * TODO 완료 상태 / 제목 수정
   */
  async updateTodo(todoId: number, payload: { is_completed?: 'Y' | 'N'; title?: string }) {
    const response = await apiClient.put(`/api/v1/todos/${todoId}`, payload);
    return response.data;
  },

  /**
   * TODO 삭제
   */
  async deleteTodo(todoId: number) {
    const response = await apiClient.delete(`/api/v1/todos/${todoId}`);
    return response.data;
  },
};
```

---

## 4. B2B OAuth 2.0 토큰 발급 모듈 (`src/api/authApi.ts`)

```typescript
import { apiClient, setAuthToken } from './client';

export interface TokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token?: string;
  scope: string;
  company_name: string;
  company_id: number;
}

export const authApi = {
  /**
   * B2B 최초 Access Token & Refresh Token 발급 (Client Credentials Grant)
   */
  async getAccessToken(clientId: string, clientSecret: string) {
    const response = await apiClient.post<TokenResponse>('/api/oauth/token', {
      grant_type: 'client_credentials',
      client_id: clientId,
      client_secret: clientSecret,
    });
    
    // 발급 성공 시 API Client 헤더에 자동 설정
    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
    }
    
    return response.data;
  },

  /**
   * Refresh Token을 통한 Access Token 갱신 (Refresh Token Grant)
   */
  async refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
    const response = await apiClient.post<TokenResponse>('/api/oauth/token', {
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    });

    if (response.data.access_token) {
      setAuthToken(response.data.access_token);
    }

    return response.data;
  },
};
```
