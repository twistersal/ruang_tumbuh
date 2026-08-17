const STORAGE_KEY = "ruangTumbuhDataV1";
const DAY_NAMES = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

const WEEKLY_RHYTHM = [
  { day: "Senin", main: "Yoga Flow", note: "Gerak lembut untuk membuka awal minggu.", tag: "Gerak + makan teratur" },
  { day: "Selasa", main: "Pilates", note: "Latihan kekuatan ringan dan waktu pulih.", tag: "Gerak + perawatan" },
  { day: "Rabu", main: "Jalan santai", note: "Cardio ringan pada sore hari bila memungkinkan.", tag: "Gerak + jeda" },
  { day: "Kamis", main: "Pilates", note: "Kembali ke latihan yang dapat kamu sesuaikan.", tag: "Gerak + persiapan makan" },
  { day: "Jumat", main: "Yoga Yin", note: "Pilih gerak pemulihan dan malam yang lebih longgar.", tag: "Pulih + santai" },
  { day: "Sabtu", main: "Cardio ringan", note: "Berjalan atau aktivitas yang membuatmu menikmati tubuhmu.", tag: "Gerak + waktu bebas" },
  { day: "Minggu", main: "Istirahat & persiapan", note: "Meal prep, perawatan diri, dan merapikan ritme minggu depan.", tag: "Pulih + persiapan" }
];

const ROUTINE_PRESETS = {
  Senin: ["Rutinitas pagi & perlindungan saat keluar", "Yoga Flow atau gerak yang nyaman"],
  Selasa: ["Rutinitas pagi & perlindungan saat keluar", "Pilates atau latihan penguatan yang nyaman"],
  Rabu: ["Rutinitas pagi & perlindungan saat keluar", "Jalan santai atau cardio ringan"],
  Kamis: ["Rutinitas pagi & perlindungan saat keluar", "Pilates atau latihan penguatan yang nyaman"],
  Jumat: ["Rutinitas pagi & perlindungan saat keluar", "Yoga Yin atau peregangan pemulihan"],
  Sabtu: ["Rutinitas pagi & perlindungan saat keluar", "Jalan santai atau cardio ringan"],
  Minggu: ["Hari pemulihan: dengarkan kebutuhan tubuh", "Persiapan makan dan minggu berikutnya"]
};

function blankData() {
  return { reflections: [], practiceLogs: [], health: { settings: { calorieTarget: "", waterTarget: 8 }, checkins: {}, routineLogs: {}, customRoutines: [], foodLogs: {} } };
}

function normalizeData(source) {
  const base = blankData();
  if (!source || !Array.isArray(source.reflections) || !Array.isArray(source.practiceLogs)) return base;
  const health = source.health || {};
  return {
    reflections: source.reflections,
    practiceLogs: source.practiceLogs,
    health: {
      settings: { ...base.health.settings, ...(health.settings || {}) },
      checkins: health.checkins && typeof health.checkins === "object" ? health.checkins : {},
      routineLogs: health.routineLogs && typeof health.routineLogs === "object" ? health.routineLogs : {},
      customRoutines: Array.isArray(health.customRoutines) ? health.customRoutines : [],
      foodLogs: health.foodLogs && typeof health.foodLogs === "object" ? health.foodLogs : {}
    }
  };
}

function readData() { try { return normalizeData(JSON.parse(localStorage.getItem(STORAGE_KEY))); } catch { return blankData(); } }

let data = readData();
let activeFilter = "Semua";

const pageInfo = {
  dashboard: ["Selamat datang", "Hari untuk bertumbuh, bukan untuk sempurna."],
  capture: ["Catat kejadian", "Berangkat dari fakta dan rasa ingin tahu."],
  reflections: ["Refleksi", "Kumpulkan pelajaran, bukan vonis."],
  practice: ["Latihan", "Perubahan terbentuk dari pengulangan kecil."],
  health: ["Kesehatan", "Dukung tubuhmu dengan perhatian yang cukup."],
  review: ["Tinjauan", "Lihat pola, lalu perbaiki sistemnya."]
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const saveData = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(data));

