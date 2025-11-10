function logout() {
    localStorage.removeItem('authToken');
    window.location.href = '/auth/login';
}
