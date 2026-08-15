const DB_NAME = "necesito-db";
const STORE_REPORTS = "reports";
const STORE_META = "meta";

const state = {
  volunteer: null,
  reports: [],
  syncing: false,
  
  // Form draft
  draft: resetDraft()
};

const els = {
  viewHome: document.getElementById("view-home"),
  viewCapture: document.getElementById("view-capture"),
  viewProfile: document.getElementById("view-profile"),
  viewPending: document.getElementById("view-pending"),
  
  statusBanner: document.getElementById("statusBanner"),
  pendingList: document.getElementById("pendingList"),
  
  btnNewReport: document.getElementById("btnNewReport"),
  btnFastReport: document.getElementById("btnFastReport"),
  btnDonation: document.getElementById("btnDonation"),
  btnSaveReport: document.getElementById("btnSaveReport"),
  btnCancel: document.getElementById("btnCancel"),
  btnViewPending: document.getElementById("btnViewPending"),
  btnBackFromPending: document.getElementById("btnBackFromPending"),
  btnSaveProfile: document.getElementById("btnSaveProfile"),
  
  fullFormSection: document.getElementById("fullFormSection"),
  locationInput: document.getElementById("locationInput"),
  locationFeedback: document.getElementById("locationFeedback"),
  descriptionInput: document.getElementById("descriptionInput"),
  volunteerAlias: document.getElementById("volunteerAlias"),
  volunteerPhone: document.getElementById("volunteerPhone"),
  
  photoInput: document.getElementById("photoInput"),
  btnCapturePhoto: document.getElementById("btnCapturePhoto"),
  photoPreviewContainer: document.getElementById("photoPreviewContainer"),
  photoPreview: document.getElementById("photoPreview"),
  btnRemovePhoto: document.getElementById("btnRemovePhoto"),
  
  needsGrid: document.getElementById("needsGrid"),
  donationNeedsGrid: document.getElementById("donationNeedsGrid"),
  donationDetailsSection: document.getElementById("donationDetailsSection"),
  donationDetailsInput: document.getElementById("donationDetailsInput")
};

