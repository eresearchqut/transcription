import axios from 'axios'
import {addAuthHeader} from "./Authorization";


const endpoint = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001';

axios.interceptors.request.use((config) => {
    return addAuthHeader(config);
});

export class TranscriptionService {



    getIdentity(id) {

        return axios.get(`${endpoint}/identity`)
            .then(result => result.data);
    }

    saveChecklist(checklist) {
        if (!checklist.id) {
            return axios.post(`${endpoint}/checklist`, checklist)
                .then(response => response.data);
        }
        return axios.put(`${endpoint}/checklist`, checklist)
            .then(response => response.data);
    }

    importProject(project) {
        const {id} = project;
        const checklist = {id, project};
        return this.saveChecklist(checklist);
    }


    search(query) {
        return axios.post(`${endpoint}/checklist/search`, {query})
            .then(response => response.data);
    }

}
