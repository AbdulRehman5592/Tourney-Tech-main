import axios from "axios";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "", // Leave blank if using relative routes
  withCredentials: true, // Important: allow sending/receiving cookies
  headers: {
    "Content-Type": "application/json",
  },
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });

  failedQueue = [];
};

// Attach accessToken from memory or localStorage
api.interceptors.request.use((config) => {
  // Since we're using HTTP-only cookies, tokens are sent automatically
  // No need to manually set Authorization header from localStorage
  // const token = localStorage.getItem("accessToken");
  // if (token) {
  //   config.headers["Authorization"] = `Bearer ${token}`;
  // }
  return config;
});

// Handle 401 errors and refresh accessToken
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then(() => {
            // Tokens are handled via cookies, no need to set headers manually
            return api(originalRequest);
          })
          .catch((err) => Promise.reject(err));
      }

      isRefreshing = true;

      try {
        // Call your refresh token API
        const res = await axios.post(
          "/api/refresh",
          {},
          { withCredentials: true }
        );

        const newAccessToken = res.data.data.accessToken;

        // Since we're using HTTP-only cookies, tokens are handled automatically
        // No need to save to localStorage
        // localStorage.setItem("accessToken", newAccessToken);

        processQueue(null, newAccessToken);

        // Retry the original request - cookies are sent automatically
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error("Token refresh failed. Logging out...");

        // ✅ Clear user data and redirect to login
        localStorage.removeItem("user");
        window.location.href = "/auth/login";

        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
