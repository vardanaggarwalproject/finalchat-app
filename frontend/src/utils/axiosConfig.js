/* eslint-disable no-console */
import axios from "axios";

// Create axios instance with default config
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL,
  withCredentials: true, // This ensures cookies are sent automatically
});

// Add response interceptor to handle 401/400 errors (unauthorized)
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401 || error.response?.status === 400) {
      // Token is invalid or not found, clear storage and redirect
      console.error("Unauthorized:", error.response?.data?.message);
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
