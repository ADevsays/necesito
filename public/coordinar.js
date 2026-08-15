const ZONES = ["Manizales", "Cali", "Pereira", "Chocó"];

const NEED_LABELS = {
  "rescue": "RESCATE",
  "medical": "MÉDICO",
  "water": "AGUA",
  "food": "COMIDA",
  "shelter": "REFUGIO",
  "medication": "MEDICAMENTOS",
  "vulnerable": "VULNERABLE",
  "missing": "DESAPARECIDO",
  "pets": "MASCOTA",
  "other": "OTRO",
  "hygiene": "ASEO",
  "clothes": "ROPA",
  "construction": "CONSTRUCCIÓN"
};

const NEED_ICONS = {
  "rescue": "🆘",
  "medical": "🏥",
  "water": "💧",
  "food": "🍲",
  "shelter": "🏠",
  "medication": "💊",
  "vulnerable": "👶",
  "missing": "👤",
  "pets": "🐾",
  "other": "📦",
  "hygiene": "🧼",
  "clothes": "👕",
  "construction": "🧱"
};

const state = {
  reports: [],
  typeFilter: 'all',
  selectedId: null,
};

const els = {
  statusBanner: document.getElementById("statusBanner"),
  coordList: document.getElementById("coordList"),
  reportsCountText: document.getElementById("reportsCountText"),
  statusFilter: document.getElementById("statusFilter"),
  regionFilter: document.getElementById("regionFilter"),
  typeTabGroup: document.getElementById("typeTabGroup")
};

let map = null;
let markersLayer = null;
let mapVisible = false;

window.openCardFromMap = function(reportId) {
  const mapContainer = document.getElementById('mapContainer');
  const listContainer = document.getElementById('listContainer');
  const btnToggleMap = document.getElementById('btnToggleMap');
  
  if (mapContainer) mapContainer.style.display = 'none';
  if (listContainer) listContainer.style.display = 'block';
  if (btnToggleMap) btnToggleMap.textContent = '🗺️ VER MAPA';
  mapVisible = false;
  
  setTimeout(() => {
    const card = document.querySelector(`.pending-item[data-report-id="${reportId}"]`);
    if (card) {
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.style.transition = 'box-shadow 0.3s ease';
      card.style.boxShadow = '0 0 20px 5px var(--primary)';
      setTimeout(() => card.style.boxShadow = '', 2500);
    }
  }, 100);
};

function initMap() {
  if (!map && document.getElementById('mapContainer')) {
    map = L.map('mapContainer').setView([4.5709, -74.2973], 6);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap'
    }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
  }
}

function parseNeeds(report) {
  if (Array.isArray(report.needs)) return report.needs;
  if (typeof report.needs_json === 'string') {
    try { return JSON.parse(report.needs_json); } catch (e) { return []; }
  }
  return [];
}

function parsePhotos(report) {
  if (Array.isArray(report.photos)) return report.photos;
  if (typeof report.photos_json === 'string') {
    try { return JSON.parse(report.photos_json); } catch (e) { return []; }
  }
  return [];
}

