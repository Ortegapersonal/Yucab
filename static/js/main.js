const state = { tours: [], hotels: [], promotions: [] };
const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 });
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No fue posible completar la solicitud.');
  return data;
}

function renderTours(items = state.tours) {
  const grid = document.getElementById('tours-grid');
  if (!items.length) {
    grid.innerHTML = '<p class="col-span-full rounded-2xl bg-mist p-8 text-center text-sm text-slate-500">No encontramos experiencias con ese criterio. Prueba con otro destino.</p>';
    return;
  }
  grid.innerHTML = items.map(tour => `
    <article class="tour-card">
      <img src="${escapeHtml(tour.image)}" alt="${escapeHtml(tour.name)}" loading="lazy">
      <div class="absolute inset-x-0 top-0 flex items-start justify-between p-5">
        <span class="rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-navy shadow-sm"><i class="fa-solid fa-location-dot mr-1.5 text-aqua"></i>${escapeHtml(tour.location)}</span>
        ${tour.featured ? '<span class="rounded-full bg-[#C2A676] px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">Recomendado</span>' : ''}
      </div>
      <div class="absolute inset-x-0 bottom-0 p-6 sm:p-7">
        <div class="mb-3 flex items-center gap-2 text-xs font-semibold text-white/70"><i class="fa-regular fa-clock text-[#71cbd2]"></i>${escapeHtml(tour.duration)} <span class="text-white/25">•</span> Tour guiado</div>
        <h3 class="text-2xl font-bold tracking-tight">${escapeHtml(tour.name)}</h3>
        <p class="mt-3 line-clamp-2 text-xs leading-6 text-white/65">${escapeHtml(tour.description)}</p>
        <div class="mt-6 flex items-end justify-between border-t border-white/15 pt-5">
          <p><span class="text-[10px] uppercase tracking-wide text-white/50">Desde</span><br><strong class="text-xl text-white">${money.format(tour.price)}</strong> <span class="text-[10px] text-white/50">MXN</span></p>
          <button class="reserve-trigger inline-flex items-center gap-2 rounded-xl bg-aqua px-4 py-3 text-xs font-bold text-white transition hover:-translate-y-0.5 hover:bg-[#36a8b6]" data-selection="Tour: ${escapeHtml(tour.name)}">Ver disponibilidad <i class="fa-solid fa-arrow-right"></i></button>
        </div>
      </div>
    </article>`).join('');
}

function amenityIcon(name) {
  const value = name.toLowerCase();
  if (value.includes('wifi')) return 'fa-wifi';
  if (value.includes('alberca')) return 'fa-person-swimming';
  if (value.includes('desayuno') || value.includes('restaurante')) return 'fa-utensils';
  if (value.includes('estacionamiento')) return 'fa-square-parking';
  if (value.includes('mar')) return 'fa-water';
  if (value.includes('pet')) return 'fa-paw';
  if (value.includes('kayak')) return 'fa-person-swimming';
  if (value.includes('bar')) return 'fa-martini-glass-citrus';
  return 'fa-circle-check';
}

function renderHotels(items = state.hotels) {
  const grid = document.getElementById('hotels-grid');
  if (!items.length) {
    grid.innerHTML = '<p class="col-span-full rounded-2xl bg-mist p-8 text-center text-sm text-slate-500">No encontramos hoteles con ese criterio.</p>';
    return;
  }
  grid.innerHTML = items.map(hotel => {
    const amenities = hotel.amenities.split(',').slice(0, 4).map(item => {
      const clean = item.trim();
      return `<span class="amenity"><i class="fa-solid ${amenityIcon(clean)}"></i>${escapeHtml(clean)}</span>`;
    }).join('');
    return `
      <article class="hotel-card">
        <div class="hotel-image"><img src="${escapeHtml(hotel.image)}" alt="${escapeHtml(hotel.name)}" loading="lazy"><span class="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1.5 text-[10px] font-bold text-navy shadow-sm"><i class="fa-solid fa-location-dot mr-1.5 text-aqua"></i>${escapeHtml(hotel.destination)}</span></div>
        <div class="p-6">
          <h3 class="text-xl font-bold tracking-tight text-navy">${escapeHtml(hotel.name)}</h3>
          <p class="mt-2 min-h-12 text-xs leading-6 text-slate-500">${escapeHtml(hotel.description)}</p>
          <div class="mt-4 flex min-h-12 flex-wrap items-start gap-x-4 gap-y-2 border-t border-slate-100 pt-4">${amenities}</div>
          <div class="mt-5 flex items-end justify-between"><p><span class="text-[10px] text-slate-400">Desde</span><br><strong class="text-xl text-navy">${money.format(hotel.price_per_night)}</strong><span class="text-[10px] text-slate-400"> / noche</span></p><button class="reserve-trigger rounded-xl bg-aqua px-4 py-3 text-xs font-bold text-white transition hover:bg-[#247f8b]" data-selection="Hotel: ${escapeHtml(hotel.name)}">Reservar</button></div>
        </div>
      </article>`;
  }).join('');
}

