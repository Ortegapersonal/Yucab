const adminState = { tours: [], hotels: [], promotions: [], reservations: [], editing: null };
const moneyAdmin = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const h = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

const schemas = {
  tours: [
    ['name', 'Nombre del tour', 'text', true], ['location', 'Ubicación', 'text', true], ['price', 'Precio por persona', 'number', true], ['duration', 'Duración', 'text', true],
    ['image', 'URL de imagen', 'url', true, 'full'], ['description', 'Descripción', 'textarea', true, 'full'], ['featured', 'Marcar como destacado', 'checkbox', false, 'full']
  ],
  hotels: [
    ['name', 'Nombre del hotel', 'text', true], ['destination', 'Destino', 'text', true], ['price_per_night', 'Precio por noche', 'number', true], ['image', 'URL de imagen', 'url', true],
    ['amenities', 'Amenidades separadas por comas', 'text', true, 'full'], ['description', 'Descripción', 'textarea', true, 'full']
  ],
  promotions: [
    ['title', 'Título', 'text', true], ['discount', 'Descuento (%)', 'number', true], ['valid_until', 'Vigente hasta', 'date', true], ['description', 'Descripción', 'textarea', true, 'full']
  ]
};

async function api(url, options) {
  const response = await fetch(url, options);
  if (response.status === 401) { window.location.href = '/login'; throw new Error('Sesión expirada'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la operación.');
  return data;
}

function toast(message, error = false) {
  const el = document.getElementById('admin-toast');
  el.textContent = message; el.className = `fixed bottom-5 right-5 z-[90] max-w-sm rounded-2xl px-5 py-4 text-sm font-semibold text-white shadow-2xl ${error ? 'bg-red-600' : 'bg-ink'}`;
  setTimeout(() => el.classList.add('hidden'), 3200);
}

function rowImage(item) {
  return `<div class="flex min-w-[210px] items-center gap-3"><img src="${h(item.image)}" alt="" class="h-12 w-14 rounded-lg object-cover"><div><strong class="block text-sm text-ink">${h(item.name)}</strong><span class="line-clamp-1 max-w-[230px] text-xs text-slate-400">${h(item.description)}</span></div></div>`;
}

function actions(type, id) {
  return `<div class="flex justify-end"><button class="action-button edit-item" data-type="${type}" data-id="${id}" aria-label="Editar"><i class="fa-solid fa-pen"></i></button><button class="action-button delete delete-item" data-type="${type}" data-id="${id}" aria-label="Eliminar"><i class="fa-regular fa-trash-can"></i></button></div>`;
}

function renderAll() {
  document.getElementById('tours-table').innerHTML = adminState.tours.map(item => `<tr><td>${rowImage(item)}</td><td>${h(item.location)}</td><td class="font-bold text-ink">${moneyAdmin.format(item.price)}</td><td>${h(item.duration)}</td><td>${actions('tours', item.id)}</td></tr>`).join('') || emptyRow();
  document.getElementById('hotels-table').innerHTML = adminState.hotels.map(item => `<tr><td>${rowImage(item)}</td><td>${h(item.destination)}</td><td class="font-bold text-ink">${moneyAdmin.format(item.price_per_night)}</td><td><span class="line-clamp-2 max-w-xs">${h(item.amenities)}</span></td><td>${actions('hotels', item.id)}</td></tr>`).join('') || emptyRow();
  document.getElementById('promotions-table').innerHTML = adminState.promotions.map(item => `<tr><td class="font-bold text-ink">${h(item.title)}</td><td><span class="rounded-full bg-[#fff0ed] px-3 py-1 font-bold text-coral">-${item.discount}%</span></td><td>${formatDate(item.valid_until)}</td><td><span class="line-clamp-2 max-w-xs">${h(item.description)}</span></td><td>${actions('promotions', item.id)}</td></tr>`).join('') || emptyRow();
  document.getElementById('reservations-table').innerHTML = adminState.reservations.map(item => `<tr><td><strong class="block text-sm text-ink">${h(item.customer_name)}</strong><a class="text-xs text-lagoon" href="mailto:${h(item.contact)}">${h(item.contact)}</a></td><td><span class="block max-w-[230px] font-semibold text-ink">${h(item.selection)}</span>${item.notes ? `<small class="line-clamp-1 text-slate-400">${h(item.notes)}</small>` : ''}</td><td>${formatDate(item.travel_date)}</td><td>${item.guests}</td><td><select class="status-select rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs font-semibold" data-id="${item.id}">${['Nueva','Contactada','Confirmada','Cerrada'].map(s => `<option ${s === item.status ? 'selected' : ''}>${s}</option>`).join('')}</select></td><td>${actions('reservations', item.id).replace(/<button class="action-button edit-item".*?<\/button>/, '')}</td></tr>`).join('') || emptyRow();
  const newLeads = adminState.reservations.filter(item => item.status === 'Nueva').length;
  document.getElementById('lead-badge').textContent = newLeads;
  document.getElementById('stats-grid').innerHTML = [
    ['fa-sailboat', adminState.tours.length, 'Tours activos', 'bg-[#e3f5ee] text-lagoon'],
    ['fa-hotel', adminState.hotels.length, 'Hoteles', 'bg-[#edf0fc] text-[#5c6fc1]'],
    ['fa-tags', adminState.promotions.length, 'Promociones', 'bg-[#fff0ed] text-coral'],
    ['fa-envelope-open-text', newLeads, 'Leads nuevos', 'bg-[#fff7df] text-[#bd8420]']
  ].map(([icon, number, label, color]) => `<article class="admin-card flex items-center gap-4"><span class="grid h-12 w-12 place-items-center rounded-xl ${color}"><i class="fa-solid ${icon}"></i></span><div><strong class="block text-2xl">${number}</strong><span class="text-xs font-semibold text-slate-400">${label}</span></div></article>`).join('');
  renderRecent();
}

function emptyRow() { return '<tr><td colspan="6" class="py-12 text-center text-slate-400">Todavía no hay registros.</td></tr>'; }
function formatDate(value) { return new Date(`${value}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric' }); }
function renderRecent() {
  const items = adminState.reservations.slice(0, 5);
  document.getElementById('recent-reservations').innerHTML = items.length ? `<div class="space-y-1">${items.map(item => `<div class="flex items-center gap-3 rounded-xl p-3 hover:bg-slate-50"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-seafoam text-sm font-bold text-lagoon">${h(item.customer_name).slice(0, 2).toUpperCase()}</span><div class="min-w-0 flex-1"><p class="truncate text-sm font-bold">${h(item.customer_name)}</p><p class="truncate text-xs text-slate-400">${h(item.selection)}</p></div><span class="text-xs font-semibold text-slate-400">${formatDate(item.travel_date)}</span></div>`).join('')}</div>` : '<p class="py-8 text-center text-sm text-slate-400">Aún no hay solicitudes.</p>';
}

async function loadData() {
  try {
    const [tours, hotels, promotions, reservations] = await Promise.all(['tours','hotels','promotions','reservations'].map(type => api(`/api/${type}`)));
    Object.assign(adminState, { tours, hotels, promotions, reservations }); renderAll();
  } catch (error) { toast(error.message, true); }
}

function switchView(view) {
  document.querySelectorAll('.admin-view').forEach(el => el.classList.add('hidden'));
  document.getElementById(`view-${view}`).classList.remove('hidden');
  document.querySelectorAll('.admin-nav[data-view]').forEach(el => el.classList.toggle('active', el.dataset.view === view));
  document.getElementById('view-title').textContent = ({ overview: 'Resumen', tours: 'Tours', hotels: 'Hoteles', promotions: 'Promociones', reservations: 'Reservas' })[view];
  if (window.innerWidth < 1024) document.getElementById('sidebar').classList.add('hidden');
}

function fieldMarkup([name, label, type, required, width], data = {}) {
  const value = data[name] ?? '';
  if (type === 'checkbox') return `<label class="form-field ${width === 'full' ? 'sm:col-span-2' : ''} flex items-center gap-3 rounded-xl bg-slate-50 p-4"><input class="!w-5" name="${name}" type="checkbox" ${value ? 'checked' : ''}><span class="!mb-0">${label}</span></label>`;
  const attributes = `${required ? 'required' : ''} ${type === 'number' ? 'min="0" step="any"' : ''}`;
  return `<label class="form-field ${width === 'full' ? 'sm:col-span-2' : ''}"><span>${label}</span>${type === 'textarea' ? `<textarea name="${name}" rows="4" ${attributes}>${h(value)}</textarea>` : `<input name="${name}" type="${type}" value="${h(value)}" ${attributes}>`}</label>`;
}

function openModal(type, item = null) {
  adminState.editing = { type, id: item?.id || null };
  const singular = { tours: 'tour', hotels: 'hotel', promotions: 'promoción' }[type];
  document.getElementById('modal-title').textContent = item ? `Editar ${singular}` : `Nueva ${singular}`;
  document.getElementById('modal-kicker').textContent = item ? 'Editar catálogo' : 'Agregar al catálogo';
  document.getElementById('modal-fields').innerHTML = schemas[type].map(field => fieldMarkup(field, item || {})).join('');
  const modal = document.getElementById('modal'); modal.classList.remove('hidden'); modal.classList.add('flex');
}

function closeModal() { const modal = document.getElementById('modal'); modal.classList.add('hidden'); modal.classList.remove('flex'); adminState.editing = null; }

document.addEventListener('click', async event => {
  const nav = event.target.closest('[data-view]');
  if (nav) { switchView(nav.dataset.view); if (nav.dataset.create) openModal('tours'); }
  const create = event.target.closest('[data-create-type]'); if (create) openModal(create.dataset.createType);
  const edit = event.target.closest('.edit-item'); if (edit) openModal(edit.dataset.type, adminState[edit.dataset.type].find(item => item.id === Number(edit.dataset.id)));
  const remove = event.target.closest('.delete-item');
  if (remove && confirm('¿Seguro que deseas eliminar este registro? Esta acción no se puede deshacer.')) {
    try { await api(`/api/${remove.dataset.type}/${remove.dataset.id}`, { method: 'DELETE' }); toast('Registro eliminado.'); await loadData(); }
    catch (error) { toast(error.message, true); }
  }
});

document.getElementById('entity-form').addEventListener('submit', async event => {
  event.preventDefault(); const { type, id } = adminState.editing; const formData = new FormData(event.currentTarget); const payload = Object.fromEntries(formData);
  schemas[type].filter(field => field[2] === 'checkbox').forEach(field => { payload[field[0]] = formData.has(field[0]); });
  try { await api(`/api/${type}${id ? `/${id}` : ''}`, { method: id ? 'PUT' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); closeModal(); toast(id ? 'Cambios guardados.' : 'Registro creado.'); await loadData(); }
  catch (error) { toast(error.message, true); }
});

document.addEventListener('change', async event => {
  if (!event.target.matches('.status-select')) return;
  try { await api(`/api/reservations/${event.target.dataset.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: event.target.value }) }); toast('Estado actualizado.'); await loadData(); }
  catch (error) { toast(error.message, true); }
});

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-cancel').addEventListener('click', closeModal);
document.getElementById('modal').addEventListener('click', event => { if (event.target.id === 'modal') closeModal(); });
document.getElementById('sidebar-button').addEventListener('click', () => { const sidebar = document.getElementById('sidebar'); sidebar.classList.toggle('hidden'); sidebar.classList.add('flex'); });
loadData();
