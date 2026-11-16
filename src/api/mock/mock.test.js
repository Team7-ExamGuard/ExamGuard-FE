import { mockRequest } from "./index";
import { getDb, resetMockDb } from "./db";

const STUDENT = "mock-token-student1";
const ADMIN = "mock-token-admin";
const MIN = 60 * 1000;

const call = async (method, path, body, token) => {
  const { status, body: data } = await mockRequest(method, path, body, token);
  return { status, data };
};

beforeEach(() => resetMockDb());

describe("인증·권한", () => {
  test("로그인 성공/실패", async () => {
    expect((await call("POST", "/api/auth/login", { loginId: "admin", password: "1234" })).data.role).toBe("ADMIN");
    expect((await call("POST", "/api/auth/login", { loginId: "admin", password: "x" })).data.code).toBe("INVALID_CREDENTIALS");
  });

  test("토큰 없음 401, 역할 불일치 403", async () => {
    expect((await call("GET", "/api/admin/exams")).status).toBe(401);
    expect((await call("GET", "/api/admin/exams", undefined, STUDENT)).status).toBe(403);
  });
});

describe("학생 응시 흐름", () => {
  test("입장 에러 구분", async () => {
    const join = async (code) => (await call("POST", "/api/student/exams/join", { code }, STUDENT)).data.code;
    expect(await join("NOPE00")).toBe("EXAM_NOT_FOUND");
    expect(await join("DONE01")).toBe("EXAM_CLOSED");
  });

  test("시작 전에는 문항 403", async () => {
    const { data } = await call("POST", "/api/student/exams/join", { code: "WAIT01" }, STUDENT);
    expect(data.attemptStatus).toBe("WAITING");
    const res = await call("GET", `/api/student/exams/${data.examId}/questions`, undefined, STUDENT);
    expect(res.status).toBe(403);
    expect(res.data.code).toBe("EXAM_NOT_STARTED");
  });

  test("입장 → 문항 → 저장 → 재입장 → 제출 → 재입장 거절", async () => {
    const join = () => call("POST", "/api/student/exams/join", { code: "OPEN01" }, STUDENT);
    const { data } = await join();
    const base = `/api/student/exams/${data.examId}`;

    const questions = (await call("GET", `${base}/questions`, undefined, STUDENT)).data;
    expect(questions).toHaveLength(3);
    expect(questions[0]).not.toHaveProperty("answer");

    const saved = await call("PUT", `${base}/answers`, { version: 1, answers: { 11: 1 }, saveFailCount: 2 }, STUDENT);
    expect(saved.data.version).toBe(1);

    // 늦게 도착한 옛 저장은 거절
    const stale = await call("PUT", `${base}/answers`, { version: 1, answers: { 11: 0 } }, STUDENT);
    expect(stale.data.code).toBe("STALE_VERSION");
    expect((await call("GET", `${base}/answers`, undefined, STUDENT)).data.answers).toEqual({ 11: 1 });

    // 코드 재입력하면 응시 중으로 복귀
    expect((await join()).data.attemptStatus).toBe("IN_PROGRESS");

    const submitted = await call("POST", `${base}/submit`, { version: 2, answers: { 11: 1, 12: "80" } }, STUDENT);
    expect(submitted.status).toBe(200);
    expect((await join()).data.code).toBe("ALREADY_SUBMITTED");
  });

  test("종료 후 유예 30초 안의 제출은 받음", async () => {
    await call("POST", "/api/student/exams/join", { code: "OPEN01" }, STUDENT);
    await call("GET", "/api/student/exams/1/questions", undefined, STUDENT);
    getDb().exams[0].endAt = new Date(Date.now() - 10 * 1000).toISOString();

    expect((await call("PUT", "/api/student/exams/1/answers", { version: 1, answers: {} }, STUDENT)).data.code).toBe("EXAM_CLOSED");
    expect((await call("POST", "/api/student/exams/1/submit", { version: 1, answers: {} }, STUDENT)).status).toBe(200);
  });
});

describe("관리자", () => {
  const draft = {
    title: "새 시험",
    startAt: new Date(Date.now() + 10 * MIN).toISOString(),
    endAt: new Date(Date.now() + 70 * MIN).toISOString(),
    questions: [{ type: "SHORT_ANSWER", content: "1+1?", answer: "2" }],
  };

  test("생성 → 공개(코드 발급) → 수정 불가", async () => {
    const { status, data } = await call("POST", "/api/admin/exams", draft, ADMIN);
    expect(status).toBe(201);

    const published = await call("POST", `/api/admin/exams/${data.id}/publish`, undefined, ADMIN);
    expect(published.data.code).toMatch(/^[A-Z0-9]{6}$/);

    const update = await call("PUT", `/api/admin/exams/${data.id}`, draft, ADMIN);
    expect(update.data.code).toBe("EXAM_NOT_DRAFT");
  });

  test("공개 검증: 문항 없으면 거절", async () => {
    const { data } = await call("POST", "/api/admin/exams", { ...draft, questions: [] }, ADMIN);
    const res = await call("POST", `/api/admin/exams/${data.id}/publish`, undefined, ADMIN);
    expect(res.data.code).toBe("VALIDATION_ERROR");
  });

  test("현황 요약, 조기 종료 시 응시 중 학생 제출 처리", async () => {
    const status = (await call("GET", "/api/admin/exams/1/status", undefined, ADMIN)).data;
    expect(status.summary).toEqual({ waiting: 0, inProgress: 2, submitted: 0, saveFailed: 1 });

    await call("POST", "/api/admin/exams/1/close", undefined, ADMIN);
    const after = (await call("GET", "/api/admin/exams/1/status", undefined, ADMIN)).data;
    expect(after.status).toBe("CLOSED");
    expect(after.summary.submitted).toBe(2);
  });

  test("시작 전 시험도 조기 종료 가능", async () => {
    const res = await call("POST", "/api/admin/exams/2/close", undefined, ADMIN);
    expect(res.status).toBe(200);
    const list = (await call("GET", "/api/admin/exams", undefined, ADMIN)).data;
    expect(list.find((e) => e.id === 2).status).toBe("CLOSED");
  });
});
