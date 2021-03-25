import axios from 'axios'
import {addAuthHeader} from "./Authorization";


const endpoint = process.env.REACT_APP_API_ENDPOINT || 'http://localhost:3001';

axios.interceptors.request.use((config) => {
    return addAuthHeader(config);
});

export class TranscriptionService {

    deleteChecklist(id) {
        return axios.delete(`${endpoint}/checklist/${id}`);
    }

    getChecklistsByRole(role) {
        return axios.get(`${endpoint}/checklist/role/${role}`)
            .then(response => response.data);
    }

    getChecklist(id) {
        if (id === 'create') {
            return Promise.resolve({project: {}});
        }
        return axios.get(`${endpoint}/checklist/${id}`)
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
