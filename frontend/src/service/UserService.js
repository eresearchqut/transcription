import axios from "axios";

import { addAuthHeader } from "./Authorization";

const endpoint = process.env.REACT_APP_API_ENDPOINT || "http://localhost:3001";

axios.interceptors.request.use((config) => {
  return addAuthHeader(config);
});

export class UserService {
  static getUser() {
    return axios.get(`${endpoint}/user`).then((result) => result.data);
  }
}
