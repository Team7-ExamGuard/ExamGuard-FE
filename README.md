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

## mock 서버

API 명세는 [docs/api-spec.md](docs/api-spec.md)에 있고, mock은 이를 따릅니다. 데이터는 localStorage(`mock-db`)에 저장돼 새로고침해도 유지됩니다.

- 계정 (비밀번호 모두 `1234`): `student1`, `student2`, `student3`, `admin`
- 시험 코드: `OPEN01` 진행 중, `WAIT01` 3분 뒤 시작, `DONE01` 종료
- 초기화: 브라우저 콘솔에서 `resetMockDb()` (예시 시험 시각도 현재 기준으로 다시 만들어짐)

## 구조

```
src/
├─ api/          # API 호출 (client.js 공통 래퍼, mock/ 가짜 서버)
├─ components/   # 공용 컴포넌트
├─ pages/        # 로그인, student/ 4개, admin/ 3개 화면
└─ utils/        # localStorage, 시간 포맷
```