function uid(prefix = "local") {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

function resetDraft() {
  return {
    location: null,
    needs: new Set(),
    priority: null,
    peopleCount: 1,
    injured: null,
    trapped: null,
    children: null,
    elderly: null,
    description: "",
    photoData: null,
    source: "offline"
  };
}

// === IndexedDB ===
function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (db.objectStoreNames.contains(STORE_REPORTS)) {
        db.deleteObjectStore(STORE_REPORTS);
      }
      db.createObjectStore(STORE_REPORTS, { keyPath: "localId" });
      
      if (!db.objectStoreNames.contains(STORE_META)) db.createObjectStore(STORE_META, { keyPath: "key" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function dbRead(storeName, key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const store = tx.objectStore(storeName);
    const request = key === undefined ? store.getAll() : store.get(key);
    request.onsuccess = () => resolve(request.result || (key === undefined ? [] : null));
    request.onerror = () => reject(request.error);
  });
}

async function dbWrite(storeName, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.put(value);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

// === Navigation ===
function showView(viewEl) {
  document.querySelectorAll(".view").forEach(el => el.classList.remove("active"));
  viewEl.classList.add("active");
  window.scrollTo(0, 0);
}

// === Network & Sync ===
async function checkRealConnection(retries = 2) {
  // En iOS (Safari) navigator.onLine a veces miente al iniciar la PWA
  // y las peticiones fallan si la antena de red apenas está despertando.
  for (let i = 0; i <= retries; i++) {
    try {
      const res = await fetch("/api/health", { method: "GET", cache: "no-store", headers: { 'Cache-Control': 'no-cache' } });
      if (res.ok) return true;
    } catch (err) {
      if (i < retries) await new Promise(r => setTimeout(r, 1000));
    }
  }
  return false;
}

async function updateNetworkState() {
  const pending = state.reports.filter(r => r.syncStatus !== "synced").length;
  
  if (state.syncing) {
    els.statusBanner.className = "status-banner online";
    els.statusBanner.textContent = "🔄 SINCRONIZANDO...";
  } else if (navigator.onLine) {
    els.statusBanner.className = "status-banner online";
    els.statusBanner.textContent = `🟢 CONECTADO${pending ? ` (${pending} pendientes)` : ""}`;
  } else {
    // Asumimos offline pero verificamos por culpa de iOS
    els.statusBanner.className = "status-banner offline";
    els.statusBanner.textContent = "🟠 REVISANDO CONEXIÓN...";
    
    checkRealConnection().then(realOnline => {
      if (realOnline) {
        els.statusBanner.className = "status-banner online";
        els.statusBanner.textContent = `🟢 CONECTADO${pending ? ` (${pending} pendientes)` : ""}`;
        if (pending > 0) triggerSync();
      } else {
        els.statusBanner.className = "status-banner offline";
        els.statusBanner.textContent = "🟠 SIN INTERNET — SE GUARDA LOCALMENTE";
      }
    });
  }
  
  els.btnViewPending.textContent = `📋 REPORTES PENDIENTES (${pending})`;
}

async function syncPending() {
  if (state.syncing || !state.volunteer) return;
  const isReallyOnline = await checkRealConnection();
  if (!isReallyOnline) return;

  state.syncing = true;
  updateNetworkState();

  try {
    const pending = state.reports.filter(r => r.syncStatus !== "synced");
    if (!pending.length) return;

    const payloads = pending.map(r => ({
      local_id: r.localId,
      volunteer_id: r.volunteerId,
      volunteer_name: state.volunteer.name,
      phone: state.volunteer.phone,
      created_at: r.createdAt,
      location: {
         lat: r.location?.latitude || null,
         lng: r.location?.longitude || null,
         label: r.location?.description || null
      },
      needs: r.needs,
      priority: r.priority,
      people_count: r.peopleCount,
      injured: r.injured,
      trapped: r.trapped,
      children: r.children,
      elderly: r.elderly,
      description: r.description,
      source: r.source || "offline",
      photos: r.photoData ? [{ dataUrl: r.photoData, type: "image/jpeg", name: "foto.jpg", size: r.photoData.length }] : []
    }));

    const response = await fetch("/api/reports/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reports: payloads }),
    });

    if (!response.ok) throw new Error("sync_failed");
    const result = await response.json();
    
    const syncedIds = new Set((result.synced || []).map(item => item.localId || item.local_id));
    
    for (const report of pending) {
      if (syncedIds.has(report.localId)) {
        report.syncStatus = "synced";
        report.serverId = (result.synced.find(i => (i.localId || i.local_id) === report.localId)).serverId || (result.synced.find(i => (i.localId || i.local_id) === report.localId)).server_id;
      }
      report.syncAttempts = (report.syncAttempts || 0) + 1;
      report.lastSyncAttempt = new Date().toISOString();
      await dbWrite(STORE_REPORTS, report);
    }
    await loadReports();
  } catch (err) {
    console.error("Sync failed", err);
    if ('serviceWorker' in navigator && 'SyncManager' in window) {
      navigator.serviceWorker.ready.then(sw => sw.sync.register('sync-reports')).catch(console.error);
    }
  } finally {
    state.syncing = false;
    updateNetworkState();
  }
}

// === Core Flow ===
async function loadReports() {
  state.reports = await dbRead(STORE_REPORTS);
  state.reports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  updateNetworkState();
  renderPending();
}

function renderPending() {
  els.pendingList.innerHTML = "";
  const pending = state.reports.filter(r => r.syncStatus !== "synced");
  if (!pending.length) {
    els.pendingList.innerHTML = "<p>No hay reportes pendientes.</p>";
    return;
  }
  for (const rep of pending) {
    const isDonation = rep.source === "donation";
    const div = document.createElement("div");
    div.className = `pending-item ${isDonation ? "donation-item" : ""} ${rep.syncStatus}`;
    
    const NEED_LABELS = {
      "rescue": "RESCATE", "medical": "MÉDICO", "water": "AGUA", "food": "COMIDA",
      "shelter": "REFUGIO", "medication": "MEDICAMENTOS", "vulnerable": "VULNERABLE",
      "missing": "DESAPARECIDO", "pets": "MASCOTA", "other": "OTRO",
      "hygiene": "ASEO", "clothes": "ROPA", "construction": "CONSTRUCCIÓN"
    };
    const PRIORITY_LABELS = { "critical": "🔴 CRÍTICO", "urgent": "🟠 URGENTE", "necessary": "🟢 NECESARIO" };
    
    const needsArr = Array.isArray(rep.needs) ? rep.needs : [];
    const translatedNeeds = needsArr.map(n => NEED_LABELS[n] || n).join(" + ").toUpperCase();
    const needs = translatedNeeds || (isDonation ? "INSUMOS VARIOS" : "SIN NECESIDAD");
    const priorityStr = PRIORITY_LABELS[rep.priority] || rep.priority || 'NECESARIO';
    
    const loc = rep.location?.description ? rep.location.description : (rep.location?.latitude ? "GPS" : "Sin ubicación");
    
    if (isDonation) {
      div.innerHTML = `
        <div class="donation-badge-header">🎁 DONACIÓN PENDIENTE</div>
        <div class="pending-title" style="color:#86efac;">${needs}</div>
        <div class="donation-detail-box" style="margin-top:0.5rem;">
          <div class="donation-detail-title">DETALLES REGISTRADOS</div>
          <div class="donation-detail-content">${rep.description || 'Sin detalles adicionales'}</div>
        </div>
        <div class="pending-meta">📍 ${loc} · Hace un momento</div>
        <div class="pending-meta mt-4" style="color:var(--urgent)">🟠 PENDIENTE DE SINCRONIZACIÓN</div>
        
        <div style="display:flex; gap:0.5rem; margin-top:1rem;">
          <button class="btn-large secondary" style="flex:1; font-size:0.8rem; padding:0.5rem;" onclick="shareReportOffline('${rep.localId}')">📤 COMPARTIR</button>
          <button class="btn-large secondary" style="flex:1; font-size:0.8rem; padding:0.5rem;" onclick="showQR('${rep.localId}')">📱 MOSTRAR QR</button>
        </div>
      `;
    } else {
      div.innerHTML = `
        <div class="emergency-badge-header ${rep.priority || 'necessary'}">${priorityStr}</div>
        <div class="pending-title">${needs}</div>
        <div class="pending-meta">${rep.peopleCount} personas</div>
        <div class="pending-meta">📍 ${loc} · Hace un momento</div>
        <div class="pending-meta mt-4" style="color:var(--urgent)">🟠 PENDIENTE DE SINCRONIZACIÓN</div>
        
        <div style="display:flex; gap:0.5rem; margin-top:1rem;">
          <button class="btn-large secondary" style="flex:1; font-size:0.8rem; padding:0.5rem;" onclick="shareReportOffline('${rep.localId}')">📤 COMPARTIR</button>
          <button class="btn-large secondary" style="flex:1; font-size:0.8rem; padding:0.5rem;" onclick="showQR('${rep.localId}')">📱 MOSTRAR QR</button>
        </div>
      `;
    }
    
    els.pendingList.appendChild(div);
  }
}

window.shareReportOffline = async function(localId) {
  const rep = state.reports.find(r => r.localId === localId);
  if (!rep) return;
  
  const clone = { ...rep };
  delete clone.photoData; // No podemos compartir 1MB de base64 en la URL
  
  const payload = btoa(unescape(encodeURIComponent(JSON.stringify(clone))));
  const shareUrl = window.location.origin + '/?import_p2p=' + payload;
  
  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Reporte de Emergencia Necesito',
        text: '¡Hola! Ayúdame a subir este reporte de emergencia de Necesito escaneándolo o abriendo este enlace:',
        url: shareUrl
      });
    } catch(err) {
      console.log('Error compartiendo:', err);
    }
  } else {
    alert("Tu navegador no soporta compartir nativo. Usa la opción de QR.");
  }
};

