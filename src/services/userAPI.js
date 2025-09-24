import apiClient from "./apiClient"
const userAPI ={
    login: async(data) =>{
        const res =await apiClient.post("/auth/login",data);
        return res.data?.data;
    },
    register: async (data) => {
    const res = await apiClient.post("/auth/signup", data);
    return res.data?.data;
  },
};
export default userAPI;