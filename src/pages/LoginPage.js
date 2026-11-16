import { useState } from "react";
import { login } from "../api/auth";

export default function LoginPage({ onLogin }) {
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!loginId || !password) {
      setError("아이디와 비밀번호를 입력하세요.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const user = await login(loginId, password);
      // 로그인되면 App의 GuestOnly가 role별 홈으로 보낸다.
      // 학생은 항상 /exam/join (응시 중이던 시험도 코드 재입력으로 복귀)
      onLogin(user);
    } catch (err) {
      setError(err.message || "로그인에 실패했습니다.");
      setLoading(false);
    }
  };

  return (
    <main className="login">
      <form className="card login-card" onSubmit={handleSubmit}>
        <h1>ExamGuard</h1>
        <label>
          아이디
          <input value={loginId} onChange={(e) => setLoginId(e.target.value)} autoComplete="username" autoFocus />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? "로그인 중..." : "로그인"}
        </button>
        {process.env.REACT_APP_USE_MOCK === "true" && (
          <p className="hint">mock 계정: student1 / 1234, admin / 1234</p>
        )}
      </form>
    </main>
  );
}
