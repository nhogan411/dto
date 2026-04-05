import axios, {
  AxiosHeaders,
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const getStore = async () => {
  const storeModule = await import('../store');
  return storeModule.store;
};

const getStoredAccessToken = () =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem('accessToken');

const getStoredRefreshToken = () =>
  typeof localStorage === 'undefined' ? null : localStorage.getItem('refreshToken');

const setAuthorizationHeader = (
  config: InternalAxiosRequestConfig | RetryableRequestConfig,
  token: string,
) => {
  const headers = AxiosHeaders.from(config.headers);
  headers.set('Authorization', `Bearer ${token}`);
  config.headers = headers;
};

apiClient.interceptors.request.use(async (config) => {
  const store = await getStore();
  const token = store.getState().auth.accessToken ?? getStoredAccessToken();

  if (token) {
    setAuthorizationHeader(config, token);
  }

  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value: string | null) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error);
      return;
    }

    promise.resolve(token);
  });

  failedQueue = [];
};

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const store = await getStore();
    const authSliceModule = await import('../store/slices/authSlice');
    const originalRequest = error.config as RetryableRequestConfig | undefined;

    if (
      error.response?.status === 401 &&
      originalRequest &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/refresh')
    ) {
      if (isRefreshing) {
        return new Promise<string | null>((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then((token) => {
          if (token) {
            setAuthorizationHeader(originalRequest, token);
          }

          return apiClient(originalRequest);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = getStoredRefreshToken();

      if (!refreshToken) {
        store.dispatch(authSliceModule.clearCredentials());
        return Promise.reject(error);
      }

      try {
        const result = await store.dispatch(authSliceModule.refreshTokenThunk(refreshToken));

        if (!authSliceModule.refreshTokenThunk.fulfilled.match(result)) {
          throw result.error;
        }

        const newToken = result.payload.accessToken;
        processQueue(null, newToken);
        setAuthorizationHeader(originalRequest, newToken);

        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        store.dispatch(authSliceModule.clearCredentials());
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
