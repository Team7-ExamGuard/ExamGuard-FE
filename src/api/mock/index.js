// 백엔드가 준비되기 전까지 쓰는 가짜 서버. docs/api-spec.md를 따른다.
// 실제 서버 응답과 같은 모양 { status, headers, body }를 돌려준다.

import {
  USERS,
  SUBMIT_GRACE_MS,
  getDb,
  saveDb,
  nextId,
  examStatus,
  finalizeAttempt,
  answeredCount,
  generateCode,
} from "./db";

const DELAY_MS = process.env.NODE_ENV === "test" ? 0 : 300;
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const ok = (body, status = 200) => ({ status, body });
const fail = (status, code, message) => ({ status, body: { code, message } });
const nowIso = () => new Date().toISOString();

// ---------- 공통 ----------

function findExam(id) {
  return getDb().exams.find((e) => e.id === Number(id));
}

function findAttempt(examId, loginId) {
  return getDb().attempts.find((a) => a.examId === Number(examId) && a.loginId === loginId);
}

const studentQuestion = ({ answer, ...q }, i) => ({ ...q, order: i + 1 });
const adminQuestion = (q, i) => ({ ...q, order: i + 1 });

function examSummary(exam) {
  return {
    id: exam.id,
    title: exam.title,
    status: examStatus(exam),
    code: exam.code,
    startAt: exam.startAt,
    endAt: exam.endAt,
  };
}

// 요청 본문의 문항 목록을 저장 형태로 (새 문항은 id 발급)
function normalizeQuestions(questions = []) {
  return questions.map((q) => ({
    id: q.id ?? nextId(),
    type: q.type,
    content: q.content ?? "",
    options: q.type === "MULTIPLE_CHOICE" ? q.options ?? ["", "", "", ""] : null,
    answer: q.answer ?? null,
  }));
}

function validateForPublish(exam) {
  const now = Date.now();
  if (!exam.title?.trim()) return "제목을 입력하세요.";
  if (!exam.startAt || !exam.endAt) return "시작·종료 시각을 입력하세요.";
  if (Date.parse(exam.startAt) <= now) return "시작 시각은 현재 이후여야 합니다.";
  if (Date.parse(exam.endAt) <= Date.parse(exam.startAt)) return "종료 시각은 시작 시각 이후여야 합니다.";
  if (exam.questions.length === 0) return "문항을 1개 이상 추가하세요.";
  for (const [i, q] of exam.questions.entries()) {
    if (!q.content?.trim()) return `${i + 1}번 문항 내용을 입력하세요.`;
    if (q.type === "MULTIPLE_CHOICE") {
      if (q.options.some((o) => !o?.trim())) return `${i + 1}번 문항의 보기 4개를 모두 입력하세요.`;
      if (![0, 1, 2, 3].includes(q.answer)) return `${i + 1}번 문항의 정답을 선택하세요.`;
    } else if (!String(q.answer ?? "").trim()) {
      return `${i + 1}번 문항의 정답을 입력하세요.`;
    }
  }
  return null;
}

// ---------- 인증 ----------

