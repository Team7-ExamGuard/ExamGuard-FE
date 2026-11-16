import { api } from "./client";

// 응답 형태와 에러 코드는 docs/api-spec.md 참고
const base = (examId) => `/api/student/exams/${examId}`;

// → { examId, attemptStatus }
export const joinExam = (code) => api.post("/api/student/exams/join", { code });

// → { id, title, status, startAt, endAt, questionCount, attempt: { status, submittedAt } }
export const getExam = (examId) => api.get(base(examId));

// → [{ id, order, type, content, options }]
export const getQuestions = (examId) => api.get(`${base(examId)}/questions`);

// → { version, answers, savedAt }
export const getAnswers = (examId) => api.get(`${base(examId)}/answers`);

// → { version, savedAt }
export const saveAnswers = (examId, { version, answers, saveFailCount }) =>
  api.put(`${base(examId)}/answers`, { version, answers, saveFailCount });

// → { submittedAt }
export const submitExam = (examId, { version, answers }) =>
  api.post(`${base(examId)}/submit`, { version, answers });