window.showQR = function(localId) {
  const rep = state.reports.find(r => r.localId === localId);
  if (!rep) return;
  
  // Remove photoData to fit in QR (QR codes max out at ~3KB)
  const clone = { ...rep };
  delete clone.photoData;
  
  const payload = 'NECESITO_PAYLOAD:' + btoa(unescape(encodeURIComponent(JSON.stringify(clone))));
  
  document.getElementById('qrModalTitle').textContent = "Escanea con otro celular";
  document.getElementById('qrCodeContainer').style.display = 'inline-block';
  document.getElementById('qrCodeContainer').innerHTML = '';
  document.getElementById('qrReader').style.display = 'none';
  document.getElementById('qrModalFeedback').textContent = "Pídele a un voluntario con internet que escanee este código.";
  
  new QRCode(document.getElementById("qrCodeContainer"), {
    text: payload,
    width: 300,
    height: 300,
    colorDark : "#000000",
    colorLight : "#ffffff",
    correctLevel : QRCode.CorrectLevel.L
  });
  
  document.getElementById('qrModal').style.display = 'block';
};

document.getElementById('btnScanQR')?.addEventListener('click', () => {
  document.getElementById('qrModalTitle').textContent = "Escanear Código QR";
  document.getElementById('qrCodeContainer').style.display = 'none';
  document.getElementById('qrReader').style.display = 'block';
  document.getElementById('qrModalFeedback').textContent = "Apunta la cámara al código QR de otro voluntario.";
  document.getElementById('qrModal').style.display = 'block';
  
  if (window.html5QrCode) {
    window.html5QrCode.stop().catch(()=>{});
  }
  
  window.html5QrCode = new Html5Qrcode("qrReader");
  window.html5QrCode.start(
    { facingMode: "environment" },
    { fps: 10, qrbox: { width: 250, height: 250 } },
    async (decodedText) => {
      if (decodedText.startsWith('NECESITO_PAYLOAD:')) {
        try {
          const b64 = decodedText.split('NECESITO_PAYLOAD:')[1];
          const rep = JSON.parse(decodeURIComponent(escape(atob(b64))));
          rep.syncStatus = 'pending'; // Force pending so it syncs
          rep.source = 'p2p_offline';
          
          // Guardar en nuestra DB local
          const existing = state.reports.find(r => r.localId === rep.localId);
          if (!existing) {
            state.reports.push(rep);
            await dbWrite(STORE_REPORTS, rep); // Corrección del bug
            renderPending();
            document.getElementById('qrModalFeedback').textContent = "¡Reporte importado con éxito!";
            document.getElementById('qrModalFeedback').style.color = "#10b981";
            
            // Evitar escaneos duplicados en ráfaga
            if (window.html5QrCode) {
              window.html5QrCode.pause();
            }
            
            setTimeout(() => {
              if (window.html5QrCode) {
                 window.html5QrCode.stop().catch(()=>{});
              }
              document.getElementById('qrModal').style.display = 'none';
              syncPending(); // Usar la función correcta
            }, 1500);
          } else {
             document.getElementById('qrModalFeedback').textContent = "Este reporte ya lo habías importado.";
          }
        } catch(e) {
          console.error("QR Error:", e);
          document.getElementById('qrModalFeedback').textContent = "Error interno procesando el QR.";
        }
      } else if (decodedText.includes('import_p2p=')) {
        // Soporte si escanean la URL en lugar del raw payload
        window.location.href = decodedText;
      }
    },
    (errorMessage) => {}
  ).catch(err => {
    document.getElementById('qrModalFeedback').textContent = "Error al abrir la cámara: " + err;
  });
});