function updateMap() {
  if (!markersLayer) return;
  markersLayer.clearLayers();
  
  // 1. Filter reports according to active tab filter
  const reportsToDisplay = state.reports.filter(r => {
    const needs = parseNeeds(r);
    const isDon = r.source === 'donation' || needs.some(n => ['hygiene', 'clothes', 'construction'].includes(n));
    if (state.typeFilter === 'emergency') return !isDon;
    if (state.typeFilter === 'donation') return isDon;
    return true;
  });

  // 2. Group reports by location to apply spidering/offset if overlapping
  const locGroups = new Map();
  reportsToDisplay.forEach(report => {
    const lat = report.latitude ?? report.location?.lat;
    const lng = report.longitude ?? report.location?.lng;
    if (lat && lng && Number(lat) !== 0 && Number(lng) !== 0) {
      const key = `${Number(lat).toFixed(4)}_${Number(lng).toFixed(4)}`;
      if (!locGroups.has(key)) locGroups.set(key, []);
      locGroups.get(key).push(report);
    }
  });

  // 3. Render markers with spider offset & distinctive shapes
  locGroups.forEach((reportsInSpot) => {
    const count = reportsInSpot.length;
    reportsInSpot.forEach((report, index) => {
      let lat = Number(report.latitude ?? report.location?.lat);
      let lng = Number(report.longitude ?? report.location?.lng);
      
      // If multiple markers are on the exact same coordinate, fan them out slightly
      if (count > 1) {
        const angle = (2 * Math.PI * index) / count;
        const radius = 0.00035; // ~35 meters
        lat = lat + radius * Math.cos(angle);
        lng = lng + radius * Math.sin(angle);
      }

      const needs = parseNeeds(report);
      const isDonation = report.source === 'donation' || needs.some(n => ['hygiene', 'clothes', 'construction'].includes(n));
      
      let color = '#2563eb'; // blue necessary
      if (isDonation) {
        color = '#15803d'; // emerald green
      } else if (report.priority === 'critical') {
        color = '#dc2626'; // red
      } else if (report.priority === 'urgent') {
        color = '#ea580c'; // orange
      }
      
      const primaryNeed = needs[0] || (isDonation ? 'other' : 'rescue');
      const topicIcon = isDonation ? (NEED_ICONS[primaryNeed] || '🎁') : (NEED_ICONS[primaryNeed] || '🆘');
      
      let markerHtml = '';
      if (isDonation) {
        // Distinctive rounded square with bright lime border and gift corner badge
        markerHtml = `
          <div style="position: relative; width: 38px; height: 38px; background-color: #15803d; border-radius: 10px; border: 3px solid #86efac; box-shadow: 0 3px 8px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 19px; line-height: 1; cursor: pointer; user-select: none;">
            ${topicIcon}
            <span style="position: absolute; top: -7px; right: -7px; background: #000; border: 1.5px solid #86efac; border-radius: 50%; width: 16px; height: 16px; font-size: 10px; display: flex; align-items: center; justify-content: center; line-height: 1;">🎁</span>
          </div>
        `;
      } else {
        // Circular emergency badge with severity color and clean white border
        markerHtml = `
          <div style="width: 36px; height: 36px; background-color: ${color}; border-radius: 50%; border: 2.5px solid #ffffff; box-shadow: 0 3px 8px rgba(0,0,0,0.6); display: flex; align-items: center; justify-content: center; font-size: 18px; line-height: 1; cursor: pointer; user-select: none;">
            ${topicIcon}
          </div>
        `;
      }

      const iconSize = isDonation ? [38, 38] : [36, 36];
      const iconAnchor = isDonation ? [19, 19] : [18, 18];
      const icon = L.divIcon({ html: markerHtml, className: '', iconSize, iconAnchor });
      
      const translatedNeeds = needs.map(n => NEED_LABELS[n] || n.toUpperCase());
      const needsStr = translatedNeeds.length ? translatedNeeds.join(" + ") : (isDonation ? "INSUMOS VARIOS" : "SIN ESPECIFICAR");
      
      let popupContent = `<div style="color: #111; font-family: system-ui, sans-serif; font-size: 0.9rem; line-height: 1.4;">`;
      if (isDonation) {
        popupContent += `<div style="background:#15803d; color:#fff; font-weight:800; padding:0.25rem 0.5rem; border-radius:4px; display:inline-block; font-size:0.75rem; margin-bottom:0.4rem;">🎁 OFERTA DE DONACIÓN</div><br/>`;
        popupContent += `<strong style="font-size:0.95rem; color:#14532d;">${needsStr}</strong><br/>`;
        if (report.description) {
          popupContent += `<div style="background:#f0fdf4; border-left:3px solid #22c55e; padding:0.35rem 0.5rem; margin:0.4rem 0; font-size:0.8rem;">${report.description}</div>`;
        }
      } else {
        popupContent += `<strong style="color:${color}; font-size:1rem;">${priorityLabel(report.priority)}</strong><br/>`;
        popupContent += `<strong>${needsStr}</strong><br/>`;
        popupContent += `<span style="font-size:0.8rem; color:#4b5563;">${report.people_count || 1} personas</span><br/>`;
      }
      
      const locLabel = report.location_label || report.location_address || report.location?.description || report.location?.label;
      if (locLabel) {
        popupContent += `<div style="color:#6b7280; font-size:0.8rem; margin-top:0.25rem;">📍 ${locLabel}</div>`;
      }
      
      const photos = parsePhotos(report);
      if (photos.length > 0 && photos[0].dataUrl) {
        popupContent += `<img src="${photos[0].dataUrl}" style="width:100%; max-height:110px; object-fit:cover; margin-top:6px; border-radius:4px; border:1px solid #ccc;"/>`;
      }
      
      popupContent += `<button class="btn-large" style="margin-top:0.6rem; width:100%; padding:0.5rem; font-size:0.8rem; text-align:center; background:#111; color:#fff; border:none;" onclick="openCardFromMap(${report.id})">${isDonation ? 'VER DONACIÓN' : 'VER CASO'}</button>`;
      popupContent += `</div>`;
      
      L.marker([lat, lng], { icon }).bindPopup(popupContent).addTo(markersLayer);
    });
  });
}

