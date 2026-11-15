// 백엔드가 준비되기 전까지 쓰는 가짜 서버.
// 실제 서버 응답과 같은 모양 { status, headers, body }를 돌려준다.

const USERS = [
  { loginId: "student1", password: "1234", name: "김학생", role: "STUDENT" },
  { loginId: "admin", password: "1234", name: "관리자", role: "ADMIN" },
];

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

const ok = (body) => ({ status: 200, body });
const fail = (status, code, message) => ({ status, body: { code, message } });

// [method, path 정규식, 핸들러]
const routes = [
  [
    "POST",
    /^\/api\/auth\/login$/,
    (_, body) => {
      const u = USERS.find((x) => x.loginId === body?.loginId && x.password === body?.password);
      if (!u) return fail(401, "INVALID_CREDENTIALS", "아이디 또는 비밀번호가 올바르지 않습니다.");
      return ok({ loginId: u.loginId, name: u.name, role: u.role, accessToken: `mock-token-${u.loginId}` });
    },
  ],
];

export async function mockRequest(method, path, body) {
  await delay(300);
  const headers = { date: new Date().toUTCString() };

  for (const [m, pattern, handler] of routes) {
    const match = method === m && path.match(pattern);
    if (match) return { ...handler(match, body), headers };
  }
  return { ...fail(404, "MOCK_NOT_IMPLEMENTED", `mock에 없는 API: ${method} ${path}`), headers };
}
