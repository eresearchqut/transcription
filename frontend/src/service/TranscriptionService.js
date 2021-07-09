import axios from "axios";

import { addAuthHeader } from "./Authorization";

const endpoint = process.env.REACT_APP_API_ENDPOINT || "http://localhost:3001";

axios.interceptors.request.use((config) => {
  return addAuthHeader(config);
});

export class TranscriptionService {
  getTranscriptions() {
    return axios.get(`${endpoint}/transcription`).then((result) => result.data);
  }
}
