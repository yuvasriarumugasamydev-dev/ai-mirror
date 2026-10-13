// VASTRA AI Smart Mirror - Admin Authentication Logic

function handleAdminLogin(event) {
  if (event) event.preventDefault();

  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const errorMsg = document.getElementById('admin-error');
  const popup = document.getElementById('admin-success-popup');
  const loginCard = document.getElementById('admin-login-card');

  const username = usernameInput ? usernameInput.value.trim().toLowerCase() : '';
  const password = passwordInput ? passwordInput.value.trim() : '';

  if ((username === 'admin' || username === 'shana@gmail.com') && password === '123') {
    if (errorMsg) errorMsg.style.display = 'none';
    if (popup) popup.style.display = 'flex';
    return true;
  } else {
    if (errorMsg) {
      errorMsg.textContent = 'Invalid username or password! Please try again.';
      errorMsg.style.display = 'flex';
    }
    return false;
  }
}

function continueToDashboard() {
  const popup = document.getElementById('admin-success-popup');
  const loginCard = document.getElementById('admin-login-card');
  const dashboard = document.getElementById('admin-dashboard-layout');

  if (popup) popup.style.display = 'none';
  if (loginCard) loginCard.style.display = 'none';
  if (dashboard) dashboard.style.display = 'flex';
}

function handleAdminLogout() {
  const loginCard = document.getElementById('admin-login-card');
  const dashboard = document.getElementById('admin-dashboard-layout');
  const usernameInput = document.getElementById('admin-username');
  const passwordInput = document.getElementById('admin-password');
  const errorMsg = document.getElementById('admin-error');

  if (usernameInput) usernameInput.value = '';
  if (passwordInput) passwordInput.value = '';
  if (errorMsg) errorMsg.style.display = 'none';
  if (dashboard) dashboard.style.display = 'none';
  if (loginCard) loginCard.style.display = 'block';
}

function togglePasswordVisibility() {
  const pwd = document.getElementById('admin-password');
  const icon = document.getElementById('eye-icon');
  if (pwd) {
    if (pwd.type === 'password') {
      pwd.type = 'text';
      if (icon) icon.className = 'fa-solid fa-eye-slash';
    } else {
      pwd.type = 'password';
      if (icon) icon.className = 'fa-solid fa-eye';
    }
  }
}
