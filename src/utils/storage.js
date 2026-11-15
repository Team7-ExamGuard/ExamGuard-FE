// localStorage는 사생활 보호 모드 등에서 예외가 날 수 있어 모두 try/catch로 감싼다.

export function getJSON(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function setJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {
    // 무시
  }
}

// 키 이름을 한곳에서 관리
export const STORAGE_KEYS = {
  USER: "user",
  answers: (examId) => `answers:${examId}`,
};
