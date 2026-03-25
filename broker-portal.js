// ===== CONFIGURATION =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylb_cxvWH_5xhH3u9aDolm4_wn8rczAG1mDDP1sDWeyt8TfmDOVRrpDkDdYZ19QXtj/exec';

document.addEventListener('DOMContentLoaded', () => {
  // Navigation setup
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
  }

  // Update time and GPS
  setInterval(updateTime, 1000);
  updateTime();
  fetchGPS();

  // Drag and drop for photo zones
  setupDragAndDrop('photo1Zone', 'photo1Input');
  setupDragAndDrop('photo2Zone', 'photo2Input');
});

// ===== LOGIN LOGIC =====
async function brokerLogin() {
  const user = document.getElementById('brokerUser').value;
  const pass = document.getElementById('brokerPass').value;
  const loginBtn = document.getElementById('loginBtn');

  if (!user || !pass) {
    alert('Please enter both username and password.');
    return;
  }

  try {
    loginBtn.disabled = true;
    loginBtn.textContent = 'Verifying...';

    // Call Apps Script to verify credentials
    // Note: We use a GET request for simplicity in credential checking
    const response = await fetch(`${APPS_SCRIPT_URL}?action=brokerLogin&user=${encodeURIComponent(user)}&pass=${encodeURIComponent(pass)}`);
    const result = await response.json();

    if (result.result === 'success') {
      document.getElementById('loginContainer').style.display = 'none';
      document.getElementById('formContainer').style.display = 'block';
      // Store transport name if returned
      if (result.detail) {
        document.getElementById('transportName').value = result.detail;
      }
    } else {
      alert(result.detail || 'Invalid credentials. Please try again.');
    }
  } catch (error) {
    console.error('Login error:', error);
    // For local testing/demo if Apps Script isn't set up yet
    if (APPS_SCRIPT_URL.includes('YOUR_APPS_SCRIPT_URL')) {
        alert('Apps Script URL not configured. (Demo Mode: Use any login)');
        document.getElementById('loginContainer').style.display = 'none';
        document.getElementById('formContainer').style.display = 'block';
    } else {
        alert('Login failed. Check your connection.');
    }
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Login to Portal ▸';
  }
}

function logoutBroker() {
  if (confirm('Are you sure you want to logout?')) {
    document.getElementById('loginContainer').style.display = 'block';
    document.getElementById('formContainer').style.display = 'none';
    document.getElementById('brokerUser').value = '';
    document.getElementById('brokerPass').value = '';
  }
}

// ===== SUBMISSION LOGIC =====
async function submitBrokerTrip() {
  const submitBtn = document.getElementById('submitBtn');
  const originalText = submitBtn.textContent;

  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';

    const payload = {
      action: 'brokerSubmit',
      transportName: document.getElementById('transportName').value,
      truckNo: document.getElementById('truckNo').value,
      grNo: document.getElementById('grNo').value,
      gps: document.getElementById('gpsLocation').textContent,
      timestamp: document.getElementById('currentTime').textContent,
      photo1: await toBase64(document.getElementById('photo1Input').files[0]),
      photo2: await toBase64(document.getElementById('photo2Input').files[0])
    };

    if (!payload.transportName || !payload.truckNo || !payload.grNo) {
        alert('Please fill in all required fields.');
        return;
    }

    const formData = new URLSearchParams();
    formData.append('action', 'brokerSubmit');
    formData.append('transportName', payload.transportName);
    formData.append('truckNo', payload.truckNo);
    formData.append('grNo', payload.grNo);
    formData.append('gps', payload.gps);
    formData.append('timestamp', payload.timestamp);
    
    if (payload.photo1) formData.append('photo1', JSON.stringify(payload.photo1));
    if (payload.photo2) formData.append('photo2', JSON.stringify(payload.photo2));

    await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString()
    });

    // Generate reference ID
    const refId = `BGR-B-${Date.now().toString().slice(-6)}`;
    document.getElementById('tripIdDisplay').textContent = refId;
    
    document.querySelector('.form-body').style.display = 'none';
    document.getElementById('successScreen').classList.add('show');

  } catch (error) {
    console.error('Submission failed:', error);
    alert('Something went wrong. Please try again.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalText;
  }
}

// ===== UTILITIES =====
function updateTime() {
  const now = new Date();
  const str = now.toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
  });
  if (document.getElementById('liveTime')) document.getElementById('liveTime').textContent = str;
  if (document.getElementById('currentTime')) document.getElementById('currentTime').textContent = str;
}

function fetchGPS() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        const gpsEl = document.getElementById('gpsLocation');
        if (gpsEl) gpsEl.textContent = pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
      },
      () => { if (document.getElementById('gpsLocation')) document.getElementById('gpsLocation').textContent = 'Unavailable'; }
    );
  }
}

function setupDragAndDrop(zoneId, inputId) {
  const zone = document.getElementById(zoneId);
  const input = document.getElementById(inputId);
  if (!zone || !input) return;

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('dragover');
    if (e.dataTransfer.files.length) {
      input.files = e.dataTransfer.files;
      handleUpload(input, zoneId.replace('Zone', 'Preview'));
    }
  });
}

function handleUpload(input, previewId) {
  const file = input.files[0];
  if (!file) return;
  const preview = document.getElementById(previewId);
  const thumb = preview.querySelector('img');
  const info = preview.querySelector('.file-info');
  
  if (file.type.startsWith('image/')) {
    const reader = new FileReader();
    reader.onload = e => { thumb.src = e.target.result; thumb.style.display = 'block'; };
    reader.readAsDataURL(file);
  }
  info.textContent = `${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
  preview.classList.add('show');
}

function removeFile(inputId, previewId) {
  document.getElementById(inputId).value = '';
  document.getElementById(previewId).classList.remove('show');
}

function toBase64(file) {
  if (!file) return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve({
      base64: reader.result,
      type: file.type,
      name: file.name
    });
    reader.onerror = error => reject(error);
  });
}

function resetForm() {
  document.querySelector('.form-body').style.display = 'block';
  document.getElementById('successScreen').classList.remove('show');
  document.querySelectorAll('input:not([type="button"]):not([type="submit"])').forEach(i => i.value = '');
  document.querySelectorAll('.upload-preview').forEach(p => p.classList.remove('show'));
}