function openCapture(mode = 'normal') {
  const fastMode = mode === 'fast';
  const donationMode = mode === 'donation';
  state.draft = resetDraft();
  
  // Reset UI
  document.querySelectorAll(".btn-large.selected").forEach(el => el.classList.remove("selected"));
  document.querySelectorAll(".count-btn").forEach(el => el.classList.remove("selected"));
  document.querySelector('.count-btn[data-val="1"]').classList.add("selected");
  document.querySelectorAll(".toggle-btn").forEach(el => el.classList.remove("selected"));
  document.querySelectorAll('.toggle-btn[data-val="unknown"]').forEach(el => el.classList.add("selected"));
  
  els.locationInput.style.display = "none";
  els.locationInput.value = "";
  els.descriptionInput.value = "";
  els.locationFeedback.textContent = "";
  if (els.donationDetailsInput) els.donationDetailsInput.value = "";
  
  els.photoPreviewContainer.style.display = "none";
  els.photoPreview.src = "";
  els.photoInput.value = "";
  els.btnCapturePhoto.style.display = "block";
  els.btnCapturePhoto.textContent = "📷 TOMAR FOTO";
  
  if (donationMode) {
    document.getElementById("captureTitle").textContent = "NUEVA DONACIÓN";
    document.getElementById("locTitle").textContent = "¿DÓNDE ESTÁ LA DONACIÓN?";
    document.getElementById("needsTitle").textContent = "¿QUÉ VAS A DONAR?";
    document.getElementById("photoTitle").textContent = "FOTO (Obligatoria)";
    document.getElementById("prioritySection").style.display = "none";
    els.fullFormSection.style.display = "none";
    if (els.donationNeedsGrid) els.donationNeedsGrid.style.display = "grid";
    if (els.needsGrid) els.needsGrid.style.display = "none";
    if (els.donationDetailsSection) els.donationDetailsSection.style.display = "block";
    els.btnCapturePhoto.textContent = "📷 TOMAR FOTO";
    state.draft.source = "donation";
    state.draft.priority = "necessary"; // Default for donations
  } else {
    document.getElementById("captureTitle").textContent = "NUEVO REPORTE";
    document.getElementById("locTitle").textContent = "¿DÓNDE ESTÁ LA PERSONA?";
    document.getElementById("needsTitle").textContent = "NECESIDAD";
    document.getElementById("photoTitle").textContent = "FOTO (Opcional)";
    document.getElementById("prioritySection").style.display = "block";
    els.fullFormSection.style.display = fastMode ? "none" : "block";
    if (els.donationNeedsGrid) els.donationNeedsGrid.style.display = "none";
    if (els.needsGrid) els.needsGrid.style.display = "grid";
    if (els.donationDetailsSection) els.donationDetailsSection.style.display = "none";
    els.btnCapturePhoto.textContent = "📷 TOMAR FOTO";
    state.draft.source = "offline";
  }

  showView(els.viewCapture);
}

