import { getJSON, STORAGE_KEYS } from "../utils/storage";
import { mockRequest } from "./mock";

const BASE_URL = process.env.REACT_APP_API_BASE_URL || "";
// 요청 때마다 읽는다 (테스트에서 바꿀 수 있도록)
const isMockEnabled = () => process.env.REACT_APP_USE_MOCK === "true";

// 서버 응답 에러를 화면에서 구분하기 쉽게 status + code로 통일
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message || code);
    this.status = status; // HTTP 상태 (0 = 네트워크 오류)
    this.code = code; // 서버 에러 코드 (예: "INVALID_CREDENTIALS")
  }
}

// 401(토큰 없음·만료) 시 실행할 함수. App이 로그아웃 처리를 등록한다.
// 로그인 요청의 401은 "아이디/비밀번호 틀림"이라 제외한다.
const LOGIN_PATH = "/api/auth/login";
let onUnauthorized = null;
export const setUnauthorizedHandler = (fn) => {
  onUnauthorized = fn;
};

function toError(path, status, data) {
  if (status === 401 && path !== LOGIN_PATH) onUnauthorized?.();
  return new ApiError(status, data?.code, data?.message);
}

// 서버 시각 - 클라이언트 시각 (ms). 응답의 Date 헤더로 갱신한다.
let serverTimeOffset = 0;
export const getServerTimeOffset = () => serverTimeOffset;
export const serverNow = () => Date.now() + serverTimeOffset;

function updateServerTime(dateHeader) {
  const t = Date.parse(dateHeader);
  if (!Number.isNaN(t)) serverTimeOffset = t - Date.now();
}

export async function request(method, path, body) {
  const user = getJSON(STORAGE_KEYS.USER);

  if (isMockEnabled()) {
    const res = await mockRequest(method, path, body, user?.accessToken);
    updateServerTime(res.headers.date);
    if (res.status >= 400) throw toError(path, res.status, res.body);
    return res.body;
  }

  const headers = { "Content-Type": "application/json" };
  if (user?.accessToken) headers.Authorization = `Bearer ${user.accessToken}`;

  let res;
  try {
    res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(0, "NETWORK_ERROR", "네트워크에 연결할 수 없습니다.");
  }

  updateServerTime(res.headers.get("Date"));

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw toError(path, res.status, data);
  return data;
}

export const api = {
  get: (path) => request("GET", path),
  post: (path, body) => request("POST", path, body),
  put: (path, body) => request("PUT", path, body),
  delete: (path) => request("DELETE", path),
};
