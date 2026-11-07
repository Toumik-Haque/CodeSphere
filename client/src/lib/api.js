const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('codesphere_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(options.body && !isFormData
      ? { 'Content-Type': 'application/json' }
      : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  // Let the browser set Content-Type and the multipart boundary for FormData.
  if (isFormData) {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(data.message || 'Something went wrong.');
    // Extra details (e.g. a list of missing fields) for pages that want them.
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}
