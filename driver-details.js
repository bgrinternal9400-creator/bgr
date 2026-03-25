// ===== CONFIGURATION =====
const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbylb_cxvWH_5xhH3u9aDolm4_wn8rczAG1mDDP1sDWeyt8TfmDOVRrpDkDdYZ19QXtj/exec';

document.addEventListener('DOMContentLoaded', () => {
  // ===== HAMBURGER MENU TOGGLE =====
  const hamburger = document.querySelector('.hamburger');
  const navLinks = document.getElementById('navLinks');
  
  if (hamburger) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('active');
      navLinks.classList.toggle('open');
    });
  }

  // ===== LIVE TIMESTAMP =====
  function updateTime() {
    const now = new Date();
    const str = now.toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true
    });
    const liveTimeEl = document.getElementById('liveTime');
    const currentTimeEl = document.getElementById('currentTime');
    if (liveTimeEl) liveTimeEl.textContent = str;
    if (currentTimeEl) currentTimeEl.textContent = str;
  }
  setInterval(updateTime, 1000);
  updateTime();

  // ===== GPS =====
  const gpsEl = document.getElementById('gpsLocation');
  if (gpsEl) {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        pos => {
          gpsEl.textContent = pos.coords.latitude.toFixed(4) + ', ' + pos.coords.longitude.toFixed(4);
        },
        () => { gpsEl.textContent = 'Location unavailable'; }
      );
    } else {
      gpsEl.textContent = 'Not supported';
    }
  }

  // Drag & drop for upload zones
  document.querySelectorAll('.upload-zone').forEach(zone => {
    zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
    zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('dragover');
      const input = zone.nextElementSibling;
      if (e.dataTransfer.files.length) {
        input.files = e.dataTransfer.files;
        input.dispatchEvent(new Event('change'));
      }
    });
  });
});

// ===== FORM NAVIGATION =====
let currentStep = 1;

function goToStep(step) {
  if (step === 3) buildReview();
  document.querySelectorAll('.form-step').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.progress-step').forEach(s => {
    const sn = parseInt(s.dataset.step);
    s.classList.remove('active', 'done');
    if (sn < step) s.classList.add('done');
    if (sn === step) s.classList.add('active');
  });
  const targetStep = document.querySelector(`.form-step[data-step="${step}"]`);
  if (targetStep) targetStep.classList.add('active');
  currentStep = step;
  window.scrollTo({ top: document.getElementById('driver').offsetTop - 100, behavior: 'smooth' });
}

// ===== FILE UPLOAD =====
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
  } else {
    thumb.src = '';
    thumb.style.display = 'none';
  }
  info.textContent = file.name + ' (' + (file.size / 1024).toFixed(1) + ' KB)';
  preview.classList.add('show');
}

function removeFile(inputId, previewId) {
  document.getElementById(inputId).value = '';
  document.getElementById(previewId).classList.remove('show');
}

// ===== IMAGE COMPRESSION =====
function compressImage(file, quality = 0.7, maxWidth = 1024) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      resolve(file);
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob conversion failed'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}

// ===== REVIEW =====
function buildReview() {
  const fields = [
    ['Ability Number', document.getElementById('abilityNum').value || '—'],
    ['Driver Name', document.getElementById('driverName').value || '—'],
    ['Truck Number', document.getElementById('truckNo').value || '—'],
    ['Phone', document.getElementById('phone').value || '—'],
    ['Route', document.getElementById('route').value || '—'],
    ['Cargo Type', document.getElementById('cargoType').value || '—'],
    ['GPS', document.getElementById('gpsLocation').textContent],
    ['Timestamp', document.getElementById('currentTime').textContent],
    ['Photo', document.getElementById('photoInput').files[0]?.name || 'Not uploaded'],
    ['Document 1', document.getElementById('doc1Input').files[0]?.name || 'Not uploaded'],
    ['Document 2', document.getElementById('doc2Input').files[0]?.name || 'Not uploaded'],
  ];
  const grid = document.getElementById('reviewGrid');
  grid.innerHTML = fields.map(([l, v]) =>
    `<div class="review-item"><span class="rlabel">${l}</span><span class="rvalue">${v}</span></div>`
  ).join('');
}

