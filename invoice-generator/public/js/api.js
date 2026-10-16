const API = {
  async request(url, options = {}) {
    const config = { ...options, headers: { ...(options.body ? {'Content-Type':'application/json'} : {}), ...(options.headers || {}) } };
    let response;
    try { response = await fetch(url, config); }
    catch { throw new Error('Could not connect to the server. Make sure the application is running.'); }
    if (response.status === 204) return { success: true, data: null };
    let body;
    try { body = await response.json(); } catch { throw new Error(`Server returned an unexpected response (${response.status}).`); }
    if (!response.ok || body.success === false) throw new Error(body.message || `Request failed (${response.status}).`);
    return body;
  },
  get: url => API.request(url),
  post: (url, data) => API.request(url, {method:'POST',body:JSON.stringify(data)}),
  put: (url, data) => API.request(url, {method:'PUT',body:JSON.stringify(data)}),
  patch: (url, data) => API.request(url, {method:'PATCH',body:JSON.stringify(data)}),
  delete: url => API.request(url, {method:'DELETE'})
};
