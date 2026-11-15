import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => localStorage.clear());

test("비로그인 상태면 로그인 화면을 보여준다", () => {
  render(<App />);
  expect(screen.getByRole("button", { name: "로그인" })).toBeInTheDocument();
});

test("학생이 관리자 경로에 들어가면 학생 홈으로 보낸다", () => {
  localStorage.setItem("user", JSON.stringify({ loginId: "s", name: "김학생", role: "STUDENT" }));
  window.history.pushState({}, "", "/admin/exams");
  render(<App />);
  expect(screen.getByRole("heading", { name: "시험 코드 입력" })).toBeInTheDocument();
});
