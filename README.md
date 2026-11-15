# ExamGuard-FE

온라인 시험 응시·감독 시스템 ExamGuard의 프론트엔드 (React, Create React App)

## 실행

```bash
npm install
cp .env.example .env   # 처음 한 번
npm start      # http://localhost:3000
npm test
npm run build
```

## 환경 변수 (.env)

`.env`는 git에 올리지 않습니다. 항목이 바뀌면 `.env.example`도 같이 수정하세요.

| 이름 | 설명 |
| --- | --- |
| `REACT_APP_API_BASE_URL` | 백엔드 주소 |
| `REACT_APP_USE_MOCK` | `true`면 백엔드 없이 `src/api/mock` 응답 사용 |

mock 계정: `student1 / 1234` (학생), `admin / 1234` (관리자)

## 구조

```
src/
├─ api/          # API 호출 (client.js 공통 래퍼, mock/ 가짜 서버)
├─ components/   # 공용 컴포넌트
├─ pages/        # 로그인, student/ 4개, admin/ 3개 화면
└─ utils/        # localStorage, 시간 포맷
```