document.getElementById('btnToggleMap')?.addEventListener('click', (e) => {
  mapVisible = !mapVisible;
  if (mapVisible) {
    document.getElementById('listContainer').style.display = 'none';
    document.getElementById('mapContainer').style.display = 'block';
    e.target.textContent = '📋 VER LISTA';
    initMap();
    updateMap();
    setTimeout(() => map.invalidateSize(), 100);
  } else {
    document.getElementById('listContainer').style.display = 'block';
    document.getElementById('mapContainer').style.display = 'none';
    e.target.textContent = '🗺️ VER MAPA';
  }
});

function fmtAgo(iso) {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "Hace un momento";
  if (minutes < 60) return `Hace ${minutes} min`;
  return `Hace ${Math.floor(minutes / 60)} h`;
}

function priorityOrder(priority) {
  return { critical: 0, urgent: 1, necessary: 2 }[priority] ?? 3;
}

function priorityLabel(p) {
  if (p === 'critical') return '🔴 CRÍTICO';
  if (p === 'urgent') return '🟠 URGENTE';
  if (p === 'necessary') return '🟢 NECESARIO';
  return p;
}

function labelForStatus(status) {
  return { new: "Nuevo", assigned: "Asignado", in_progress: "En proceso", resolved: "Resuelto", invalid: "Descartado" }[status] || status;
}

async function fetchReports() {
  try {
    const params = new URLSearchParams();
    if (els.regionFilter.value) params.set("region", els.regionFilter.value);
    if (els.statusFilter.value) params.set("status", els.statusFilter.value);
    const res = await fetch(`/api/reports${params.toString() ? `?${params}` : ""}`);
    if (res.status === 503 || !res.ok) {
      if (els.statusBanner) els.statusBanner.style.display = "block";
      return;
    }
    if (els.statusBanner) els.statusBanner.style.display = "none";
    const data = await res.json();
    state.reports = data.reports || [];
    renderList();
  } catch(err) {
    console.warn("Offline or failed to fetch reports:", err);
    if (els.statusBanner) els.statusBanner.style.display = "block";
  }
}

function findDuplicates(report) {
  return state.reports.some(other => {
    if (other.id === report.id) return false;
    
    const sameNeeds = (report.needs || []).join("") === (other.needs || []).join("");
    const timeDiff = Math.abs(new Date(report.created_at).getTime() - new Date(other.created_at).getTime());
    const closeTime = timeDiff < 2 * 60 * 60 * 1000;
    let closeLocation = false;
    if (report.location?.lat && other.location?.lat) {
      closeLocation = Math.abs(report.location.lat - other.location.lat) < 0.002 && Math.abs(report.location.lng - other.location.lng) < 0.002;
    } else if (report.location?.description && report.location?.description === other.location?.description) {
      closeLocation = true;
    }

    return sameNeeds && closeTime && closeLocation;
  });
}

