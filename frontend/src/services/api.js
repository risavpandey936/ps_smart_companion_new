import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? "" : 'http://localhost:8000');

const api = axios.create({
    baseURL: API_BASE,
    timeout: 120000, // 2 min for large PDFs
});

export const uploadPDF = async (file, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
            if (onProgress) onProgress(Math.round((e.loaded * 100) / e.total));
        },
    });
    return response.data;
};

export const chatWithPDF = async (sessionId, question, chatHistory = []) => {
    const response = await api.post('/api/chat', {
        session_id: sessionId,
        question,
        chat_history: chatHistory,
    });
    return response.data;
};

export const getSession = async (sessionId) => {
    const response = await api.get(`/api/session/${sessionId}`);
    return response.data;
};

export const deleteSession = async (sessionId) => {
    const response = await api.delete(`/api/session/${sessionId}`);
    return response.data;
};
