'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Company {
  COMPANY_ID: number;
  COMPANY_NAME: string;
  BUSINESS_NUMBER: string;
  CLIENT_ID: string;
  CLIENT_SECRET: string;
  STATUS: 'ACTIVE' | 'SUSPENDED';
  DAILY_LIMIT: number;
  TOTAL_CALLS: number;
  CREATED_AT: string;
}

interface ApiLog {
  LOG_ID: number;
  COMPANY_NAME: string;
  ENDPOINT: string;
  HTTP_METHOD: string;
  STATUS_CODE: number;
  CREATED_AT: string;
}

export default function AdminDashboardPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [recentLogs, setRecentLogs] = useState<ApiLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // New Company Form State
  const [companyName, setCompanyName] = useState<string>('');
  const [businessNumber, setBusinessNumber] = useState<string>('');
  const [dailyLimit, setDailyLimit] = useState<number>(10000);
  const [createdCredentials, setCreatedCredentials] = useState<any>(null);
  const [rekeyedInfo, setRekeyedInfo] = useState<any>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [copiedKey, setCopiedKey] = useState<string>('');

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/companies');
      const data = await res.json();
      if (data.success) {
        setCompanies(data.companies || []);
        setRecentLogs(data.recentLogs || []);
      }
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_name: companyName,
          business_number: businessNumber,
          daily_limit: dailyLimit,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setCreatedCredentials(data.company);
        setCompanyName('');
        setBusinessNumber('');
        fetchAdminData();
      } else {
        alert(data.message || '업체 등록 실패');
      }
    } catch (err: any) {
      alert('오류 발생: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (companyId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Status update failed:', err);
    }
  };

  const handleRekeySecret = async (companyId: number, name: string) => {
    if (!confirm(`[${name}] 업체의 Client Secret 보안키를 새로 재발급하시겠습니까?\n(기존 Secret은 즉시 사용 불가합니다)`)) return;
    try {
      const res = await fetch(`/api/admin/companies/${companyId}/rekey`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setRekeyedInfo({ name, newSecret: data.new_client_secret });
        fetchAdminData();
      }
    } catch (err) {
      console.error('Rekey failed:', err);
    }
  };

  const handleDeleteCompany = async (companyId: number, name: string) => {
    if (!confirm(`정말로 [${name}] 업체를 완전히 삭제하시겠습니까?`)) return;
    try {
      const res = await fetch(`/api/admin/companies/${companyId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        fetchAdminData();
      }
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(''), 2000);
  };

  const filteredCompanies = companies.filter((c) =>
    c.COMPANY_NAME.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.CLIENT_ID.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeCount = companies.filter((c) => c.STATUS === 'ACTIVE').length;
  const totalCalls = companies.reduce((acc, c) => acc + (c.TOTAL_CALLS || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Top Admin Navigation */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-slate-900/80 border-b border-slate-800 px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-purple-500/25 text-xl">
            🏢
          </div>
          <div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-indigo-300 to-pink-400">
              B2B 파트너 업체 전용 관리자 대시보드
            </h1>
            <p className="text-xs text-slate-400">OAuth 2.0 파트너 가입, 키 발급, 상태 제어 및 호출 로그 관리</p>
          </div>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium border border-slate-700 transition flex items-center space-x-2"
          >
            <span>🌐 B2B API 연동 센터로 이동</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 space-y-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <span className="text-xs text-slate-400 font-medium">총 등록 파트너 업체 수</span>
            <div className="text-3xl font-extrabold text-white mt-1">{companies.length}개사</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <span className="text-xs text-slate-400 font-medium">승인 활성화(ACTIVE) 업체</span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">{activeCount}개사</div>
          </div>
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 backdrop-blur-sm">
            <span className="text-xs text-slate-400 font-medium">누적 총 파트너 API 호출수</span>
            <div className="text-3xl font-extrabold text-indigo-400 mt-1">{totalCalls.toLocaleString()}회</div>
          </div>
        </div>

        {/* Register New Partner Form */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center space-x-2">
            <span>✨ 신규 파트너 업체 가입 & API 자격증명(Client ID/Secret) 즉시 발급</span>
          </h2>

          <form onSubmit={handleRegisterCompany} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">업체명/회사명 (필수)</label>
              <input
                type="text"
                placeholder="예: (주)한국콘텐츠미디어"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">사업자등록번호</label>
              <input
                type="text"
                placeholder="123-45-67890"
                value={businessNumber}
                onChange={(e) => setBusinessNumber(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1">1일 API 호출 허용 한도</label>
              <input
                type="number"
                value={dailyLimit}
                onChange={(e) => setDailyLimit(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white text-xs font-bold rounded-xl transition shadow-lg shadow-purple-500/20 disabled:opacity-50"
              >
                {submitting ? '발급 처리 중...' : '업체 등록 & OAuth 키 생성'}
              </button>
            </div>
          </form>

          {/* Newly Created Credentials Panel */}
          {createdCredentials && (
            <div className="mt-4 p-4 rounded-xl bg-purple-950/40 border border-purple-500/30 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-purple-300">
                  🎉 [{createdCredentials.company_name}] 업체의 OAuth 2.0 API 자격증명이 발급되었습니다!
                </span>
                <button
                  onClick={() => setCreatedCredentials(null)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  닫기
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Client ID:</span>
                    <span className="text-purple-300 font-bold text-xs truncate max-w-[240px] block">{createdCredentials.client_id}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.client_id, 'new-id')}
                    className="px-2 py-1 bg-purple-950 hover:bg-purple-900 border border-purple-500/30 text-purple-200 text-[10px] rounded transition"
                  >
                    {copiedKey === 'new-id' ? '✓ 복사됨' : '📋 복사'}
                  </button>
                </div>
                <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 flex justify-between items-center">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Client Secret:</span>
                    <span className="text-emerald-300 font-bold text-xs truncate max-w-[240px] block">{createdCredentials.client_secret}</span>
                  </div>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.client_secret, 'new-secret')}
                    className="px-2 py-1 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/30 text-emerald-200 text-[10px] rounded transition"
                  >
                    {copiedKey === 'new-secret' ? '✓ 복사됨' : '📋 복사'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {rekeyedInfo && (
            <div className="mt-4 p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 space-y-1">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-emerald-300">
                  🔑 [{rekeyedInfo.name}] 업체의 Client Secret 보안키가 새로 재발급되었습니다.
                </span>
                <button onClick={() => setRekeyedInfo(null)} className="text-xs text-slate-400 hover:text-white">
                  닫기
                </button>
              </div>
              <div className="flex justify-between items-center font-mono">
                <p className="text-xs text-emerald-400 font-bold">New Secret: {rekeyedInfo.newSecret}</p>
                <button
                  onClick={() => copyToClipboard(rekeyedInfo.newSecret, 'rekey-secret')}
                  className="px-2 py-1 bg-emerald-900/50 hover:bg-emerald-800/50 border border-emerald-500/30 text-emerald-200 text-[10px] rounded transition"
                >
                  {copiedKey === 'rekey-secret' ? '✓ 복사됨' : '📋 복사'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Registered Companies Management Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
            <h2 className="text-lg font-bold text-slate-100">🏢 파트너 업체 목록 및 자격증명 통합 관리</h2>
            <input
              type="text"
              placeholder="업체명 또는 Client ID 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 w-64"
            />
          </div>

          {loading ? (
            <div className="text-xs text-slate-400 py-6 text-center">목록 불러오는 중...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-medium">
                    <th className="py-3 px-3 w-12 text-center">ID</th>
                    <th className="py-3 px-3 w-32">업체명</th>
                    <th className="py-3 px-3 w-32">사업자번호</th>
                    <th className="py-3 px-3 w-48">Client ID</th>
                    <th className="py-3 px-3 w-48">Client Secret</th>
                    <th className="py-3 px-3 w-20 text-center">상태</th>
                    <th className="py-3 px-3 w-24 text-center">API 호출수</th>
                    <th className="py-3 px-3 w-40 text-right">상태/키 관리</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredCompanies.map((comp) => (
                    <tr key={comp.COMPANY_ID} className="hover:bg-slate-900/50 transition">
                      <td className="py-3.5 px-3 text-slate-400 text-center font-mono">{comp.COMPANY_ID}</td>
                      <td className="py-3.5 px-3 font-bold text-slate-100 whitespace-nowrap">{comp.COMPANY_NAME}</td>
                      <td className="py-3.5 px-3 text-slate-400 whitespace-nowrap">{comp.BUSINESS_NUMBER || '-'}</td>
                      
                      {/* Client ID with Width Limit & Copy Button */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-purple-300 text-[11px] truncate max-w-[140px] inline-block" title={comp.CLIENT_ID}>
                            {comp.CLIENT_ID}
                          </span>
                          <button
                            onClick={() => copyToClipboard(comp.CLIENT_ID, `cid-${comp.COMPANY_ID}`)}
                            className="px-1.5 py-0.5 bg-purple-950/80 hover:bg-purple-900/80 border border-purple-500/30 text-purple-200 text-[10px] rounded transition flex-shrink-0"
                            title="Client ID 복사"
                          >
                            {copiedKey === `cid-${comp.COMPANY_ID}` ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>

                      {/* Client Secret with Width Limit & Copy Button */}
                      <td className="py-3.5 px-3">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-mono text-emerald-400 text-[11px] truncate max-w-[130px] inline-block" title={comp.CLIENT_SECRET}>
                            {comp.CLIENT_SECRET}
                          </span>
                          <button
                            onClick={() => copyToClipboard(comp.CLIENT_SECRET, `csec-${comp.COMPANY_ID}`)}
                            className="px-1.5 py-0.5 bg-emerald-950/80 hover:bg-emerald-900/80 border border-emerald-500/30 text-emerald-200 text-[10px] rounded transition flex-shrink-0"
                            title="Client Secret 복사"
                          >
                            {copiedKey === `csec-${comp.COMPANY_ID}` ? '✓' : '📋'}
                          </button>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-block ${
                            comp.STATUS === 'ACTIVE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}
                        >
                          {comp.STATUS}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-center font-bold text-indigo-300 whitespace-nowrap">
                        {comp.TOTAL_CALLS || 0}회
                      </td>
                      <td className="py-3.5 px-3 text-right whitespace-nowrap space-x-1">
                        <button
                          onClick={() => handleToggleStatus(comp.COMPANY_ID, comp.STATUS)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-medium transition ${
                            comp.STATUS === 'ACTIVE'
                              ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20'
                              : 'bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                          }`}
                        >
                          {comp.STATUS === 'ACTIVE' ? '정지' : '승인'}
                        </button>

                        <button
                          onClick={() => handleRekeySecret(comp.COMPANY_ID, comp.COMPANY_NAME)}
                          className="px-2 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 text-[10px] font-medium transition"
                        >
                          키 재발급
                        </button>

                        <button
                          onClick={() => handleDeleteCompany(comp.COMPANY_ID, comp.COMPANY_NAME)}
                          className="px-2 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[10px] font-medium transition"
                        >
                          삭제
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Real-time API Call Logs Table */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-6 space-y-4">
          <h2 className="text-lg font-bold text-slate-100">📊 파트너 API 실시간 호출 및 트래킹 로그</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-medium">
                  <th className="py-3 px-4">Log ID</th>
                  <th className="py-3 px-4">호출 파트너 업체명</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Endpoint</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">호출 시간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentLogs.map((log) => (
                  <tr key={log.LOG_ID} className="hover:bg-slate-900/50">
                    <td className="py-3 px-4 text-slate-500">#{log.LOG_ID}</td>
                    <td className="py-3 px-4 font-sans font-bold text-slate-200">
                      {log.COMPANY_NAME}
                    </td>
                    <td className="py-3 px-4 text-indigo-400 font-bold">{log.HTTP_METHOD}</td>
                    <td className="py-3 px-4 text-slate-300">{log.ENDPOINT}</td>
                    <td className="py-3 px-4">
                      <span className="text-emerald-400 font-bold">{log.STATUS_CODE} OK</span>
                    </td>
                    <td className="py-3 px-4 text-right text-slate-500 text-[11px]">
                      {new Date(log.CREATED_AT).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