function login(_, body) {
  const u = USERS.find((x) => x.loginId === body?.loginId && x.password === body?.password);
  if (!u) return fail(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
  return ok({ loginId: u.loginId, name: u.name, role: u.role, accessToken: `mock-token-${u.loginId}` });
}

// ---------- 학생 ----------

function joinExam({ user }, body) {
  const exam = getDb().exams.find((e) => e.code && e.code === body?.code?.trim().toUpperCase());
  if (!exam) return fail(404, "EXAM_NOT_FOUND", "존재하지 않는 시험 코드입니다.");

  const status = examStatus(exam);
  if (status === "DRAFT") return fail(409, "EXAM_NOT_PUBLISHED", "아직 공개되지 않은 시험입니다.");

  let attempt = findAttempt(exam.id, user.loginId);
  if (attempt) finalizeAttempt(attempt, exam);
  if (attempt?.status === "SUBMITTED") return fail(409, "ALREADY_SUBMITTED", "이미 제출한 시험입니다.");
  if (status === "CLOSED") return fail(409, "EXAM_CLOSED", "이미 종료된 시험입니다.");

  if (!attempt) {
    attempt = {
      examId: exam.id,
      loginId: user.loginId,
      status: "WAITING",
      joinedAt: nowIso(),
      lastSavedAt: null,
      version: 0,
      answers: {},
      saveFailCount: 0,
      submittedAt: null,
    };
    getDb().attempts.push(attempt);
  }
  saveDb();
  return ok({ examId: exam.id, attemptStatus: attempt.status });
}

// 학생 API 공통: 시험과 본인 응시 기록 찾기
function studentContext(examId, user) {
  const exam = findExam(examId);
  const attempt = exam && findAttempt(exam.id, user.loginId);
  if (!attempt) return { error: fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.") };
  finalizeAttempt(attempt, exam);
  return { exam, attempt };
}

function getStudentExam({ user, params }) {
  const { exam, attempt, error } = studentContext(params[0], user);
  if (error) return error;
  saveDb();
  return ok({
    id: exam.id,
    title: exam.title,
    status: examStatus(exam),
    startAt: exam.startAt,
    endAt: exam.endAt,
    questionCount: exam.questions.length,
    attempt: { status: attempt.status, submittedAt: attempt.submittedAt },
  });
}

function getQuestions({ user, params }) {
  const { exam, attempt, error } = studentContext(params[0], user);
  if (error) return error;
  if (attempt.status === "SUBMITTED") return fail(409, "ALREADY_SUBMITTED", "이미 제출한 시험입니다.");

  const status = examStatus(exam);
  if (status === "PUBLISHED") return fail(403, "EXAM_NOT_STARTED", "아직 시작 전입니다.");
  if (status === "CLOSED") return fail(409, "EXAM_CLOSED", "이미 종료된 시험입니다.");

  attempt.status = "IN_PROGRESS";
  saveDb();
  return ok(exam.questions.map(studentQuestion));
}

function getAnswers({ user, params }) {
  const { attempt, error } = studentContext(params[0], user);
  if (error) return error;
  return ok({ version: attempt.version, answers: attempt.answers, savedAt: attempt.lastSavedAt });
}

function saveAnswers({ user, params }, body) {
  const { exam, attempt, error } = studentContext(params[0], user);
  if (error) return error;
  if (attempt.status === "SUBMITTED") return fail(409, "ALREADY_SUBMITTED", "이미 제출한 시험입니다.");
  if (attempt.status === "WAITING") return fail(403, "EXAM_NOT_STARTED", "아직 시작 전입니다.");
  if (Date.now() >= Date.parse(exam.endAt)) return fail(409, "EXAM_CLOSED", "시험 시간이 끝났습니다.");
  if (!(body?.version > attempt.version)) return fail(409, "STALE_VERSION", "더 최신 답안이 이미 저장되어 있습니다.");

  attempt.version = body.version;
  attempt.answers = body.answers ?? {};
  attempt.saveFailCount += Number(body.saveFailCount) || 0;
  attempt.lastSavedAt = nowIso();
  saveDb();
  return ok({ version: attempt.version, savedAt: attempt.lastSavedAt });
}

function submitExam({ user, params }, body) {
  const exam = findExam(params[0]);
  const attempt = exam && findAttempt(exam.id, user.loginId);
  if (!attempt) return fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.");
  if (attempt.status === "SUBMITTED") return fail(409, "ALREADY_SUBMITTED", "이미 제출한 시험입니다.");
  if (attempt.status === "WAITING") return fail(403, "EXAM_NOT_STARTED", "아직 시작 전입니다.");
  if (Date.now() >= Date.parse(exam.endAt) + SUBMIT_GRACE_MS) {
    finalizeAttempt(attempt, exam);
    saveDb();
    return fail(409, "EXAM_CLOSED", "제출 가능 시간이 지났습니다.");
  }

  // 서버에 저장된 답안보다 오래된 제출이면 서버 답안을 유지
  if (body?.version >= attempt.version) {
    attempt.version = body.version;
    attempt.answers = body.answers ?? {};
  }
  attempt.status = "SUBMITTED";
  attempt.submittedAt = nowIso();
  saveDb();
  return ok({ submittedAt: attempt.submittedAt });
}

// ---------- 관리자 ----------

function listExams() {
  const { exams, attempts } = getDb();
  return ok(
    exams.map((e) => ({
      ...examSummary(e),
      joinedCount: attempts.filter((a) => a.examId === e.id).length,
    }))
  );
}

function createExam(_, body) {
  const exam = {
    id: nextId(),
    title: body?.title ?? "",
    code: null,
    published: false,
    startAt: body?.startAt ?? null,
    endAt: body?.endAt ?? null,
    questions: normalizeQuestions(body?.questions),
  };
  getDb().exams.push(exam);
  saveDb();
  return ok({ id: exam.id }, 201);
}

function getAdminExam({ params }) {
  const exam = findExam(params[0]);
  if (!exam) return fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.");
  return ok({ ...examSummary(exam), questions: exam.questions.map(adminQuestion) });
}

function updateExam({ params }, body) {
  const exam = findExam(params[0]);
  if (!exam) return fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.");
  if (exam.published) return fail(409, "EXAM_NOT_DRAFT", "공개된 시험은 수정할 수 없습니다.");

  exam.title = body?.title ?? "";
  exam.startAt = body?.startAt ?? null;
  exam.endAt = body?.endAt ?? null;
  exam.questions = normalizeQuestions(body?.questions);
  saveDb();
  return ok({ id: exam.id });
}

function publishExam({ params }) {
  const exam = findExam(params[0]);
  if (!exam) return fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.");
  if (exam.published) return fail(409, "EXAM_NOT_DRAFT", "이미 공개된 시험입니다.");

  const message = validateForPublish(exam);
  if (message) return fail(400, "VALIDATION_ERROR", message);

  exam.published = true;
  exam.code = generateCode();
  saveDb();
  return ok({ code: exam.code });
}

function getExamStatus({ params }) {
  const exam = findExam(params[0]);
  if (!exam) return fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.");

  const attempts = getDb().attempts.filter((a) => a.examId === exam.id);
  attempts.forEach((a) => finalizeAttempt(a, exam));
  saveDb();

  const students = attempts.map((a) => ({
    loginId: a.loginId,
    name: USERS.find((u) => u.loginId === a.loginId)?.name ?? a.loginId,
    status: a.status,
    joinedAt: a.joinedAt,
    lastSavedAt: a.lastSavedAt,
    answeredCount: answeredCount(a.answers),
    saveFailCount: a.saveFailCount,
  }));
  const count = (s) => students.filter((x) => x.status === s).length;

  return ok({
    ...examSummary(exam),
    summary: {
      waiting: count("WAITING"),
      inProgress: count("IN_PROGRESS"),
      submitted: count("SUBMITTED"),
      saveFailed: students.filter((x) => x.saveFailCount > 0).length,
    },
    students,
  });
}

function closeExam({ params }) {
  const exam = findExam(params[0]);
  if (!exam) return fail(404, "EXAM_NOT_FOUND", "시험을 찾을 수 없습니다.");
  const status = examStatus(exam);
  if (status === "DRAFT" || status === "CLOSED") return fail(409, "EXAM_NOT_OPEN", "종료할 수 없는 상태입니다.");

  const now = nowIso();
  exam.endAt = now;
  // 시작 전 종료면 시작 시각도 당겨서 startAt ≤ endAt 유지
  if (Date.parse(exam.startAt) > Date.parse(now)) exam.startAt = now;

  getDb()
    .attempts.filter((a) => a.examId === exam.id && a.status === "IN_PROGRESS")
    .forEach((a) => {
      a.status = "SUBMITTED";
      a.submittedAt = now;
    });
  saveDb();
  return ok({ endAt: exam.endAt });
}

// ---------- 라우팅 ----------

// [method, path 정규식, 필요한 역할(null = 로그인 불필요), 핸들러]
const routes = [
  ["POST", /^\/api\/auth\/login$/, null, login],

  ["POST", /^\/api\/student\/exams\/join$/, "STUDENT", joinExam],
  ["GET", /^\/api\/student\/exams\/(\d+)$/, "STUDENT", getStudentExam],
  ["GET", /^\/api\/student\/exams\/(\d+)\/questions$/, "STUDENT", getQuestions],
  ["GET", /^\/api\/student\/exams\/(\d+)\/answers$/, "STUDENT", getAnswers],
  ["PUT", /^\/api\/student\/exams\/(\d+)\/answers$/, "STUDENT", saveAnswers],
  ["POST", /^\/api\/student\/exams\/(\d+)\/submit$/, "STUDENT", submitExam],

  ["GET", /^\/api\/admin\/exams$/, "ADMIN", listExams],
  ["POST", /^\/api\/admin\/exams$/, "ADMIN", createExam],
  ["GET", /^\/api\/admin\/exams\/(\d+)$/, "ADMIN", getAdminExam],
  ["PUT", /^\/api\/admin\/exams\/(\d+)$/, "ADMIN", updateExam],
  ["POST", /^\/api\/admin\/exams\/(\d+)\/publish$/, "ADMIN", publishExam],
  ["GET", /^\/api\/admin\/exams\/(\d+)\/status$/, "ADMIN", getExamStatus],
  ["POST", /^\/api\/admin\/exams\/(\d+)\/close$/, "ADMIN", closeExam],
];

// 토큰 "mock-token-<loginId>"에서 사용자 찾기
function userFromToken(token) {
  const loginId = token?.replace(/^mock-token-/, "");
  return USERS.find((u) => u.loginId === loginId) ?? null;
}

function handle(method, path, body, token) {
  for (const [m, pattern, role, handler] of routes) {
    const match = method === m && path.match(pattern);
    if (!match) continue;

    const user = userFromToken(token);
    if (role && !user) return fail(401, "UNAUTHORIZED", "로그인이 필요합니다.");
    if (role && user.role !== role) return fail(403, "FORBIDDEN", "권한이 없습니다.");
    return handler({ user, params: match.slice(1) }, body);
  }
  return fail(404, "MOCK_NOT_IMPLEMENTED", `mock에 없는 API: ${method} ${path}`);
}

export async function mockRequest(method, path, body, token) {
  await delay(DELAY_MS);
  return { ...handle(method, path, body, token), headers: { date: new Date().toUTCString() } };
}