async function captureGps() {
  els.locationFeedback.textContent = "Buscando GPS (esto puede tardar unos segundos)...";
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      els.locationFeedback.textContent = "GPS no disponible en este dispositivo.";
      return resolve(null);
    }
    
    const options = { enableHighAccuracy: true, timeout: 15000, maximumAge: 10000 };
    
    navigator.geolocation.getCurrentPosition(
      pos => {
        els.locationFeedback.textContent = "GPS capturado correctamente.";
        resolve({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          description: ""
        });
      },
      err => {
        if (err.code === 1) {
          els.locationFeedback.textContent = "Permiso GPS denegado. Debes ir a la Configuración de tu celular/navegador, permitir la Ubicación y recargar la página.";
        } else if (err.code === 3) {
          els.locationFeedback.textContent = "El GPS tardó mucho en responder (Timeout).";
        } else {
          els.locationFeedback.textContent = "Error al obtener GPS: " + err.message;
        }
        resolve(null);
      },
      options
    );
  });
}

// === Image Processing ===
function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        // Limit size aggressively to prevent Base64 bloat (JSON API limitation)
        let MAX_WIDTH = 800;
        let MAX_HEIGHT = 800;
        let quality = 0.6;

        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round(height * (MAX_WIDTH / width));
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round(width * (MAX_HEIGHT / height));
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

