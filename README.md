# 🏢 B2B 파트너 업체 OAuth 2.0 API 프로젝트

본 프로젝트는 개별 사용자가 아닌 **업체/기업(Company/Partner) 단위로 OAuth 2.0 Client Credentials 인증**을 받아 API를 호출하고 자사 데이터를 연동하는 **B2B OAuth 2.0 API 시스템**입니다.

---

## 🌐 1. 대화형 B2B API 대시보드
개발 서버(`npm run dev`) 실행 후 브라우저에서 [http://localhost:3000](http://localhost:3000)에 접속하시면 **B2B 파트너 대화형 API 테스트 콘솔**을 통해 브라우저에서 즉시 토큰 발급 및 업체별 API 연동을 실습하실 수 있습니다.

---

## 🔑 2. 사전 등록된 파트너 업체 계정

| 업체명 | Client ID | Client Secret |
| :--- | :--- | :--- |
| **민스튜디오 엔터테인먼트** | `partner_minstudio` | `secret_minstudio_key123` |
| **시네마 파트너스** | `partner_cinema` | `secret_cinema_key999` |

---

## 📋 3. B2B 엔드포인트 목록

* `POST /api/oauth/companies`: 신규 파트너 업체 등록 및 Client ID / Secret 발급
* `POST /api/oauth/token`: B2B 업체 Access Token 발급 (`grant_type=client_credentials`)
* `GET /api/v1/movies`: 업체 영화 목록 조회 (Bearer 업체 토큰 전달 시 해당 업체 데이터 필터링)
* `POST /api/v1/movies`: 자사 신규 영화 등록 (**Header: `Authorization: Bearer <COMPANY_TOKEN>` 필수**)
* `GET /api/v1/companies/me`: 내 업체 프로필 및 API 실시간 호출 로그 조회 (**Header: `Authorization: Bearer <COMPANY_TOKEN>` 필수**)
