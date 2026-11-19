import { api } from "./client";

// 응답 형태와 에러 코드는 백엔드 Swagger(/swagger-ui/index.html) 참고
const BASE = "/api/admin/exams";

// → [{ id, title, status, code, startAt, endAt, joinedCount }]
export const getExams = () => api.get(BASE);

// exam: { title, startAt, endAt, questions } → { id }
export const createExam = (exam) => api.post(BASE, exam);

// → { id, title, status, code, startAt, endAt, questions }
export const getExam = (examId) => api.get(`${BASE}/${examId}`);

// 임시 저장 → { id }
export const updateExam = (examId, exam) => api.put(`${BASE}/${examId}`, exam);

// → { code }
export const publishExam = (examId) => api.post(`${BASE}/${examId}/publish`);

// → { ...시험 정보, summary, students }
export const getExamStatus = (examId) => api.get(`${BASE}/${examId}/status`);

// 조기 종료 → { endAt }
export const closeExam = (examId) => api.post(`${BASE}/${examId}/close`);