// === Event Listeners ===
function wireUI() {
  els.btnNewReport.addEventListener("click", () => openCapture('normal'));
  els.btnFastReport.addEventListener("click", () => openCapture('fast'));
  els.btnDonation.addEventListener("click", () => openCapture('donation'));
  els.btnCancel.addEventListener("click", () => showView(els.viewHome));
  
  els.btnViewPending.addEventListener("click", () => showView(els.viewPending));
  els.btnBackFromPending.addEventListener("click", () => showView(els.viewHome));
  
  // Photo Logic
  els.btnCapturePhoto.addEventListener("click", () => els.photoInput.click());
  els.photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    els.btnCapturePhoto.textContent = "⏳ Procesando foto...";
    try {
      const base64 = await compressImage(file);
      state.draft.photoData = base64;
      els.photoPreview.src = base64;
      els.photoPreviewContainer.style.display = "block";
      els.btnCapturePhoto.style.display = "none";
    } catch(err) {
      console.error(err);
      alert("Error al procesar foto");
    } finally {
      els.btnCapturePhoto.textContent = "📷 TOMAR FOTO";
      els.photoInput.value = "";
    }
  });

  els.btnRemovePhoto.addEventListener("click", () => {
    state.draft.photoData = null;
    els.photoPreview.src = "";
    els.photoPreviewContainer.style.display = "none";
    els.btnCapturePhoto.style.display = "block";
  });
  
  // PWA Install Logic
  let deferredPrompt;
  const btnInstall = document.getElementById("btnInstallApp");
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (btnInstall) btnInstall.style.display = 'block';
  });

  if (btnInstall) {
    btnInstall.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          btnInstall.style.display = 'none';
        }
        deferredPrompt = null;
      }
    });
  }

  els.btnSaveProfile.addEventListener("click", async () => {
    const name = els.volunteerAlias.value.trim();
    const phone = els.volunteerPhone.value.trim();
    if (!name) return alert("Por favor ingresa un nombre o alias");
    if (!phone) return alert("Por favor ingresa un número de teléfono para poder contactarte en emergencias");
    
    state.volunteer = {
      volunteerId: uid("vol"),
      name,
      phone: els.volunteerPhone.value.trim(),
      createdAt: new Date().toISOString()
    };
    await dbWrite(STORE_META, { key: "volunteer", value: state.volunteer });
    showView(els.viewHome);
  });

  // Needs selection
  document.querySelectorAll('[data-need]').forEach(btn => {
    btn.addEventListener("click", () => {
      const val = btn.dataset.need;
      if (state.draft.needs.has(val)) {
        state.draft.needs.delete(val);
        btn.classList.remove("selected");
      } else {
        state.draft.needs.add(val);
        btn.classList.add("selected");
      }
    });
  });

  // Priority selection
  document.querySelectorAll('[data-priority]').forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll('[data-priority]').forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.draft.priority = btn.dataset.priority;
    });
  });

  // Location selection
  document.querySelectorAll('[data-loc]').forEach(btn => {
    btn.addEventListener("click", async () => {
      document.querySelectorAll('[data-loc]').forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      const locType = btn.dataset.loc;
      
      els.locationInput.style.display = locType === "text" ? "block" : "none";
      
      if (locType === "gps") {
        state.draft.location = await captureGps();
      } else if (locType === "unknown") {
        state.draft.location = null;
        els.locationFeedback.textContent = "Sin ubicación.";
      }
    });
  });

  // Geocode manual text address
  els.locationInput.addEventListener("blur", async () => {
    const text = els.locationInput.value.trim();
    if (!text) return;
    els.locationFeedback.textContent = "🔍 Buscando coordenadas para el mapa...";
    els.locationFeedback.style.color = "#93c5fd";
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=co&limit=1&q=${encodeURIComponent(text)}`);
      const data = await res.json();
      if (data && data.length > 0) {
        state.draft.location = {
          latitude: parseFloat(data[0].lat),
          longitude: parseFloat(data[0].lon),
          accuracy: null,
          description: text,
          label: data[0].display_name
        };
        els.locationFeedback.textContent = `📍 Ubicación detectada en mapa (${parseFloat(data[0].lat).toFixed(4)}, ${parseFloat(data[0].lon).toFixed(4)})`;
        els.locationFeedback.style.color = "#86efac";
      } else {
        state.draft.location = { description: text };
        els.locationFeedback.textContent = "📍 Dirección guardada como texto de referencia.";
        els.locationFeedback.style.color = "#fdba74";
      }
    } catch(e) {
      state.draft.location = { description: text };
      els.locationFeedback.textContent = "📍 Dirección guardada (modo sin conexión).";
      els.locationFeedback.style.color = "#fdba74";
    }
  });

  // People Count
  document.querySelectorAll('.count-btn').forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll('.count-btn').forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      state.draft.peopleCount = btn.dataset.val === "10+" ? 10 : parseInt(btn.dataset.val);
    });
  });

  // Toggles
  document.querySelectorAll('.toggle-btn').forEach(btn => {
    btn.addEventListener("click", () => {
      const group = btn.closest('.toggle-group');
      const field = group.dataset.field;
      group.querySelectorAll('.toggle-btn').forEach(b => b.classList.remove("selected"));
      btn.classList.add("selected");
      
      const val = btn.dataset.val;
      state.draft[field] = val === "yes" ? true : (val === "no" ? false : null);
    });
  });

  // Save Report
  els.btnSaveReport.addEventListener("click", async () => {
    // Collect text inputs
    if (els.locationInput.style.display === "block" && els.locationInput.value.trim()) {
      const text = els.locationInput.value.trim();
      if (state.draft.location && state.draft.location.latitude) {
        state.draft.location.description = text;
      } else {
        state.draft.location = { description: text };
      }
    }
    
    if (state.draft.source === 'donation') {
      const donationDesc = els.donationDetailsInput ? els.donationDetailsInput.value.trim() : "";
      if (!donationDesc) {
        alert("Por favor detalla qué vas a donar (Cantidades, detalles, etc).");
        return;
      }
      if (!state.draft.photoData) {
        alert("Por favor incluye una foto de la donación. Es obligatorio.");
        return;
      }
      state.draft.description = donationDesc;
    } else {
      state.draft.description = els.descriptionInput.value.trim();
    }
    
    // Construct LocalReport
    const report = {
      localId: uid("rep"),
      volunteerId: state.volunteer.volunteerId,
      createdAt: new Date().toISOString(),
      location: state.draft.location,
      needs: Array.from(state.draft.needs),
      priority: state.draft.priority || "necessary",
      peopleCount: state.draft.peopleCount,
      injured: state.draft.injured,
      trapped: state.draft.trapped,
      children: state.draft.children,
      elderly: state.draft.elderly,
      description: state.draft.description,
      emergency: state.draft.priority === "critical" || state.draft.priority === "urgent",
      photoData: state.draft.photoData,
      source: state.draft.source || "offline",
      syncStatus: "pending",
      syncAttempts: 0
    };

    await dbWrite(STORE_REPORTS, report);
    
    // Feedback & Reset
    alert("✅ REPORTE GUARDADO\nSe enviará automáticamente cuando vuelva la conexión.");
    await loadReports();
    showView(els.viewHome);
    
    // Trigger sync
    syncPending();
  });

  window.addEventListener("online", () => {
    updateNetworkState();
    syncPending();
  });
  window.addEventListener("offline", updateNetworkState);
}

// === Init ===
async function init() {
  const urlParams = new URLSearchParams(window.location.search);
  const p2pImport = urlParams.get('import_p2p');
  
  wireUI();
  updateNetworkState();
  
  const meta = await dbRead(STORE_META, "volunteer");
  if (meta && meta.value) {
    state.volunteer = meta.value;
    showView(els.viewHome);
    await loadReports();
    
    if (p2pImport) {
      try {
        const rep = JSON.parse(decodeURIComponent(escape(atob(p2pImport))));
        rep.syncStatus = 'pending';
        rep.source = 'p2p_offline';
        const existing = state.reports.find(r => r.localId === rep.localId);
        if (!existing) {
          state.reports.push(rep);
          await dbWrite(STORE_REPORTS, rep);
          renderPending();
          alert("¡Reporte importado con éxito desde el enlace!");
        } else {
          alert("Este reporte ya lo tenías guardado.");
        }
      } catch(e) {
        alert("Enlace de importación inválido o corrupto.");
      }
      window.history.replaceState({}, document.title, window.location.pathname);
    }
    
    syncPending();
  } else {
    showView(els.viewProfile);
  }
}

init();
