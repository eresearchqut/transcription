import axios from 'axios'
import {addAuthHeader} from "./Authorization";

const endpoint = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001';

axios.interceptors.request.use((config) => {
    return addAuthHeader(config);
});

export class TranscriptionService {
    getIdentity() {
        return axios.get(`${endpoint}/identity`)
            .then(result => result.data);
    }
}
