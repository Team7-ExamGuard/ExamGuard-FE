# ExamGuard API 명세

프론트엔드(`src/api`), mock 서버(`src/api/mock`), 백엔드가 함께 따르는 계약입니다.

## 공통 규칙

- 기본 경로: `/api`
- 인증: 로그인 응답의 `accessToken`을 `Authorization: Bearer <token>` 헤더로 보냄
- 시각: ISO 8601 문자열, 시간대 포함 (예: `2026-11-20T14:00:00+09:00`)
- 서버 시각: 모든 응답에 `Date` 헤더 포함 (클라이언트가 카운트다운 보정에 사용)
- 에러 응답 본문

  ```json
  { "code": "EXAM_CLOSED", "message": "이미 종료된 시험입니다." }
  ```

| 상태 | code | 의미 | 프론트 처리 |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 입력값 오류 | 메시지 표시 |
| 401 | `UNAUTHORIZED` | 토큰 없음·만료 | 로그아웃 후 `/login` |
| 403 | `FORBIDDEN` | 역할 불일치 | 각자 홈으로 |
| 0 | `NETWORK_ERROR` | 서버에 닿지 못함 (프론트 전용) | 재시도 / 오프라인 배너 |

## 상태값

**시험 `Exam.status`**

| 값 | 의미 |
| --- | --- |
| `DRAFT` | 작성 중, 코드 없음, 수정 가능 |
| `PUBLISHED` | 공개됨, 코드 발급, 시작 전 |
| `OPEN` | 진행 중 (`startAt` ≤ 현재 < `endAt`) |
| `CLOSED` | 종료 (`endAt` 지남 또는 조기 종료) |

`PUBLISHED` / `OPEN` / `CLOSED`는 서버가 현재 시각 기준으로 계산해서 내려줍니다.

**응시 `Attempt.status`** (학생 1명 × 시험 1개)

| 값 | 의미 |
| --- | --- |
| `WAITING` | 코드로 입장, 시작 전 |
| `IN_PROGRESS` | 문항을 받아 응시 중 |
| `SUBMITTED` | 제출 완료 (직접 제출 또는 자동 제출) |

**문항 유형 `Question.type`**: `MULTIPLE_CHOICE` (보기 4개), `SHORT_ANSWER`

**답안 값**: 객관식은 보기 인덱스 `0`~`3` (number), 단답형은 문자열

**답안 version**: 응시 1건당 하나의 번호. 클라이언트가 답안을 바꿀 때마다 1씩 올리고, 저장할 때 답안 전체와 함께 보냅니다. 서버는 저장된 version보다 큰 요청만 받아서, 늦게 도착한 옛 저장이 최신 답안을 덮어쓰지 못하게 합니다.

---

## 인증

### `POST /api/auth/login`

요청 `{ "loginId": "student1", "password": "1234" }`

응답 200

```json
{ "loginId": "student1", "name": "김학생", "role": "STUDENT", "accessToken": "..." }
```

| 에러 | code |
| --- | --- |
| 401 | `INVALID_CREDENTIALS` |

---

## 학생

학생은 로그인하면 항상 `/exam/join`으로 갑니다. 응시 중이던 시험도 코드를 다시 입력해서 이어서 봅니다.

### `POST /api/student/exams/join`

요청 `{ "code": "A1B2C3" }`

응답 200 `{ "examId": 1, "attemptStatus": "WAITING" }`

| `attemptStatus` | 이동 |
| --- | --- |
| `WAITING` | `/exam/{examId}/wait` |
| `IN_PROGRESS` | `/exam/{examId}/take` (답안은 서버에서 복원) |

| 에러 | code | 화면 메시지 |
| --- | --- | --- |
| 404 | `EXAM_NOT_FOUND` | 존재하지 않는 시험 코드입니다. |
| 409 | `EXAM_NOT_PUBLISHED` | 아직 공개되지 않은 시험입니다. (코드는 있지만 DRAFT인 경우 대비) |
| 409 | `EXAM_CLOSED` | 이미 종료된 시험입니다. |
| 409 | `ALREADY_SUBMITTED` | 이미 제출한 시험입니다. |

