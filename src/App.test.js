import { act, render, screen } from "@testing-library/react";
import App from "./App";
import { api } from "./api/client";

const setUser = (user) => localStorage.setItem("user", JSON.stringify(user));

beforeEach(() => {
  localStorage.clear();
  process.env.REACT_APP_USE_MOCK = "true";
});

test("비로그인 상태면 로그인 화면을 보여준다", () => {
  window.history.pushState({}, "", "/");
  render(<App />);
  expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
});

test("학생이 관리자 경로에 들어가면 학생 홈으로 보낸다", () => {
  setUser({ loginId: "student1", name: "김학생", role: "STUDENT", accessToken: "mock-token-student1" });
  window.history.pushState({}, "", "/admin/exams");
  render(<App />);
  expect(screen.getByRole("heading", { name: "시험 코드 입력" })).toBeInTheDocument();
});

test("API가 401을 받으면 로그아웃하고 만료 안내를 보여준다", async () => {
  setUser({ loginId: "ghost", name: "유령", role: "STUDENT", accessToken: "mock-token-ghost" });
  window.history.pushState({}, "", "/exam/join");
  render(<App />);
  expect(screen.getByRole("heading", { name: "시험 코드 입력" })).toBeInTheDocument();

  await act(() => api.get("/api/student/exams/1").catch(() => {}));

  expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveTextContent("로그인이 만료되었습니다");
  expect(localStorage.getItem("user")).toBeNull();
});

test("로그인 실패(401)는 로그아웃 처리하지 않는다", async () => {
  window.history.pushState({}, "", "/login");
  render(<App />);

  await act(() => api.post("/api/auth/login", { loginId: "admin", password: "x" }).catch(() => {}));

  expect(screen.queryByRole("status")).not.toBeInTheDocument();
});
