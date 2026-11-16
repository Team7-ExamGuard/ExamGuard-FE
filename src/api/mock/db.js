// mock 서버의 데이터 저장소.
// 새로고침해도 유지되도록 localStorage("mock-db")에 저장한다.
// 초기화: 브라우저 콘솔에서 resetMockDb()

import { getJSON, remove, setJSON } from "../../utils/storage";

const DB_KEY = "mock-db";
const MIN = 60 * 1000;

export const SUBMIT_GRACE_MS = 30 * 1000; // 제출 유예 시간

export const USERS = [
  { loginId: "student1", password: "1234", name: "김학생", role: "STUDENT" },
  { loginId: "student2", password: "1234", name: "이학생", role: "STUDENT" },
  { loginId: "student3", password: "1234", name: "박학생", role: "STUDENT" },
  { loginId: "admin", password: "1234", name: "관리자", role: "ADMIN" },
];

const iso = (ms) => new Date(ms).toISOString();

const sampleQuestions = (startId) => [
  { id: startId, type: "MULTIPLE_CHOICE", content: "스택의 특징으로 옳은 것은?", options: ["FIFO", "LIFO", "랜덤 접근", "우선순위 기반"], answer: 1 },
  { id: startId + 1, type: "SHORT_ANSWER", content: "HTTP 기본 포트 번호는?", options: null, answer: "80" },
  { id: startId + 2, type: "MULTIPLE_CHOICE", content: "시간 복잡도 O(log n)인 탐색은?", options: ["선형 탐색", "이진 탐색", "깊이 우선 탐색", "버블 정렬"], answer: 1 },
];

// 시각은 처음 만들 때의 현재 시각 기준 (OPEN/PUBLISHED/CLOSED 예시가 모두 보이도록)
function seed() {
  const now = Date.now();
  return {
    nextId: 1000,
    exams: [
      { id: 1, title: "자료구조 중간고사", code: "OPEN01", published: true, startAt: iso(now - 10 * MIN), endAt: iso(now + 50 * MIN), questions: sampleQuestions(11) },
      { id: 2, title: "운영체제 퀴즈", code: "WAIT01", published: true, startAt: iso(now + 3 * MIN), endAt: iso(now + 33 * MIN), questions: sampleQuestions(21) },
      { id: 3, title: "네트워크 기말고사", code: null, published: false, startAt: iso(now + 7 * 24 * 60 * MIN), endAt: iso(now + 7 * 24 * 60 * MIN + 60 * MIN), questions: sampleQuestions(31) },
      { id: 4, title: "알고리즘 쪽지시험", code: "DONE01", published: true, startAt: iso(now - 2 * 24 * 60 * MIN), endAt: iso(now - 2 * 24 * 60 * MIN + 30 * MIN), questions: sampleQuestions(41) },
    ],
    attempts: [
      // 관리자 현황 화면 예시용 (student1은 비워 둬서 직접 입장해 볼 수 있게)
      { examId: 1, loginId: "student2", status: "IN_PROGRESS", joinedAt: iso(now - 12 * MIN), lastSavedAt: iso(now - 1 * MIN), version: 4, answers: { 11: 1, 12: "80" }, saveFailCount: 0, submittedAt: null },
      { examId: 1, loginId: "student3", status: "IN_PROGRESS", joinedAt: iso(now - 11 * MIN), lastSavedAt: iso(now - 3 * MIN), version: 2, answers: { 11: 0 }, saveFailCount: 2, submittedAt: null },
    ],
  };
}

let db = getJSON(DB_KEY) || seed();

export const getDb = () => db;
export const saveDb = () => setJSON(DB_KEY, db);

export function resetMockDb() {
  remove(DB_KEY);
  db = seed();
  saveDb();
}

if (typeof window !== "undefined") window.resetMockDb = resetMockDb;

export function nextId() {
  db.nextId += 1;
  return db.nextId;
}

// 시험 상태는 현재 시각으로 계산
export function examStatus(exam, now = Date.now()) {
  if (!exam.published) return "DRAFT";
  if (now >= Date.parse(exam.endAt)) return "CLOSED";
  if (now >= Date.parse(exam.startAt)) return "OPEN";
  return "PUBLISHED";
}

// 종료(+유예) 후에도 제출하지 않은 응시 중 학생은 마지막 저장 답안으로 제출 처리
// (시작하지 않은 WAITING 학생은 그대로 둔다)
export function finalizeAttempt(attempt, exam, now = Date.now()) {
  if (attempt.status !== "IN_PROGRESS") return;
  if (now >= Date.parse(exam.endAt) + SUBMIT_GRACE_MS) {
    attempt.status = "SUBMITTED";
    attempt.submittedAt = exam.endAt;
  }
}

export function answeredCount(answers) {
  return Object.values(answers).filter((v) => v !== null && v !== undefined && v !== "").length;
}

export function generateCode() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const random = () => Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const used = new Set(db.exams.map((e) => e.code));
  let code = random();
  while (used.has(code)) code = random();
  return code;
}
