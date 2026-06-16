import axios from "axios";

const api = axios.create({
  baseURL: "http://10.29.45.40:8000/api",
});

// Attach access token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("access_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// If a request fails with 401, try refreshing the token once
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Only attempt refresh once, and only on 401s
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refreshToken = localStorage.getItem("refresh_token");
      if (!refreshToken) {
        // No refresh token — force logout
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(error);
      }

      try {
        const { data } = await axios.post(
          "http://localhost:8000/api/auth/refresh/",
          {
            refresh: refreshToken,
          }
        );

        // Store the new access token
        localStorage.setItem("access_token", data.access);

        // Retry the original request with the new token
        original.headers.Authorization = `Bearer ${data.access}`;
        return api(original);
      } catch {
        // Refresh itself failed (refresh token expired) — force logout
        localStorage.clear();
        window.location.href = "/";
        return Promise.reject(error);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
