import axios from 'axios';

const API_BASE_URL = 'http://localhost:7000/api/ims';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
  },
  paramsSerializer: {
    indexes: null // Send arrays as ?languages[]=value1&languages[]=value2
  }
});

export default api;

