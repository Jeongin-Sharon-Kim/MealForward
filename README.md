# MealForward

> 세무 리스크 없는 B2B 식대 이월 및 복지 정산 플랫폼 — LLM 기반 세무 가드레일(Guardrail AX)로 현금성 자산 결제를 자동 차단합니다.

당월 미사용 식대 포인트를 임직원이 차월 복지 포인트로 이월해서 쓸 수 있게 하되, "비과세 식대의 현금 유용(상품권 재테크)"이라는 세무 리스크는 LLM이 결제 시점에 자동으로 걸러내는 프로젝트입니다.

## 스크린샷

> `docs/screenshots/` 폴더에 아래 파일명으로 스크린샷을 넣으면 이 섹션에 자동으로 표시됩니다. (README에서 직접 파일을 만들 수 없어 macOS `Cmd+Shift+4`로 캡처해서 넣어주세요.)

| 화면 | 파일 |
|---|---|
| 랜딩 페이지 | `docs/screenshots/landing.png` |
| 임직원 대시보드 (이월 신청) | `docs/screenshots/dashboard.png` |
| 포인트 상점 (분할 결제 + 가드레일 차단) | `docs/screenshots/store.png` |
| 관리자 화면 | `docs/screenshots/admin.png` |
| Swagger UI | `docs/screenshots/swagger.png` |

```markdown
![landing](docs/screenshots/landing.png)
![dashboard](docs/screenshots/dashboard.png)
![store](docs/screenshots/store.png)
![admin](docs/screenshots/admin.png)
![swagger](docs/screenshots/swagger.png)
```

## 기술 스택 & 선택 이유

| 영역 | 기술 | 선택 이유 |
|---|---|---|
| 프론트엔드 | 순수 HTML/CSS/바닐라 JS | 백엔드/도메인 로직이 프로젝트의 핵심이라, 프레임워크 러닝커브 없이 화면 5개를 빠르게 완성하는 데 집중. `localStorage`로 로그인 세션만 관리 |
| 백엔드 | Node.js + Express | REST API를 가장 적은 보일러플레이트로 구현할 수 있어 2.5일 일정에 적합 |
| DB | **PostgreSQL** | 실무에서 가장 널리 쓰이는 RDBMS 중 하나를 직접 다뤄보기 위해 채택. SQLite 대신 PostgreSQL을 선택해 실제 서버-클라이언트 DB 연결(Pool), 트랜잭션 경계, 외래키 제약을 경험함 |
| LLM 연동 | OpenAI `gpt-4o-mini` / Anthropic `claude-sonnet-5` (JSON 모드) | 상품명 텍스트만으로 "현금화 가능한 자산인지"를 판단해야 해서, 고정된 키워드 블랙리스트보다 문맥을 이해하는 LLM이 적합하다고 판단. 두 프로바이더를 모두 지원하고, API 키가 없을 때는 룰 기반 폴백으로 자동 전환되게 해 데모 안정성 확보 |
| API 문서 | OpenAPI 3.0 + Swagger UI | 명세를 코드와 분리해 관리하고, 프론트 개발자가 API를 바로 테스트해볼 수 있게 함 |
| 인증 | 자체 구현 (scrypt 해시 + 역할 분리) | 임직원/관리자 회원가입 절차를 분리하고, 관리자는 사전 발급된 인증 키가 있어야 가입되도록 해 실무의 "관리자 권한 승인 프로세스"를 흉내냄 |

### 설계상 트레이드오프

- **`server/data/seed.json`을 PostgreSQL의 미러로 유지**: PostgreSQL이 실제 소스지만(서버 재시작해도 데이터 유지, DBeaver로 직접 조회 가능), 매 쓰기 요청마다 전체 테이블을 `seed.json`에도 다시 덤프합니다. 에디터에서 데이터 변화를 바로 확인하고 싶다는 요구와 "진짜 DB"를 쓰고 싶다는 요구를 동시에 만족시키기 위한 선택입니다. 실무였다면 이런 이중 쓰기는 하지 않았을 거예요 (한쪽이 실패하면 불일치가 생기므로) — 이 프로젝트에서는 학습/시연 목적의 트레이드오프임을 명시합니다.
- **세션 관리가 간단함**: JWT나 서명된 쿠키 대신 로그인 응답의 `id`를 `localStorage`에 저장하고 관리자 API 호출 시 `x-admin-id` 헤더로 전달합니다. 프로덕션 수준의 보안은 아니며, 다음 단계 과제로 남겨둠.

## 실행 방법

### 1. PostgreSQL 준비
```bash
brew install postgresql@17   # 이미 설치되어 있다면 생략
brew services start postgresql@17
createdb mealforward
```

### 2. 환경 변수 설정
```bash
cp .env.example .env
# .env를 열어 OPENAI_API_KEY 또는 ANTHROPIC_API_KEY, ADMIN_SIGNUP_KEY를 채워주세요.
# DATABASE_URL은 기본값(postgresql://localhost:5432/mealforward)을 그대로 쓰면 됩니다.
```

### 3. 서버 실행
```bash
npm install
npm start
```
- 서비스: http://localhost:3000
- Swagger UI: http://localhost:3000/api-docs

첫 실행 시 `db/schema.sql`로 테이블을 만들고, `server/data/seed.json`의 데이터로 초기 시드를 채웁니다. 이후에는 PostgreSQL에 데이터가 있으면 재시드하지 않습니다.

## 데모 계정

| 역할 | 이메일 | 비밀번호 |
|---|---|---|
| 임직원 | jeongin.kim@example.com | demo1234 |
| 관리자 | admin@example.com | admin1234 |

## 주요 기능

- **식대 이월**: 당월 미사용 식대를 1-Click으로 차월 복지 포인트(`FLEXI_MEAL`)로 전환, 중복 신청은 `409`로 차단
- **분할 결제**: 상품 하나를 일반 복지 포인트(`GENERAL`)와 이월 포인트로 나눠서 결제 가능
- **Guardrail AX**: 이월 포인트로 결제하는 금액에 대해서만 LLM이 "현금화 가능 자산인지" 실시간 판단 → 차단 시 `400` + 사유/신뢰도 반환. 일반 복지 포인트 결제는 검증 대상 아님
- **관리자 대시보드**: 전사 이월 현황, AI 차단 건수/절감액 KPI, 연간 정산 승인, 이월 포인트 소멸 배치(수동 트리거)

## 폴더 구조

```
server/        Express 백엔드 (routes, db, guardrail, auth)
public/        프론트엔드 (로그인/회원가입/대시보드/상점/관리자)
spec/          OpenAPI 명세 (openapi.yaml)
db/            스키마(schema.sql, schema.dbml), ERD(erd.puml)
```
