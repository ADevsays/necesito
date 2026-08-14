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
  btnRemovePhoto: document.getElementById("btnRemovePhoto")
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
    photoData: null
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
async function checkRealConnection() {
  if (!navigator.onLine) return false;
  try {
    const res = await fetch("/api/health", { method: "GET", cache: "no-store", headers: { 'Cache-Control': 'no-cache' } });
    return res.ok;
  } catch (err) {
    return false;
  }
}

async function updateNetworkState() {
  const pending = state.reports.filter(r => r.syncStatus !== "synced").length;
  
  if (state.syncing) {
    els.statusBanner.className = "status-banner online";
    els.statusBanner.textContent = "­ƒöä SINCRONIZANDO...";
  } else if (navigator.onLine) {
    els.statusBanner.className = "status-banner online";
    els.statusBanner.textContent = `­ƒƒó CONECTADO${pending ? ` (${pending} pendientes)` : ""}`;
  } else {
    els.statusBanner.className = "status-banner offline";
    els.statusBanner.textContent = "­ƒƒá SIN INTERNET ÔÇö SE GUARDA LOCALMENTE";
  }
  
  els.btnViewPending.textContent = `­ƒôï REPORTES PENDIENTES (${pending})`;
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
    const div = document.createElement("div");
    div.className = `pending-item ${rep.syncStatus}`;
    const needs = rep.needs.length ? rep.needs.join(" + ").toUpperCase() : "SIN NECESIDAD";
    const loc = rep.location?.description ? rep.location.description : (rep.location?.latitude ? "GPS" : "Sin ubicaci├│n");
    div.innerHTML = `
      <div class="pending-title">${needs}</div>
      <div class="pending-meta">${rep.peopleCount} personas ┬À ${rep.priority || 'NORMAL'}</div>
      <div class="pending-meta">­ƒôì ${loc} ┬À Hace un momento</div>
      <div class="pending-meta mt-4" style="color:var(--urgent)">­ƒƒá PENDIENTE DE SINCRONIZACI├ôN</div>
    `;
    els.pendingList.appendChild(div);
  }
}

function openCapture(fastMode = false) {
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
  
  els.photoPreviewContainer.style.display = "none";
  els.photoPreview.src = "";
  els.photoInput.value = "";
  els.btnCapturePhoto.style.display = "block";
  els.btnCapturePhoto.textContent = "­ƒôÀ TOMAR FOTO";
  
  els.fullFormSection.style.display = fastMode ? "none" : "block";
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
          els.locationFeedback.textContent = "Permiso GPS denegado. Debes ir a la Configuraci├│n de tu celular/navegador, permitir la Ubicaci├│n y recargar la p├ígina.";
        } else if (err.code === 3) {
          els.locationFeedback.textContent = "El GPS tard├│ mucho en responder (Timeout).";
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
        // Limit size heavily if offline
        let MAX_WIDTH = navigator.onLine ? 1200 : 600;
        let MAX_HEIGHT = navigator.onLine ? 1200 : 600;
        let quality = navigator.onLine ? 0.7 : 0.5;

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
  els.btnNewReport.addEventListener("click", () => openCapture(false));
  els.btnFastReport.addEventListener("click", () => openCapture(true));
  els.btnCancel.addEventListener("click", () => showView(els.viewHome));
  
  els.btnViewPending.addEventListener("click", () => showView(els.viewPending));
  els.btnBackFromPending.addEventListener("click", () => showView(els.viewHome));
  
  // Photo Logic
  els.btnCapturePhoto.addEventListener("click", () => els.photoInput.click());
  els.photoInput.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    els.btnCapturePhoto.textContent = "ÔÅ│ Procesando foto...";
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
      els.btnCapturePhoto.textContent = "­ƒôÀ TOMAR FOTO";
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
    if (!phone) return alert("Por favor ingresa un n├║mero de tel├®fono para poder contactarte en emergencias");
    
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
        els.locationFeedback.textContent = "Sin ubicaci├│n.";
      }
    });
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
      state.draft.location = { description: els.locationInput.value.trim() };
    }
    state.draft.description = els.descriptionInput.value.trim();
    
    // Construct LocalReport
    const report = {
      localId: uid("rep"),
      volunteerId: state.volunteer.volunteerId,
      createdAt: new Date().toISOString(),
      location: state.draft.location,
      needs: Array.from(state.draft.needs),
      priority: state.draft.priority || "needed",
      peopleCount: state.draft.peopleCount,
      injured: state.draft.injured,
      trapped: state.draft.trapped,
      children: state.draft.children,
      elderly: state.draft.elderly,
      description: state.draft.description,
      photoData: state.draft.photoData,
      syncStatus: "pending",
      syncAttempts: 0
    };

    await dbWrite(STORE_REPORTS, report);
    
    // Feedback & Reset
    alert("Ô£à REPORTE GUARDADO\nSe enviar├í autom├íticamente cuando vuelva la conexi├│n.");
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
  wireUI();
  const meta = await dbRead(STORE_META, "volunteer");
  if (meta && meta.value) {
    state.volunteer = meta.value;
    showView(els.viewHome);
    await loadReports();
    syncPending();
  } else {
    showView(els.viewProfile);
  }
}

init();
