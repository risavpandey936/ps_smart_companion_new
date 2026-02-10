import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
});

// Request interceptor to add token
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

export const register = async (username, password) => {
    const response = await api.post('/register', { username, password });
    return response.data;
};

export const login = async (username, password) => {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    const response = await api.post('/login', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });

    if (response.data.access_token) {
        localStorage.setItem('token', response.data.access_token);
        localStorage.setItem('username', response.data.username);
    }
    return response.data;
};

export const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
};

export const chatWithAI = async (query, context = 'general') => {
    const response = await api.post('/chat', { query, condition_context: context });
    return response.data.response;
};

export const breakdownTask = async (taskDescription) => {
    const response = await api.post('/breakdown-task', { task_description: taskDescription });
    return response.data.steps;
};

export const simplifyText = async (text) => {
    const response = await api.post('/simplify-text', { text });
    return response.data.simplified_text;
};

export const estimateTime = async (taskDescription) => {
    const response = await api.post('/time-estimator', { task_description: taskDescription });
    return response.data.estimation;
};

export default api;
