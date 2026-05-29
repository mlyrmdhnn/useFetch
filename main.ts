import { useFetch } from "./http/useFetch";

useFetch.interceptor.response.use(async (result) => {
  if (result?.code == 401) {
  }
});

useFetch.baseURL("");

useFetch.headers({});
useFetch.headers({ "Accept-Language": "id" });

export const paymentApi = useFetch.create({
  baseURL: "",
  headers: {},
});