function localDate(date = new Date()) {
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}
function displayDate(value) { return value ? new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T12:00:00`)) : "—"; }
function shortDate(value) { return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short" }).format(new Date(`${value}T12:00:00`)); }
function dayName(date = new Date()) { return DAY_NAMES[date.getDay()]; }
function escapeHTML(input = "") { return String(input).replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#039;", '"': "&quot;" })[char]); }

function showToast(message) {
  const toast = $("#toast"); toast.textContent = message; toast.classList.add("is-visible");
  window.clearTimeout(showToast.timeout); showToast.timeout = window.setTimeout(() => toast.classList.remove("is-visible"), 2800);
}

function goToPage(page) {
  $$("[data-page-content]").forEach(el => el.classList.toggle("is-visible", el.dataset.pageContent === page));
  $$(".nav-link").forEach(el => el.classList.toggle("is-active", el.dataset.page === page));
  const [title, subtitle] = pageInfo[page]; $("#pageTitle").textContent = title; $("#topDate").textContent = subtitle;
  $(".sidebar").classList.remove("is-open"); window.scrollTo({ top: 0, behavior: "smooth" });
  if (page === "reflections") renderReflectionPage();
  if (page === "practice") renderPracticePage();
  if (page === "health") renderHealthPage();
  if (page === "review") renderReviewPage();
}

function reflectionCard(entry) {
  const preview = entry.lesson || entry.event || "Refleksi ini belum selesai.";
  return `<button class="reflection-card" data-open-entry="${entry.id}"><div class="card-meta"><span>${shortDate(entry.date)}</span><span class="category-pill">${escapeHTML(entry.category)}</span></div><h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(preview)}</p><span class="card-footer">${entry.action ? "Ada eksperimen untuk dilatih" : "Lihat refleksi"} →</span></button>`;
}

const getActivePractices = () => data.reflections.filter(entry => entry.action?.trim());
const getRecentEntries = (limit = 3) => [...data.reflections].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, limit);
const todayLog = (entryId) => data.practiceLogs.find(log => log.entryId === entryId && log.date === localDate());
const currentCheckin = () => data.health.checkins[localDate()] || {};
const getFoodLog = (date = localDate()) => Array.isArray(data.health.foodLogs[date]) ? data.health.foodLogs[date] : [];
const foodCalories = (items = getFoodLog()) => items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0);
const routineState = () => data.health.routineLogs[localDate()] || {};

function todayRoutines() {
  const today = dayName();
  const daily = (ROUTINE_PRESETS[today] || []).map((label, index) => ({ id: `preset-${today}-${index}`, label, time: index === 0 ? "Pagi" : "", area: index === 0 ? "Perawatan diri" : "Gerak" }));
  const core = [
    { id: "core-water", label: "Isi ulang botol minum dan makan sesuai kebutuhanmu", time: "", area: "Makan & hidrasi" },
    { id: "core-night", label: "Rutinitas malam dan ruang untuk beristirahat", time: "", area: "Istirahat" }
  ];
  const custom = data.health.customRoutines.filter(item => item.day === "Setiap hari" || item.day === today);
  return [...daily, ...core, ...custom];
}

function renderDashboard() {
  const practices = getActivePractices();
  const thisWeek = new Date(); thisWeek.setDate(thisWeek.getDate() - 6); thisWeek.setHours(0, 0, 0, 0);
  const entriesThisWeek = data.reflections.filter(item => new Date(`${item.date}T12:00:00`) >= thisWeek).length;
  const reviewsDue = data.reflections.filter(item => item.reviewDate && item.reviewDate <= localDate()).length;
  const stats = [[data.reflections.length, "kejadian yang dicatat"], [entriesThisWeek, "refleksi dalam 7 hari"], [practices.length, "latihan yang sedang aktif"], [reviewsDue, "tinjauan perlu dilihat"]];
  $("#statsGrid").innerHTML = stats.map(([number, label]) => `<div class="stat-card"><div class="stat-number">${number}</div><div class="stat-label">${label}</div></div>`).join("");
  $("#activePractices").innerHTML = practices.length ? practices.slice(0, 3).map(entry => `<div class="mini-practice"><h3>${escapeHTML(entry.title)}</h3><p>${escapeHTML(entry.action)}</p></div>`).join("") : `<p class="empty-inline">Belum ada eksperimen aktif. Setelah mencatat, pilih satu perilaku kecil untuk dicoba.</p>`;
  $("#recentReflections").innerHTML = getRecentEntries().length ? getRecentEntries().map(reflectionCard).join("") : emptyCards();
  renderHealthDashboard();
}

function renderHealthDashboard() {
  const checkin = currentCheckin(), routines = todayRoutines(), done = routines.filter(item => routineState()[item.id]).length, total = routines.length;
  const calories = foodCalories(), target = Number(data.health.settings.calorieTarget) || 0;
  const checkinText = checkin.sleep || checkin.energy || checkin.mood ? `${checkin.sleep ? `${checkin.sleep} jam tidur` : "Check-in tersimpan"}` : "Belum ada check-in";
  const calorieText = target ? `${calories} dari ${target} kcal` : calories ? `${calories} kcal dicatat` : "Belum ada makan dicatat";
  $("#healthDashboard").innerHTML = `<article class="health-glance-card soft"><p class="eyebrow">CHECK-IN TUBUH</p><h3>${escapeHTML(checkinText)}</h3><p>${checkin.note ? escapeHTML(checkin.note) : "Tidur, energi, suasana hati, air, dan gerak—hanya bila berguna bagimu."}</p></article><article class="health-glance-card"><p class="eyebrow">RUTINITAS HARI INI</p><div class="glance-number">${done}/${total}</div><p>langkah kecil selesai</p><div class="micro-progress"><i style="width:${total ? Math.round(done / total * 100) : 0}%"></i></div></article><article class="health-glance-card"><p class="eyebrow">MAKAN</p><div class="glance-number">${calorieText}</div><p>catatan manual, tanpa penilaian</p><div class="micro-progress"><i style="width:${target ? Math.min(100, Math.round(calories / target * 100)) : 0}%"></i></div></article>`;
}

function emptyCards() { return `<div class="reflection-card" style="grid-column: 1 / -1; min-height: 130px; justify-content:center"><h3>Belum ada catatan</h3><p>Mulai dengan satu kejadian yang ingin kamu pahami—tanpa perlu membuatnya sempurna.</p><span class="card-footer">Catat kejadian →</span></div>`; }

function renderReflectionPage() {
  const categories = ["Semua", ...new Set(data.reflections.map(entry => entry.category))];
  if (!categories.includes(activeFilter)) activeFilter = "Semua";
  $("#categoryFilters").innerHTML = categories.map(category => `<button class="filter-button ${category === activeFilter ? "is-active" : ""}" data-filter="${escapeHTML(category)}">${escapeHTML(category)}</button>`).join("");
  const entries = getRecentEntries(data.reflections.length).filter(entry => activeFilter === "Semua" || entry.category === activeFilter);
  $("#allReflections").innerHTML = entries.length ? entries.map(reflectionCard).join("") : emptyCards();
}

function renderPracticePage() {
  const practices = getActivePractices(); $("#emptyPracticeTip").hidden = practices.length > 0;
  $("#practiceList").innerHTML = practices.map(entry => {
    const log = todayLog(entry.id), outcomes = [["berhasil", "✓ Berhasil"], ["sebagian", "~ Sebagian"], ["gagal", "× Belum berhasil"]];
    return `<article class="practice-card"><div><h3>${escapeHTML(entry.title)}</h3><p class="source">Eksperimen sejak ${displayDate(entry.actionStart || entry.date)}${entry.reviewDate ? ` · review ${displayDate(entry.reviewDate)}` : ""}</p><p class="action-text">${escapeHTML(entry.action)}</p>${log ? `<p class="practice-status">Hari ini: <strong>${log.outcome === "berhasil" ? "berhasil" : log.outcome === "sebagian" ? "sebagian berhasil" : "belum berhasil"}</strong></p>` : ""}</div><div class="practice-controls" aria-label="Status latihan ${escapeHTML(entry.title)}">${outcomes.map(([value, label]) => `<button class="outcome-button ${log?.outcome === value ? "is-selected" : ""}" data-log-entry="${entry.id}" data-outcome="${value}">${label}</button>`).join("")}</div></article>`;
  }).join("");
}

function setFormValue(form, name, value) { const field = form.elements[name]; if (field) field.value = value ?? ""; }

function renderHealthPage() {
  const checkin = currentCheckin(), form = $("#healthCheckinForm");
  ["sleep", "energy", "mood", "water", "movement", "note"].forEach(name => setFormValue(form, name, checkin[name]));
  $("#healthTodayLabel").textContent = `${dayName()} · ${displayDate(localDate())}`;
  renderHealthSummary(); renderRoutine(); renderFood(); renderWeeklyRhythm();
}

function renderHealthSummary() {
  const checkin = currentCheckin(), labels = [];
  if (checkin.sleep) labels.push(`${checkin.sleep} jam tidur`);
  if (checkin.energy) labels.push(`energi ${checkin.energy}/5`);
  if (checkin.mood) labels.push(`mood ${checkin.mood}/5`);
  if (checkin.water !== "" && checkin.water !== undefined) labels.push(`${checkin.water} gelas air`);
  if (checkin.movement) labels.push(`${checkin.movement} menit gerak`);
  $("#healthScoreContent").innerHTML = labels.length ? `<div class="score-main"><strong>${labels.length}</strong><span>sinyal tubuh tercatat</span></div><div class="score-details">${labels.map(item => `<span>${escapeHTML(item)}</span>`).join("")}</div>` : `<div class="score-main"><strong>—</strong><span>belum ada check-in</span></div><p>Mulai dengan satu atau dua data yang terasa bermanfaat hari ini.</p>`;
}

function renderRoutine() {
  const routines = todayRoutines(), state = routineState(), done = routines.filter(item => state[item.id]).length, rhythm = WEEKLY_RHYTHM.find(item => item.day === dayName());
  $("#routineTitle").textContent = rhythm ? rhythm.main : "Ritual kecil untuk dirimu";
  $("#routineDescription").textContent = rhythm ? rhythm.note : "Kamu bebas mengubahnya sesuai kebutuhan tubuh dan jadwalmu.";
  $("#routineProgressNumber").textContent = `${done}/${routines.length}`; $("#routineProgressBar").style.width = `${routines.length ? Math.round(done / routines.length * 100) : 0}%`;
  $("#routineList").innerHTML = routines.map(item => `<article class="routine-item ${state[item.id] ? "is-done" : ""}"><input class="routine-toggle" data-routine-id="${item.id}" type="checkbox" ${state[item.id] ? "checked" : ""} aria-label="Tandai ${escapeHTML(item.label)} selesai" /><span class="routine-time">${escapeHTML(item.time || "—")}</span><span class="routine-label">${escapeHTML(item.label)}</span><span class="routine-area">${escapeHTML(item.area)}</span>${item.custom ? `<button class="routine-remove" data-remove-routine="${item.id}" aria-label="Hapus ${escapeHTML(item.label)}">×</button>` : ""}</article>`).join("");
}

function renderFood() {
  const items = getFoodLog(), total = foodCalories(items), target = Number(data.health.settings.calorieTarget) || 0;
  $("#calorieTotal").textContent = total.toLocaleString("id-ID"); $("#calorieTargetInput").value = data.health.settings.calorieTarget || "";
  $("#calorieBar").style.width = `${target ? Math.min(100, Math.round(total / target * 100)) : 0}%`;
  $("#calorieCaption").textContent = target ? `${Math.max(0, target - total).toLocaleString("id-ID")} kcal tersisa menuju target pribadi hari ini.` : "Target bersifat opsional; catat makan untuk mengenali pola, bukan untuk menghakimi diri.";
  $("#foodLogList").innerHTML = items.length ? items.map((item, index) => `<div class="food-row"><span class="food-meal">${escapeHTML(item.meal)}</span><span class="food-name">${escapeHTML(item.name)}</span><span class="food-calories">${item.calories === "" || item.calories === null || item.calories === undefined ? "—" : `${Number(item.calories).toLocaleString("id-ID")} kcal`}</span><button class="food-delete" data-delete-food="${index}" aria-label="Hapus ${escapeHTML(item.name)}">×</button></div>`).join("") : `<p class="empty-inline">Belum ada makanan yang dicatat hari ini. Tambahkan jika pelacakan ini membantumu.</p>`;
}

function renderWeeklyRhythm() { $("#weeklyRhythm").innerHTML = WEEKLY_RHYTHM.map(item => `<article class="rhythm-day ${item.day === dayName() ? "is-today" : ""}"><span>${escapeHTML(item.day)}${item.day === dayName() ? " · hari ini" : ""}</span><h3>${escapeHTML(item.main)}</h3><p>${escapeHTML(item.note)}</p><i class="rhythm-tag">${escapeHTML(item.tag)}</i></article>`).join(""); }

function mode(values) { if (!values.length) return null; const counts = values.reduce((all, item) => ({ ...all, [item]: (all[item] || 0) + 1 }), {}); return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]; }

function renderReviewPage() {
  const start = new Date(); start.setDate(start.getDate() - 6); start.setHours(0, 0, 0, 0);
  const weeklyEntries = data.reflections.filter(entry => new Date(`${entry.date}T12:00:00`) >= start);
  const weeklyLogs = data.practiceLogs.filter(log => new Date(`${log.date}T12:00:00`) >= start);
  const healthCheckins = Object.entries(data.health.checkins).filter(([date]) => new Date(`${date}T12:00:00`) >= start).map(([, value]) => value);
  const sleepValues = healthCheckins.map(item => Number(item.sleep)).filter(value => value > 0), topCategory = mode(weeklyEntries.map(entry => entry.category));
  const wins = weeklyLogs.filter(log => log.outcome === "berhasil").length, attempted = weeklyLogs.length;
  const categoriesText = topCategory ? `${topCategory[0]} (${topCategory[1]} catatan)` : "Belum cukup data";
  const sleepText = sleepValues.length ? `${(sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length).toFixed(1).replace(".", ",")} jam` : "—";
  $("#reviewGrid").innerHTML = `<article class="review-card"><p class="eyebrow">KEJADIAN DICATAT</p><div class="big-insight">${weeklyEntries.length}</div><p>catatan dalam tujuh hari terakhir.</p></article><article class="review-card"><p class="eyebrow">POLA PALING SERING</p><h3>${escapeHTML(categoriesText)}</h3><p>${topCategory ? "Gunakan ini sebagai titik awal untuk bertanya lebih dalam." : "Cobalah mencatat satu kejadian ketika kamu siap."}</p></article><article class="review-card"><p class="eyebrow">LATIHAN</p><div class="big-insight">${attempted ? `${wins}/${attempted}` : "—"}</div><p>${attempted ? "latihan hari ini yang tercatat berhasil." : "Belum ada status latihan minggu ini."}</p></article><article class="review-card"><p class="eyebrow">CHECK-IN TUBUH</p><div class="big-insight">${sleepText}</div><p>${healthCheckins.length ? `rata-rata tidur dari ${healthCheckins.length} check-in minggu ini.` : "Belum ada check-in tubuh minggu ini."}</p></article>`;
  let prompt = "Catat satu kejadian yang ingin kamu pahami minggu ini. Mulailah dari fakta: apa yang terjadi, dan apa bagianmu?";
  if (weeklyEntries.length && !weeklyLogs.length) prompt = "Kamu sudah mengumpulkan refleksi. Pilih satu eksperimen perilaku yang paling kecil dan realistis untuk dilatih minggu ini.";
  if (weeklyLogs.length && wins < attempted) prompt = "Hasil yang belum sesuai bukan kegagalan diri. Tanyakan: apakah pemicunya jelas, langkahnya terlalu besar, atau sistem pendukungnya perlu diubah?";
  if (weeklyLogs.length && wins === attempted) prompt = "Ada bukti perubahan di sini. Pertahankan langkah yang berhasil, lalu perhatikan kapan situasi menjadi lebih menantang.";
  if (healthCheckins.length && sleepValues.length) prompt += " Perhatikan juga apakah tidur, energi, atau pola makan ikut memengaruhi cara kamu merespons hari-hari yang sulit.";
  $("#reviewPrompt").innerHTML = `<p class="eyebrow">PERTANYAAN MINGGU INI</p><h3>Apa yang ingin diperbaiki dari sistemmu?</h3><p>${prompt}</p>`;
}

function openDetail(entryId) {
  const entry = data.reflections.find(item => item.id === entryId); if (!entry) return;
  const items = [["Apa yang terjadi", entry.event], ["Dampak terhadap diri", entry.impactSelf], ["Dampak terhadap orang lain", entry.impactOthers], ["Bagian tanggung jawabku", entry.ownership], ["Kemungkinan penyebab", entry.rootCause], ["Yang kupelajari", entry.lesson]].filter(([, value]) => value?.trim());
  $("#dialogContent").innerHTML = `<div class="detail-meta"><span class="category-pill">${escapeHTML(entry.category)}</span><span>${displayDate(entry.date)}</span>${entry.emotions ? `<span>· ${escapeHTML(entry.emotions)}</span>` : ""}</div><h2>${escapeHTML(entry.title)}</h2>${items.map(([heading, content]) => `<h3>${heading}</h3><p>${escapeHTML(content)}</p>`).join("")}${entry.action ? `<h3>Eksperimen perilaku baru</h3><div class="detail-action"><p>${escapeHTML(entry.action)}</p></div>` : ""}`;
  $("#detailDialog").showModal();
}

function saveReflection(event) {
  event.preventDefault(); const entry = Object.fromEntries(new FormData(event.currentTarget).entries());
  entry.id = crypto.randomUUID(); entry.createdAt = new Date().toISOString(); data.reflections.push(entry); saveData(); event.currentTarget.reset(); setDateInputs(); renderAll();
  showToast("Refleksi tersimpan. Terima kasih sudah memberi ruang untuk memahaminya."); goToPage(entry.action?.trim() ? "practice" : "reflections");
}
function logPractice(entryId, outcome) { const existing = todayLog(entryId); if (existing) existing.outcome = outcome; else data.practiceLogs.push({ id: crypto.randomUUID(), entryId, date: localDate(), outcome, note: "" }); saveData(); renderAll(); showToast("Status latihan hari ini dicatat."); }
function saveHealthCheckin(event) { event.preventDefault(); data.health.checkins[localDate()] = Object.fromEntries(new FormData(event.currentTarget).entries()); saveData(); renderAll(); showToast("Check-in tubuh tersimpan."); }
function toggleRoutine(id, checked) { const date = localDate(); data.health.routineLogs[date] ||= {}; data.health.routineLogs[date][id] = checked; saveData(); renderAll(); showToast(checked ? "Langkah kecil ditandai selesai." : "Rutinitas dikembalikan ke daftar."); }
function addRoutine(event) { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); data.health.customRoutines.push({ id: `custom-${crypto.randomUUID()}`, ...values, custom: true }); saveData(); event.currentTarget.reset(); renderAll(); showToast("Rutinitas pribadi ditambahkan."); }
function removeRoutine(id) { data.health.customRoutines = data.health.customRoutines.filter(item => item.id !== id); Object.values(data.health.routineLogs).forEach(log => delete log[id]); saveData(); renderAll(); showToast("Rutinitas pribadi dihapus."); }
function saveCalorieTarget(value) { data.health.settings.calorieTarget = value === "" ? "" : Math.max(0, Number(value)); saveData(); renderAll(); showToast("Target pribadi disimpan."); }
function addFood(event) { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); data.health.foodLogs[localDate()] ||= []; data.health.foodLogs[localDate()].push({ id: crypto.randomUUID(), meal: values.meal, name: values.name.trim(), calories: values.calories === "" ? "" : Math.max(0, Number(values.calories)) }); saveData(); event.currentTarget.reset(); renderAll(); showToast("Catatan makan ditambahkan."); }
function deleteFood(index) { const items = getFoodLog(); items.splice(index, 1); data.health.foodLogs[localDate()] = items; saveData(); renderAll(); showToast("Catatan makan dihapus."); }
function clearFood() { if (!getFoodLog().length) return; if (!confirm("Kosongkan seluruh catatan makan untuk hari ini?")) return; data.health.foodLogs[localDate()] = []; saveData(); renderAll(); showToast("Catatan makan hari ini dikosongkan."); }
function prepareHealthReflection() { $("#reflectionForm").reset(); setDateInputs(); $("#reflectionForm").elements.category.value = "Kesehatan"; goToPage("capture"); $("#reflectionForm").elements.title.focus(); }

function exportData() { const content = JSON.stringify({ exportedAt: new Date().toISOString(), ...data }, null, 2); const link = document.createElement("a"); link.href = URL.createObjectURL(new Blob([content], { type: "application/json" })); link.download = `ruang-tumbuh-${localDate()}.json`; link.click(); URL.revokeObjectURL(link.href); showToast("Data berhasil diunduh."); }
function importData(file) { const reader = new FileReader(); reader.onload = () => { try { data = normalizeData(JSON.parse(reader.result)); saveData(); renderAll(); showToast("Data berhasil dipulihkan."); } catch { showToast("File tidak dapat dibaca. Pilih cadangan Ruang Tumbuh yang valid."); } }; reader.readAsText(file); }
function renderAll() { renderDashboard(); renderReflectionPage(); renderPracticePage(); renderHealthPage(); renderReviewPage(); }
function setDateInputs() { $("#eventDate").value = localDate(); $("#actionStart").value = localDate(); const review = new Date(); review.setDate(review.getDate() + 7); $("#reviewDate").value = localDate(review); }
function showHealthTab(name) { $$(".health-tab").forEach(button => button.classList.toggle("is-active", button.dataset.healthTab === name)); $$("[data-health-panel]").forEach(panel => panel.classList.toggle("is-visible", panel.dataset.healthPanel === name)); }

function bindEvents() {
  $$("[data-page]").forEach(button => button.addEventListener("click", () => goToPage(button.dataset.page)));
  document.addEventListener("click", event => {
    const go = event.target.closest("[data-go]"); if (go) goToPage(go.dataset.go);
    const open = event.target.closest("[data-open-entry]"); if (open) openDetail(open.dataset.openEntry);
    const filter = event.target.closest("[data-filter]"); if (filter) { activeFilter = filter.dataset.filter; renderReflectionPage(); }
    const log = event.target.closest("[data-log-entry]"); if (log) logPractice(log.dataset.logEntry, log.dataset.outcome);
    const healthTab = event.target.closest("[data-health-tab]"); if (healthTab) showHealthTab(healthTab.dataset.healthTab);
    const remove = event.target.closest("[data-remove-routine]"); if (remove) removeRoutine(remove.dataset.removeRoutine);
    const removeFood = event.target.closest("[data-delete-food]"); if (removeFood) deleteFood(Number(removeFood.dataset.deleteFood));
  });
  document.addEventListener("change", event => { if (event.target.matches("[data-routine-id]")) toggleRoutine(event.target.dataset.routineId, event.target.checked); if (event.target.id === "calorieTargetInput") saveCalorieTarget(event.target.value); });
  $("#reflectionForm").addEventListener("submit", saveReflection); $("#healthCheckinForm").addEventListener("submit", saveHealthCheckin); $("#routineForm").addEventListener("submit", addRoutine); $("#foodLogForm").addEventListener("submit", addFood); $("#clearFoodButton").addEventListener("click", clearFood); $("#healthReflectionButton").addEventListener("click", prepareHealthReflection);
  $("#quickCaptureButton").addEventListener("click", () => goToPage("capture")); $("#menuButton").addEventListener("click", () => $(".sidebar").classList.toggle("is-open")); $("#privacyButton").addEventListener("click", () => $("#privacyDialog").showModal()); $("#closeDialog").addEventListener("click", () => $("#detailDialog").close());
  $$("[data-close-dialog]").forEach(button => button.addEventListener("click", () => $(`#${button.dataset.closeDialog}`).close()));
  $("#exportButton").addEventListener("click", exportData); $("#importInput").addEventListener("change", event => { if (event.target.files[0]) importData(event.target.files[0]); event.target.value = ""; });
  $("#clearDataButton").addEventListener("click", () => { if (!confirm("Hapus semua refleksi, latihan, dan catatan kesehatan pada browser ini? Tindakan ini tidak dapat dibatalkan.")) return; data = blankData(); saveData(); renderAll(); showToast("Seluruh data lokal telah dihapus."); });
}

$("#topDate").textContent = pageInfo.dashboard[1];
setDateInputs(); bindEvents(); renderAll();
