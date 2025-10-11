import apiClient from "./apiClient";

const normalizeAuthResponse = (response, fallback = {}) => {
  const body = response?.data ?? {};
  const data = typeof body === "object" && body !== null ? body : {};

  const token =
    data?.token ??
    data?.accessToken ??
    data?.data?.token ??
    data?.data?.accessToken ??
    data?.data?.sessionToken ??
    null;

  const user =
    data?.user ??
    data?.data?.user ??
    data?.profile ??
    data?.data?.profile ??
    null;

  return {
    ...fallback,
    ...data,
    token,
    user,
  };
};

const userAPI = {
  login: async (payload) => {
    const res = await apiClient.post("/auth/login", payload);
    return normalizeAuthResponse(res, { email: payload?.email });
  },
  register: async (payload) => {
    const name = payload?.name ?? payload?.fullName ?? payload?.username ?? "";

    const body = {
      name,
      fullName: payload?.fullName ?? name,
      email: payload?.email,
      password: payload?.password,
    };

    const res = await apiClient.post("/auth/signup", body);
    return normalizeAuthResponse(res, { email: body.email, name: body.name });
  },
};

export default userAPI;