let visibleCount = 50;

function renderList(append = false) {
  if (!append) {
    els.coordList.innerHTML = "";
    visibleCount = 50;
  }
  
  const statusOrder = (status) => {
    return { new: 0, assigned: 1, in_progress: 2, resolved: 3, invalid: 4 }[status] ?? 5;
  };

  function checkIsDonation(r) {
    const needs = parseNeeds(r);
    return r.source === 'donation' || needs.some(n => ['hygiene', 'clothes', 'construction'].includes(n));
  }

  const filteredByType = state.reports.filter(r => {
    const isDon = checkIsDonation(r);
    if (state.typeFilter === 'emergency') return !isDon;
    if (state.typeFilter === 'donation') return isDon;
    return true;
  });

  const ordered = [...filteredByType].sort((a, b) => {
    return statusOrder(a.status) - statusOrder(b.status) || 
           priorityOrder(a.priority) - priorityOrder(b.priority) || 
           new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  state.orderedReports = ordered;
  
  if (state.typeFilter === 'emergency') {
    els.reportsCountText.textContent = `${ordered.length} Emergencias`;
  } else if (state.typeFilter === 'donation') {
    els.reportsCountText.textContent = `${ordered.length} Donaciones`;
  } else {
    els.reportsCountText.textContent = `${ordered.length} Casos`;
  }

  const start = append ? visibleCount - 20 : 0;
  const batch = ordered.slice(start, visibleCount);

  for (const report of batch) {
    const needs = parseNeeds(report);
    const isDonation = report.source === 'donation' || needs.some(n => ['hygiene', 'clothes', 'construction'].includes(n));
    const item = document.createElement("div");
    item.className = `pending-item ${isDonation ? 'donation-item' : ''} status-${report.status || 'new'}`;
    item.dataset.reportId = report.id;
    
    const translatedNeeds = needs.map(n => NEED_LABELS[n] || n.toUpperCase());
    const needsStr = translatedNeeds.length ? translatedNeeds.join(" + ") : (isDonation ? "INSUMOS VARIOS" : "SIN ESPECIFICAR");
    
    let locDesc = report.location?.description || report.location?.label || report.location_label || report.location_address;
    let needsResolve = false;
    if (!locDesc && (report.latitude || report.location?.lat)) {
      locDesc = `Buscando dirección...`;
      needsResolve = true;
    }

    const lat = report.latitude ?? report.location?.lat;
    const lng = report.longitude ?? report.location?.lng;

    let locHtml = `<div class="pending-meta" style="margin-top:0.5rem; color:#9ca3af;">Sin ubicación</div>`;
    if (lat && lng) {
      locHtml = `<a href="https://maps.google.com/?q=${lat},${lng}" target="_blank" class="pending-meta" style="margin-top:0.5rem; display:block; color:var(--primary); text-decoration:underline;">
        📍 <span ${needsResolve ? `data-id="${report.id}" data-resolve-lat="${lat}" data-resolve-lng="${lng}"` : ''}>${locDesc || `GPS (${lat.toFixed(5)}, ${lng.toFixed(5)})`}</span>
      </a>`;
    } else if (locDesc) {
      locHtml = `<div class="pending-meta" style="margin-top:0.5rem; color:var(--primary);">📍 <span>${locDesc}</span></div>`;
    }
    
    const isDup = findDuplicates(report);
    const dupWarning = isDup ? `<div style="background:#431407; color:#fdba74; padding:0.5rem; margin-bottom:0.5rem; font-weight:bold;">⚠️ POSIBLE DUPLICADO</div>` : '';

    let photoHtml = "";
    const photos = parsePhotos(report);
    if (photos.length > 0 && photos[0].dataUrl) {
      photoHtml = `<div style="margin-top:0.75rem;"><img src="${photos[0].dataUrl}" style="width:100%; max-height:220px; object-fit:cover; border-radius:var(--radius); border:2px solid var(--border); cursor:pointer;" onclick="document.getElementById('modalImg').src=this.src; document.getElementById('photoModal').style.display='flex';" /></div>`;
    }

    item.style.position = 'relative';
    
    if (isDonation) {
      item.innerHTML = `
        ${dupWarning}
        <button class="btn-large" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; font-size: 0.85rem; background: #991b1b; color: white; border: none; width: auto; z-index: 10;" data-id="${report.id}" data-action="flag">⚠ Reportar</button>
        
        <div class="donation-badge-header">🎁 DONACIÓN DE INSUMOS</div>
        <div class="pending-title" style="color:#86efac; margin-top:0.25rem;">${needsStr}</div>
        
        <div class="supplies-tags">
          ${translatedNeeds.map(n => `<span class="supply-tag">${n}</span>`).join('')}
        </div>
        
        <div class="donation-detail-box">
          <div class="donation-detail-title">DETALLES DE LA DONACIÓN</div>
          <div class="donation-detail-content">${report.description || 'Sin detalles especificados'}</div>
        </div>
        
        ${locHtml}
        ${photoHtml}
        
        <div class="pending-meta" style="margin-top:1rem; border-top: 1px solid #14532d; padding-top:0.5rem;">
          Ofrecido ${fmtAgo(report.created_at)}<br>
          DONANTE / CONTACTO: <strong style="color:white;">${report.volunteer_name || 'Anónimo'}</strong> (${report.phone || 'Sin número'})
        </div>
        
        <div class="status-actions" style="margin-top:1rem; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.5rem;">
          <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="in_progress">En proceso</button>
          <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="resolved">Recibido</button>
          <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="invalid">Descartar</button>
        </div>
      `;
    } else {
      let emergencyDetails = `${report.people_count || 1} personas`;
      if (report.injured) emergencyDetails += ` · ⚠️ Heridos`;
      if (report.trapped) emergencyDetails += ` · 🆘 Atrapados`;
      if (report.children) emergencyDetails += ` · 👶 Niños`;
      if (report.elderly) emergencyDetails += ` · 👵 Adultos mayores`;

      item.innerHTML = `
        ${dupWarning}
        <button class="btn-large" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; font-size: 0.85rem; background: #991b1b; color: white; border: none; width: auto; z-index: 10;" data-id="${report.id}" data-action="flag">⚠ Reportar</button>
        
        <div class="emergency-badge-header ${report.priority || 'necessary'}">${priorityLabel(report.priority)}</div>
        <div class="pending-title" style="margin-top:0.25rem;">${needsStr}</div>
        <div class="pending-meta" style="margin-top:0.5rem; font-size: 1rem; color: white; font-weight:700;">${emergencyDetails}</div>
        ${locHtml}
        ${report.description ? `<div class="pending-meta" style="margin-top:0.5rem; color:#e5e7eb;">${report.description}</div>` : ''}
        ${photoHtml}
        <div class="pending-meta" style="margin-top:1rem; border-top: 1px solid #333; padding-top:0.5rem;">
          Registrado ${fmtAgo(report.created_at)}<br>
          VOLUNTARIO: ${report.volunteer_name || 'Anónimo'} (${report.phone || 'Sin número'})
        </div>
        
        <div class="status-actions" style="margin-top:1rem; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.5rem;">
          <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="in_progress">En proceso</button>
          <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="resolved">Resuelto</button>
          <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="invalid">Descartar</button>
        </div>
      `;
    }
    
    els.coordList.appendChild(item);
  }

  document.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const btnEl = e.target.closest('button');
      if (!btnEl) return;
      
      const id = btnEl.dataset.id;
      const action = btnEl.dataset.action;
      const volunteerId = localStorage.getItem('volunteerId') || 'anonymous_coordinator';
      
      if (action === "flag") {
        if (!confirm("¿Reportar este caso como falso o spam?")) return;
        try {
          const res = await fetch(`/api/reports/${id}/flag`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ flagged_by: volunteerId, reason: "falso/spam" })
          });
          if (res.ok) {
            const data = await res.json();
            btnEl.textContent = `⚠ ${data.flagCount} reportes`;
            if (data.report.status === "flagged") {
               const cardEl = btnEl.closest('.pending-item');
               if (cardEl) cardEl.style.display = 'none';
            }
          } else {
             const err = await res.json().catch(()=>({}));
             if (err.error === "already_flagged") alert("Ya reportaste este caso.");
             else alert("Error: " + (err.error || res.status));
          }
        } catch (err) {
          alert("Error de red: " + err.message);
        }
        return;
      }
      
      const status = action;
      try {
        const response = await fetch(`/api/reports/${id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ status, changed_by: "coordinator" }),
        });
        
        if (response.ok) {
          const report = state.reports.find(r => String(r.id) === String(id));
          if (report) report.status = status;
          
          const cardEl = btnEl.closest('.pending-item');
          if (cardEl) {
            cardEl.className = cardEl.className.replace(/status-\w+/, `status-${status}`);
          }
        } else {
          const err = await response.json().catch(() => ({}));
          alert("Error al actualizar el estado: " + (err.error || response.status));
        }
      } catch (err) {
        alert("Error de red al actualizar estado: " + err.message);
      }
    });
  });

  resolveAddresses();
  if (mapVisible) updateMap();
}

async function resolveAddresses() {
  const elements = document.querySelectorAll('[data-resolve-lat]');
  for (const el of elements) {
    const lat = el.dataset.resolveLat;
    const lng = el.dataset.resolveLng;
    const id = el.dataset.id;
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
      const data = await res.json();
      if (data && data.display_name) {
        el.textContent = `📍 ${data.display_name}`;
        el.removeAttribute('data-resolve-lat');
        
        if (id) {
          fetch(`/api/reports/${id}/location`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ location_label: data.display_name })
          }).catch(console.error);
        }
      }
    } catch(err) {
      console.error(err);
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  // Forward geocode reports that have text address but no coordinates
  for (const report of state.reports) {
    const lat = report.latitude ?? report.location?.lat;
    const lng = report.longitude ?? report.location?.lng;
    const hasCoords = lat && lng && Number(lat) !== 0 && Number(lng) !== 0;
    const addr = report.location_label || report.location_address || report.location?.description || report.location?.label;
    
    if (!hasCoords && addr && typeof addr === 'string' && addr.trim().length > 3) {
      try {
        const query = encodeURIComponent(addr.trim());
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=co&limit=1&q=${query}`);
        const data = await res.json();
        if (data && data.length > 0 && data[0].lat && data[0].lon) {
          const foundLat = parseFloat(data[0].lat);
          const foundLng = parseFloat(data[0].lon);
          report.latitude = foundLat;
          report.longitude = foundLng;
          if (report.location) {
            report.location.lat = foundLat;
            report.location.lng = foundLng;
          }
          if (mapVisible) updateMap();
        }
      } catch(e) {}
      await new Promise(r => setTimeout(r, 1000));
    }
  }
}

if (els.typeTabGroup) {
  els.typeTabGroup.querySelectorAll('.type-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      els.typeTabGroup.querySelectorAll('.type-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.typeFilter = btn.dataset.typeFilter || 'all';
      renderList();
      if (mapVisible) updateMap();
    });
  });
}

els.regionFilter.addEventListener("change", fetchReports);
els.statusFilter.addEventListener("change", fetchReports);

fetchReports().catch(err => {
  console.error(err);
});

const scrollObserver = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting && state.orderedReports && visibleCount < state.orderedReports.length) {
    visibleCount += 20;
    renderList(true);
  }
});
const scrollObserverEl = document.getElementById("scrollObserver");
if (scrollObserverEl) {
  scrollObserver.observe(scrollObserverEl);
}

window.addEventListener("online", () => { els.statusBanner.style.display = "none"; });
window.addEventListener("offline", () => { els.statusBanner.style.display = "block"; });
if (navigator.onLine) {
  els.statusBanner.style.display = "none";
}
