import React, { useState } from "react";
import { BrowserRouter, Navigate, Outlet, Route, Routes } from "react-router-dom";
import "./App.css";
import { getJSON, remove, setJSON, STORAGE_KEYS } from "./utils/storage";

import Header from "./components/Header";
import LoginPage from "./pages/LoginPage";

// 학생
import ExamJoinPage from "./pages/student/ExamJoinPage";
import ExamWaitPage from "./pages/student/ExamWaitPage";
import ExamTakePage from "./pages/student/ExamTakePage";
import ExamDonePage from "./pages/student/ExamDonePage";

// 관리자
import AdminExamListPage from "./pages/admin/AdminExamListPage";
import AdminExamEditPage from "./pages/admin/AdminExamEditPage";
import AdminExamStatusPage from "./pages/admin/AdminExamStatusPage";

// role별 홈 경로
const HOME_BY_ROLE = {
  STUDENT: "/exam/join",
  ADMIN: "/admin/exams",
};

// 새로고침해도 로그인 유지 (localStorage에서 복원)
const loadUser = () => getJSON(STORAGE_KEYS.USER);

// 로그인 + role 검사
function RequireRole({ user, role }) {
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== role) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <Outlet />;
}

// 로그인한 사용자는 로그인 페이지 접근 시 홈으로
function GuestOnly({ user }) {
  if (user) return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <Outlet />;
}

function App() {
  // user: { loginId, name, role: "STUDENT" | "ADMIN", accessToken } | null
  const [user, setUser] = useState(loadUser);

  const handleLogin = (loginUser) => {
    setJSON(STORAGE_KEYS.USER, loginUser);
    setUser(loginUser);
  };

  const handleLogout = () => {
    // 로그인 정보만 삭제 (답안 임시 저장 데이터는 지우지 않음)
    remove(STORAGE_KEYS.USER);
    setUser(null);
  };

  return (
    <BrowserRouter>
      {user && <Header user={user} onLogout={handleLogout} />}

      <Routes>
        {/* 루트: role별 홈 또는 로그인으로 */}
        <Route
          path="/"
          element={<Navigate to={user ? HOME_BY_ROLE[user.role] : "/login"} replace />}
        />

        {/* 비로그인 전용 */}
        <Route element={<GuestOnly user={user} />}>
          <Route path="/login" element={<LoginPage onLogin={handleLogin} />} />
        </Route>

        {/* 학생 */}
        <Route element={<RequireRole user={user} role="STUDENT" />}>
          <Route path="/exam/join" element={<ExamJoinPage />} />
          <Route path="/exam/:examId/wait" element={<ExamWaitPage />} />
          <Route path="/exam/:examId/take" element={<ExamTakePage />} />
          <Route path="/exam/:examId/done" element={<ExamDonePage />} />
        </Route>

        {/* 관리자 */}
        <Route element={<RequireRole user={user} role="ADMIN" />}>
          <Route path="/admin/exams" element={<AdminExamListPage />} />
          <Route path="/admin/exams/new" element={<AdminExamEditPage />} />
          <Route path="/admin/exams/:examId/edit" element={<AdminExamEditPage />} />
          <Route path="/admin/exams/:examId" element={<AdminExamStatusPage />} />
        </Route>

        {/* 그 외 경로 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;