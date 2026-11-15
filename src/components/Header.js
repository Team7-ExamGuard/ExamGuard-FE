import { Link } from "react-router-dom";

function Logo() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5l-8-3Z" fill="currentColor" />
      <path d="m8.5 12 2.5 2.5 4.5-5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Header({ user, onLogout }) {
  return (
    <header className="header">
      <Link to="/" className="header-brand">
        <Logo />
        <span>ExamGuard</span>
      </Link>
      <div className="header-user">
        <span>
          {user.name}
          <small>{user.role === "ADMIN" ? " (관리자)" : " (학생)"}</small>
        </span>
        <button type="button" className="btn btn-ghost" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </header>
  );
}