이미 입장한 시험에 다시 입장하면 같은 `examId`를 돌려줍니다 (에러 아님).

### `GET /api/student/exams/{examId}`

대기·응시·완료 화면 공통 정보. 대기 화면은 30초마다 다시 호출합니다.

```json
{
  "id": 1,
  "title": "중간고사",
  "status": "PUBLISHED",
  "startAt": "2026-11-20T14:00:00+09:00",
  "endAt": "2026-11-20T15:00:00+09:00",
  "questionCount": 10,
  "attempt": { "status": "WAITING", "submittedAt": null }
}
```

제한 시간은 `endAt - startAt`으로 계산합니다.

| 에러 | code |
| --- | --- |
| 404 | `EXAM_NOT_FOUND` (입장하지 않은 시험 포함) |

### `GET /api/student/exams/{examId}/questions`

문항 목록. 처음 성공하면 응시 상태가 `IN_PROGRESS`로 바뀝니다.

```json
[
  { "id": 11, "order": 1, "type": "MULTIPLE_CHOICE", "content": "...", "options": ["A", "B", "C", "D"] },
  { "id": 12, "order": 2, "type": "SHORT_ANSWER", "content": "...", "options": null }
]
```

정답은 포함하지 않습니다.

| 에러 | code | 프론트 처리 |
| --- | --- | --- |
| 403 | `EXAM_NOT_STARTED` | 1~2초 뒤 재시도 |
| 409 | `EXAM_CLOSED` | 완료/종료 안내 |
| 409 | `ALREADY_SUBMITTED` | `/exam/{examId}/done` |

### `GET /api/student/exams/{examId}/answers`

서버에 저장된 답안. 응시 화면 진입 시 localStorage 답안과 `version`을 비교해 높은 쪽으로 복원합니다.

```json
{ "version": 7, "answers": { "11": 2, "12": "정답" }, "savedAt": "2026-11-20T14:12:03+09:00" }
```

저장된 적이 없으면 `{ "version": 0, "answers": {}, "savedAt": null }`

### `PUT /api/student/exams/{examId}/answers`

자동 저장. 답안 전체를 보냅니다.

요청

```json
{ "version": 8, "answers": { "11": 2, "12": "정답" }, "saveFailCount": 1 }
```

- `version`: 클라이언트가 변경할 때마다 1씩 올림
- `saveFailCount`: 지난 성공 이후 실패한 저장 횟수 (관리자 현황 표시용)

응답 200 `{ "version": 8, "savedAt": "2026-11-20T14:12:06+09:00" }`

| 에러 | code | 프론트 처리 |
| --- | --- | --- |
| 409 | `STALE_VERSION` | 서버가 더 최신 → 무시 (재시도하지 않음) |
| 409 | `EXAM_CLOSED` | 입력 잠금, 자동 제출 |
| 409 | `ALREADY_SUBMITTED` | `/exam/{examId}/done` |

### `POST /api/student/exams/{examId}/submit`

최종 제출. 직접 제출과 시간 종료 자동 제출 모두 사용합니다.

**제출 유예 시간 30초**: `endAt` 이후 30초까지 도착한 제출은 받습니다. 시간 종료 순간 네트워크가 늦어도 답안을 잃지 않게 하기 위함입니다. 답안 저장(`PUT .../answers`)은 유예 없이 `endAt`에 막힙니다.

요청 `{ "version": 9, "answers": { "11": 2, "12": "정답" } }`

응답 200 `{ "submittedAt": "2026-11-20T14:40:00+09:00" }`

| 에러 | code | 프론트 처리 |
| --- | --- | --- |
| 409 | `ALREADY_SUBMITTED` | `/exam/{examId}/done` (성공으로 취급) |
| 409 | `EXAM_CLOSED` | 유예 시간(30초) 이후 제출 → 종료 안내 |

---

## 관리자

### `GET /api/admin/exams`