function renderPromotions() {
  const grid = document.getElementById('promotions-grid');
  grid.innerHTML = state.promotions.length ? state.promotions.map(promo => `
    <article class="promo-card">
      <div class="relative z-10 flex items-start justify-between"><span class="rounded-full bg-aqua/20 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-[#8edce2]">Oferta especial</span><i class="fa-solid fa-bolt text-gold"></i></div>
      <p class="promo-discount relative z-10 mt-6">-${promo.discount}%</p>
      <h3 class="relative z-10 mt-2 text-base font-bold">${escapeHtml(promo.title)}</h3>
      <p class="relative z-10 mt-2 min-h-16 text-xs leading-6 text-white/55">${escapeHtml(promo.description)}</p>
      <p class="relative z-10 mt-5 border-t border-white/10 pt-4 text-[10px] font-semibold text-white/60"><i class="fa-regular fa-calendar mr-2 text-gold"></i>Válida hasta el ${new Date(`${promo.valid_until}T12:00:00`).toLocaleDateString('es-MX', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
    </article>`).join('') : '<p class="col-span-full text-sm text-white/60">Muy pronto tendremos nuevas promociones.</p>';
}

function populateSelections() {
  const select = document.getElementById('reservation-selection');
  const tours = state.tours.map(item => `<option value="Tour: ${escapeHtml(item.name)}">Tour · ${escapeHtml(item.name)}</option>`).join('');
  const hotels = state.hotels.map(item => `<option value="Hotel: ${escapeHtml(item.name)}">Hotel · ${escapeHtml(item.name)}</option>`).join('');
  select.innerHTML = '<option value="">Selecciona una opción</option><optgroup label="Experiencias">' + tours + '</optgroup><optgroup label="Hoteles">' + hotels + '</optgroup><option value="Viaje personalizado">Quiero un viaje personalizado</option>';
}

async function loadContent() {
  try {
    const [tours, hotels, promotions] = await Promise.all([fetchJson('/api/tours'), fetchJson('/api/hotels'), fetchJson('/api/promotions')]);
    Object.assign(state, { tours, hotels, promotions });
    renderTours(); renderHotels(); renderPromotions(); populateSelections();
  } catch (error) {
    document.getElementById('tours-grid').innerHTML = `<p class="col-span-full rounded-2xl bg-red-50 p-6 text-sm text-red-700">${escapeHtml(error.message)}</p>`;
  }
}

document.addEventListener('click', event => {
  const trigger = event.target.closest('.reserve-trigger');
  if (!trigger) return;
  document.getElementById('reservation-selection').value = trigger.dataset.selection;
  document.getElementById('reserva').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('search-form').addEventListener('submit', event => {
  event.preventDefault();
  const term = document.getElementById('search-input').value.trim().toLowerCase();
  const message = document.getElementById('search-message');
  if (!term) {
    renderTours(); renderHotels(); message.classList.add('hidden');
    document.getElementById('experiencias').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const tours = state.tours.filter(item => `${item.name} ${item.location} ${item.description}`.toLowerCase().includes(term));
  const hotels = state.hotels.filter(item => `${item.name} ${item.destination} ${item.description}`.toLowerCase().includes(term));
  renderTours(tours); renderHotels(hotels);
  message.textContent = `${tours.length + hotels.length} resultado(s) para “${term}”`;
  message.classList.remove('hidden');
  document.getElementById('experiencias').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('reservation-form').addEventListener('submit', async event => {
  event.preventDefault();
  const form = event.currentTarget;
  const output = document.getElementById('form-message');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const submit = document.getElementById('reservation-submit');
  submit.disabled = true;
  submit.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Enviando solicitud...';
  try {
    const payload = Object.fromEntries(new FormData(form));
    payload.guests = Number(payload.guests);
    const result = await fetchJson('/api/reservations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    output.textContent = result.message;
    output.className = 'mt-4 rounded-xl bg-[#E8F5F6] p-3 text-sm font-semibold text-aqua';
    form.reset(); document.querySelector('[name="guests"]').value = 2;
  } catch (error) {
    output.textContent = error.message;
    output.className = 'mt-4 rounded-xl bg-red-50 p-3 text-sm font-semibold text-red-700';
  } finally {
    submit.disabled = false;
    submit.innerHTML = 'Solicitar cotización <i class="fa-solid fa-arrow-right"></i>';
  }
});

const menuButton = document.getElementById('menu-button');
menuButton.addEventListener('click', () => {
  const menu = document.getElementById('mobile-menu');
  menu.classList.toggle('hidden');
  const open = !menu.classList.contains('hidden');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.innerHTML = `<i class="fa-solid ${open ? 'fa-xmark' : 'fa-bars'}"></i>`;
});
document.querySelectorAll('#mobile-menu a').forEach(link => link.addEventListener('click', () => {
  document.getElementById('mobile-menu').classList.add('hidden');
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.innerHTML = '<i class="fa-solid fa-bars"></i>';
}));

document.getElementById('travel-date').min = new Date().toISOString().split('T')[0];
loadContent();
