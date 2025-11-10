function showError(message) {
    const errorBanner = document.getElementById('error-banner');
    const errorMessage = document.getElementById('error-message');
    if (errorBanner && errorMessage) {
      errorMessage.textContent = message;
      errorBanner.classList.add('show');
    }
  }
  
  function hideError() {
    const errorBanner = document.getElementById('error-banner');
    if (errorBanner) {
      errorBanner.classList.remove('show');
    }
  }
  
  function clearFieldErrors() {
    const errorSpans = document.querySelectorAll('.error-message');
    errorSpans.forEach(span => {
      span.textContent = '';
    });
  }