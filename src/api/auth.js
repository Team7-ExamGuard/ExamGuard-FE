import { api } from "./client";

// → { loginId, name, role: "STUDENT" | "ADMIN", accessToken }
export const login = (loginId, password) => api.post("/api/auth/login", { loginId, password });
