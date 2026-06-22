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
  const token = localStorage.getItem("accessToken");
  if (token) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
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
          .then((token) => {
            originalRequest.headers["Authorization"] = `Bearer ${token}`;
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

        // Save to localStorage
        localStorage.setItem("accessToken", newAccessToken);

        // Update Axios default header
        api.defaults.headers.common["Authorization"] =
          `Bearer ${newAccessToken}`;

        processQueue(null, newAccessToken);

        // Retry the original request
        originalRequest.headers["Authorization"] = `Bearer ${newAccessToken}`;
        return api(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        console.error("Token refresh failed. Logging out...");

        // ✅ Clear token and redirect to login
        localStorage.removeItem("accessToken");
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
