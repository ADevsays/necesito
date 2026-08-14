const ZONES = ["Manizales", "Cali", "Pereira", "Chocó"];

const state = {
  reports: [],
  selectedId: null,
};

const els = {
  regionFilter: document.getElementById("regionFilter"),
  statusFilter: document.getElementById("statusFilter"),
  reportsCountText: document.getElementById("reportsCountText"),
  coordList: document.getElementById("coordList"),
};

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
  const params = new URLSearchParams();
  if (els.regionFilter.value) params.set("region", els.regionFilter.value);
  if (els.statusFilter.value) params.set("status", els.statusFilter.value);
  const res = await fetch(`/api/reports${params.toString() ? `?${params}` : ""}`);
  if (!res.ok) throw new Error("failed");
  const data = await res.json();
  state.reports = data.reports || [];
  renderList();
}

function findDuplicates(report) {
  return state.reports.some(other => {
    if (other.id === report.id) return false;
    
    // same need
    const sameNeeds = (report.needs || []).join("") === (other.needs || []).join("");
    // Close in time (e.g. 2 hours)
    const timeDiff = Math.abs(new Date(report.created_at).getTime() - new Date(other.created_at).getTime());
    const closeTime = timeDiff < 2 * 60 * 60 * 1000;
    // Location check: extremely close lat/lng (within ~0.001 deg) or same label
    let closeLocation = false;
    if (report.location?.lat && other.location?.lat) {
       closeLocation = Math.abs(report.location.lat - other.location.lat) < 0.002 && Math.abs(report.location.lng - other.location.lng) < 0.002;
    } else if (report.location?.description && report.location?.description === other.location?.description) {
       closeLocation = true;
    }

    return sameNeeds && closeTime && closeLocation;
  });
}

function renderList() {
  els.coordList.innerHTML = "";
  
  const statusOrder = (status) => {
    return { new: 0, assigned: 1, in_progress: 2, resolved: 3, invalid: 4 }[status] ?? 5;
  };

  const ordered = [...state.reports].sort((a, b) => {
    return statusOrder(a.status) - statusOrder(b.status) || 
           priorityOrder(a.priority) - priorityOrder(b.priority) || 
           new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });
  
  els.reportsCountText.textContent = `${ordered.length} Casos`;

  for (const report of ordered) {
    const item = document.createElement("div");
    item.className = `pending-item status-${report.status || 'new'}`;
    item.dataset.reportId = report.id;
    
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
      "other": "OTRO"
    };
    
    const translatedNeeds = report.needs ? report.needs.map(n => NEED_LABELS[n] || n.toUpperCase()) : [];
    const needs = translatedNeeds.length ? translatedNeeds.join(" + ") : "SIN NECESIDAD";
    let locDesc = report.location?.description || report.location?.label;
    let needsResolve = false;
    if (!locDesc && report.location?.lat) {
      locDesc = `Buscando dirección...`;
      needsResolve = true;
    }

    let locHtml = `<div class="pending-meta" style="margin-top:0.5rem; color:#9ca3af;">Sin ubicación</div>`;
    if (report.location?.lat && report.location?.lng) {
      locHtml = `<a href="https://maps.google.com/?q=${report.location.lat},${report.location.lng}" target="_blank" class="pending-meta" style="margin-top:0.5rem; display:block; color:var(--primary); text-decoration:underline;">
        📍 <span ${needsResolve ? `data-id="${report.id}" data-resolve-lat="${report.location.lat}" data-resolve-lng="${report.location.lng}"` : ''}>${locDesc || `GPS (${report.location.lat.toFixed(5)}, ${report.location.lng.toFixed(5)})`}</span>
      </a>`;
    } else if (locDesc) {
      locHtml = `<div class="pending-meta" style="margin-top:0.5rem; color:var(--primary);">📍 <span>${locDesc}</span></div>`;
    }
    
    let details = `${report.people_count} personas`;
    if (report.injured) details += ` · Heridos`;
    if (report.trapped) details += ` · Atrapados`;
    if (report.children) details += ` · Niños`;
    
    const isDup = findDuplicates(report);
    const dupWarning = isDup ? `<div style="background:#431407; color:#fdba74; padding:0.5rem; margin-bottom:0.5rem; font-weight:bold;">⚠️ POSIBLE DUPLICADO</div>` : '';

    let photoHtml = "";
    if (report.photos_json) {
       try {
         const photos = JSON.parse(report.photos_json);
         if (photos.length > 0 && photos[0].dataUrl) {
            photoHtml = `<div style="margin-top:1rem;"><img src="${photos[0].dataUrl}" style="width:100%; max-height:200px; object-fit:cover; border:2px solid var(--border); cursor:pointer;" onclick="document.getElementById('modalImg').src=this.src; document.getElementById('photoModal').style.display='flex';" /></div>`;
         }
       } catch(e) {}
    }

    item.style.position = 'relative';
    item.innerHTML = `
      ${dupWarning}
      <button class="btn-large" style="position: absolute; top: 1rem; right: 1rem; padding: 0.5rem 1rem; font-size: 0.85rem; background: #991b1b; color: white; border: none; width: auto; z-index: 10;" data-id="${report.id}" data-action="flag">⚠ Reportar</button>
      
      <div class="pending-title" style="color:var(--${report.priority === 'necessary' ? 'necessary' : report.priority}); padding-right: 100px;">${priorityLabel(report.priority)}</div>
      <div class="pending-title" style="margin-top:0.5rem;">${needs}</div>
      <div class="pending-meta" style="margin-top:0.5rem; font-size: 1rem; color: white;">${details}</div>
      ${locHtml}
      <div class="pending-meta" style="margin-top:0.5rem;">${report.description || ''}</div>
      ${photoHtml}
      <div class="pending-meta" style="margin-top:1rem; border-top: 1px solid #333; padding-top:0.5rem;">Registrado ${fmtAgo(report.created_at)}<br>VOLUNTARIO: ${report.volunteer_name || 'Anónimo'} (${report.phone || 'Sin número'})</div>
      
      <div class="status-actions" style="margin-top:1rem; display:grid; grid-template-columns: 1fr 1fr 1fr; gap:0.5rem;">
        <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="in_progress">En proceso</button>
        <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="resolved">Resuelto</button>
        <button class="btn-large" style="padding: 0.5rem; font-size: 0.85rem; display: flex; align-items: center; justify-content: center; text-align: center;" data-id="${report.id}" data-action="invalid">Descartar</button>
      </div>
    `;
    
    els.coordList.appendChild(item);
  }

  // Attach events
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
               if (cardEl) cardEl.style.display = 'none'; // Auto hide
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
        
        // Save back to DB to permanently cache it
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
    // Respect Nominatim strict usage policy
    await new Promise(r => setTimeout(r, 1000));
  }
}

els.regionFilter.addEventListener("change", fetchReports);
els.statusFilter.addEventListener("change", fetchReports);

fetchReports().catch(err => {
  console.error(err);
});
