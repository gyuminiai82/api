'use client';

import { useState } from 'react';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'DELETE' | 'PUT' | 'PATCH';
  path: string;
  title: string;
  category: 'B2B OAuth 2.0 Auth' | 'Hierarchical Board API' | 'Hierarchical Comments API' | 'B2B TODO API' | 'Company Portal';
  authRequired: boolean;
  description: string;
  headers?: Record<string, string>;
  bodyExample?: any;
  responseExample?: any;
}

const API_LIST: ApiEndpoint[] = [
  {
    category: 'B2B OAuth 2.0 Auth',
    method: 'POST',
    path: '/api/oauth/token',
    title: '1. B2B 업체 최초 Access Token & Refresh Token 발급 (client_credentials)',
    authRequired: false,
    description: '업체 Client ID와 Client Secret으로 Access Token(24시간 유효) 및 Refresh Token(30일 유효)을 발급받습니다.',
    headers: {
      'Content-Type': 'application/json',
    },
    bodyExample: {
      grant_type: 'client_credentials',
      client_id: 'partner_minstudio',
      client_secret: 'secret_minstudio_key123',
    },
    responseExample: {
      access_token: 'comp_at_89f21a...',
      token_type: 'Bearer',
      expires_in: 86400,
      refresh_token: 'comp_rt_99c31b...',
      refresh_token_expires_in: 2592000,
      scope: 'read,write',
      company_name: '민스튜디오 엔터테인먼트',
      company_id: 1,
    },
  },
  {
    category: 'B2B OAuth 2.0 Auth',
    method: 'POST',
    path: '/api/oauth/token',
    title: '2. Refresh Token으로 Access Token 갱신 (refresh_token)',
    authRequired: false,
    description: '만료된 Access Token 대신 보유한 Refresh Token으로 새로운 Access Token을 갱신 발급받습니다.',
    headers: {
      'Content-Type': 'application/json',
    },
    bodyExample: {
      grant_type: 'refresh_token',
      refresh_token: 'comp_rt_99c31b...',
      client_id: 'partner_minstudio',
      client_secret: 'secret_minstudio_key123',
    },
    responseExample: {
      access_token: 'comp_at_new_77b42a...',
      token_type: 'Bearer',
      expires_in: 86400,
      refresh_token: 'comp_rt_99c31b...',
      scope: 'read,write',
      company_name: '민스튜디오 엔터테인먼트',
      company_id: 1,
    },
  },

  // Hierarchical Board Posts API
  {
    category: 'Hierarchical Board API',
    method: 'GET',
    path: '/api/v1/posts?page=1&limit=10&search=&searchType=all',
    title: '2. 계층형 게시글 목록 조회 (페이징 & 검색)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 계층 구조(START WITH ... CONNECT BY)로 정렬된 게시글 목록 및 페이징을 반환합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      message: '계층형 게시글 목록 조회 성공',
      pagination: {
        page: 1,
        limit: 10,
        totalCount: 2,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      },
      data: [
        {
          POST_ID: 1,
          TITLE: '공지사항 원글입니다.',
          AUTHOR_NAME: '관리자',
          PARENT_ID: null,
          DEPTH: 0,
          VIEW_COUNT: 12,
          COMMENT_COUNT: 3,
          CREATED_AT: '2026-08-11 23:00:00',
        },
      ],
    },
  },
  {
    category: 'Hierarchical Board API',
    method: 'POST',
    path: '/api/v1/posts',
    title: '3. 신규 게시글 또는 답글 게시글 작성 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 원글 작성 시 parent_id 생략, 답글 작성 시 parent_id를 전달합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
      'Content-Type': 'application/json',
    },
    bodyExample: {
      title: '새로운 질문드립니다.',
      content: 'API 페이징 처리는 어떻게 구성되어 있나요?',
      author_name: '홍길동',
      parent_id: null,
    },
    responseExample: {
      success: true,
      message: '신규 게시글이 등록되었습니다.',
      data: {
        title: '새로운 질문드립니다.',
        author_name: '홍길동',
        parent_id: null,
        depth: 0,
      },
    },
  },
  {
    category: 'Hierarchical Board API',
    method: 'GET',
    path: '/api/v1/posts/1',
    title: '4. 게시글 상세 조회 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 게시글 상세 정보를 가져오며 조회수가 1 증가합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      data: {
        POST_ID: 1,
        TITLE: '공지사항 원글입니다.',
        CONTENT: '게시판 시스템 상세 안내 내용...',
        AUTHOR_NAME: '관리자',
        VIEW_COUNT: 13,
        COMMENT_COUNT: 3,
        CREATED_AT: '2026-08-11 23:00:00',
      },
    },
  },
  {
    category: 'Hierarchical Board API',
    method: 'PUT',
    path: '/api/v1/posts/1',
    title: '5. 게시글 / 계층형 답글 수정 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 본인 업체가 작성한 원 게시글 또는 계층형 답글을 수정합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
      'Content-Type': 'application/json',
    },
    bodyExample: {
      title: '[수정] 공지사항 원글 내용 변경',
      content: '수정된 본문 내용입니다.',
      author_name: '홍길동(수정자)',
    },
    responseExample: {
      success: true,
      message: '게시글(또는 답글)이 성공적으로 수정되었습니다.',
    },
  },
  {
    category: 'Hierarchical Board API',
    method: 'DELETE',
    path: '/api/v1/posts/1',
    title: '6. 게시글 및 하위 답글 삭제 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 본인 업체가 작성한 게시글 및 하위 답글을 논리 삭제합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      message: '게시글(및 하위 답글)이 성공적으로 삭제되었습니다.',
    },
  },

  // Hierarchical Comments API
  {
    category: 'Hierarchical Comments API',
    method: 'GET',
    path: '/api/v1/posts/1/comments?page=1&limit=20',
    title: '7. 게시글 하위 계층형 댓글 목록 조회 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 특정 게시글의 계층형 댓글 목록을 조회합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      message: '계층형 댓글 목록 조회 성공',
      data: [],
    },
  },
  {
    category: 'Hierarchical Comments API',
    method: 'POST',
    path: '/api/v1/posts/1/comments',
    title: '8. 댓글 또는 대댓글 작성 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 댓글 또는 대댓글(답글 댓글)을 작성합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
      'Content-Type': 'application/json',
    },
    bodyExample: {
      content: '대댓글(답글)을 작성합니다.',
      author_name: '이영희',
      parent_id: 1,
    },
    responseExample: {
      success: true,
      message: '대댓글(답글)이 등록되었습니다.',
    },
  },
  {
    category: 'Hierarchical Comments API',
    method: 'GET',
    path: '/api/v1/comments/1',
    title: '9. 댓글 / 대댓글 단건 상세 조회 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 특정 댓글 또는 대댓글의 상세 정보를 조회합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      data: {},
    },
  },
  {
    category: 'Hierarchical Comments API',
    method: 'PUT',
    path: '/api/v1/comments/1',
    title: '10. 댓글 / 대댓글 수정 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 작성한 댓글 또는 대댓글을 수정합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
      'Content-Type': 'application/json',
    },
    bodyExample: {
      content: '수정된 댓글 내용입니다.',
    },
    responseExample: {
      success: true,
      message: '댓글이 성공적으로 수정되었습니다.',
    },
  },
  {
    category: 'Hierarchical Comments API',
    method: 'DELETE',
    path: '/api/v1/comments/1',
    title: '11. 댓글 및 하위 대댓글 삭제 (토큰 필수)',
    authRequired: true,
    description: 'OAuth 2.0 Bearer 토큰이 필수입니다. 작성한 댓글 및 하위 대댓글을 논리 삭제합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      message: '댓글(및 하위 대댓글)이 성공적으로 삭제되었습니다.',
    },
  },

  // B2B TODO API
  {
    category: 'B2B TODO API',
    method: 'GET',
    path: '/api/v1/todos',
    title: '11. B2B 업체 할일(TODO) 목록 조회',
    authRequired: false,
    description: '업체 전용 Bearer 토큰을 헤더에 전달하거나 전체 파트너 업체의 TODO 목록을 필터링하여 조회합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
    },
    responseExample: {
      success: true,
      count: 2,
      data: [
        {
          TODO_ID: 1,
          COMPANY_ID: 1,
          TITLE: 'B2B 파트너 API 통합 문서 검토',
          IS_COMPLETED: 'N',
          CREATED_AT: '2026-08-11 23:00:00',
        },
      ],
    },
  },
  {
    category: 'B2B TODO API',
    method: 'POST',
    path: '/api/v1/todos',
    title: '12. 신규 할일(TODO) 등록 (업체 토큰 필수)',
    authRequired: true,
    description: '발급받은 파트너 업체 전용 Bearer 토큰을 이용해 자사 TODO 데이터를 신규 등록합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
      'Content-Type': 'application/json',
    },
    bodyExample: {
      title: '새로운 시스템 통합 테스트 진행하기',
    },
    responseExample: {
      success: true,
      message: '[민스튜디오 엔터테인먼트] 신규 TODO가 성공적으로 등록되었습니다.',
      todo: {
        title: '새로운 시스템 통합 테스트 진행하기',
        is_completed: 'N',
      },
    },
  },
  {
    category: 'B2B TODO API',
    method: 'PUT',
    path: '/api/v1/todos/1',
    title: '13. 할일(TODO) 완료 체크 및 내용 수정 (업체 토큰 필수)',
    authRequired: true,
    description: '자사 TODO 항목의 완료 상태(is_completed: Y/N) 또는 제목을 수정합니다.',
    headers: {
      Authorization: 'Bearer <COMPANY_ACCESS_TOKEN>',
      'Content-Type': 'application/json',
    },
    bodyExample: {
      is_completed: 'Y',
      title: '[완료] 새로운 시스템 통합 테스트 진행하기',
    },
    responseExample: {
      success: true,
      message: 'TODO 상태가 수정되었습니다.',
    },
  },
  {
    category: 'B2B TODO API',
    method: 'DELETE',
    path: '/api/v1/todos/1',
    title: '14. 할일(TODO) 데이터 삭제 (업체 토큰 필수)',
    authRequired: true,
    description: '자사 소유의 TODO 데이터를 삭제합니다.',
    headers: {},
    responseExample: {
      success: true,
      message: 'TODO 항목이 삭제되었습니다.',
    },
  },
];

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [activeToken, setActiveToken] = useState<string>('');
  const [customPath, setCustomPath] = useState<string>('');
  const [customHeaders, setCustomHeaders] = useState<string>('{}');
  const [customBody, setCustomBody] = useState<string>('{}');
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [responseOutput, setResponseOutput] = useState<any>(null);
  const [responseStatus, setResponseStatus] = useState<number | null>(null);

  // 코드 긁어가기 스니펫 탭 상태 ('fetch' | 'axios' | 'curl')
  const [snippetType, setSnippetType] = useState<'fetch' | 'axios' | 'curl'>('axios');
  const [copied, setCopied] = useState<boolean>(false);

  const categories = ['All', 'B2B OAuth 2.0 Auth', 'Hierarchical Board API', 'Hierarchical Comments API', 'B2B TODO API'];

  const filteredApis =
    selectedCategory === 'All' ? API_LIST : API_LIST.filter((api) => api.category === selectedCategory);

  const selectEndpoint = (endpoint: ApiEndpoint) => {
    setSelectedEndpoint(endpoint);
    setCustomPath(endpoint.path);
    setCustomHeaders(JSON.stringify(endpoint.headers || {}, null, 2));
    setCustomBody(JSON.stringify(endpoint.bodyExample || {}, null, 2));
    setResponseOutput(null);
    setResponseStatus(null);
  };

  const handleRunApi = async () => {
    if (!selectedEndpoint && !customPath) return;

    setLoading(true);
    setResponseOutput(null);
    setResponseStatus(null);

    try {
      const method = selectedEndpoint?.method || 'GET';
      const url = customPath;

      let headersObj: Record<string, string> = {};
      try {
        headersObj = JSON.parse(customHeaders);
      } catch {
        headersObj = {};
      }

      if (activeToken) {
        headersObj['Authorization'] = `Bearer ${activeToken}`;
      }

      const options: RequestInit = {
        method,
        headers: headersObj,
      };

      if (method !== 'GET' && customBody && customBody !== '{}') {
        options.body = customBody;
      }

      const res = await fetch(url, options);
      setResponseStatus(res.status);
      const data = await res.json();
      setResponseOutput(data);

      if (data.access_token) {
        setActiveToken(data.access_token);
      }
    } catch (err: any) {
      setResponseOutput({ error: 'fetch_failed', message: err.message });
    } finally {
      setLoading(false);
    }
  };

  // 긁어갈(복사할) 코드 생성 헬퍼
  const generateSnippet = () => {
    if (!selectedEndpoint) return '';
    const method = selectedEndpoint.method;
    const url = `http://localhost:3000${customPath}`;

    let headersObj: Record<string, string> = {};
    try {
      headersObj = JSON.parse(customHeaders);
    } catch {
      headersObj = {};
    }
    if (activeToken) {
      headersObj['Authorization'] = `Bearer ${activeToken}`;
    }

    if (snippetType === 'curl') {
      let headerStr = Object.entries(headersObj)
        .map(([k, v]) => `  -H "${k}: ${v}"`)
        .join(' \\\n');
      let bodyStr = method !== 'GET' && customBody && customBody !== '{}' ? ` \\\n  -d '${customBody.replace(/\n/g, '')}'` : '';
      return `curl -X ${method} "${url}" \\\n${headerStr}${bodyStr}`;
    }

    if (snippetType === 'axios') {
      let headersConfig = Object.keys(headersObj).length > 0 ? `,\n  headers: ${JSON.stringify(headersObj, null, 4)}` : '';
      if (method === 'GET') {
        return `import axios from 'axios';\n\nconst response = await axios.get('${url}'${headersConfig});\nconsole.log(response.data);`;
      }
      return `import axios from 'axios';\n\nconst response = await axios.${method.toLowerCase()}('${url}', ${customBody || '{}'}${headersConfig});\nconsole.log(response.data);`;
    }

    // fetch
    let optionsObj: any = { method, headers: headersObj };
    if (method !== 'GET' && customBody && customBody !== '{}') {
      optionsObj.body = JSON.parse(customBody || '{}');
    }
    return `const response = await fetch('${url}', {\n  method: '${method}',\n  headers: ${JSON.stringify(headersObj, null, 4)}${
      method !== 'GET' && customBody && customBody !== '{}' ? `,\n  body: JSON.stringify(${customBody})` : ''
    }\n});\nconst data = await response.json();\nconsole.log(data);`;
  };

  const copyToClipboard = () => {
    const text = generateSnippet();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 md:p-10">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-10 border-b border-slate-800 pb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <span className="px-3 py-1 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-full text-xs font-semibold uppercase tracking-wider">
              API Service v1.0
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              계층형 게시판 & B2B API 센터
            </h1>
          </div>
          <p className="text-slate-400 mt-2 text-sm">
            Oracle DB 계층형 쿼리(START WITH ... CONNECT BY) 및 페이징 처리, B2B TODO REST API 센터입니다.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-xl border border-slate-800">
          <div className="text-xs">
            <div className="text-slate-400">발급된 Active Bearer Token:</div>
            <div className="font-mono text-indigo-300 font-medium truncate max-w-[220px]">
              {activeToken ? activeToken : '없음 (OAuth 토큰 발급 API 실행 시 자동 등록)'}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Grid */}
      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Sidebar: API Endpoints List */}
        <section className="lg:col-span-5 space-y-4">
          {/* Category Tabs */}
          <div className="flex flex-wrap gap-2 mb-4">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                  selectedCategory === cat
                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="space-y-3 max-h-[750px] overflow-y-auto pr-2 custom-scrollbar">
            {filteredApis.map((api, idx) => {
              const isSelected = selectedEndpoint?.title === api.title;
              return (
                <div
                  key={idx}
                  onClick={() => selectEndpoint(api)}
                  className={`p-4 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-indigo-500 shadow-md shadow-indigo-500/10'
                      : 'bg-slate-900/50 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span
                      className={`px-2.5 py-0.5 rounded text-xs font-bold font-mono ${
                        api.method === 'GET'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : api.method === 'POST'
                          ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                          : api.method === 'PUT'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {api.method}
                    </span>
                    <span className="text-[11px] text-slate-500">{api.category}</span>
                  </div>
                  <h3 className="text-sm font-semibold text-slate-200 mb-1">{api.title}</h3>
                  <div className="text-xs font-mono text-slate-400 truncate">{api.path}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Panel: Interactive API Tester & Inspector & Code Generator */}
        <section className="lg:col-span-7 space-y-6">
          {selectedEndpoint ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6 space-y-6">
              {/* Endpoint Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                <div>
                  <span className="text-xs text-indigo-400 font-semibold">{selectedEndpoint.category}</span>
                  <h2 className="text-xl font-bold text-white mt-1">{selectedEndpoint.title}</h2>
                  <p className="text-xs text-slate-400 mt-1">{selectedEndpoint.description}</p>
                </div>
                <button
                  onClick={handleRunApi}
                  disabled={loading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs transition shadow-lg shadow-indigo-600/30 disabled:opacity-50 flex items-center justify-center gap-2 self-start sm:self-auto min-w-[110px]"
                >
                  {loading ? (
                    <span>호출 중...</span>
                  ) : (
                    <>
                      <span>API 실행</span>
                      <span>🚀</span>
                    </>
                  )}
                </button>
              </div>

              {/* URL & Path Input */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Target Endpoint URL</label>
                <div className="flex gap-2">
                  <span className="px-3 py-2 bg-slate-950 border border-slate-800 text-indigo-400 font-mono text-xs rounded-lg flex items-center font-bold">
                    {selectedEndpoint.method}
                  </span>
                  <input
                    type="text"
                    value={customPath}
                    onChange={(e) => setCustomPath(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              {/* Request Headers */}
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Request Headers (JSON)</label>
                <textarea
                  rows={2}
                  value={customHeaders}
                  onChange={(e) => setCustomHeaders(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Request Body (If Method != GET) */}
              {selectedEndpoint.method !== 'GET' && (
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1">Request Body (JSON)</label>
                  <textarea
                    rows={4}
                    value={customBody}
                    onChange={(e) => setCustomBody(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs font-mono text-slate-300 focus:outline-none focus:border-indigo-500 resize-none"
                  />
                </div>
              )}

              {/* 📋 Copy Code Snippet Generator Section */}
              <div className="border-t border-slate-800 pt-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                      ⚡ 클라이언트 연동 코드 (바로 긁어가기)
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Snippet Format Selector */}
                    <div className="bg-slate-950 p-1 rounded-lg border border-slate-800 flex gap-1">
                      {(['axios', 'fetch', 'curl'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => setSnippetType(type)}
                          className={`px-2.5 py-1 rounded text-[11px] font-mono uppercase font-bold transition ${
                            snippetType === type
                              ? 'bg-indigo-600 text-white'
                              : 'text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>

                    {/* Copy Button */}
                    <button
                      onClick={copyToClipboard}
                      className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition border border-slate-700 flex items-center gap-1.5"
                    >
                      <span>{copied ? '✅ 복사됨!' : '📋 코드 복사'}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 max-h-[220px] overflow-y-auto custom-scrollbar">
                  <pre className="text-xs font-mono text-indigo-300 whitespace-pre-wrap">
                    {generateSnippet()}
                  </pre>
                </div>
              </div>

              {/* Response Inspector */}
              <div className="border-t border-slate-800 pt-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Response Data</h3>
                  {responseStatus && (
                    <span
                      className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                        responseStatus >= 200 && responseStatus < 300
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      HTTP Status: {responseStatus}
                    </span>
                  )}
                </div>

                <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 max-h-[300px] overflow-y-auto custom-scrollbar">
                  {loading ? (
                    <div className="text-center py-8 text-slate-500 text-xs">서버에서 응답을 수신하는 중입니다...</div>
                  ) : responseOutput ? (
                    <pre className="text-xs font-mono text-emerald-400 whitespace-pre-wrap">
                      {JSON.stringify(responseOutput, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      [API 실행] 버튼을 눌러 실제 Oracle DB 및 서버 응답을 테스트해보세요.
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900/50 rounded-2xl border border-slate-800/80 p-12 text-center text-slate-500">
              <div className="text-4xl mb-3">📌</div>
              <p className="text-sm font-medium">좌측 목록에서 테스트할 API 엔드포인트를 선택해주세요.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