```json
[
  {
    "id": 1,
    "title": "중간고사",
    "status": "OPEN",
    "code": "A1B2C3",
    "startAt": "2026-11-20T14:00:00+09:00",
    "endAt": "2026-11-20T15:00:00+09:00",
    "joinedCount": 32
  }
]
```

`DRAFT`는 `code`가 `null`입니다.

### `POST /api/admin/exams`

새 시험 (DRAFT로 생성). 요청 본문은 아래 `PUT`과 같습니다.

응답 201 `{ "id": 3 }`

### `GET /api/admin/exams/{examId}`

편집 화면용 상세 (정답 포함).

```json
{
  "id": 3,
  "title": "기말고사",
  "status": "DRAFT",
  "code": null,
  "startAt": "2026-12-10T10:00:00+09:00",
  "endAt": "2026-12-10T11:00:00+09:00",
  "questions": [
    { "id": 31, "order": 1, "type": "MULTIPLE_CHOICE", "content": "...", "options": ["A", "B", "C", "D"], "answer": 2 },
    { "id": 32, "order": 2, "type": "SHORT_ANSWER", "content": "...", "options": null, "answer": "정답" }
  ]
}
```

### `PUT /api/admin/exams/{examId}`

임시 저장. 문항 목록 전체를 보냅니다 (새 문항은 `id` 없이).

```json
{
  "title": "기말고사",
  "startAt": "2026-12-10T10:00:00+09:00",
  "endAt": "2026-12-10T11:00:00+09:00",
  "questions": [
    { "id": 31, "type": "MULTIPLE_CHOICE", "content": "...", "options": ["A", "B", "C", "D"], "answer": 2 },
    { "type": "SHORT_ANSWER", "content": "...", "options": null, "answer": "정답" }
  ]
}
```

순서는 배열 순서를 따릅니다. 임시 저장은 빈 값도 허용합니다.

| 에러 | code |
| --- | --- |
| 409 | `EXAM_NOT_DRAFT` |

### `POST /api/admin/exams/{examId}/publish`

공개. 시험 코드를 발급하고 이후 수정할 수 없습니다.

응답 200 `{ "code": "A1B2C3" }`

| 에러 | code | 조건 |
| --- | --- | --- |
| 400 | `VALIDATION_ERROR` | 제목 없음, 문항 0개, 시작이 과거, 종료 ≤ 시작, 정답 미지정 |
| 409 | `EXAM_NOT_DRAFT` | 이미 공개됨 |

### `GET /api/admin/exams/{examId}/status`

현황 화면. 5초마다 호출합니다.

```json
{
  "id": 1,
  "title": "중간고사",
  "status": "OPEN",
  "code": "A1B2C3",
  "startAt": "2026-11-20T14:00:00+09:00",
  "endAt": "2026-11-20T15:00:00+09:00",
  "summary": { "waiting": 2, "inProgress": 25, "submitted": 5, "saveFailed": 1 },
  "students": [
    {
      "loginId": "student1",
      "name": "김학생",
      "status": "IN_PROGRESS",
      "joinedAt": "2026-11-20T13:55:10+09:00",
      "lastSavedAt": "2026-11-20T14:12:06+09:00",
      "answeredCount": 4,
      "saveFailCount": 1
    }
  ]
}
```

`summary.saveFailed`는 `saveFailCount > 0`인 학생 수입니다.

### `POST /api/admin/exams/{examId}/close`

조기 종료. `PUBLISHED`(시작 전)와 `OPEN`(진행 중) 모두 가능합니다. `endAt`을 현재 시각으로 바꾸고 상태를 `CLOSED`로 만듭니다.

- 시작 전 종료: 시험 취소와 같음. 대기 중인 학생은 다음 재동기화 때 종료 안내
- 진행 중 종료: 응시 중인 학생은 마지막 저장 답안으로 제출 처리

응답 200 `{ "endAt": "2026-11-20T14:30:00+09:00" }`

| 에러 | code |
| --- | --- |
| 409 | `EXAM_NOT_OPEN` (`DRAFT` 또는 이미 `CLOSED`) |
