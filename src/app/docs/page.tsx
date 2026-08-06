'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function SwaggerDocsPage() {
  const [openApiSpec, setOpenApiSpec] = useState<string>('로딩 중...');
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    fetch('/openapi.json')
      .then((res) => res.json())
      .then((data) => setOpenApiSpec(JSON.stringify(data, null, 2)))
      .catch((err) => setOpenApiSpec('OpenAPI Spec 로드 실패: ' + err.message));
  }, []);

  const handleCopySpec = () => {
    navigator.clipboard.writeText(openApiSpec);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 space-y-6">
      <header className="flex justify-between items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800 backdrop-blur-sm">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center font-bold text-white shadow-lg text-lg">
            📄
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100">OpenAPI 3.0 (Swagger) Standard Specification</h1>
            <p className="text-xs text-slate-400">외부 개발사에 통째로 복사해서 전달하기 좋은 표준 규격서 (Postman Import 지원)</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopySpec}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-emerald-500/20"
          >
            {copied ? '✓ 복사되었습니다!' : '📋 OpenAPI Spec JSON 통째로 복사'}
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition"
          >
            🌐 연동 대시보드로 이동
          </Link>
        </div>
      </header>

      <main className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-sm font-bold text-slate-200">OpenAPI 3.0 (Swagger) Raw JSON Spec</h2>
          <span className="text-xs font-mono text-emerald-400">Postman / Swagger Editor에 Paste 가능</span>
        </div>
        <pre className="w-full max-h-[calc(100vh-250px)] overflow-y-auto bg-slate-950 border border-slate-800 rounded-xl p-4 font-mono text-xs text-emerald-300 leading-relaxed whitespace-pre-wrap">
          {openApiSpec}
        </pre>
      </main>
    </div>
  );
}