// ===== FILE CONVERSION =====
function toBase64(file) {
  return new Promise((resolve, reject) => {
    if (!file) resolve(null);
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

// ===== SUBMIT =====
async function submitTrip() {
  const check = document.getElementById('declarationCheck');
  if (!check.checked) {
    alert('Please accept the declaration before submitting.');
    return;
  }

  const submitBtn = document.getElementById('submitBtn');
  const originalBtnText = submitBtn.textContent;
  
  try {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Processing... ⌛';

    const now = new Date();
    const dateStr = now.toISOString().slice(2, 10).replace(/-/g, '');
    const rand = Math.floor(10000 + Math.random() * 90000);
    const tripId = `BGR-${dateStr}-${rand}`;

    const photoInput = document.getElementById('photoInput').files[0];
    const doc1Input = document.getElementById('doc1Input').files[0];
    const doc2Input = document.getElementById('doc2Input').files[0];

    const [compressedPhoto, compressedDoc1, compressedDoc2] = await Promise.all([
      photoInput ? compressImage(photoInput) : null,
      doc1Input ? compressImage(doc1Input) : null,
      doc2Input ? compressImage(doc2Input) : null,
    ]);

    const payload = {
      tripId: tripId,
      abilityNum: document.getElementById('abilityNum').value,
      driverName: document.getElementById('driverName').value,
      truckNo: document.getElementById('truckNo').value,
      phone: document.getElementById('phone').value,
      route: document.getElementById('route').value,
      cargoType: document.getElementById('cargoType').value,
      gps: document.getElementById('gpsLocation').textContent,
      timestamp: document.getElementById('currentTime').textContent,
      photoFile: await toBase64(compressedPhoto),
      doc1File: await toBase64(compressedDoc1),
      doc2File: await toBase64(compressedDoc2),
    };

    if (APPS_SCRIPT_URL.includes('YOUR_APPS_SCRIPT_URL')) {
      await new Promise(r => setTimeout(r, 1500));
    } else {
      // Using URLSearchParams to send data as application/x-www-form-urlencoded
      // This is the most reliable way to avoid CORS/CORB issues with Apps Script
      const formData = new URLSearchParams();
      formData.append('action', 'driverSubmit');
      formData.append('tripId', payload.tripId);
      formData.append('abilityNum', payload.abilityNum);
      formData.append('driverName', payload.driverName);
      formData.append('truckNo', payload.truckNo);
      formData.append('phone', payload.phone);
      formData.append('route', payload.route);
      formData.append('cargoType', payload.cargoType);
      formData.append('gps', payload.gps);
      formData.append('timestamp', payload.timestamp);
      
      if (payload.photoFile) formData.append('photoFile', JSON.stringify(payload.photoFile));
      if (payload.doc1File) formData.append('doc1File', JSON.stringify(payload.doc1File));
      if (payload.doc2File) formData.append('doc2File', JSON.stringify(payload.doc2File));

      await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData.toString()
      });
    }

    document.getElementById('tripIdDisplay').textContent = tripId;
    document.querySelector('.form-body').style.display = 'none';
    document.querySelector('.progress-bar').style.display = 'none';
    document.getElementById('successScreen').classList.add('show');

  } catch (error) {
    console.error('Submission failed:', error);
    alert('Something went wrong. Please try again or check your internet connection.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = originalBtnText;
  }
}

function resetForm() {
  document.querySelector('.form-body').style.display = 'block';
  document.querySelector('.progress-bar').style.display = 'flex';
  document.getElementById('successScreen').classList.remove('show');
  document.getElementById('declarationCheck').checked = false;
  document.querySelectorAll('input[type="text"], input[type="tel"]').forEach(i => i.value = '');
  document.querySelectorAll('select').forEach(s => s.selectedIndex = 0);
  document.querySelectorAll('.upload-preview').forEach(p => p.classList.remove('show'));
  goToStep(1);
}
