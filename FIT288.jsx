/**
 * FIT288 — мобильное фитнес-приложение.
 *
 * Один самодостаточный React-компонент. Навигация по файлу — по главам:
 *
 *   ГЛАВА 1. ОСНОВА                    строка 19
 *     Палитра, типографика, материалы стекла
 *   ГЛАВА 2. ДАННЫЕ И БЕЗОПАСНОСТЬ     строка 73
 *     Метрики с устройств, защита от травм, подбор нагрузки
 *   ГЛАВА 3. ПЕРСОНАЖ                  строка 536
 *     Изображения, иконки, экраны образа и профиля
 *   ГЛАВА 4. ВХОД В ПРИЛОЖЕНИЕ         строка 1115
 *     Языки, сервер, источники данных, регистрация, анкета
 *   ГЛАВА 5. РАСЧЁТЫ И ПРОГРЕСС        строка 2257
 *     КБЖУ, вес, достижения, статистика плашек
 *   ГЛАВА 6. ГЛАВНЫЙ ЭКРАН             строка 3082
 *     Плашки-виджеты, перетаскивание, растягивание
 *   ГЛАВА 7. ТРЕНИРОВКИ                строка 3749
 *     План, анимация техники, журнал подходов
 *   ГЛАВА 8. НАВИГАЦИЯ И ПИТАНИЕ       строка 4464
 *     Панель вкладок, дневник питания
 *   ГЛАВА 9. СБОРКА                    строка 4995
 *     Состояние приложения, маршрутизация экранов
 *
 * Быстрый поиск:  python3 map.py <имя>   — покажет строку объявления
 *                 python3 map.py         — полная карта разделов
 *
 * Ключевые правила, которые нельзя нарушать:
 *   • Уровень подготовки берётся ТОЛЬКО из анкеты (survey.exp), не из веса
 *   • Тренировки считаются по уникальным завершённым записям, не по взвешиваниям
 *   • Любой план питания и тренировки проходит guardNutrition / guardWorkout
 *   • Каждая рекомендация имеет источник и год
 *   • Токены не попадают в localStorage; в браузер отдаётся только маска телефона
 */
import React, { useState, useEffect } from "react";


/****************************************************************************
 *  ГЛАВА 1. ОСНОВА
 *  Палитра, типографика, материалы стекла
 ****************************************************************************/

// ============================ ПАЛИТРА ============================
const PF = {
  bg: "#F5EFE8",
  bgDeep: "#EBE2D8",
  card: "#FBF7F2",
  sand: "#D8C4AE",
  terra: "#A97060",
  cocoa: "#71594C",
  ink: "#3F3029",
  ink2: "#71594C",
  ink3: "#A79688",
  line: "rgba(63,48,41,0.10)",
};

// iOS 26/27 Liquid Glass: полупрозрачный слой + размытие фона + блик по верхней кромке.
// Стекло: заметно прозрачнее, сильнее размытие, световая кромка сверху.
// Настоящее стекло: сильно прозрачное, широкое размытие, световой блик по кромке.
const glass = (opacity = 0.28) => ({
  background: `linear-gradient(150deg,
    rgba(255,255,255,${Math.min(0.72, opacity + 0.30)}) 0%,
    rgba(255,253,250,${opacity}) 40%,
    rgba(240,228,216,${Math.max(0.10, opacity - 0.14)}) 100%)`,
  backdropFilter: "blur(46px) saturate(215%)",
  WebkitBackdropFilter: "blur(46px) saturate(215%)",
  borderStyle: "solid", borderWidth: 1, borderColor: "rgba(255,255,255,0.58)",
  boxShadow: [
    "0 14px 42px rgba(63,48,41,0.11)",
    "inset 0 1px 0 rgba(255,255,255,0.98)",
    "inset 0 -1px 0 rgba(169,112,96,0.08)",
    "inset 1px 0 0 rgba(255,255,255,0.42)",
  ].join(", "),
});
// Цветные акценты для разделов — приложение перестаёт быть одноцветным.
const ACCENT = {
  rings:  { c: "#B0653F", soft: "rgba(176,101,63,0.16)" },   // тёплый терракот — под палитру
  weight: { c: "#7A6A9C", soft: "rgba(122,106,156,0.15)" },
  macros: { c: "#C77A3E", soft: "rgba(199,122,62,0.16)" },
  meals:  { c: "#D9762F", soft: "rgba(217,118,47,0.16)" },
  food:   { c: "#F2622B", soft: "rgba(242,98,43,0.20)" },    // яркий апельсин
  steps:  { c: "#3E72B8", soft: "rgba(62,114,184,0.15)" },   // синий
  sleep:  { c: "#6B62C4", soft: "rgba(107,98,196,0.15)" },   // индиго
  workout:{ c: "#D2483F", soft: "rgba(210,72,63,0.15)" },    // алый
  awards: { c: "#D9A324", soft: "rgba(217,163,36,0.16)" },   // золото
  goals:  { c: "#4E9E5F", soft: "rgba(78,158,95,0.15)" },    // зелёный
  shop:   { c: "#C0559A", soft: "rgba(192,85,154,0.15)" },   // фуксия
  tips:   { c: "#8A6BD1", soft: "rgba(138,107,209,0.15)" },  // лиловый
};


/****************************************************************************
 *  ГЛАВА 2. ДАННЫЕ И БЕЗОПАСНОСТЬ
 *  Метрики с устройств, защита от травм, подбор нагрузки
 ****************************************************************************/

// ============================ ДАННЫЕ О ЗДОРОВЬЕ ============================
// Единое хранилище измерений. Каждая запись: { type, value, unit, ts, source }.
// Источники подключаются адаптерами; у каждого честно указано, работает ли он
// прямо сейчас в браузере или требует нативной оболочки.
//
// Работает уже сейчас:
//   • Web Bluetooth — нагрудные пульсометры и часы с профилем Heart Rate (GATT 0x180D)
//   • Strava и Google Fit — через OAuth на бэкенде (/api/integrations/*)
// Через мост нативной оболочки (Capacitor / React Native):
//   • HealthKit (Apple Watch, Apple Health) — window.FIT288Bridge.healthkit
//   • Health Connect (Pixel Watch, Galaxy Watch, Fitbit, Mi Band) — window.FIT288Bridge.healthconnect
// Garmin отдаёт данные только партнёрам программы Garmin Health API — нужен договор.

const METRIC = {
  steps:      { label: "Шаги",                 unit: "шагов",  agg: "sum" },
  distance:   { label: "Дистанция",            unit: "км",     agg: "sum" },
  activeKcal: { label: "Активные калории",     unit: "ккал",   agg: "sum" },
  heartRate:  { label: "Пульс",                unit: "уд/мин", agg: "avg" },
  restingHR:  { label: "Пульс покоя",          unit: "уд/мин", agg: "last" },
  hrv:        { label: "Вариабельность (HRV)", unit: "мс",     agg: "avg" },
  vo2max:     { label: "VO₂max",               unit: "мл/кг/мин", agg: "last" },
  spo2:       { label: "Кислород в крови",     unit: "%",      agg: "avg" },
  sleep:      { label: "Сон",                  unit: "ч",      agg: "sum" },
  sleepDeep:  { label: "Глубокий сон",         unit: "ч",      agg: "sum" },
  weight:     { label: "Вес",                  unit: "кг",     agg: "last" },
  bodyFat:    { label: "Жир",                  unit: "%",      agg: "last" },
  floors:     { label: "Этажи",                unit: "эт.",    agg: "sum" },
  activeMin:  { label: "Активные минуты",      unit: "мин",    agg: "sum" },
  workouts:   { label: "Тренировки",           unit: "шт.",    agg: "sum" },
};

const dayKey = (ts) => new Date(ts).toISOString().slice(0, 10);

function createHealthStore() {
  let samples = [];
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => f(samples));
  return {
    subscribe(f) { listeners.add(f); return () => listeners.delete(f); },
    add(list) {
      // Физиологические границы: мусор с датчика в хранилище не попадает.
      const inRange = (t, v) =>
        (t === "heartRate" || t === "restingHR") ? v >= 25 && v <= 250 :
        t === "spo2" ? v >= 50 && v <= 100 :
        t === "steps" ? v >= 0 && v <= 200000 :
        (t === "sleep" || t === "sleepDeep") ? v >= 0 && v <= 24 :
        t === "weight" ? v >= 20 && v <= 400 : v >= 0;
      const valid = (Array.isArray(list) ? list : [list]).filter((s) =>
        s && METRIC[s.type] && Number.isFinite(Number(s.value)) && s.ts && s.source
        && inRange(s.type, Number(s.value)));
      if (!valid.length) return 0;
      // Ключ type+ts+source: повторное завершение и повторная синхронизация
      // не создают вторую запись о том же событии.
      const seen = new Set(samples.map((s) => `${s.type}|${s.ts}|${s.source}`));
      const fresh = [];
      for (const s of valid) {
        const k = `${s.type}|${s.ts}|${s.source}`;
        if (seen.has(k)) continue;
        seen.add(k);
        fresh.push({ ...s, value: Number(s.value) });
      }
      if (!fresh.length) return 0;
      samples = [...samples, ...fresh];
      notify();
      return fresh.length;
    },
    all() { return samples; },
    clear() { samples = []; notify(); },
    // сводка по дню с учётом правила агрегации метрики
    daily(type, day = dayKey(Date.now())) {
      const m = METRIC[type];
      const rows = samples.filter((s) => s.type === type && dayKey(s.ts) === day);
      if (!rows.length) return null;
      if (m.agg === "sum") return rows.reduce((a, b) => a + b.value, 0);
      if (m.agg === "avg") return rows.reduce((a, b) => a + b.value, 0) / rows.length;
      return rows.sort((a, b) => b.ts - a.ts)[0].value;
    },
    week(type) {
      const out = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const k = dayKey(d.getTime());
        out.push({ day: ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()], key: k, v: this.daily(type, k) });
      }
      return out;
    },
    sources() { return [...new Set(samples.map((s) => s.source))]; },
  };
}
const healthStore = createHealthStore();

// ---------- Адаптер 1: Web Bluetooth, профиль Heart Rate (работает в Chrome/Edge/Android) ----------
const bleHeartRate = {
  id: "ble-hr", name: "Пульсометр по Bluetooth",
  available: () => typeof navigator !== "undefined" && !!navigator.bluetooth,
  device: null, char: null,
  async connect(onSample) {
    const device = await navigator.bluetooth.requestDevice({ filters: [{ services: ["heart_rate"] }], optionalServices: ["battery_service"] });
    const server = await device.gatt.connect();
    const service = await server.getPrimaryService("heart_rate");
    const char = await service.getCharacteristic("heart_rate_measurement");
    await char.startNotifications();
    char.addEventListener("characteristicvaluechanged", (e) => {
      // Bluetooth SIG: флаг бита 0 — формат значения (8 или 16 бит)
      const dv = e.target.value;
      const flags = dv.getUint8(0);
      const hr = (flags & 0x01) ? dv.getUint16(1, true) : dv.getUint8(1);
      // RR-интервалы (бит 4) — из них считается HRV (RMSSD)
      const rr = [];
      if (flags & 0x10) for (let i = (flags & 0x08) ? 4 : 2 + ((flags & 0x01) ? 1 : 0); i + 1 < dv.byteLength; i += 2) rr.push(dv.getUint16(i, true) / 1024 * 1000);
      const ts = Date.now();
      const out = [{ type: "heartRate", value: hr, unit: "bpm", ts, source: device.name || "BLE HR" }];
      if (rr.length > 1) {
        const diffs = rr.slice(1).map((v, i) => v - rr[i]);
        const rmssd = Math.sqrt(diffs.reduce((a, d) => a + d * d, 0) / diffs.length);
        out.push({ type: "hrv", value: Math.round(rmssd), unit: "ms", ts, source: device.name || "BLE HR" });
      }
      healthStore.add(out);
      onSample && onSample(out);
    });
    this.device = device; this.char = char;
    device.addEventListener("gattserverdisconnected", () => { this.device = null; this.char = null; });
    return device.name || "Пульсометр";
  },
  disconnect() { if (this.device && this.device.gatt.connected) this.device.gatt.disconnect(); },
};

// ---------- Адаптер 2: мост нативной оболочки (HealthKit / Health Connect) ----------
// Оболочка (Capacitor) выставляет window.FIT288Bridge с методами:
//   healthkit.requestAuthorization(types) → Promise<boolean>
//   healthkit.query({ type, from, to }) → Promise<Array<{value, unit, ts, source}>>
//   healthconnect — тот же интерфейс. Типы совпадают с METRIC.
const nativeBridge = {
  id: "native", name: "Apple Health / Health Connect",
  available: () => typeof window !== "undefined" && !!window.FIT288Bridge,
  which() { const b = window.FIT288Bridge; return b?.healthkit ? "healthkit" : (b?.healthconnect ? "healthconnect" : null); },
  async sync(types = Object.keys(METRIC), days = 7) {
    const kind = this.which(); if (!kind) return 0;
    const api = window.FIT288Bridge[kind];
    const ok = await api.requestAuthorization(types);
    if (!ok) return 0;
    const from = Date.now() - days * 864e5, to = Date.now();
    let n = 0;
    for (const type of types) {
      const rows = await api.query({ type, from, to });
      n += healthStore.add((rows || []).map((r) => ({ type, value: r.value, unit: r.unit || METRIC[type].unit, ts: r.ts, source: r.source || (kind === "healthkit" ? "Apple Health" : "Health Connect") })));
    }
    return n;
  },
};

// ---------- Адаптер 3: облачные сервисы через бэкенд (OAuth там, токены не в браузере) ----------
const cloudSync = {
  id: "cloud", name: "Strava / Google Fit",
  authUrl: (provider) => `${API_BASE}/integrations/${provider}/auth`,
  async pull(provider, token) {
    const res = await apiCall(`/integrations/${provider}/pull`, { days: 7 }, { token });
    if (!res.ok || !Array.isArray(res.samples)) return 0;
    return healthStore.add(res.samples);
  },
};

// ---------- Демо-данные: включаются только когда нет ни одного источника, и помечаются ----------
function seedDemoHealth() {
  if (healthStore.all().length) return;
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(12);
    const ts = d.getTime(), h = (d.getDate() * 7 + i * 13) % 100 / 100;
    rows.push({ type: "steps", value: Math.round(6200 + h * 5200), unit: "шагов", ts, source: "демо" });
    rows.push({ type: "activeKcal", value: Math.round(380 + h * 420), unit: "ккал", ts, source: "демо" });
    rows.push({ type: "activeMin", value: Math.round(18 + h * 50), unit: "мин", ts, source: "демо" });
    rows.push({ type: "restingHR", value: Math.round(56 + h * 9), unit: "bpm", ts, source: "демо" });
    rows.push({ type: "heartRate", value: Math.round(68 + h * 30), unit: "bpm", ts, source: "демо" });
    rows.push({ type: "hrv", value: Math.round(38 + h * 30), unit: "ms", ts, source: "демо" });
    rows.push({ type: "spo2", value: Math.round(96 + h * 3), unit: "%", ts, source: "демо" });
    rows.push({ type: "sleep", value: Math.round((6.2 + h * 2.2) * 10) / 10, unit: "ч", ts, source: "демо" });
    rows.push({ type: "sleepDeep", value: Math.round((1.1 + h * 0.9) * 10) / 10, unit: "ч", ts, source: "демо" });
    rows.push({ type: "distance", value: Math.round((4.2 + h * 4) * 10) / 10, unit: "км", ts, source: "демо" });
    rows.push({ type: "floors", value: Math.round(3 + h * 12), unit: "эт.", ts, source: "демо" });
    if (h > 0.45) rows.push({ type: "workouts", value: 1, unit: "шт.", ts, source: "демо" });
  }
  rows.push({ type: "vo2max", value: 41, unit: "мл/кг/мин", ts: Date.now(), source: "демо" });
  healthStore.add(rows);
}

function useHealth() {
  const [, force] = React.useReducer((x) => x + 1, 0);
  React.useEffect(() => healthStore.subscribe(() => force()), []);
  return healthStore;
}


// ============================ ЗАЩИТА ОТ ВРЕДА ============================
// Жёсткие границы, которые план не может нарушить ни при каких входных данных.
// Каждая опирается на опубликованную норму; пороги указаны прямо в коде.
const SAFETY = {
  kcalMinF: 1200, kcalMinM: 1500,          // NIH/ADA: ниже — только под наблюдением врача
  kcalMaxDeficit: 0.25,                     // дефицит не глубже 25% от расхода
  kcalMaxSurplus: 0.15,                     // профицит не выше 15%
  proteinMaxPerKg: 2.4,                     // ISSN: выше нет пользы, нагрузка на почки
  weightLossMaxKgWeek: 1.0,                 // NIH: 0.5–1 кг в неделю
  hrMaxFormula: (age) => Math.round(208 - 0.7 * age),   // Tanaka 2001
  restingHRRedFlag: [40, 100],              // вне диапазона — к врачу
  spo2RedFlag: 92,                          // ниже — к врачу
  bmiUnderweight: 18.5,
  maxSetsPerSession: 25,                    // ACSM: объём для здоровых взрослых
  maxSessionsPerWeek: 6,
  minAge: 16,                               // моложе — программа только с тренером/врачом
};

// Проверка плана питания. Возвращает { ok, macros, flags[] } — при нарушении план ПРАВИТСЯ, а не просто помечается.
function guardNutrition(macros, survey) {
  const flags = [];
  if (!macros) return { ok: false, macros, flags: ["нет расчёта"] };
  const kg = Number(survey?.weight) || 70;
  const male = survey?.gender === "male";
  const m = { ...macros };
  const minK = male ? SAFETY.kcalMinM : SAFETY.kcalMinF;
  if (m.kcal < minK) { flags.push(`Калорийность поднята до безопасного минимума ${minK} ккал (NIH)`); m.kcal = minK; }
  if (m.tdee && m.kcal < m.tdee * (1 - SAFETY.kcalMaxDeficit)) { m.kcal = Math.round(m.tdee * (1 - SAFETY.kcalMaxDeficit)); flags.push("Дефицит ограничен 25% от расхода"); }
  if (m.tdee && m.kcal > m.tdee * (1 + SAFETY.kcalMaxSurplus)) { m.kcal = Math.round(m.tdee * (1 + SAFETY.kcalMaxSurplus)); flags.push("Профицит ограничен 15% от расхода"); }
  const pMax = Math.round(kg * SAFETY.proteinMaxPerKg);
  if (m.protein > pMax) { m.protein = pMax; flags.push(`Белок ограничен ${SAFETY.proteinMaxPerKg} г/кг (ISSN)`); }
  const h = Number(survey?.height) / 100, bmi = h ? kg / (h * h) : null;
  if (bmi && bmi < SAFETY.bmiUnderweight && (survey?.goals || []).includes("lose")) {
    flags.push("ИМТ ниже 18.5 — снижение веса не назначается; цель переведена на здоровье");
    m.kcal = Math.max(m.kcal, m.tdee || m.kcal);
  }
  const contra = survey?.contra || [];
  if (contra.includes("diabet")) flags.push("Диабет: углеводы распределены равномерно, план согласовать с врачом");
  return { ok: flags.length === 0, macros: m, flags };
}

// Проверка тренировки: убирает опасное, ограничивает объём, помечает красные флаги.
function guardWorkout(plan, survey, health) {
  const flags = [];
  const age = Number(survey?.age) || 30;
  const contra = survey?.contra || [];
  let ex = [...(plan?.exercises || [])];
  if (age < SAFETY.minAge) flags.push("Младше 16: программа только под присмотром тренера");
  // сердце/давление: без максимальных весов и без задержки дыхания
  if (contra.includes("heart") || contra.includes("hyper")) {
    ex = ex.map((e) => e.sets >= 5 ? { ...e, sets: 3, reps: "10–12", rest: "90 сек" } : e);
    flags.push("Сердце/давление: силовой режим заменён на умеренный, без задержки дыхания");
  }
  const restHR = health ? health.daily("restingHR") : null;
  if (restHR != null && (restHR < SAFETY.restingHRRedFlag[0] || restHR > SAFETY.restingHRRedFlag[1])) {
    flags.push(`Пульс покоя ${Math.round(restHR)} вне нормы — сегодня только лёгкая ходьба, покажитесь врачу`);
    ex = ex.filter((e) => e.target === "mobility");
  }
  const spo2 = health ? health.daily("spo2") : null;
  if (spo2 != null && spo2 < SAFETY.spo2RedFlag) { flags.push(`Сатурация ${Math.round(spo2)}% — тренировка отменена, обратитесь к врачу`); ex = []; }
  const total = ex.reduce((a, e) => a + (e.sets || 0), 0);
  if (total > SAFETY.maxSetsPerSession) {
    const k = SAFETY.maxSetsPerSession / total;
    ex = ex.map((e) => ({ ...e, sets: Math.max(1, Math.floor((e.sets || 1) * k)) }));
    flags.push(`Объём ограничен ${SAFETY.maxSetsPerSession} подходами (ACSM)`);
  }
  const hrMax = SAFETY.hrMaxFormula(age);
  return { ok: flags.length === 0, exercises: ex, flags, hrMax, hrZones: { easy: [Math.round(hrMax * 0.5), Math.round(hrMax * 0.65)], fatburn: [Math.round(hrMax * 0.65), Math.round(hrMax * 0.75)], cardio: [Math.round(hrMax * 0.75), Math.round(hrMax * 0.85)], peak: [Math.round(hrMax * 0.85), hrMax] } };
}

// ============================ ПОДБОР ТРЕНИРОВОК ============================
// Правила, а не модель: каждое решение можно проследить и объяснить.
// Источник нагрузок — общепринятые диапазоны ACSM для силовой работы,
// выносливости и снижения веса.

// excludes — противопоказания, при которых упражнение убирается
// swap    — чем заменить, если убрали
const EXERCISE_DB = [
  { id:"bench",     name:"Жим гантелей лёжа",     kind:"benchPress",    target:"chest",    level:1,
    excludes:["shoulder"], swap:"pushup",
    desc:"Основное движение на грудь. Лопатки сведены и прижаты, стопы упираются в пол.",
    cues:["Опускайте до лёгкого растяжения груди, без удара о корпус",
          "Локти под углом 45° к телу, не разводите в стороны",
          "Выдох на усилии, вдох на опускании"] },

  { id:"pushup",    name:"Отжимания от пола",     kind:"benchPress",    target:"chest",    level:1,
    excludes:["shoulder"], swap:null,
    desc:"Замена жима без снаряда. Корпус прямой, таз не проваливается.",
    cues:["Ладони чуть шире плеч","Локти назад, а не в стороны","Опускайтесь до угла 90° в локте"] },

  { id:"row",       name:"Тяга в наклоне",        kind:"row",           target:"back",     level:1,
    excludes:["back","hernia"], swap:"rowSupported",
    desc:"Работает спина и задняя дельта. Корпус наклонён, поясница сохраняет прогиб.",
    cues:["Тяните к низу живота","Спина прямая, взгляд в пол на метр вперёд","Сводите лопатки в верхней точке"] },

  { id:"rowSupported", name:"Тяга с упором в скамью", kind:"row",       target:"back",     level:1,
    excludes:[], swap:null,
    desc:"Безопасная версия тяги: корпус лежит на опоре, поясница разгружена.",
    cues:["Грудь прижата к скамье","Работайте только руками и спиной","Без рывка корпусом"] },

  { id:"ohp",       name:"Жим стоя",              kind:"overheadPress", target:"shoulders",level:2,
    excludes:["shoulder","hyper","neck"], swap:"latRaise",
    desc:"Плечи и трицепс. Корпус жёсткий, ягодицы и пресс напряжены.",
    cues:["Рёбра вниз, без прогиба в пояснице","Гриф проходит близко к лицу","Вверху руки полностью выпрямлены"] },

  { id:"latRaise",  name:"Разведения гантелей",   kind:"overheadPress", target:"shoulders",level:1,
    excludes:["shoulder"], swap:null,
    desc:"Мягкая нагрузка на среднюю дельту без жима над головой.",
    cues:["Локти чуть согнуты","Поднимайте до уровня плеч, не выше","Опускайте медленно"] },

  { id:"pullup",    name:"Подтягивания",          kind:"pullUp",        target:"back",     level:3,
    excludes:["shoulder"], swap:"latPull",
    desc:"Широчайшие и бицепс. Если тяжело — резинка или гравитрон.",
    cues:["Начинайте со сведения лопаток","Подбородок выше перекладины, без рывка","Опускайтесь подконтрольно"] },

  { id:"latPull",   name:"Тяга верхнего блока",   kind:"pullUp",        target:"back",     level:1,
    excludes:[], swap:null,
    desc:"Та же вертикальная тяга, но с регулируемым весом.",
    cues:["Тяните к верху груди","Не заводите гриф за голову","Корпус слегка назад и неподвижен"] },

  { id:"squat",     name:"Приседания со штангой", kind:"squat",         target:"legs",     level:2,
    excludes:["knee","back","hernia","varicose"], swap:"legPress",
    desc:"Ноги целиком. Штанга лежит на верхе спины, а не на шее.",
    cues:["Колени по линии носков","Таз назад, грудь развёрнута","Глубина — до параллели бедра с полом"] },

  { id:"legPress",  name:"Жим ногами",            kind:"squat",         target:"legs",     level:1,
    excludes:["hernia"], swap:"gluteBridge",
    desc:"Ноги без осевой нагрузки на позвоночник — безопаснее для спины.",
    cues:["Не отрывайте таз от спинки","Колени не заваливайте внутрь","Не выпрямляйте ноги в замок"] },

  { id:"gluteBridge", name:"Ягодичный мост",      kind:"squat",         target:"legs",     level:1,
    excludes:[], swap:null,
    desc:"Ягодицы и задняя поверхность бедра лёжа. Подходит почти всем.",
    cues:["Упор на пятки","Вверху сожмите ягодицы на секунду","Поясницу не перегибайте"] },

  { id:"plank",     name:"Планка",                kind:"plank",         target:"core",     level:1,
    excludes:["hernia","preg"], swap:"deadBug",
    desc:"Статика на корпус. Тело — прямая линия от пяток до макушки.",
    cues:["Таз не проваливается и не задирается","Локти строго под плечами","Дышите ровно"] },

  { id:"deadBug",   name:"Мёртвый жук",           kind:"plank",         target:"core",     level:1,
    excludes:[], swap:null,
    desc:"Мягкая работа на корпус лёжа, без давления на живот и поясницу.",
    cues:["Поясница прижата к полу","Движения медленные","Выдох на опускании ноги"] },

  { id:"stretch",   name:"Растяжка",              kind:"stretch",       target:"mobility", level:1,
    excludes:[], swap:null,
    desc:"Заминка. Тянитесь мягко, без боли и рывков.",
    cues:["Держите положение 30–40 секунд","Никаких пружинящих движений","Дыхание спокойное"] },
];

// Диапазоны подходов и повторов под цель — по рекомендациям ACSM
const GOAL_SCHEME = {
  lose:      { sets:3, reps:"12–15", rest:"45 сек", note:"Круговой режим и короткий отдых — выше расход энергии" },
  muscle:    { sets:4, reps:"8–12",  rest:"90 сек", note:"Объём и умеренный отдых — рабочий диапазон для роста мышц" },
  strength:  { sets:5, reps:"3–6",   rest:"150 сек", note:"Малые повторы и длинный отдых — работа на силу" },
  endurance: { sets:3, reps:"15–20", rest:"40 сек", note:"Много повторов и короткий отдых — на выносливость" },
  posture:   { sets:3, reps:"10–12", rest:"60 сек", note:"Акцент на спину и корпус" },
  health:    { sets:3, reps:"10–12", rest:"60 сек", note:"Умеренная нагрузка на всё тело" },
  flex:      { sets:2, reps:"30–40 сек", rest:"30 сек", note:"Удержания вместо повторов" },
  energy:    { sets:3, reps:"12–15", rest:"45 сек", note:"Лёгкий тонизирующий режим" },
};

const LEVEL_BY_EXP = { none:1, lt1:1, "1to3":2, gt3:3 };

// Порядок мышечных групп в тренировке на всё тело
const TARGET_ORDER = ["legs", "back", "chest", "shoulders", "core", "mobility"];

/**
 * buildWorkout — собирает тренировку из анкеты.
 * Возвращает и сам список, и журнал решений: что убрали и почему.
 */
function buildWorkout(survey, workoutsDone = 0) {
  const limits = [
    ...(survey.contra || []).filter((c) => c !== "none"),
    ...((survey.customContra || []).length ? ["custom"] : []),
  ];
  const level = LEVEL_BY_EXP[survey.exp] || 1;
  const goal = (survey.goals || [])[0] || "health";
  const scheme = GOAL_SCHEME[goal] || GOAL_SCHEME.health;

  const log = [];          // объяснение решений
  const byId = (id) => EXERCISE_DB.find((e) => e.id === id);

  // подбираем по одному упражнению на группу
  const chosen = [];
  for (const target of TARGET_ORDER) {
    const pool = EXERCISE_DB.filter((e) => e.target === target);
    let picked = null;

    for (const ex of pool) {
      const blocked = ex.excludes.filter((c) => limits.includes(c));
      if (blocked.length === 0 && ex.level <= level + 1) { picked = ex; break; }

      if (blocked.length && ex.swap) {
        const alt = byId(ex.swap);
        const altBlocked = alt ? alt.excludes.filter((c) => limits.includes(c)) : ["нет замены"];
        if (alt && altBlocked.length === 0) {
          log.push({ from: ex.name, to: alt.name, reason: blocked });
          picked = alt;
          break;
        }
      }
      if (blocked.length && !ex.swap) {
        log.push({ from: ex.name, to: null, reason: blocked });
      }
    }
    if (picked && !chosen.some((c) => c.id === picked.id)) chosen.push(picked);
  }

  // прогрессия: каждые 50 тренировок добавляем подход, но не больше +2
  const bonus = Math.min(2, Math.floor(workoutsDone / 50));

  return {
    goal, scheme, level, limits,
    log,
    exercises: chosen.map((e) => ({
      ...e,
      sets: e.target === "mobility" ? 1 : scheme.sets + bonus,
      reps: e.target === "mobility" ? "5 минут" : scheme.reps,
      rest: e.target === "mobility" ? "—" : scheme.rest,
    })),
  };
}

const LIMIT_LABEL = {
  knee:"колени", back:"поясница", shoulder:"плечи", neck:"шея", hyper:"давление",
  heart:"сердце", hernia:"грыжа", diabet:"диабет", asthma:"астма", preg:"беременность",
  varicose:"варикоз", custom:"ваше ограничение",
};

// Непрерывные скругления, как у iOS-плашек.
const R = { card: 26, tile: 22, pill: 999, hero: 30 };

// Геометрия сетки плашек на главной
const GRID = {
  gap: 16,          // зазор между плашками
  editGap: 28,      // зазор в режиме правки — под элементы управления
  rowRatio: 0.84,   // высота плашки относительно ширины колонки
  editScale: 0.93,  // плашка ужимается в правке
};
const CHARACTER_BG = "#F6EFE9";

// Системный шрифт iOS. SF Pro подтягивается сам на Apple-устройствах,
// на остальных платформах падает на близкие системные гарнитуры.
const sfPro = '-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Inter", "Helvetica Neue", sans-serif';
const serif = sfPro;   // серифные заголовки заменены на системный шрифт
const sans = sfPro;

// Шкала типографики iOS 26 (Human Interface Guidelines).
// Размеры в px соответствуют pt один к одному.
const TYPE = {
  largeTitle: { fontSize: 34, fontWeight: 700, letterSpacing: "-0.4px", lineHeight: 1.12 },
  title1:     { fontSize: 28, fontWeight: 700, letterSpacing: "-0.36px", lineHeight: 1.15 },
  title2:     { fontSize: 22, fontWeight: 700, letterSpacing: "-0.26px", lineHeight: 1.2 },
  title3:     { fontSize: 20, fontWeight: 600, letterSpacing: "-0.2px", lineHeight: 1.25 },
  headline:   { fontSize: 17, fontWeight: 600, letterSpacing: "-0.4px", lineHeight: 1.3 },
  body:       { fontSize: 17, fontWeight: 400, letterSpacing: "-0.4px", lineHeight: 1.4 },
  callout:    { fontSize: 16, fontWeight: 400, letterSpacing: "-0.32px", lineHeight: 1.35 },
  subhead:    { fontSize: 15, fontWeight: 400, letterSpacing: "-0.24px", lineHeight: 1.35 },
  footnote:   { fontSize: 13, fontWeight: 400, letterSpacing: "-0.08px", lineHeight: 1.35 },
  caption:    { fontSize: 12, fontWeight: 400, letterSpacing: 0, lineHeight: 1.3 },
  caption2:   { fontSize: 11, fontWeight: 500, letterSpacing: "0.06px", lineHeight: 1.3 },
};

/****************************************************************************
 *  ГЛАВА 3. ПЕРСОНАЖ
 *  Изображения, иконки, экраны образа и профиля
 ****************************************************************************/

// ============================ АССЕТЫ: ТОЛЬКО СТРОКОВЫЕ ПУТИ, БЕЗ IMPORT ============================
// Изображения персонажей встроены прямо в файл (data URI, WebP).
// Это нужно, чтобы артефакт работал в предпросмотре, где нет доступа к /public.
// В боевом проекте замените значения на пути вида
// "/avatars/characters/female-slim-start-front.png" — остальной код не меняется.
const CHAR_FEMALE_FRONT = "data:image/webp;base64,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";
const CHAR_FEMALE_BACK = "data:image/webp;base64,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";
const CHAR_MALE_FRONT = "data:image/webp;base64,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";
const CHAR_MALE_BACK = "data:image/webp;base64,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";

const SH_BODY_BACK = "data:image/webp;base64,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";
const SH_BODY_FRONT = "data:image/webp;base64,UklGRtJFAABXRUJQVlA4IMZFAABQugGdASoAAgAEPkkkkUWioigR+kxsgASEs7d/aJrJFe95ZITFukOlXOL8i+acLnJ69E8u/jPOV6uP7F03vVI4d/zPysfNPuR4c+gj55/CciD1r/P/aT1K/lf43/nf3n2rd5vAj/NP7h6kceX1/Qh/T+Jr+t6N/oP+89GnJwnYf9bmRBNZeNtRhl421GGXjbUYZeNtRhl421GGXjbUYZeNtRhl421GGXjbUYZeNtRhl421GGXjbUYZeNtRhl421GGXjbUYZeNtRhl421GGXjbXKuJyZ47IxcZT2mzz6oP5TJqAFQryQk0npwtvztgvAmptRhqYzR5EVeKo129wDxTgbL3eR5wXCiVpbzYqnzeK46RXbl9YtiK6cvFe57W0TKogHQQXExaknqhY/jNQqjbtZWXfqwu+maHO83YjgJrKhReyiEK1jCEnKIDaSGXuZgAdBbvhzq6sypjpkhhwAWnIx6WfQFd3kxahcWey5bekBAhPlda7OR41nE9axHgy4ZePfoPcTOGgB0Fu+Gc7JmVmy1QUvM85EH9XVhnM6SFDQp/aKaGWh12Z47jdhNbFt1f2CdDgEA6CFUV6HZqIB0EKA9AgP8LC2MMOdBf90wFgS2mtZOUiTQOjk2lni8fCI10KUzP84TDp/mIPrkZtqiZaEY64ZeN/Mwr449BhbdtaFl8o/uy6/uwa53n6AsF1U+8rxO6KA6jo9ZksfnFg+4KCFvK2AdBCqIEsIIEA6CBWF0OCdNI4C2YW4KSXJl/rAVmmDA0Clwh86GHeTtscSCb+nPRO2QLmtWUgzQjMLeOq+LgA6DZN4YAOghQo/yp2XMk7yH7NQJwUThWciHB8uUa2rxbTJKY5XkA9TrzIakPjkbR2Z7Z1WIpToTfXzuNc8JM5jajCKldwRsx1wy9nffQslFd75AAOxKg9eBtkbHnaTxNBIdVNflXhibPWWVTpRzBzxJLAzc3KllbUAMyuFPC5QMX4FyM21aEqaiAdBWWko6lHPHj9dC4FnD3isXLIJ7xM4EdqyVvqPQZ4mPYjzFS7+AZUiHlCZqPFgZxcCju8uADnj4Oy8S3IauYeeKJz6ThS1Qi2gI8siifetTzi7BtrzKsDBU1r0oDrbmCXYgG4DOLgBAxgwAdBAtka7O//+aOfxwemPTQrX25awbNjToA99ZMn0hmlMUXfBdFLMvOXTaZo5FcDIh2VlcxhMFFdK2hMvlOOcBNqHK3wLkaO0N8C5A3Yih8rCT43o/wk6kDouAPgFZm1tDWEXGQlRdnWsHC3n0OPoj54CG+9rqETBvAElgQihJaAOghV9BlUQB6Oy5puuY7b0He3uicuLB1vAcjP8wM9ksIdLUUbQ3PU2QaY5WeJUnyYZY2AMLoGxjzME6GmjKDPoxIHQRH6idAVQ/mw6374CZHJFyCCNH62AIuwNHIfVs/CZd7X1RBNM+En/Hm3oi2LjfSIPqCVTSeF0odUKGE8RQMHuP6atCae21GLRfEzf9OMwEFBwWiL1mwTHyFJJEInQYzRXSUhUetghDKa7fLBx7W6ccoSe3loFXg+JISFdcdcNvn5VGbRXebubTRnI5KNcoGazYo3FHYYoWyPBUIRKaz58l9XAsy/4GEIubYA/szkzzXfyUhl7H3uqjN8SE21GNwDzdCkfPXYm1MVgPnZLPUBKETYSjHaOgR/MFvnyjyCIzpdP5zWkuGLphPdVa9zfftvoL4fF7dISl6Vm1GGZ600AdB48USJ6Kml01Yhbp6m7lwrRNcdK/3S8f8ZMgNAD9Qn3QUaAcKkmnmptKMtp9ejwWuMJ7yELAbrYWk2X8MttYHth1bvbCy7EzvcSQy9zMADoJH14YnAbPf7o8C6I/S/67HZSXWavXrOM4p3SAn+/4txhwz5fCNSyaC8elpPFmeK130yMmAeNRMUy0PmnA+bRiBLNZRVEA6EV9Azi4vSLVRUv1bjDU3LnymhjdsgCICloxF7LpwZ21gNELw96A3xGkDn+iwZOCu/OQmcj7wMpbDoLEJgdYJWgCGN8Ax8DDOyoDjYcdn/Ha0pa529ivgQWO2LeEtcuu81DgSg8iKoxyX/aM2kzrqq5SvZSl1gdVQiUlM/zek09wPTc71qdAE4yg25byVO3Y5eFWXvGbqo0O0rNtPu0P8WDFT2JIoiIJb8e38nFsgua/W6laQLXgtKxBOT8vhyDUB4SI4aYMn8F/6cuWbbxV4ZeQ7Ss20+qOKFeCNNOsgj3uYZonaHMtXPKD5hpLQdj5VPb+Xnope1zpwH6Asrg7jJV281bsVhbmpJ1+IkBg82P77unejrhqkIr4t/i1Gh1xoJrnST+VRjQt9+am+ck0V2wficETTBpAZVyEWrNif6QLqTq2OGpY7Fa29a+0JLa7IA2bajxvCMMyeMA1jMTX+KaO4sZ9PE1CahpfI3v1ORDfSk+3K30vY/Qi7l6DS4FDfUmPBEMosT1qYM3doTjVm2rQjHXDFLpguH67HK5XmRlFYWDWHZcZ9sxkZXH4OtJRuCJ/qo+87dmy8xYsbT2JhJK1MdJ1mSFlqkRUIrNARl3BlwzPWmgEBVqGRZd3JPGk/XvFHiUZLE+VrYy7SutV3TZV0tWRPygX9AfZJhveWNa9Pp2cx6OaADppTGLqsec+ZpRTeulZ1Ic+uj2nhzjcNRAQMWuGXfCWh8xrdKoTHp5cpOPtGdFzNHrzu9CkhIOlm5N+3aEy9HTBIePUn74fqmvaVV24W7cIQEx7kiE2iu2ogEibKpouRgiPJtghUv2x757gVBYS969WfMRYET0n6jCm0U+yPPD10dkP/96VvjAn1/U0Cu60PpR+MAxeRQ586PAje92DaQ8Tr5UTqBIFDnn/aaK+5NBhXXHXGnrAuP6r1RbAAGQcU/aERSMCEMFWWSSpYJ4r64s5UwYj93rh9nmz3fS+nFPxyUXhqVmoX0p/u8bvI/YqQuAEKw62oxJsY+ZFxILJBR39KLV61DHmmu8qAQBPfv12O49tGbSKWs4YZIC8GeaLF5h2ssvpBm9wrBPrbUOd7Oq79tCnW1HjeEYZaT7TPerXzx1TrT5ezsg7jaBXsskDeZWGlmwGYCJoewQ80HOd4qIxjexzgID/8FXWcLCvr2tPPu83gKA6CGFreNtQKR1Mi9qBVwtxZ0jYF6xwP+5axTMm8n0KlSDWCtMHxvS0GMWizOqPxjeGB9EyvjLz5tRht8/KozMRQs5AM+zw1N7apRD6wSwPzwrwpu9bYnzl9JsnNn9gpaH0NH2qz2ndkwurhl43xITbUYaXh6MtyH21e30wmPnoVx3TM6lYqpOkh+YqrSXxNjnYd4Z31nCcXAB1CMhF6CFCQ1Nn5066oXyzsCsvV3r/XtOVCQ3+yTGomwLaAFZf8Nnd+2zCuE0arPwM4xkJd8XAAx+zBoJb17XvvgA3sL+niCPNtoPanehldH9WRKjejQSjtnmnBibIfxhYGcXIdt8C6gBSavDmHBfbQEU9jhRly5OfYyG60pBzbp3PhUhzvF2NB6YgwIQVRoSN4n7Xet+xtnEu10yQ+YADoIH5b+5GbaffDj9cd3dqNuMd5xLq2yV9r5TiuBvdK325zBYYad4/6OsgaTTUEb0PzDl425bO3XHXByyE0Xp5+CZWZ2EeQwNCfdpLI8xkvg8IWDQG3uBqgkrQEDeMc7LxTzYe4uAJYQQIBwGZaW73Lbq2FvJVJGMmIXKGq44JtAwGlZHlKxpnQ0FwnqOaVBD7fD1ZtqPG8Iwy216X4Rz0t/5W3lf/p2hSsHtHeEDeUSuOdqoRXrjwbhUDiXBhl5DtMHEZtnF0JIkR8JItF6A6Pjp0Fnt6mSwhOSxOCk0bRb5zAC5xAEJDUYZnrTQB0EaWGiK2sRU6aBbDGAdDrmX62BA1oFOStS67eXphNWP2WnekEcdcMz1ppeAHO4CntxH6V7HMvLRqh4LIdXWP5AFGXbyHLSwCoHaWq3lwAdQjJ0OGXfmSdl40k2ej7AXYcobAxL/nqwgNqrwhLwLHkTILAuRnAQ00AdBE/6fVxhx/nmKYCxtm4YPqlAMY+qHKVGgawsu+LgBAxa4ZeNn602btqrRwvrRaeKhvU9ezHWDNIh7cEAKcFkppQ4Y+0yv9yM21aEY64Zd+duy0+N56MzoAZ4hO1uoNqoFO5XbapjIfk0IEGB1x1sULmVRAQMYMAHQQIRe5cPGpLXMi8q+wqGDbT23jb8CmIc4YoojnpC8WAA6CP4yjNtP8kP8ZkATNmUlPsJz4L3QhkRSEQVwqjekbJL9NSsYV6jkI0Fpsmj5oYo0nFgfcXACBi1006BR81uqEgXO5PP8CLWv8Qn+64yA3r7R+8cZ3wDfzpaC8R4KBZ88YjUNo+r7WiydzSjSwvsUOcYoGcXAo7Q8UQH8JCsLZcgWuZkS2Th5+zG3sqHcobwDLQosYn6/q21qkESK6b9d5fd+6vG1P3gH27yaj+THlHoD3Fv9rzDqnavUYOX92NDLFx5hYtaMCp8UVNkcTdisV+s0VhWOIAG8u58AIUsKb2rgKhM/2CQoKggMJx5LYjjYqrqozfsGUZ2ia/CDNbN8cXVR4SvwNl+R67D2fsnk86MfzkJ4FzXMW+f2EI8ScbCdCAx7Wva+IEWZuPRPvy5E6oUyXGvcHRQ3Izbolbxtp+CK/p4fd/mNwTQUoCC2j+95TXvX8sOxBqfbsmakyMztsJtAHUyYADoIUXFRXgB0nOWfm2oxtAAAP7/oKiq9mqKIdAAAAJFAAAAAAAAAAAAAAAAALXebBJ9EHNpVdFpzs0iZEDlUELLjfwOUu2DNMNIoBmu27LtSmc3Hv4eS/Olw9gjJJ5KXtrKiHY4CHDejo/v/xYswCPo6/qd1HO63O8wvO9Axocru6CxS6a0xEUfecgediXn5IoK+eXze8inkK0Cv0SKjWQYCBhlX11G372c3IVw7rxtkDC0zWt38YhhoKhfLl83sRvxFa8r28QNHe35T0JPPGY0Oo+meZI/IZp82juGSwN4pjbtLx/y48OQzTY0LtGZIn4EbfvcCL6iqnmiLfoGwWKUn+P1U/IhfC7zOhewqeaeKx8nClBe387ORDASIvjLlO2wzuU6k4j9VTSqbhSc3YggKaL5DJX+bR/3EOviM81hOphZV5dak5GvtKq64gZcQO+cFxqcEcjXSNysKYAZXoWvledgFEesydYY2BwImM09PXbc6ZkpXUxhXkajVx7fQydYTZmYCgs2fzvsG6m9qsdjZCYHiiJ5E0VgFp8tEdapt/0tyvYVyAZ2ifxYlLl2C10NhU0JABqqYGLXMAABh5iel8u1vUwQyjrlgrsjzrcILBtp2BzltwSL7LrsXKmIip694KkPYKcnCIqQ2CE1yuPsUmrm3DjEw6Nj7K/oNM4gxeX/CcqFGpFgWM2IHYTQ2CEhk0azsc7p0oqfGkp2F2tPWBPelQsB0bNqGy0JO5g6GoNVsomHgMkyS58v3HLLtKR7vvHbZekZIbtnrMNPXxcE6P0ymWbS2VAygLdjuGb5s9PrKHfuu4QEhFBfifoDAPTeeTNJ0Z7YRnKFjIshWGLdLsukUZXxiFcl+telECkY34IK1QavbVm5x2I77jOUsRZtFTSx/K8ZC3JguEY3aVO++sUte1u83ZDovduLX4Z7ymBjx6Fm+q3fhtr5SknjWwYcgPZO45MwCVK7V6viw1r0dm7b1d2UncCPp+mqurPikul3Mp5Z+eZ9xxG3lGRGbSoou/O3pTeLo2K8sZjK7ewHwmYlj8pZsRAq+a2otHMIFMwamq07dJOyuMcj1CzKOnXbgfEFlL5zpYNEcr1ReDr/1zQJZnoPlOOnpoMC8jXhUg07fwxMgYdhFq/P/H2zhB2zmRD4ZyXbf/GPx2TRQfMsd2QjthRjS3k4yQpL2xwLuQmJvuxFeRWwgDJA7zQ9REgx5jlRMqoakmZl1XZen/1+7rLmI2G+NuUCNT1ekEuBO8oisgVCIfEMfTLKB3LoI77N6MsKrJd+PMg6zj0l7jMrjjXMC9xbvWA73L1qD2PSDJaaWf0RNN7mcEf0LJarxkKRg2KjKfJEgnw0drP8EzVa3paZj6jU9eWSB57QZSZZqRTNZq9n5KbcCqbGSZHNb843r5/2jeCdnf+ftle2fLpOfkpjVW5J0G43vZV+rCf+zyq0xBLkZgXbXpqvqdYLpj8TPlfKQgXmuOdkcGaa//HpgAO2RgXHQWyJyfoMx9FywNrF2qnv4HlB2VxnXLNPngkUMq0SgvINT8eOmQpkqXPx5m69k1s82K4ZKjNd4B2iFHdpBkdldNPB8wtnJSruJzrRIVuzjlLZtXJ+LgdaDl2oGXTPh6HD36b+2gbw6Qg+RnmlgDl4Nev6FepzbbzDI1qpRQaANMng0T33HE68LRoj7HADHqXEieughG++0TKBSN7oxb7cUtyamw1L9H/SV64f3aWIypc2jIjHQU/McaUwFZcHdL9x6zYVF3ZSthAlyZnweRvKK1rzUXSjPUKGDabf54/lMblpjecxJxvK987KZPa8qWRbnDjqKAInrqyJF2khi9NdoJiJiDwz78SlVzdHuNhsz4iJFHt7HmEiP/Qj5enRfZJjOGwAALgcfhRjy342pHwX/hQgYqIARdHKoY8V9cL6Nr+jzXsH0eKO1KVRWZUaRWRFkVkm+ZLIV/UtwAlTYz5pcEzM1iLu2rrSzImqHwXuYfNlXKskilHC+5waNgBqp1NcgenYP/u/wtAZlR00fav/xzggXOMRQYS8xVmhv8bvLkJZ3QKU1oHxTQl5bMjxYFfsFibDxbFBTadCTGm4eGj2YycNQaN5juku5NlA2Hq6/J98KgRtFgnEtVlZxOgtGFp+cnONepCVBI1bFCHMwK1Ru1tYD6DiLg2fncLfRkI8P+qNeM+CguSSPsPrYmidvWib4lPCyno4Cz06iGezn/lDKM9X5r6/tMONmxDaDWrFICHvPXee4EsUwKaKiDH8cWYNjca0c9x21Lf6Y4S1Jy6/2RRfnWZFlB59KxLF3tsWPw5oEB6PE1SdGO3svwsUdFEeiyDDERLBNeFQTpI0O5r2eUkN+bwV43nyYjAyBEkDLIpJK0GzVNQdmplFROHf2iithCGeVmunclGubfjcivZplaiDrc0FL+6MWDbp5vWg+2hd4hzl6zQithmN8hX4gn6HqtEfjBm3oubpz0XBCmUpD7oatjiggT1W4rdJqrCuZZYisrEIQztZDXojr+jAISdnGo6wE8Fv2nmQJVv/l8H7Z7veOn5UjdBfW0cKd2H9yJ57KwKxCxySfcWMGT6k8XPoXUtGlheP0dhQrOuxvX1YCNeWa6mBqe8PYqglXo2wnxO+Dy2Cj64nUoPMln1TTM49xbksZAyhwSMWmyWlsSPimUgyzstyGXTDrgZub0b9J2+zpA5eSQnE9e7xuna0Ok5SYuEtb/KJAY+13iKZOVPVm6ls8N5OfgnpZwe/C/JbdyGcarTQ/Igh3EaGiiR3j3Iv6JCKYCOiKl+1/g9mCCc6ltedFqUs+1x7CJd08mWGVYf/blDzTG4j3sLVl3hX45Q4XW3vH0rR0lSLUNJPXiLAxHHoWPY2xVJXObX6bcJpykwMiF802WEz2KB/wT8PBiU6zFx7O/TurjhkbxKw2soe5sI/BykkPXAW1Eguvt2iAM27RfLHeKt/6PD8fOXefG8lNaxyGIHui0+crQggSdnyLdpPeJhEKDDC5P4pvDxG1bNT4zz+tPALF6JuTbaM0I02y0CsjHe+FBswLUs8hGAmukosLkMCd5qbpcAypDd8puVnyfikoWIy4Aqv+xyj3gUV3YH9f6GhrEv6dkK1ZoKk+gctf9St5aKabeZB5VWI2R52s4lChhG4+WBHpdZFRypK/BbxMyizslGKiE9mnmLGWUM46D9H3MPBWNjtVmOAxXyyozZkhxMRNWwaYHV7/ktsgWqntwg3z/O6BGtn8Esv/PrWEtx2eKmRmNBwOwhCW1gPPrezAAAETFky3AgELnpKRWlPGEkMT8Xs2hHAta++uV56/phQqrgtNqRN+v/01+0+3ioietox+IPMxhWB9SuVu4MgmEsX/w7FakxU0j6Rx1faU5hqZP2BcYB3L/UohbL0sbE85vIkTp6kss3QgNV5wh81zsPSBcZW/HgoHzs3R8aHU5FhGWz451KLHSGKT9aYSyFOF5WgOIwloqlVtfHO9rPNpKhzv+khjCEfaJUtL57SaUF/LZ7rj17+NSOHNYDN8EKlHfVCOYSUXHtdVhGufPmNyl2eLwbjKi//ZEAfIukzaV3f3uZ/vfVb7mtY+LEKp4mPG0saHP8q/8OGGKbw2gnTtw3/QT4iiJuPpMngaDngCH3Ayarw9RilZlATYPsLu7VN7oVOtELFTJM1b0H1iurdKlwurIdd4ixZs9y16EL2ahGgM/O2EyBepC2ABo1c3zEii+1bMU5qroJU/uEA8oaQQBOBUzX8+Q0CR7KqmFykukalO7kS6Ix5UvBkgizMW9RyNafETNK2t6Uhn7Yog105xKIOGJPGFMo+4jeO+zQCKqoeYaiLRXZCJJnqkHo+XD4DFrSbJg7P2E6ClKqIfcSoqQyNl/DKrfm8mi0x1yfX1WjxxrzZt57U7qKJKbF/mk8fGnuAbJtqguGIYtJ2OM+3gY/Pf7kcXudWSYAg1mwanQa/rkZnH5U6PNkgVRbJVouPXP/qERtMgowTEFNbF7wOR/gardmybUKG4DmGB2NFK81VfFmpp21tDwDGtm+u+m94MFOw3oaiCYBX8b5EEsCX0A1wGBwZzeSObKxxYKNk2INiBUW4krHbghTCtK00TowRH0qOvSsT5D8S5Dc2LmPmJ9+CR9d4Wei5iYlDMJiOtd/1zRXIIESOYLDjdeT/7I5VGYn+zKaaXnRJobEjSZKitKB3EEj6+kxiyZh6XGSJ0xSolrm1QRNSW/pIlD2nAHOoL867/4CexNU8wFlHU/ZGWeFB3Cdpg43hxSZPorD3Igcv112eNmNP73A7OYjZwiAtCdomfkQi0dOlBHxhFwIYBKF3qddx3xFtf74kJdSTABvzKwWAMU5hvq1blTX3GJM+PwIsz8nSO2ZLay+t6iysExNo+iMY+vSd6CA6/R51bPZOos4PQ0BZkkwAxleX3nhK9oFRGKvgr8zg4tY27QrX5vbo7oEG85WDFJgFqDj+wOxOfxYDJl4EJgxD8PF8Yywu0c3TOdfU1yzarX3Qbqm4ek377UuTMzEY3Z5utNhBqC+/jiziP7eqYl+BoVV8l8fobKlMBFMHifZfq00X53D7IyqZ4dFkAeSiyz1IhGsZchscm0FjD0WbgJzwiWgrTm+DFi7vBcgKAX6+8qjrFqjUOuyjXFnqe6adnKwPel9PyMMlC8NihE9sK4kG+FdShBEvcPUUpbkR59nh88Jwrqv1mZhlyMQbyMzJ0YYR9acDLujNBoBe2fIjnaGqRh77E6nDMhB/DqDU6RQ6TEo7RK7qBORu//W/836+bQ9PK3iVAmH6nHsp2Dh3VDysEJlN1phjktdRlvxcXHuZfpgxf5fwI2xRxpqKJeuTI+tjyQQLDkM3p4HV+Fi5rCwZowjV3vrs1cFpAqhwF9AdL9mUI007vI9tACAnur4HN1TPVv06mKJiSgMCfYxPZ5lAnpoyFTkugo6mfBhGVBQkbJ2YepwgAAch0uCMiNDGUC8Z5ophPFVtU6jMU6z4k0N0yy4/DRi8PfW/E/wFli8goatS/0PXb9LwsMc7iKR5HnWC5AfZwqGZnNNcaw1h4RsMV1s1g44tJCGuPsCFDrEtQ+I3xNcRpUNu4MN276ovyXKaotTzSl++xJ2fTmZ7oaR0fKsKb1BJdISR4U0fkzqbpQpozOBs8eBtsD6j9kKWAv22xu16i6cPs+lhVF0ZmeoQHRwJL5il3q99l5iiKZK7GMW47OTUA1rTgGZQ+VIm4+0HCqC23bzuOoFj7mcM6QK0LuJ3tTmeUW8VhIWxjTC0MuHZV8T7fR2hHhRhVQlCiY12SPOVIKp0RGcY9M3OuRLrg3sjJB8+0oXB3F1IuACjzQN2cmbd/hhbie1+ekJHWc573Yz02S8fbtaBwZWeqZjToGAbAXrEpAr7zjiy8JQICWvxa8VVEiLNC/tJF28q8M4AGLtBx3XvyIPp3dLkHk8g7hoBkPNs7PWD8Wgu0ZM9KaXpeGqe1ivkSaTYo0RfokgEjYo1B/epuaOTMDh7zxOqQCMHZtZG3VUXHqk8Ir1C6KAmjacEtvtywm3dtXmJzWjb6mTafVxEdyF0MuhMz3Jwgv906/EG+Elr4AwNa/ftNhYByuspHNf5nTd5Anq2P0ahs3JLH+/cIvp4+udhqRN/JHLl4rTLYTCaOeBtEofDPDmKiFkO6wxQHjxhsJUdMXVlS16kzrY8dLQHNvK6Dsmc4rZ2WmrTlArwOCqr4P3pVSFss7nRyMumJpqzS1I3HxqNm+55gNEXpcvbESikr1f141XowlR4x8r9Zafb9qvCKiKz4VnD95GDvcQeYNIVf2ufwwcUeofkPeCkjMRFLu1sLoJbB3pQLqo+tJuT/E8mz25MktDDGvmvVZ0KsYfHcdrOsipC8RXm4JsTXG974SvnG9h0h8UPrmjkCVGiPY6OiJfztQQLXmBNxoDcrJTfADZaqPr2Ti/orQcXl0w06kJ3uAlw6tmAeXPt23eGsnVXAIMt0BPiQdEeiTvh8Vv8iCsgRKlOCz8J3QBwiGMp4ox79Xcs9UBQxbp5v0pcZ1DAfzbQKKig5A3GrNIN/G/Nbr6P2UniGwlSgKntJiAH64V9SIpN6zhJZyMfxjZVfVe2hijHj6gqA7/TTl7mOcrtcrarsMvA44FxeWC0KQTe7+mTaoP4CHYC/xeJL52Q/ErD4BomjOdIFqMGawcASujcqu+UCXTo75k9ab5ipseDGyWJe3mg4xKl218SDeguOmjZD0YvYJJ4bwYIg+HE8ZpS95umDJb2BOp98lWnnF1yTOpatiQcppE3dn1jxkqH50qPOuqpr1X/xaYD1PO9WNqKMgq5oFqa4gYUjWLWKAVpPINRf5xBewNrNB4YHrC82ZPjqOpUZNGAsYHI4CkvK24C3HtMX0WPX5Q1IGw/TId7UdkBVdeoXLnDUkV3CsgIfAMJnM+jLPiFzupq7Ek9Ro00YW2OsMZAYfiqgeG8XwhHW6PYNTZ95XeEMEQa6yHYOID+Mvk0lWko84axpc86325ImAeWFMJleizlUzqYqwAzOELthjlOknKONTiEAov5L/mGbajAP6fzaxky8nusVyCNZW2G6o7vYbOQ8GuXmuI/WcdSife+QzYHrIr3jXRVzbGKvhM2StFf87uvdFfePv28TGToLUpPniKWe9ES8LejZ6YIeCat6TQR6BZzkYI446cMDOE9BVDE6BDe65M8SVqTYvIpnGkgwegvQjpkCS+EHI1CCRQFU74bSr8A6kd93R3hH/hjV8+yollwdnRLLXt3ANIvEO5fg8VVGTZI6//SHpCjJgK6KeS1vCVZBwx52Cj57GnBDroPCdzi/i1j/W4pjZO0Xxt9HBoUd4EZY7qLtYLM/do/oGlawiCP+vFM7JBdKp3vgZCAXFnnSZpyg+gsABAqn+6l2LbjlVmkA83UEgc03zpBjlbbs5DmyNa8/tX5YdsCqpbSrzoatDza+wVQNbOvm/p0R1gHBWH2dNEKk8ZuFyKeB8dMO7P+Av0gSDTraPL/hMJE75eaeRGZpWzF46YibereLTu2ToMxElbM2auxTBQi1Ad8zqYzYBgkMTAGT1LyB6mb1o806wiGQ3ChTX1rklybp5qMedf2C0T0xMJqxX45WNzIaFbOl9WAgVSgz2MS/v9izR8LpLAEY4tFssrRiL0fpvLVqmGuRPb30UYpTczM2SKyIJO9JBAcfq96kvQZJ/fQW7g1slN8tpnaAVxgEAo2Jsh86a30cIB2uxe2KeYdyGlK0dJEQKmTKK/LofjI/CKdvqV/zirNUJ5heMnW7HIG/KLg8CBgz20Hk/RJE8uLRGNW1y8drFdx9wTBx3KkGRAN0EMq2Cj/0IChgixT3YczXGjU1KqrZ5h+86nNvTNMnxAPWxNJsTyY5fAmFYURmXyjM2Bd/+tvhijeD3g2N4REGPomNu+BI2HV4Nku5EN+qGVP7jZvVHAMvy1M60nWGBXsx02Ifo3oYqd6tHWl3xxBVWaDfXNJRvVzP3tyb6HtISeLuDUqgz5QKKw5ftCBrOZwnBmUD7WoVT+obKTa/QRCHnxVdo005Ap3DVoiSfhEJxW0XCITW5EFRUzHMMuQTu1TtgGZh/v7ko5aMZj6qzGCxT/oHki09XAh02gk6vkqJnYaGbgw1Xipka0Lsf6MMqRwTjNYBv11IH9bwAAPOxrcaOm29ptjeYti37grczdJm3QEDNM5f9RMnEvHUC4tfECc0B7w64KesLJFMoRbyLWm4MIXFXiQ82RbPV2NuWaXBQu1DSNxkD+OxzeT4GpPOSvJa+7G3f4LHFBTdJREuwGrrBjxfTMGIlys+trxKESeJ+DFyAz/6suI9tKPCv+oLJUe0JH+4l9LQGvUhzIPH76ydbIjgsuESHbO/PrNyDiQYH5XSJwCrS+6bndbTqXOjgepWyFI386GwQTqzZmIvRiGVp//dnkkfLSSZARqlquuOn+NBnQsKyuwMCloCQm/JAF4fQGHOfn8lvKvNgomO0dsTEVSpyllqzbRa5zOaqqLYcAqi6qQBlWeHfcuZmMkW3Z2hobPf4JlXD6DfMM8xwEKrumf8HfJ/Lj/NPIukeNBg25k+0Ka3z9onT8YkXFH8QIrlkslrbBhG6cWd+IWjEFMtf1a/dwzxQWo6bAUOjSviHmJFs57hegYmkoE9eohQFRbpRS8K5AjQ/v0T1CfrIrZQaJF2gqS1TPGQ/S2f6d6T6EXyqYJUmsKmwMG4MoAnFPcBB6FFruHZwnNMICCHBhKnaYOoE/OJeXrFOGtmlej4OdxLJHt1b9gEftB9eGfXc62OdS8OjxxNGzvh2qZnmT7Z+k4qxYLBKQgEfBgQEHwm4QWgdyrfaJp9asIb62gpt4pb0TF5P00QgbRKA9eArcM4FqWkc8QgTs0RGgxovFGoZN60ZSgNMkssNy3Vg0eq6iCKNWsMNxAWBgUCPcexONuj2WJ5hWJmiae2KpCLW848AzADtSFpKRlGOTyiWVb1x/gBIhqmoLuhoe+uZz1wwwbQmh/y8uOIeOMDK9LPfEA2zcsGXJXJHkLpzZdlFux3VlfjdJ7bj8B8k8N72bkSM0H8BuLkfgdK7AV253fVsTjpBZBCiCnM0oBO85jznvFWKq5YbIpfz5zc1zfCT2keVCcAnCuQLtnsr8DhuVJLChFHNjCuVJxy5D6sstj3GjPcqI01L1U5XZLCVdn4QIMSgKIyjFrP5xHbpTn/4bx+rsjT3XaR2h42+Moo+1XwVotYZF/64Bt7YBfuPQcEEjQVOizh3hDf+0/uTrGEL247NJQASOQjp0onrC0sJ43cAP9PANwSu2EtzSLunsQplajm/J1HZOpIJ9kds6o9DAi6/3tk3XR6cKhxO063COY1p8OmSv13K/h0nxshjceQtB9L4/eSe4bAioDkhnD/cQKu4mlxVD5FicLQhwBUGG9raifaHzc3u6MGUKDMo5w3+mM/IVPKoRzFkrPkGS7Fgi2fYTp6LDh8EsobVDiAMRGqd3kz2Y1mDtpMokao1WwDmiAX2BIQm+quIWiCC2EXVtcxA92puwAJ1aPAMjnnvyYplVJ9WhW8Yq8sNk3QXSklwf7GFsKtpyG9zbq4oFgY7IstBUCUzk3d10/LSVKbhHPXNVBGCYyOY6A0AYKLbsw9g/M3FibjTtOd4TPAipGs7u9bfpIsqrDh4QQn+Nl/iH02NjEJ1paX3eLzrS0kSxvaoanZjoBNl/H5UNCzPpvFIN6NyuduxLgMbF/rIC8Djp66vSc5L0fHQglPKn0owgMtmfkK7MC8WMPpuqeYcPy4lh2MvlnxBTkQypbMvO45427u3PG4FbZVYlbRSoUMAnWcQwzxxHbdpDfRw/5TYc1Snfmafy+W1kM74iEbZNRv5VXlYZaGILBO8frjrHJZglSPhfeV+Vag3xlt/A5x0rB5xpbEpyYV1lajWxvDksxmysmq0YnYKThWtvsWdcejbyA6WiVX4jv2gR0SEyy8Tsmt4/hvcBdh6Vw+9DoMNUGsEzKwkCdsE2INMxIgUnefAKrHr5ZRpBTzc44cTOmsOIQFmoUO7fo9+X2fVlwjte5bRVy9Ya9S63BSOnKRY7AtfMECIjWDiRRW3OhdJqVz3PdH6t8HXIgXYFITslQSayuzrtJN+LYG94k/XkWuDaHacbDyInXscFq2gh3LpTlcZUC8sb5cUwkdNCSbCh1M/d5+a0Y33ABBV4LHAH2QnuMLRkG+z3f9lA+VUpq9FeEk04H7CYHpJERzT32PMn9aF116osjw/VgyDT4AybQCo4iKO09ao6lOf9rXe5AhpVECw0jUUm/xX45DwHfDYZoEV+drIj/v6NxhyAkRFSSBbzBonSDqjh1Py9qNMHDYMF7Xzb7QOaNgC6kyn4bXVte8WSKjV9ud3rKnxLCfuTx7LMr4gTXVQvDcM+iimQYe9DrmX26TfqTUlwgdfbTd8lV3A6tv+/4ReGSOFqOkohWiLbXqdCPOMCbGa3zFyY9msO/VpcoCdpRYC/2ldLelk5oQf1mVyWumcm3m+BcynAEX3yDk4fFg2OhwpGe1cAb0pFQ4YpvfMkivY72jLOvVg1IjL0iIypi9RE/wG0bubQhBXGLV1deNY49qw5DWQ0x0bh8T1UVLoz50CzwR/XcxTgmARhhfh27KPJUpJGJMMxgUB1uA8xGD54OgQlR8upbNQureQsV4hl8PCZaSXANnTqyZ/hxEa5qb5lAgQes8tSK7czdANJW6rn5yZ+z8lWhtWX91dT4E3zUX00PZs7LkAesyZijzTRifEJ9Nqvs8u+wEvfjF4+SOudz9lEmUzqnjkdaKm4MRYU+egUcJh4Nf+nmcJx+1IuPgiOrTEPr0h7wjcpGt5wq0cDUhG7CfOOP3pPjM8ubPKwzsg5dzUFOFApeork3q9PKgVDhbiOI/pMGvJlWorfvWYLvszE3oXyXv4dvMNWIjyvCrOJoX4TLIsPUiyhzVy7qmiguasvMOEt/vgxNQfOIaP8jjUFVAfyP0eWlepmdn+rkVQckGESeuabU2bX3RhID5WM3m5w+ZtLFJrgDxjyu+0/zviMgOHZmMDM5w19rEkqoz3mE/5RN1AbHocbnuoVLKVK6PXne0W7T0tDZqrCk0EEzBwNLNmN/QlVFnttextU1y6OmSeQe81zsphu+61AOhTJhTfDhMKMsC0KywhV+hnE0eMiDALAJT+lJtKAQYZOv3VuAJ0yieYePOA7/Wsu+0OxHlq27a1YU066z3QVy5Bv4FJNXqp3cL63dtll050NmF4cBVznlrxq78Avzxi1pi9ynoLSnOmESlCTJZ8ciaFoXOXMmfJymn2L5BATAaxPUV/AdFRqBoaZZgK5X/k/ds/+1skJ0jmns+sU/dxb8jhIMh9Uzdiq9L+UO3PWZ3fq2KWeNRw3ymXmXz+zpL6IM8aKZd9KkAXhQ8vulwwVTwZUUJZhIZjuALIrgfTWdsttQYFKOX81vqLHrzlXY8q82MWvVRdvyijvZzePnshyvKrFyFfkkK4ljyuFQVIZ8Trex9Q2jzGIiqVd6HZm/FpOsPAKMI44ST/zUNpCqzpy39zzZLU9C7XsiHJ7wsPl1B+mGIYet375UVogv31bHgVRFzhGp0Wn54se/w6WqTQww1nnXdYK6cNTI0kFt2PLIVcc7tkT3Dy2fwrt5I2wYUrqJ9Ri4lcGl5jqmFzLHNv12hcoZ61rQeVdgsIJs+zG/yokP8ohqMVv9m/82LGwKxv5UmfL8+0ZBWy/Wa244t3TfC7XG6gyMeLwE40EFa5xEB/OBFmml8NQ1clJuWeI3jgv+c6O9pYVePX5/kGpS76TFXQ6HSV51I/n7DMEnaWNy2jwEE8tDEPN74AZKJo7x9cz8tlllC1f85ZEqzpC3RnI+CUNYhIRhHYVvYUQwxevl5gKyjb1g3xu53ggpq2AoapyOriP5UJ99p92tbJZr17oIsxbuiD6wLsoR+b9Ll+UWsKYxEDE826Ix5dK6Jnyvn4nuH38kEIsPnbUq3+NWqqL//N6H8clgNV4/Uh/BQnzHVcSvc9CMX/ua0faEkv2OVXAtGEOxyHCmdPGUOTfe/xl2BHyy68e3Dk/aSY7UNUvPBQWJgnB4TSrR92yidw3lVGu3lUQhSxKPv9Lqa0rMVmA0d8HbuMOf8yetBHI+vQk+AwIccYuuBNg51gpTGWqUXrwjYXHHS7+VzShRh8wLZ3b/XLOGrCD9UxOGzK695U+0ALnb4hAZRlEaq9T5/50yzbglcH/mtlNNrdvF4gnWrd5b2ZHN40Cgqw8JqW8sn7vX3sEr91QzbXXHMQRyZz1DzN7uf+Z/EzylOp0juW6c/J+iS8smwTabZGhxpwCOtTe5D2gVBFYJR6qKqJgOqAo7257mgmsMgeLhHJueWRoAbSMykzE6bgJaDa6eoLHXhYmnZIemD+NDVKth0krl78PU1DPNuNr6Gze9wWJCpNlmi8bJdaREI4LmxQp/u6G+sU+Aj91DM03fBL+t3ZL6EBsNKkZ9FoXHU3qGu9165ip4XARh4QDrsL+co+SvaegrP8aHGNTtplYMoSu8niZ148F+aqtN68aiB9XysJr8s2CS5Zx7H0vL6a71IeOjngEEtjiB5CGX6Y49gdt3fUYWHg2LV99pg5Pfz+bzziuKV1zsZOL2kNyvmX6p/PvtbmznY+s/5/N3xoYc995E59APHMFQMkmSl8tr21WZa0Wud7N0WWYIlCWeGaIO6e2LnwstAhN8dA4AA5ESLYOn/1uth2vMGNQdjVMUS/oD8PWllCMb5tsk7RgAd73gypKnlrQUvp63tsj69aURDSGRF32VWv2UmHEI+fuetCkpaICT5AgI6FbjzKcXRq9SU5Hn83dh/4E9wQOp/APdFL1ss4z6Q7c22puK0wTU1y3OTNwklWE2DWmk01DS7rMes/2oZh4Wiy2Ee/LRS3FFNX0nj3+5XuFFAnjJwMhC/djcEvEGarWAVgd+vKxPbrkvg9VUFgamk9aW4nDRjaAC+fcEhBVPo2Kh9oZ27N3kePQbeT7cUckBdmKOFG/Hyyp1lNOsvfbqiFtLh5868Q8GJPPP5dBTKsrPX/4+XgLfseyhbrqxkWuHDUJlKAJXH0bzaAMiczTAYWYskorjxR0twyfqqbPE1I7wFRK0UpDSqcvBPoYAG45D2oT6hvYxDfVjeLCkUDmgg1A9N3XV8Ox3JUvcTm8ABd7+a82DMQadhtUtW+mkzpQOIwuo4zK9Y8++7lTzqbrsv7lOMyj2lgShl+IMxzadH9Kw4aWkRiuMyVtU/2kcyjdaJPtM/RJTbn2RKLnpr1AppO8aZqaICv9Be9xOAt868e2pjTKVHuMiLTgFXuBeV9fbTRyhttkHDvxW0gMXajEuXmzfYafaIiPjFV1fDWtCwB2icmC0GxZUDP0xuX09uoLu7uU0+bXMqGVMayvuLZKzZ6LYpDz+yuqwcv6yoVYsNi3nbCnLs2hucA+Kw7LUg2EGEBh40qcSs7LdzfdlkL3eBSc1/2cnRevplTLhT4weqvzkDnyovf0hkPmxJR2G0tGvgdew5zHCKko+rawdBeEyGNji/oEPhHsOqk6OsI91h4JDiqAgNudUpwUk/eFssrmia3KMMlQaaliZ84LYspa0k3t0MebrtzoZxnIPcec2j5bV6zXLtDU5Nd/34ActYZ6nLlgzzxddvajdepUpiN8cpjaF/yWYbbNakxmRIMudwZjhpTBxLtPQk4GhrGvkhOn7Bgm9JRAJtv5d3YSwjBqR+Dy3NTgDp12Yv4nCx+to9R9luZuEMKRPs/Y10p0rCRz0uCnLZZm3Lhpaf2EyYbqedI3D5jvhCn5tNEy7ARQB/UcUtZboMJPHwPFuMsqwYcam7/3B3oB42uK0kA+gS/nuNeiYXxYMYGMpMGkNDGmMofesvkbCEHLyTL7qV81hL9nF8Ihye/KdHz/uryOmYFS2QqhJ19psLjRe4a+ZAdmg6pjeVCCGT8XcBGwclBPMjVDALcxDJxIO5BGc8Clytuf7RA9QbDvTv6xQ/xo5PLsi93LV5Erny5RMqOyy4QJA4P4CpcMkzSRS9gb1N0XrHW6LBr2Zz1xtwfbLi2Usz/18mv+YswwtP6VB03KEGjvlep+fJKxlIFliTkX1z2JLoNtMRy5Bn0opVh2RJvV4rrCjQBLKlySvBAuaGgQYq/X19reszuca/Zm1mIMbL0EAhwylsZRihVprcwGAptAGjIrJJnx96pgN700xnWZf6ln3fQWQeLoEdo+Amv7ZlbQXrIdIP2USq205DIg3rttgy7u71Z1Ga005gcoUUQyYlH6eQmur3Tcr2JWh8gGNfK0XEkZiPmARY+f6HXpJ6+B9mDzRkRgk9kbCrEiV1FWN1vI9aa64Ya5S1zgWR9QyFiekok18+dPI6HOqZIyv3Kd6umgGMDPXGrIkUVT6VaeE4AABr69H+9sExcBNu29JIa7xotcTdHOWOZH1lJsy5eb6fJ5w118u1Oj0cuOZsbBBz4yUYXh6+zqtluB/UJfY2anNdz7M4SjnMgBOSCsTj5mA8Tzu62bB0qhBzmFw/5xNbV7E0F+fobH2wBPpPERczAv4NdlF/eDQ49oaDoc3AyPfmzJiVWIPBjOG7qVsYHr53Dq0Q6AFBp0zgMlIfrEPk+Iv1SuQYgGLoURrtMijAjECqcTeG1zJO1fDp49+Vd8Xi53eByJroNcE+6f/2PjowML36I9GLAOY203wIuSNz2QbvKPOd9HK0VlkyBDOiYJYS656X1oBrflK6ydxWu8jQL5+UpNqT6chxHOtfC0FpFjN0EwAQQlBc01o/w1AQSaXDs5OMiTgcKFySKn78RFUHYRcv9UL7bsXqlVi1SNkwUg1MD00kPLZfOCiUKFiPB0l4hpOwHDX0Hw5p5qCDPFxy1cmWKGoGuFoYHcFC03l/3MmKi41llWfQOMD7sBrQaUb0phPwvSmoxRv8wAdYc7ECaQ/X8PHdc0Gy1MOzw/LSf0TZoMwPR8qUWUFLASEUh+FLCb6vC+7Pzuo4RJWfWD6f6mOKakO+RyEEX4gFfTJckVtYDnOlBQxy5EHEnXhf18qQQs7FszIUwEB+Gj0R2B6lJfgl3VLl8g6Ux+WK9NDBFAwh0YjZ8U0b0vQsEjjrOOfno1kzq2AqknvzpUqHSincAGyoHRmBDepfapWuhgprseI5AT4PeogQI0T1t5eqf1xHi9vwtSvAHiu9UvVvA0wAVBSoslD9xl3PeMgEfoF4/VAHWEO+v8GF8cAW5efAmvdfsSHQcTA1uSKRmnCUOHSPjXgYoNJRWibqWuwoPGZjTGemAiCU9xSUGgx2x3Q/RyJgl8KQ5evurSStOjhkq2tmnBNJxQW931VctmqRDmht0A7eqO1fi7CJAV5EJrfwVSEQ6rCpKFjeZupbhKs9rV3xW0mNCIB0CM4V5Cm6JnNOdXhfyrY4UaFxEBQdP2FLD4Anx5vz/FQHxeFHbovy0Isq+hMEpevSIDTS7ZdAslgkI0BOL5WyXCmm3PXKP58C1nz3ikC5+P8Joeh/+C3z8HJhfmm14XiaVl+FVkiAu8hfBp3lG0q4GG8zkVA/7miKLoyavYUYx1vQeby0SaSOKiOrEtGUVLGsukB5x9LR3OFi/e6p5ZCMi8HFvO/Oq2cBc4C4Mel8VKIPJhUXzt87wNyjkOfEEy4GDRbBhb0bC0mdEpJO6ZTM+9o2jiDGwSv19fbeY4WvdlfUl7XsmfeDAxincGrsDzpZ6KNylnrKxNszj7s2xQFj8bSEAO7rYJSZj7cYLTusTmPx9DKcR2Jz0MMeoLuLLp3+4IvbPFxV/NCm/IZxN5Wr84HR55tNJFp8ufgckdQO8ymhzkyraiS6seg3dL9DxIJBK9k1OE+VYtnRcDPPxwccHLOVQYn+vFRqGjyoD634OORNv/osp0UFoG3jHBFSCx0+04GxUCWVBXxfX+z6IMxc2ljlGACyI3o9uhNyqZkeZBwciihK8W4v5PkGVGmnC8LynUFP4jGsj4daAEOIgy03ShkQCq8toG3IJKL2NAbovOBxv2503MhUZdfguphC7nhMCc1G8DLo4xtauPRZGJjtXcdGESVcaGiXxxGEIBCQmKr0z/CqGAQvLM81reaxyQb035HhlVN/kZvIULgcQwc+N8MIlCQB8hcvlMVqYEBYOds6B3bZVB/+jZbN0GTNqoWc2kft5K7rYYBMevwMeJitkvpw2+OwOHyZ2RQM2jJvtdtkGNoDOhj6vmq6KwKOzhTWqUgj8G2aou7DWgyCVPs6OBUSm2ePIiRX91xbDKBscLlBP7+GSK8amcO8APAjEydaG3wFsB810VODHgyix2BAohggbc6l4u4lPzAU28OMY3eKOJNMK6BKEXREyLChfKUBUbL+X3Kn/1iU0wMu++igrXPSX4w6dF23hXE0frE2ZFu2dqWha3MC9Y7C1z7SJT5hpVzhPCUvadM9pxUo1yhPxXQykO8oIPWbwjDPrVXBXI9r2/SU+58AVPGeyJ5uQVtDvmotUQ9ds9/WY78ea2TCcr+G7EDp5gvY0Mbl29ulbAzwSh1UnwzO9y3lxkCZ+8E647B3OqFdiFkmybEACVyxF9colQdsy/zyAIJBAbgGv29k2IxdapNKYZQItYYXqXBOq0z+ya8leWfUBSZ1h5sXqX+FG/0HoMZJ+Abe3MYOSezlgABNfBsHRoi64xf+oYTr1FGinTBef7MJY8Lv08ywthfLFiA/G0Ge6Kh33s0TmlcS64ZGihTmY/H4vTrzrOW3SbzgVvDTo0pBs406SrCijUuC9spvsIeTpWdXyXWmdVSgpQpbrQywfwpGiU9+XawAwjVgePPStUTqVWTrTwBJWbR4jDBnou1eiG6bfZVlsfYpRRW7TFQEg1l8aE4u7G9VjRlVNlPz5DwhP5a53ziGWFI301FuPaOSjX6HCwYBkF405Vjqg/vfm2j2UnpkABk4KGM8qNgpICbH35cjC4nhs9f7HESzm9kFu2/vVYm+ABHiEcvojTPclzQoz4bGZEW5/Atl1+5p6v3lUjDH5EjnBUFaY99+VTKhmL/fuHdVdL5MTPDdqZcgAkxRoBYvsGj44AfDkpmkgucaHM9DBvtYnxUXw2G3k7s1HjjfVgzAZimr6nf0idswPRBqBz6gt1bzL9UVVEu1lANgwo2ca/9xYifGWEhEYBt1Xc0ORu5DnsHomKFx9Kk2NWpoGAa1En8KJT2k1oTUJBd6Ffn4sxNdxSKW2ZI5uHU0aaX4DKMIZRnbAItua1PkBMwRDz2tcormv204BIhXgB0s3af+OrxEgsHzZjsriw2KCjDda1KKmGtn+AaTD2Q4bu2GD3shEBZECgx+h5kw4GagA3WBMM8kGFrXx0iG5zBjfBzfZgWV3zOpgcix/keRNtoCEkLKD7+v/QbHRkBrCE4PPg0++m1IljGOR6qC0/3pML4D3ArOdvq3tPdpJxFKqfeXwqVbAOg9OjtYu1H00Qmx2c2TpJruwYNYn74qLijnbL1kK7p7jHgoZY8xdJMcCv7kr+ToEHENHVauSfSKWxoA/cAR0EbhEtNnXMpPRYfAaDBqjD0WWlHiHUEylLoADeZCKvO/G1usOOq5J8IaA4NRY0Msi00GrZGlSJVpGOR8M8W0LH3BC3Moa2dzM0sIY0CW+rnR9COfAU1vt/2/OE7L12PuuP6Wakg5F5Ucrco5uWM1Wi+XytsUjDhniwijjuTyIuWX4ZCYVmwncEwzpU7j3JzPy3w7qX9pMEJRxlBKPAEdUqZZWZ+3StuBrCbeASLAyTmgKiemymWOMl9nt1nlBxOXHwqgkhyDS+DETGorb55vYrJVzDT4PHH9B52cz8JyPIwT6lzd38/tQ8r4RSptB85Ri819qPv+HV4kymxtnyibS7fg3J8IHoMm86Ev/QiElJqjzqTg1WELc+S9Ra52Lzu5lKsNtAtnfQ88LxRNPntIUJ6FWTtj3CxPSOdf3/k/+j9jHUFYHRGf6KGRajyhfWj8seBBd3JCDUwxs0C+ZpFW4uKbOMq6p2qLJXfmGNkEeUJhAIpNbCEpxcpOO32mvmUrXFH97YWsvzcjdAAYd1/NsReBUolMY2/61/sLaURPDGCfQpxygEEM3vMBnoRbf/6+V4YXB7dhWrTPG8UDeV89NrTbgfgs5r4mmmykfUNVllQlzhsrN1gbWG9zpaDFCKJ/i5TGj/y5QxfCuEBik92k3IoyIKkBeFJ12xL0PEWcRK54b4Gt9Tas+sVgDtVy98z7pQtabY5NkQ2/0BKJ5cK6BcukU6YoeYdwi0ZldURORU7QXzCi63N4p8x8hdWfPPTPXoYRFXxBXPx1ORr3LLGNmaHrDUD5exchh/hIY9UwGVdFdi2Zv70UL6bGHVt2VLWX8NQzDF1lhlc6+OKtrbxxKx+l5kFNjZ7N0BTu99bs8XyizcPlC89iyDmjfy+kOQhDiIE+q1rrnE9sUz5cnfWeaKhcMmD/xh2JUJppKyAlyg9XhPl4wbJWYqt3xz5sOnqbOP7D7ljWyb1wOix+GgPnVmVyGzm7q4EijlM+KYO1BZq+AcLYAoRogaDVGgjATXgm3eJDjcno2kLlBlrazFLw7zTO2tL0VldBHxldZrHZ+1tolbjZ74jyQku19uXehHud6UlpLPt7HC1C16A1gGqn3w5CjDUIlasmhUYx0Bk3scnqtpLx/BWIXzahHSffZyJEbA4ROdwT7TXVrLGsYJ3g5TIeEEbO+mkEOrVVrA8jLELQzimInBuwHF8Xlb+m5nIvk4Y1GIPqtEL0MKoiG1Tz1kfQRgXqB4rcMaP1uFRHgijfxMJj7DsCeU5hg+0WMezLFbDBI/bANWTBM3EyUftEjI7t+P5inwJlNO2HEjJzLzLmjIBIdagO6+SRaTigv593ktZlHLWhQEyXfW5K5s/MzqU/l7QQz2RuTE2VnnRj9bC4E65/iv/3q3N18BvdGePHOeaHQGPlPwtxEBFTPdbgK4W1M1v9mKGRRxAStl7aITKML9PigDdU31QcXxYpzmRVLSNVVcLtNkSJzdYp2VdiAQnI0dK4YK09NX4ERvPbskGmeKZaImyvhjfKBD1nUx5E46ldGPHoWw9IjM7BYXYte+tUpSR4UXrhNi54nXP4SDx14ZEzwTxnIMvRL54rWHlI4GDC7Ti5mbC160tEgHjuJ6ABblA5YFUr0zGRWTABokzXPYLeGg0AVU6YC+C75nqGZRv043qe/yUDxOOWKvEOqixuEbBkjsxwc0E+70kVOwdM4PdlwplvTV6rzBWju+wBSiqGz8gLnLe1eHAuAJfG3MC1BGK5GjJRlZXXrrxevSgUw/BIZ7UzBN2/7mhKI/3C9NlNONGEk65alBOFpKOAQvXH83FHwbsM8ZfSg5ZKcTVSWkLbwrLdRaEid0BoYdJCV3bTlpgrDy2RRj4TB0Y8zVJgUjxI1is3Bd16YKrpip2MRSpiw4KwYjh2EZi5UV2lSp0B71A9mH0gP/BhNvacPRx+/QcMv83j5cM9+YW75qjklOKm0EqBelJJ3MiL++QQFb6J39/wM/ALtePLCqAB6OD5CGVo/twg8VIJ8OXcixLZCidI6MBEODRtC8SFw9UMYAAHFBFHwesVRxAAAAAAAA=";
const SH_EYE_BLUE = "data:image/webp;base64,UklGRlADAABXRUJQVlA4IEQDAACQEQCdASo8ADwAPok0lUelIqIhMfVbaKARCWIAnTNaQsyRbF/it6tPHY09aO4cZne1y1BabNPM0sRW/SanoTJcbAr3AOnc1mzuUz4eERNWXaSoPh3yQH0OsJnxDRK/0e4MuEftH3EgFeDVgXsbRab2MJpVCcjf4CegVwwQKfvQczxbDzNArZtAiynRaMHQMO0TalPnGAD+5v8zPWfWS6dqt0KcFTYzVh09XdtiqRKiq90D/gdNJ091mhoTftaXhXDD5kUcn0mmFqC1/hYNhFtCO1gv58iz9V4Q0QkWymBRrOJEgyI4RiqhdivQebUw7VnKEJD2HwjN0AI4HqGLGY6mZ+pf0qmGFkMQvhSk5a6HG+ATo4nkg9b5Hvt6uY5EDL0xZ2hCC154uUCbZ65hYaiI2ajlQ6Qjc/50Ip/mQVH35E1CIOmW7mYzpRP5dILSfGxk1QgsWFrSFKGXYJTSopqsUFdjDfBxs9q3Jzsnc3l5UMZsoeKtrhSwEUkdsW/kApeh5kjiINPEgg034VWqMxv/uMamaj5eeAmIzEUQ6prXkqIuf5aLt4zk0HTx0ssoWuvVy8jxyMkbUsccPczVvZq9A6svj3o7wROKJdIPnMr1wtf8x7YnbYcMI5iNr2aBqHLyiOEasMWVTosuPmngFMXxCUJTxRqEK9RsAFDeFY53TihBUvK1+3icavgA2KHlngjd6YCILkrz33DFpzp6XXHGFrw/wstSFEgq6Lhr6f8LMTVKqNTZus8maviiRV23/7ODOBbDztqhpxC4qb3ndGEAF1DVL7JLRwA0kUEMNlqQ2NCXXtf8nLRwrcTwrPCVQhBHMF6dm0bvwwnl1Osk41okjsF8U77+wgU3Xr6jZTMvlWfz/hmJDI+PXT28DbU0ccftlP1CDJDvUJncTQeWvIRlcz+zO223ysxRJLbHpH4Bi7Sxed/JFatYdh9Cz5VkklxT7woeox1BrbahQ87VpwLgdblCTZUZxEZ/8l0YFCFSXD/LcjMnAcWj/ogA1ikhxn3kvaEXCBNF2ozOXIshezUWMZz5ZFyDJu0B8yFDP9iwitpbMSShovoCuVC22tXKTLsMiwnHleJ4xgISi5ZFzZ3WC0EAAA==";
const SH_EYE_BROWN = "data:image/webp;base64,UklGRoQDAABXRUJQVlA4IHgDAACwEQCdASo8ADwAPok4l0glIyIhLhbbiKARCWIAnTMOSVjwP6wS6z/rh3AjNJmwOmcysydQhN9UxwIjTcgHRF+V8NkBolNZ2OWbEAK7JKwxhJH1/Ir/m4ZCW8hAL69Am0BOsSTNMrZVysV6QonnpgYv+GyuBOcrrmIN7Jjy9saT6zoQFw4tR8+vkMFENgThpXGiP2Xu96AA/ugEzYaAffJGsn26HXSFNs/Geupb8bM0fNsxKRfCPh//+Ec319T40l2/+NK+Gf1dl1bJn/NaOzcsc7QruzpE7bwcZPHBNJgPEvvFCeC/41oU2LjU7rI4EQgbzRdFKNRk30LI+fq308Dp+QvJeSiISUwJvZcsA/HQL5u820MMjFeEepqHoaHDt7dqvQBtb+A8Nyq5nb7IBNfP4WCaPvzhD37BQJG6Mo5aLlVfPlyqzlSdi+JVJIAByFixo9lxyuxeVr9VH30knTaEIKg1vYj1QE6chakfMC+JNn8eoH7i3cuQVzWIkYdpVKcg4Q8cLj/Ot7Duc7MtwiKRA8PavC9zvZhrfPBK8vAVPYfWjpTiiYGQutmI2UsOMwvFRFc1s/rTOGgrX9499zjfi6uwlSJ35M6n8sVx3RssdFWG/jnabSVq2/6eTwXkAbrE+ljIzEHHM0DkNbW7yFRlFGNaJo2o1W4RHOszFL5hSDWT+cZLF1JDsad/PSliN3QCYInRk+sXVcNtCisqNtecdjMu52bheYuzlGc1ME1wVxV+6rZZhzl9+cSGNUv5uQ4b/IdLcJ8dwDSbBqfjAf7O8zgi1AVfSCX7I5IX8HfuWqAGUJrZ74bBdnN9GCKTmbDvLTvSRW/leVav4oBLh4ANtbaFl4A33nA8/zPERbPhx13+XkA05UbJai8K84bLVpkS7lHsR002CIMeF9/Av3h+7r+C5dkMDxdgWH/J35boHSmo4FcRnQrr3K/Y1DgfBDb0BlvkXPqAkJmf01xwbv5Ts69g/s0YaS3fTnWBX36CfPFhpVC9J4fiLZjE/z2BBJeyUNUw4dgmP40hrxXNfzA5kDSrbrfzZf6LsFbWLbv5hyZuzRHWNTwInbIW2rzeCJaF9db1vZxB2nleIloJP5yb2B2YELvPEjZjgS2hBrJp9N4BZKR8lm32XtzPjljTz4cLXECtYTd6NHaW88oiF8dbxxaTaRioAAA=";
const SH_EYE_GREEN = "data:image/webp;base64,UklGRmIDAABXRUJQVlA4IFYDAADQEQCdASo8ADwAPok0lkglIqIhLhbccKARCWIApd8JgiSY7i1pXy90j6y9v4zO/hdjPyYmqpai4a0JWjLAbT6a90SS8g2GhaX2sB9pCULkZEHwP/3Wm8q1e93qa9RCBzMYYf1wvvtHv1fo7mv/2U4/ra/i1tFRFVsYHw7gs3pK8eKDV6co84tRj760u6omBePqwsctPpsAAP6vECJOgFkmE089xzMWdZiAbKAVtTiQX/4tDsD7AwfZB/8bx5Lu3c7sYYPj4sgCQTs/fEQ+Ed2uy+GJsmVVxOqELDb7Xr4bY8ufaG0BEJ3gZqgrLHM6FJi9seSTf6+4UlMkCY3uPj2zyWDahY/Z7s18g9kb9r53ekLU/bQy8hCK5iNF+8GBL5ljKzZrRCRulTLHh3qOVAfLyDxQNNaSnQzqib6ETmT8FvViISeCImls2ELdsvQz1RIeoqq2qHJurM5uloRCgTo5naDEMYV63Kqcheq0uAg+X4OCEV01oq3vlJHFKWcV0GboN5uNDunfZkqljtVqej5MPgRVMm+CfKzdk7MlZDJkD3T3QZyviaPBBAm5B0e1dT51BxZPAk+ReESrvCkYQn4yqoh/T2sdkckijkW9ABnPkuvQi1Nhg7i5P73+1SRl+AtQ5SAHss1B20HqvxRFMlCAd6cSQWSyuuicNpVN2En85OaOr1e1m/IetNTiJde5SCR90TTcAoDF0wua7ca90MQxievqMLlh9gYHCWSPV9mlmhYf4fdqz3llBI8UR5tKuG1cTCT1XMUS9m9ZvQs7v7QQ0MjUgHgQ6YyXCAX6ZlsQHdfJVaWRDPRoBHdvywYMBGG7BXN94gq4okHC69lm4A06TUQD1wrm4L/jxQ6k91IMI9B1zvPymtjSQbZTSG45AV2nJFDWNcoIqPGDkuF19sWA3i28b6dpp/p3V12Jr0ObpCQr4EJdiTvozhp5n496nUAYrinyWbpJwsc8Zjkgy5U/aVVEpYyg95cQBCwQnhpVKHIlRtrexGE7xHxLyvymmbYvAqWvyMqf1U5e3D77Hp3EzU6f5H6DpSbmZvflNXB1g8i2u5ppegj+hgnLvhhmtZY1STusAXL875vUXpUqKRpf2RXPD+2CFz9dvwPjY7xnQhk7c4AAAA==";
const SH_EYE_GREY = "data:image/webp;base64,UklGRmgDAABXRUJQVlA4IFwDAADwEACdASo8ADwAPok6lkglI6IhLBgMAKARCWIAsR9yCOlFiiwH4Fnl0LX54Y4zW9BMvBNqNmlmTsNaxKQvbuL8LRXt7+Yfhqu52gZLGahjkZBCKMP2K4O7Bm9/e6V7R5f1+rzu2tBivvr5T//j8p+Qne70J6IEzQ39FJm+/N+P+PwayTO3VueHrmHr4jvIYoAA/vTC05WsO5TCJO9Um+8gRfamKud+aeBabBKVfv7rgKYM0mrgcAoVcguys5pWQ8K5gzYDYndKogo38XCT+b1vonIbGkqsLMhuiZkRq7IXeJxAkHXiRMCu9HouNHtJGfTKrFbcA0qvqepTKiSdnidNLio5KXBKyA00iQziZaY5UkIrAkhb2qhYphnxL6kzi3mGDcQiz/mkWjzY0aFt69F1Xd7ifX1woWf6L8agmt6B0sGskV4lrncr9xmrvvh+3DPUrEhGKjO/98MzeajPXa5rx9up7RHauc0DJxrucgAO2mISLnjddCAN+mMKA2TO6mBx/rj7uRZ4McfkKgc7ElB2Z9LVcxw/SgDWqduGik+PUpzFfxuBmIvJirB9Y2RWZ5GPu0aIEkJ90voP2un66m5GfrwhfPoNO06xuZ0Srtu6k+PgPpuv4v8KLgByRpoCIQGF0R1olxox9TgaFJXPS9wtk8ed9uREj7xCAYxbRmuYZgsFFa1u7tdW0oESaz1Q2zIfSlAEb4+7+nnLilwRG934IiW2URzBYCXKmQ03sR/jS8DhbMah4MDf+eI+He0uYz05k7X5qqcV8uzPD6In+99Zxh0UED2ZRMXn9UNuFS1M0OUZhcawKJCDZbleZV21luA+VgtkdCEk7QgJxZl3OzMiOrSvMWjBVZQ17sp0OqV77yAcvJHlsFBGe5C6/fvGBFgHLPdfrnqBCBR1ssgf4nThJN07yhpnzfTXHXnkK1wtA96HRkCl4LKSw3c/oRXVdcee4cRPDAxMi/btejfFiG5QkpNBEKLa4g/iJLRFSECWCMa9et/A7tm7R9RQRbg8/NPWbTheEURbWSc2inPyDzuOwT4sutnfvBOQq+jUA2orX485IpwVcz+LU/zmkj7BYx0VMvGDgDnSyYXEyK3TsU0qFFjD2l0MRLorpuY6A7FQeWyCcX0uBzLTBoAAAA==";
const SH_HAIR_LONG_CURLY = "data:image/webp;base64,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";
const SH_HAIR_LONG_STRAIGHT = "data:image/webp;base64,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";
const SH_HAIR_LONG_WAVY = "data:image/webp;base64,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";
const SH_HAIR_MEDIUM_CURLY = "data:image/webp;base64,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";
const SH_HAIR_MEDIUM_STRAIGHT = "data:image/webp;base64,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";
const SH_HAIR_MEDIUM_WAVY = "data:image/webp;base64,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";
const SH_HAIR_PONYTAIL = "data:image/webp;base64,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";
const SH_HAIR_SHORT_CURLY = "data:image/webp;base64,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";
const SH_HAIR_SHORT_STRAIGHT = "data:image/webp;base64,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";
const SH_HAIR_SHORT_WAVY = "data:image/webp;base64,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";
const SH_HAIR_XLONG_CURLY = "data:image/webp;base64,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";
const SH_HAIR_XLONG_STRAIGHT = "data:image/webp;base64,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";
const SH_HAIR_XLONG_WAVY = "data:image/webp;base64,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";
const SH_LIPS_BERRY = "data:image/webp;base64,UklGRnADAABXRUJQVlA4IGQDAACQFgCdASpCAG4APn00kkckpaGhN7gJyLAPiU0xCqMn6VyUm9THCwqABZtaH/Z+lu+EmiDRoDgcGGhxeRyTySx1IGPX9Bqt7x7bkSLHOpa8GjfabQCHmtEUajmu7At7Tv/AujasjY7GG/7j2qtkqVgSkyGMOaZ1AFSnM4c3CZXVkTx4IoEhUBtU+78QdUUh7dKhq/qDJ/drni5AtnQf8POFI5ao3BoHydkArSnFlgZIpaCMrd5u4IHsz53Ub0AA/vrm3NfuOLxo+M2dSwnKxGhpmmTIm+OQqk/vgRtbV5akVVtY0zfh/5Y+WnHKKwgIUQKjcSPJ9M/IHynBjXekCNXksuuvt/V7TBUBTRxU20XUb4nkZkU1keMc3hiM4K1k2kXWeKzVfJv1CZfygeZ2KDq1VhMRKSvp6kBmLN8pLFsqtVCuRiHTwz8rxYnD24INhbkzHNDOUcGcqyvBuOzsE5ob4nfmOAy7aEXnfvMS8E6SJMpoGeNBC6jDtp1lanfxPK8GPdD5wf3RhZq0gy4IC4n7VYJXNHg+jVEZLO5bxURg2B7tOfY8zvwp0xdmBurtfnip9LSaEcmK+Vat0XdoO3TxvBXm5LNZ79AV5OeFGxcyAAgniexc0SqZbR8/L2c3HCPnrf50LABrbLux+4++iaogu46q3gH2u3AZBb6Xmrb2LAHEwgHpxT5PrMXekVenoYoOIAnIVh6Favca0Cy/3YRLbNBVlVEW8/peWENLbIBC7kz/Ni0e0yHk9jKYcfmNWB2gSk3P3zmpLTU8IINGU33jgqsP+nz591PPgBP/0wHK1nqbDBnFYwGYu9ZB7aDc931lX3BmyunnGUfYkL65ikgwk19KJGVsmPMdcucS4S/dhFocXIRrLbOBry0gcTT7vLQcNg6Dhvmj1/0lrFYuZqDFizABwFaKhScO4OcGDhIJQQrsWcrB9UWOrfyPSz+gA3tWbOP0naSt8fcfDfatfIDJG1/ay7GVvjueG3RGML81z0dtMFtqPknMIHayodBI+60r/36Vjozvnugk/co6WDz1V2X13SdzSh1acq5h+yN3UhBBSXvR4cf91sFt+9LV8GZgTpO15pXpiDmKPmxj8qjAyrpbuyudWJpvqt3Mc/RXtgEas0Ok6fNPQRamFhace/yFAAAA";
const SH_LIPS_NUDE = "data:image/webp;base64,UklGRjQDAABXRUJQVlA4ICgDAABwFgCdASpCAG4APn00lUckoyIhttUsAJAPiWUAwUyCr7YBu/tZzRxapieNLVdMfzJySDvdN2I9KFHNAPdcEcxkETeaG9p1i+jMMaosIVQehPblnnekW7QuxLCFMEwtLTPrm5tSjUNiNfokBiyYvEyz+RcYEbbFAWPNiOMWq+g32jbs+SWPBZezzoZ2wqikpHi3wV7WGMDHJqo2LMevuyJL0IaQNYeZsyWm/NgzPEApAp7iOacmY2qBvQwjKAD++2YwtPK6lYepY9RE/7k/gJ7H5XtT+b9+hEZ9qEKUXKblm6cm2LJessC4bIUONTBWFqNA/FmxgpicsT0Mgt9zBsxHXz/ft9kDbI/yZhKRBVmmZEFWaRa90EFPxYlNM+V1SoWoD4TCuQIosKkc+QC9rothr+KzBrJlsOdtvUVzthO/1OQ1kSPnyKpGMBKivANlgEwz2yYk0nF5fRY1k1gLVTgprklZW1iEc64oB5NhYK20W1zboz0Qu+xT7YDleb8TQ6AYmC71IyxwSI7pMgtzCkiXwpJLvF8TJa9LN6SJLnhTns/E9XfkUmEouaZUZuf1xtw2ltncdTl1eI0OlwfolsxbFoQiU31wnbBYQXSj4S+80sXpKfaA0L47NO1vTGzN84Z9A2aqJ/syowH5s7NPGCx/BpU2KFSHaRYEe3Gsd9iSXaZ63Vb4EAIZiCGfQ5XniRw6C4IfLp3QRCcL0H+Stgp1xr3seJU9NwPkepF//Mrf+dSxqDU5k/6f68zpMnHi0FRx/kaJaQEMZX0A2L2c9+4zUy5843EaFdBqxQultiT53fSDZSzPYc1JFqYBY68KjTMtMqJXVKXhdr2cGEogSZZ+kNbLzkAfR62m9vOEvqROkMpMWY8rR1qi1YIN8UHBUHQ8EYPONBo7s1yx/eUAYC7gqlaTkLeIJjOlHjBtpwvEyGj8AZsyemTccfE3njQZZcku3Kn565yG23/SuBXm+ID0GlwdXYpyS9LZDgyPjHJi/e4gnFjGGwrphjl6JcN2xVUVgovtX2HHEwABr5Yi7WnUfaoGyJbcJ+2/WU7STNEeTMx/MGu8+AAA";
const SH_LIPS_PEACH = "data:image/webp;base64,UklGRiwDAABXRUJQVlA4ICADAACQFwCdASpCAG4APnUwkkckoyYjOZkskMAOiWMfQAkK3ScG5NITHqT5/8Bt/q3hSOEL32vxiJZa2qBVP4f5WSON7gZ2w5NgIGKXD8y6yAkczh6CFrSOKnnFACThskhEGPyplh2Viv3gdXZnvsrkVF4ST6FSaaQP4hlj154PT7GALJY9tCOpiEONF9J3FpGxknxRNQcho7EEIMAiNjHzJ11L0WlZFNKmH15nvHcBf7szqGfachmuTXqCtDq7ZLY61Vo8ctigUAD+/Ea55s0/HWm2356HcWXTbCYs3TCMoT1+8cb0n3U0PPYT+PZkOOuAWZVb1Wa8bxWc9RsfTphMaJ0TmYy/OlPeieIc/PbNvLIliLpPDXLoTFfYsOfP7btcgs8a5dQn85XIJs260wYdP5DyvGgQn1OxLTui8fgtSb/Mssm4sujNsLCCVcniSJdM5MvXyohZYdY0NGvZvgQpIJK0DhB+n7Yl/u7TWvvzEIw1eMuJtL16f2yZJ4tYj5/C+wTNwrtDmaT5pByvoJ2IXARU4RY6i3OaTLETlNHRSjT1iLK8QyLpIR/Le8tMXGQ9AgdX9i0R8fkshwPYxuIrKBwQivwmSZE3NzQ3z1WU+/BuCNIqp+8edqma43DZdG1b6kVDlHGjnm2BgxW7Ii8FzHrxzVzDZBPGVyw0XS4ZsFJ+n5BIDrX9cK1U/0bB7N8gXso9NaHiHZYaqPAvbLIoHIDrVD/U6aAFhmNt0cxxLj/HEGaxoapgdiM4tlKFmS9frgyvMdqZJZLayaudYpPJRr6UoBolsS3wITo4SsxYtBo10J+8Lyyxd6vNdvSRdWgJRE+9PMNZ7zaLcAs/PLbheZVepQfl8FMP6Xx7CIE9Qs/8S/xOzeFFI5QKSdmqImN/x4zx5JFk3LLj6NxZQ37aAG9y3WepZ+tuC3FDXNU5pgPii3TqfclfV+0nC7VQHLG8aQ8e8DV9gFjWgFqZuKLgCcALybn/Hv2VIuHRKXF7JQSCi7KWWFl4gc17u5kN62z+SklDSVGTGMgRqUROy+t5DUwFPzbuyKzyeHtuSYA7pwAAAA==";
const SH_LIPS_PINK = "data:image/webp;base64,UklGRsgDAABXRUJQVlA4ILwDAAAwGACdASpCAG4APnk0lEckoyIhN7YscJAPCUWYF+AAiiWLXrgNonLTkgVpEvr78Bxdc1ivNJ/T2fIZgpdbJiIgZnOszOLFGudidGZjGbxdXJlCkArl+7RoeUyDSu56LWfGr/ECO5Wt4D8nfFN65zkKmwbf9v0dijtmPA7XTsgelNPBKQEqmTbLHBO9lH0O/3rITdv0472KOZn2Vi/9eyS41cxZrEyfRinP4d9ktfqOOI0G2MDt4RpcGqidu/HJ701kPt/3em6RjhAAAP78pfZham5mx/OGhhBhQXG17zlGJH2Ou6cZ4oUGi3cWw9LDVBp2zPVLZpSgPx/m19C8BVJkCAgRMrn0MnYeReRxUTbiuVi5wEMnYsva7wOjZgqHRVMHjGjQoSil7cx0bAE0lX0Q3DG4d6/nAmTyqsPYwMCScyG7ysaw8egYXzIxwF9eSAWj63mFjMmtwtEgCFBF7HG4bzFnf3WHQeMUgkwJURcasZ65bc7VC82J44hX2MD83RbJWLqaRPN0oMi0TiKVTQAFr1JHfbezStMIQBZT/8Qw2QbGJ5TyOZbm6xDvV4lYAfJspxoNywTGGR3acE3hm3jHwwczyP86DGlFgAiD8+6gxFuMebgWC9dnXKRcb/DF1WZF12ozexk19rYJDrOl0JEeGLHWfj6phhJx6xMGQtgp/6s/p1RaxF1TgILGimmMFEvGqQqJHlabWnDw/KweECyC/PlYU8K8rLh924ASNKl9EEH3L47IrXAcZZ4Dq52Ek7EO/Df+V6pGhvfqbDZNLiEtU9Zc37zXTUyqcxBiDpmPUX0xU4goH42XztGfDL/Lrh/eV/lMv/9Awn/SQPLgpnAQl3ZIzo5TM1zz2zNNBolxK5/8dmfaTc/4913ypWObupf8WAktWhpVCOLaAFG6/96+mwhmCzU2YDeyNS0DcYnm39u57bqlWYrFS0DLbsXPXOHc69AQMhSXLFoFWNyqAwmm/hjgibA+NnBjmOFt49x08HDUTKAxaNvYepRwne1/7NzvPoHWNORCCVzvvXd4V+CC4wC4R8yne5hVeuJInPHPq+cvfxuqQswj5lDyFNtu9DkOdlLizkRZbua6Yoa+qXIFHPM95ZkzU/xKW0qz88QJrdcl1xNXBeIGuY/TDaDA5cWZw3y6yBTfs8qzSSwuYx6rrY51ZgqOuZ/JYZ9K3DnkcyMxuljGKzD/2A2Mmgqs+PAvE2UJ1EslItlGu8GYsdxFdNOrG/xPFlml7Y//0ZNdGW9D/4Ik68Loyi1AAA==";
const SH_NOSE_N1 = "data:image/webp;base64,UklGRhYCAABXRUJQVlA4IAoCAABQEACdASo8AFQAPok0lUclIqIhM/VaqKARCWUAuzRw4woqoAyw+wZEf7F/p8VIa1OG3kPoq3m4HDBwm6ksLpGquWXKzT7XwLmFi8A8goKSTgAIN/OgN31GJU57G2BN0rgwSfzKohrSYEpuzRL/xS/UXOq5hUHofPTzTBoLOVWyYQkYtTa0ntMQ3f6QAP75xalnqVOSQrUQlAUWtw5an4+8c4rrC1wnbkQxmlEG7F92rwsLxElIcL9TOjWuVUoJyKQIo8Vi2yXyO+2sMO1pMA6oZT7FY8qIdHgmqW4j9wjSU0zM7n0lKi5dzkXV2sQ6XpqXc5kPe/FuEycr5HdL5Q1Ci2h/DF1uBdtoR3hZ4D5sl1YV4N2IzOKwyC0j96nbsGtjcHtMnljMjzpYF+sJ8EhAhx9FaHlb7lxXzPeiVpLPKEv4sNsZn4wIBL1dI9btVpY2XdyuLdhJF2SOBF4DNqVCZ3AA92mdYpHtoo49q4P1qu+FQ9iKeVK3WkWLZawq5arUS5Gm65Jq6xjR7F1axN3RxsKaSIJmgrqwjpZO8p8L+yZ6QZirsJc2cSuDJApNpRXxP/EiHvoYalv25iF3YjBvhdyo2fjYYvTKEytUK/3AzIsdUReBH0AhHGDZqiw3fTp8ucjnZHH0PwE+p3/6k22fnRudWdFIZxPQyRg7HzMIIuiB70RD3h3r0AA=";
const SH_NOSE_N2 = "data:image/webp;base64,UklGRjACAABXRUJQVlA4ICQCAACQEQCdASo8AFQAPok6l0clI6IhLrXcSKARCWMAwCBQDhiwAE0aJ3Xg+l2KbQBERtTOVPHzwtdCMdVRH5RxXMMqsSqM+wfXBobGrtA+VsCdo5nFk00U159j1wF52179QHmRTrufK1V18T9f3gUcp2dMkdbr3A8mNTAydp9GkX5T4g9xa5E9wj+C2PB71vWPL1fe1xxeAAD++l2GugPkO4wbUjMFxBXR8jlOy/7dk7+IvsuamJ3hAQfyzMWR3dxrhJPoAm2AiCyxI+P8MNljty95pq2UDGlvu5vXslQaTOjnciF90l7IJXNdB03QZduS3vj3Boc4cf6HVDNZDtV9Tp9RELzKxQ9C9174KQ6Yja6TPGBFcP4du5ZbnhNNnfs0HxihMROofSMmROMPl3rUiZKnd7U1qfmfl0gatm41DIuFmsWMk+i/wMgQbhaiVowoPIE4EVCZsHMoOouGz3BprHSz0DiPlgstOfnJNvDD/VAKpfOrOhvghH83TNabmWrsPCupH4MAzc2/cy2PF3z9wXP+IamF2BzlCntSxO0E1YdPhLtBw5DdRp+72bL1dMRd5/8kQdcBrLWKZHTHvrtJ3n72OjLsTkGihRk6gJysXN1JyFSaLPkidQBjFwkAixHwURpBwCC9lli4hWDl6YbvU/wnjiKuKJmKnWp0xMyarhRMelxwBVBoKpOB8oUEUC8BAoSTebCssoOHDGJQ/1Lf55RSsAAAAA==";
const SH_NOSE_N3 = "data:image/webp;base64,UklGRiICAABXRUJQVlA4IBYCAABQEQCdASo8AFQAPok4mEilIyKiLrF7sKARCWMAxyiEShy3c9uAFBWedK47bu6U0r8DN8G7bc/BU9M4KaVFDKrgt9MxzKm4R/Id7kYIXU4xXuNs7JYLxFFBR7p2EvWUOplIEoW18HFYTfS/lNi/hurLOcu9hNpuHhObzuehhx8KnRye7jab66xRnwjtMl5eIuOoNAAA/vpgqvUE/6f8pAiHb8YghV5Hh37JZGpl7a9XnLftuJxh0ac+U4dP6Jh9Wo3eh6maAsbUYGjXRYsVtlWYqHzZXjmvpuxzIUl/1IODn9DOYs9XRTZt2N6XdCPSenZrk1xO0Td09yTit5KsWdiKLb1jyxXbBXk+l72ps1B3CgUoYQKbMPZp7PNvscAxsrKYaXP+PcMY4xZ1FPuovGIPBC0YpYPR0fNdSHFV9n6phxd6QPFLmF/121AOa3bta3IttWbATt9X6cmadQ1Ty2HrTyT+I7TPCZfrzWPCi4Gmp5ugmmkXH1Aswwp8hVyhl7BtEGu16VUtvrA94HxPnrzfqGmW0GLmvC9eC2q33V6vzJNbjSXG9ZcZkvvDBfTd46TVhRymEyBk1qIXgaKtUB5ofIZDI0sKeqdw/EKu53O7bLnHi5Msjj+nraafd2Q6VNRvvSE0gL7D/OEsG4D7dBCX22dYpdwKs7Ti21k1QqwUPcc9lOXce5x6uHSU8ltMbsDYokBgAAA=";
const SH_NOSE_N4 = "data:image/webp;base64,UklGRkQCAABXRUJQVlA4IDgCAADwDwCdASo8AFQAPn0ykkckoyGhN/VdUJAPiWMAvYx/icmIACksQ+JG5iXbQ4kk1ydsRFRzsDZLmZGqU4b4IKDuGtmCeimtBszHwYOpyRaJSIGC9/B818+uWp5PqH1/MjK9UyZb29SeGHwJ8poBPEF7PCDOjyO20dzhhXAHSocb0Rkj373qcKvAAP77Zd7DBbm5CWOQOM5nUcYIjD9sLslDxIx73iSQa78La5QQ+IEdppKZSWPoNngLu2rbogy/JJy4wQg4Y+Rs4uweXoegIAQNau4B6B04QlPFhuyqc1YSHWiikGB8L1fqSH/dvQHBBts1ENJrK5isY9Q433E2XhMbN36Xq/BXaajcgaK7VeoiIk5CKIQvbCg9PR+CabjKOpkZiYSawK/QsNY6lPnCdZyeabAWsQRQW0aFz80jctFI7E/Lq9wJjtEM8Aw7eaadaCcCOp6ouqJpr9oSOeHTAUF9g2/mP8a2kpZSwH5km/qsmINLVPif8ERUxHOW2daR9lHL0EFmBWyLvMReafvBDmjiq/4B1H2MiHGB4upIosjOLKJ/aLAz1Vji50qoDliRMwMROJNLJq7tzEcjkfHeBGhooeUoXoai2MYiWdbnNp9e/Lf1NyDfXpRkHaBC/+RE+we22gTmEkDBsImeOOPeKtRrFXdQup52IV8Ac6Xqi4MaLEs1QUdOR0CB1PRB1Ser2n6EipkaRRRV2S10HVV8EiOQHkHpwHO8Y2LXk51ZZIADNu3AEdLfPIAA";
const SH_SKIN_BEIGE = "data:image/webp;base64,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";
const SH_SKIN_CARAMEL = "data:image/webp;base64,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";
const SH_SKIN_DEEP = "data:image/webp;base64,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";
const SH_SKIN_IVORY = "data:image/webp;base64,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";
const SH_SKIN_RICH = "data:image/webp;base64,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";
const SH_SKIN_TAN = "data:image/webp;base64,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";

// Каталог внешности, нарезанный из присланного листа персонажа.
// Это готовые растровые превью — код ничего не дорисовывает.
const FACE_CATALOG = {
  hairLength: [
    { id: "short", label: "Короткие" }, { id: "medium", label: "До плеч" },
    { id: "long", label: "Длинные" }, { id: "xlong", label: "До талии" },
  ],
  hairTexture: [
    { id: "straight", label: "Прямые" }, { id: "wavy", label: "Волнистые" }, { id: "curly", label: "Кудрявые" },
  ],
  eyes: [
    { id: "brown", label: "Карие", img: SH_EYE_BROWN }, { id: "green", label: "Зелёные", img: SH_EYE_GREEN },
    { id: "blue", label: "Голубые", img: SH_EYE_BLUE }, { id: "grey", label: "Серые", img: SH_EYE_GREY },
  ],
  nose: [
    { id: "n1", label: "Форма 1", img: SH_NOSE_N1 }, { id: "n2", label: "Форма 2", img: SH_NOSE_N2 },
    { id: "n3", label: "Форма 3", img: SH_NOSE_N3 }, { id: "n4", label: "Форма 4", img: SH_NOSE_N4 },
  ],
  skin: [
    { id: "ivory", label: "Светлый", img: SH_SKIN_IVORY }, { id: "beige", label: "Персиковый", img: SH_SKIN_BEIGE },
    { id: "tan", label: "Золотистый", img: SH_SKIN_TAN }, { id: "caramel", label: "Карамельный", img: SH_SKIN_CARAMEL },
    { id: "deep", label: "Глубокий", img: SH_SKIN_DEEP }, { id: "rich", label: "Насыщенный", img: SH_SKIN_RICH },
  ],
  lips: [
    { id: "nude", label: "Нюдовый", img: SH_LIPS_NUDE }, { id: "peach", label: "Персиковый", img: SH_LIPS_PEACH },
    { id: "berry", label: "Ягодный", img: SH_LIPS_BERRY }, { id: "pink", label: "Розовый", img: SH_LIPS_PINK },
  ],
};
const HAIR_IMG = {
  short: { straight: SH_HAIR_SHORT_STRAIGHT, wavy: SH_HAIR_SHORT_WAVY, curly: SH_HAIR_SHORT_CURLY },
  medium: { straight: SH_HAIR_MEDIUM_STRAIGHT, wavy: SH_HAIR_MEDIUM_WAVY, curly: SH_HAIR_MEDIUM_CURLY },
  long: { straight: SH_HAIR_LONG_STRAIGHT, wavy: SH_HAIR_LONG_WAVY, curly: SH_HAIR_LONG_CURLY },
  xlong: { straight: SH_HAIR_XLONG_STRAIGHT, wavy: SH_HAIR_XLONG_WAVY, curly: SH_HAIR_XLONG_CURLY },
};
const SHEET_BODY = { front: SH_BODY_FRONT, back: SH_BODY_BACK };
const PONYTAIL = SH_HAIR_PONYTAIL;

const CHARACTER_ASSETS = {
  female: { label: "Женская модель", front: CHAR_FEMALE_FRONT, back: CHAR_FEMALE_BACK },
  male: { label: "Мужская модель", front: CHAR_MALE_FRONT, back: CHAR_MALE_BACK },
};

// ============================ ИКОНКИ: ПРИМИТИВНЫЕ INLINE-ГЛИФЫ, НЕ БИБЛИОТЕКА ============================
function Glyph({ d, size = 15, color = PF.terra, fill = "none" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={color}
         strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {d}
    </svg>
  );
}
const ICONS = {
  steps: <path d="M4 20h4l1-9H5zM15 20h4l1-13h-4z" />,
  flame: <path d="M12 3c1 4-3 5-3 9a3 3 0 006 0c0-2-1-3-1-5 2 1 4 3 4 6a6 6 0 11-12 0c0-5 6-6 6-10z" />,
  dumbbell: <><rect x="2.5" y="8.5" width="3.5" height="7" rx="1.2" />
    <rect x="18" y="8.5" width="3.5" height="7" rx="1.2" />
    <rect x="6.5" y="6.5" width="4" height="11" rx="1.5" />
    <rect x="13.5" y="6.5" width="4" height="11" rx="1.5" />
    <path d="M10.5 12h3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  moon: <path d="M20 14a8 8 0 11-10-10 7 7 0 0010 10z" />,
  heart: <path d="M20 9c0 5-8 10-8 10S4 14 4 9a4 4 0 018-1 4 4 0 018 1z" />,
  award: <><circle cx="12" cy="9" r="5" /><path d="M9 14l-1 7 4-2 4 2-1-7" /></>,
  bag: <><path d="M6 8h12l-1 12H7z" /><path d="M9 8V6a3 3 0 016 0v2" /></>,
  chevron: <path d="M9 6l6 6-6 6" />,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  coin: <><circle cx="12" cy="12" r="8" /><path d="M12 8v8M9.5 10h5M9.5 14h5" /></>,
  chat: <path d="M20 12a7 7 0 01-7 7H8l-4 3v-4.5A7 7 0 018 5h5a7 7 0 017 7z" />,
  // вилка и ложка
  cutlery: <><path d="M7 3v6a2.4 2.4 0 002.4 2.4h.1V21" />
    <path d="M4.7 3v4.4M9.3 3v4.4" />
    <ellipse cx="17" cy="7" rx="2.7" ry="4" />
    <path d="M17 11v10" /></>,
  // кроссовок
  sneaker: <><path d="M3 16.5h11.5l3.2-2.1c.7-.5 1.6-.6 2.4-.3l1.4.5a1.6 1.6 0 011 1.5v1.4a1.5 1.5 0 01-1.5 1.5H3z" />
    <path d="M3 16.5v-5c0-.6.5-1 1-1h1.6c.5 0 1 .3 1.2.8l1.1 2.4" />
    <path d="M9.5 13.6l2 1.2M12 12.2l1.8 1.4" /></>,
  // кубок
  trophy: <><path d="M8 4h8v5a4 4 0 01-8 0z" />
    <path d="M8 5.5H5.6A1.6 1.6 0 004 7.1c0 1.9 1.5 3.4 3.4 3.4H8" />
    <path d="M16 5.5h2.4A1.6 1.6 0 0120 7.1c0 1.9-1.5 3.4-3.4 3.4H16" />
    <path d="M12 13v3.5M9 20h6M10 16.5h4l.8 3.5H9.2z" /></>,
  // тарелка с приборами
  plate: <><circle cx="12" cy="12" r="7.5" /><circle cx="12" cy="12" r="4" /></>,
  // кольца активности
  rings: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="2.2" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  home: <path d="M4 11l8-7 8 7v9H4z" />,
  chart: <path d="M5 20V10M12 20V4M19 20v-7" />,
};

// ============================ ПЕРСОНАЖ ============================
function CharacterImage({ gender, view, height }) {
  const [failed, setFailed] = useState(false);
  const src = CHARACTER_ASSETS[gender][view];

  useEffect(() => { setFailed(false); }, [src]);

  return (
    <div style={{
      position: "relative", width: "100%", height,
      background: CHARACTER_BG, borderRadius: R.hero, overflow: "hidden", borderStyle: "solid", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)", boxShadow: "0 10px 34px rgba(63,48,41,0.10)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      {failed ? (
        <CharacterPlaceholder gender={gender} view={view} />
      ) : (
        <img
          src={src}
          alt="Персонаж FORMA"
          draggable={false}
          onError={() => setFailed(true)}
          style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom", userSelect: "none" }}
        />
      )}
    </div>
  );
}

/**
 * Демонстрационная заглушка. Показывается, только если изображение не загрузилось
 * (например, в песочнице без доступа к /public). Это не персонаж и не векторная
 * фигура — просто карточка с указанием ожидаемого файла.
 */
function CharacterPlaceholder({ gender, view }) {
  return (
    <div style={{
      textAlign: "center", padding: 24, maxWidth: 300,
      fontFamily: sans, display: "flex", flexDirection: "column",
      alignItems: "center", gap: 10,
    }}>
      <div style={{
        width: 54, height: 54, borderRadius: 999, background: PF.bgDeep,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Glyph d={ICONS.user} size={24} color={PF.cocoa} />
      </div>
      <div style={{ fontSize: 15, fontWeight: 600, color: PF.cocoa }}>
        Изображение персонажа недоступно
      </div>
      <div style={{ ...TYPE.subhead, color: PF.ink2 }}>
        Не удалось отобразить {gender === "female" ? "женскую" : "мужскую"} модель ({view === "front" ? "спереди" : "сзади"}).
      </div>
    </div>
  );
}

// ============================ МЕЛКИЕ ЭЛЕМЕНТЫ ============================
function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", borderRadius: R.pill, padding: 4, ...glass(0.6) }}>
      {options.map(([id, label]) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          style={{
            borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", padding: "9px 20px", borderRadius: R.pill,
            fontFamily: sfPro, ...TYPE.subhead, fontWeight: value === id ? 600 : 500,
            background: value === id ? "#FFFFFF" : "transparent",
            color: value === id ? PF.terra : PF.ink2, transition: "transform .18s, opacity .18s, background-color .18s, box-shadow .18s, color .18s, border-color .18s",
            boxShadow: value === id ? "0 2px 8px rgba(63,48,41,0.14)" : "none",
          }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function Eyebrow({ children, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "26px 0 12px" }}>
      <span style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 700, color: PF.terra,
        textTransform: "uppercase", letterSpacing: "0.06em" }}>
        {children}
      </span>
      {right}
    </div>
  );
}

function MetricTile({ icon, label, value, sub, color = PF.terra, onClick }) {
  return (
    <div onClick={onClick} role={onClick ? "button" : undefined} className={onClick ? "fit-press" : ""}
      style={{ padding: 16, borderRadius: R.tile, position: "relative", overflow: "hidden", cursor: onClick ? "pointer" : "default",
      backgroundImage: `linear-gradient(152deg, ${color}1F 0%, ${color}12 45%, rgba(255,255,255,0.72) 100%)`,
      backgroundColor: "rgba(255,253,250,0.62)",
      backdropFilter: "blur(34px) saturate(190%)",
      WebkitBackdropFilter: "blur(34px) saturate(190%)",
      borderStyle: "solid", borderWidth: 1, borderColor: `${color}2E`,
      boxShadow: `0 8px 22px ${color}1A, inset 0 1px 0 rgba(255,255,255,0.9)` }}>
      {/* фоновый знак темы, как у плашек главной */}
      <div aria-hidden style={{ position: "absolute", right: -12, bottom: -16, opacity: 0.09,
        transform: "rotate(-12deg)", pointerEvents: "none" }}>
        <svg width="86" height="86" viewBox="0 0 24 24" fill="none" stroke={color}
          strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">{icon}</svg>
      </div>
      <div style={{
        width: 30, height: 30, borderRadius: 10, background: color + "22",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Glyph d={icon} size={16} color={color} />
      </div>
      <div style={{ fontFamily: sfPro, ...TYPE.title1, color: PF.ink, marginTop: 10 }}>{value}</div>
      <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600, color: PF.ink, marginTop: 3 }}>{label}</div>
      <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 1 }}>{sub}</div>
    </div>
  );
}

// ============================ ЭКРАН РЕДАКТОРА ============================
function EditorScreen({ gender, setGender, view, setView, onBack }) {
  return (
    <div style={{ padding: "0 22px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 10px" }}>
        <button type="button" onClick={onBack}
          style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", width: 40, height: 40, borderRadius: R.pill, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...glass(0.7) }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}>
            <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
          </div>
        </button>
        <span style={{ fontFamily: sfPro, ...TYPE.title1, color: PF.ink }}>Образ персонажа</span>
      </div>

      <CharacterImage gender={gender} view={view} height={430} />

      <div style={{ display: "flex", justifyContent: "center", marginTop: 14 }}>
        <Toggle options={[["front", "Спереди"], ["back", "Сзади"]]} value={view} onChange={setView} />
      </div>

      <Eyebrow>Модель</Eyebrow>
      <div style={{ display: "flex", gap: 8 }}>
        {Object.keys(CHARACTER_ASSETS).map((id) => (
          <button key={id} type="button" onClick={() => setGender(id)}
            style={{
              flex: 1, cursor: "pointer", padding: "15px 14px", borderRadius: R.tile,
              fontFamily: sfPro, ...TYPE.headline, fontWeight: gender === id ? 600 : 500,
              transition: "transform .18s, opacity .18s, background-color .18s, box-shadow .18s, color .18s, border-color .18s",
              ...(gender === id
                ? { background: PF.terra, color: "#fff", borderStyle: "solid", borderWidth: 1, borderColor: "transparent", boxShadow: "0 6px 18px rgba(169,112,96,0.36), inset 0 1px 0 rgba(255,255,255,0.28)" }
                : { color: PF.ink, ...glass(0.7) }),
            }}>
            {CHARACTER_ASSETS[id].label}
          </button>
        ))}
      </div>

      <div style={{
        fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, lineHeight: 1.55, marginTop: 18,
        padding: "16px 18px", borderRadius: R.card, ...glass(0.66),
      }}>
        Одежда, причёска и обувь пока встроены в изображение персонажа.
        Раздельный выбор вещей появится, когда будут готовы отдельные слои одежды.
      </div>
    </div>
  );
}


function SheetBody({ view, height }) {
  return (
    <div style={{
      position: "relative", width: "100%", height, background: CHARACTER_BG,
      borderRadius: R.hero, overflow: "hidden", borderStyle: "solid", borderWidth: 1, borderColor: "rgba(255,255,255,0.8)",
      boxShadow: "0 10px 34px rgba(63,48,41,0.10)",
      display: "flex", alignItems: "center", justifyContent: "center",
    }}>
      <img src={SHEET_BODY[view]} alt="Персонаж FORMA"
        style={{ width: "100%", height: "100%", objectFit: "contain", objectPosition: "center bottom" }} />
    </div>
  );
}

// ============================ ЭКРАН ВНЕШНОСТИ: ВЫБОР ПО РЕАЛЬНЫМ ПРЕВЬЮ ИЗ ЛИСТА ПЕРСОНАЖА ============================
function OptionRow({ title, items, value, onChange, size = 62, round = 14 }) {
  return (
    <div style={{ marginTop: 18 }}>
      <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 9 }}>{title}</div>
      <div style={{ display: "flex", gap: 9, overflowX: "auto", paddingBottom: 4 }}>
        {items.map((it) => {
          const on = value === it.id;
          return (
            <button key={it.id} type="button" onClick={() => onChange(it.id)}
              style={{
                flexShrink: 0, cursor: "pointer", padding: 0, background: "none",
                borderStyle: "solid", borderWidth: 0, borderColor: "transparent", textAlign: "center", width: size,
              }}>
              <div style={{
                width: size, height: size, borderRadius: round, overflow: "hidden",
                borderStyle: "solid", borderWidth: 2.5, borderColor: on ? PF.terra : "transparent",
                boxShadow: on ? "0 4px 14px rgba(169,112,96,0.35)" : "0 1px 4px rgba(63,48,41,0.12)",
                transition: "transform .18s, opacity .18s, background-color .18s, box-shadow .18s, color .18s, border-color .18s",
              }}>
                <img src={it.img} alt={it.label} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
              </div>
              <div style={{ fontFamily: sfPro, ...TYPE.caption2, marginTop: 5, color: on ? PF.terra : PF.ink2, fontWeight: on ? 600 : 500 }}>{it.label}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function AppearanceScreen({ face, setFace, onBack }) {
  const hairImg = face.ponytail ? PONYTAIL : HAIR_IMG[face.hairLength][face.hairTexture];
  const set = (k) => (v) => setFace((f) => ({ ...f, [k]: v, ...(k === "hairLength" || k === "hairTexture" ? { ponytail: false } : {}) }));
  const lenItems = FACE_CATALOG.hairLength.map((l) => ({ ...l, img: HAIR_IMG[l.id][face.hairTexture] }));
  const texItems = FACE_CATALOG.hairTexture.map((t) => ({ ...t, img: HAIR_IMG[face.hairLength][t.id] }));

  return (
    <div style={{ padding: "0 22px 40px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 0 10px" }}>
        <button type="button" onClick={onBack}
          style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", width: 40, height: 40, borderRadius: R.pill, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...glass(0.7) }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}>
            <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
          </div>
        </button>
        <span style={{ fontFamily: sfPro, ...TYPE.title1, color: PF.ink }}>Внешность</span>
      </div>

      {/* Превью выбранной причёски */}
      <div style={{ borderRadius: R.hero, overflow: "hidden", ...glass(0.55), padding: 10 }}>
        <img src={hairImg} alt="Превью персонажа"
          style={{ width: "100%", height: 300, objectFit: "cover", objectPosition: "center top", borderRadius: R.tile, display: "block" }} />
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 12 }}>
        <button type="button" onClick={() => setFace((f) => ({ ...f, ponytail: !f.ponytail }))}
          style={{
            borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", padding: "10px 20px", borderRadius: R.pill,
            fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600,
            ...(face.ponytail
              ? { background: PF.terra, color: "#fff", boxShadow: "0 6px 18px rgba(169,112,96,0.36)" }
              : { color: PF.ink, ...glass(0.7) }),
          }}>
          Хвост
        </button>
      </div>

      <OptionRow title="Длина волос" items={lenItems} value={face.hairLength} onChange={set("hairLength")} size={68} />
      <OptionRow title="Фактура" items={texItems} value={face.hairTexture} onChange={set("hairTexture")} size={68} />
      <OptionRow title="Цвет глаз" items={FACE_CATALOG.eyes} value={face.eyes} onChange={set("eyes")} size={58} round={999} />
      <OptionRow title="Форма носа" items={FACE_CATALOG.nose} value={face.nose} onChange={set("nose")} size={52} />
      <OptionRow title="Тон кожи" items={FACE_CATALOG.skin} value={face.skin} onChange={set("skin")} size={58} />
      <OptionRow title="Цвет губ" items={FACE_CATALOG.lips} value={face.lips} onChange={set("lips")} size={54} />

      <div style={{
        fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, lineHeight: 1.6, marginTop: 22,
        padding: "16px 18px", borderRadius: R.card, ...glass(0.66),
      }}>
        Превью показывает выбранную причёску. Отдельные слои для глаз, носа, губ и кожи ещё не готовы — сейчас это варианты из присланного листа, а не комбинируемые слои.
      </div>
    </div>
  );
}

// ============================ ЭКРАН ПРОФИЛЯ ============================
function ProfileScreen({ gender, view, setView, onOpenEditor, onOpenAppearance, face, onOpenSettings, survey, account, weightLog, macros, onOpenStat, progress, mealsLog, onOpenTrainer, trainerActive }) {
  const health = useHealth();
  const detailCtx = React.useMemo(() => ({ survey, weightLog, macros, doneToday: [], workoutPlan: null, health }), [survey, weightLog, macros, health.all().length]);
  const fmt = (v, d = 0) => v == null ? "—" : Number(v).toLocaleString("ru", { maximumFractionDigits: d });
  const src = health.sources().filter((s) => s !== "демо");
  const sourceLabel = src.length ? src.join(", ") : "демо-данные · подключите источник";
  const [syncMsg, setSyncMsg] = useState(null);
  // Показатели читаются из хранилища здоровья — как в Apple Watch / Garmin
  const wk = (t) => health.week(t).map((d) => d.v || 0);
  const sum = (a) => a.reduce((x, y) => x + y, 0);
  const metrics = [
    [ICONS.sneaker, "Шаги сегодня", fmt(health.daily("steps")), `в неделю ${fmt(sum(wk("steps")) / 1000, 1)}к`, ACCENT.steps.c, "steps"],
    [ICONS.heart,   "Пульс покоя", fmt(health.daily("restingHR")), "уд/мин · утро", ACCENT.workout.c, "heart"],
    [ICONS.chart,   "Средний пульс", fmt(health.daily("heartRate")), "уд/мин · за день", ACCENT.workout.c, "heart"],
    [ICONS.rings,   "HRV", fmt(health.daily("hrv")), "мс · восстановление", ACCENT.tips.c, "heart"],
    [ICONS.flame,   "Активные ккал", fmt(health.daily("activeKcal")), `неделя ${fmt(sum(wk("activeKcal")))}`, ACCENT.food.c, "food"],
    [ICONS.clock,   "Активные минуты", fmt(health.daily("activeMin")), `неделя ${fmt(sum(wk("activeMin")))} из 150`, ACCENT.goals.c, "workout"],
    [ICONS.moon,    "Сон", `${fmt(health.daily("sleep"), 1)} ч`, `глубокий ${fmt(health.daily("sleepDeep"), 1)} ч`, ACCENT.sleep.c, "sleep"],
    [ICONS.award,   "VO₂max", fmt(health.daily("vo2max")), "мл/кг/мин", ACCENT.awards.c, "heart"],
    [ICONS.steps,   "Кислород (SpO₂)", `${fmt(health.daily("spo2"))}%`, "ночью", ACCENT.steps.c, "heart"],
    [ICONS.dumbbell,"Тренировки", fmt(progress?.workouts), `на неделе ${fmt(progress?.workoutsWeek)}`, ACCENT.workout.c, "workout"],
    [ICONS.chart,   "Дистанция", `${fmt(health.daily("distance"), 1)} км`, `этажей ${fmt(health.daily("floors"))}`, ACCENT.goals.c, "steps"],
    [ICONS.trophy,  "Серия сна 7ч+", fmt(progress?.sleepStreak), "ночей подряд", ACCENT.sleep.c, "sleep"],
  ];
  const awards = [
    ["Первые 50", true], ["100 тренировок", true], ["14 дней подряд", true],
    ["1 млн шагов", true], ["200 тренировок", false], ["Марафон 42 км", false],
  ];

  return (
    <div style={{ padding: "6px 22px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 8 }}>
        <div>
          <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Профиль</div>
          <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink, marginTop: 4 }}>{survey?.name || "—"}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
            <span style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>{account?.phone || "@ax77291"}</span>
            <span style={{ width: 3, height: 3, borderRadius: 2, background: PF.ink3 }} />
            <span style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.terra, fontWeight: 600, background: "rgba(169,112,96,0.14)", padding: "3px 10px", borderRadius: R.pill }}>Любитель</span>
          </div>
        </div>
        <button type="button" onClick={onOpenSettings}
          style={{ width: 40, height: 40, borderRadius: R.pill, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", ...glass(0.7) }}>
          <Glyph d={ICONS.gear} size={19} color={PF.ink2} />
        </button>
      </div>

      {/* Hero: персонаж в полный рост */}
      <div style={{ marginTop: 14 }}>
        {gender === "female"
          ? <SheetBody view={view} height={460} />
          : <CharacterImage gender={gender} view={view} height={460} />}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 12, gap: 10, flexWrap: "wrap" }}>
        <Toggle options={[["front", "Спереди"], ["back", "Сзади"]]} value={view} onChange={setView} />
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ display: "flex", alignItems: "center", gap: 6, padding: "9px 14px", borderRadius: R.pill, ...glass(0.7) }}>
            <Glyph d={ICONS.coin} size={15} color={PF.terra} />
            <span style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>320</span>
          </span>
          <button type="button" onClick={onOpenEditor}
            style={{
              borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", fontFamily: sfPro, ...TYPE.headline,
              color: "#fff", background: PF.terra, padding: "12px 20px", borderRadius: R.pill,
              boxShadow: "0 6px 18px rgba(169,112,96,0.38), inset 0 1px 0 rgba(255,255,255,0.28)",
            }}>
            Настроить образ
          </button>
        </div>
      </div>
      <div style={{ display: "inline-block", fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 12, padding: "8px 14px", borderRadius: R.pill, ...glass(0.6) }}>
        {survey?.height || "—"} см · {(weightLog && weightLog.length ? weightLog[weightLog.length-1].kg : survey?.weight) || "—"} кг · {survey?.age || "—"} лет
      </div>

      {/* тренер → анкета и подписка; клиент → подбор тренера */}
      <div onClick={onOpenTrainer} role="button" className="fit-press"
        style={{ marginBottom: 16, padding: 16, borderRadius: R.tile, cursor: "pointer", display: "flex", alignItems: "center", gap: 14,
          backgroundImage: `linear-gradient(152deg, ${ACCENT.awards.c}1F 0%, ${ACCENT.awards.c}12 45%, rgba(255,255,255,0.72) 100%)`,
          backgroundColor: "rgba(255,253,250,0.62)", borderStyle: "solid", borderWidth: 1, borderColor: `${ACCENT.awards.c}2E`,
          boxShadow: `0 10px 28px ${ACCENT.awards.c}1A` }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: ACCENT.awards.soft, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Glyph d={ICONS.user} size={19} color={ACCENT.awards.c} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>
            {survey?.role === "trainer" ? "Анкета тренера" : "Найти тренера"}
          </div>
          <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 2 }}>
            {survey?.role === "trainer"
              ? (trainerActive ? "Подписка активна · вас видят клиенты" : "Подписка не активна · вас не видно")
              : "По вашей цели и ограничениям"}
          </div>
        </div>
        <Glyph d={ICONS.chevron} size={15} color={ACCENT.awards.c} />
      </div>

      <Eyebrow>Образ</Eyebrow>
      {/* Две карточки вели почти в одно место — свёл в одну, в общем стиле плашек */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: GRID.gap }}>
        {[
          { key: "appearance", title: "Внешность", sub: "Волосы, глаза, кожа",
            acc: ACCENT.shop, onClick: onOpenAppearance, preview: true },
          { key: "editor", title: "Модель", sub: "Фигура и ракурс",
            acc: ACCENT.tips, onClick: onOpenEditor, icon: ICONS.user },
        ].map((c) => (
          <div key={c.key} onClick={c.onClick} className="fit-press fit-glass"
            style={{
              position: "relative", overflow: "hidden", cursor: "pointer",
              padding: 16, borderRadius: R.tile, height: 132,
              display: "flex", flexDirection: "column", justifyContent: "space-between",
              backgroundImage: `linear-gradient(152deg, ${c.acc.c}1F 0%, ${c.acc.c}12 45%, rgba(255,255,255,0.72) 100%)`,
              backgroundColor: "rgba(255,253,250,0.62)",
              backdropFilter: "blur(34px) saturate(190%)",
              WebkitBackdropFilter: "blur(34px) saturate(190%)",
              borderStyle: "solid", borderWidth: 1, borderColor: `${c.acc.c}2E`,
              boxShadow: `0 10px 28px ${c.acc.c}1A, inset 0 1px 0 rgba(255,255,255,0.9)`,
            }}>
            {c.preview ? (
              <div style={{ width: 40, height: 40, borderRadius: 13, overflow: "hidden", flexShrink: 0 }}>
                <img src={face.ponytail ? PONYTAIL : HAIR_IMG[face.hairLength][face.hairTexture]} alt=""
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top", display: "block" }} />
              </div>
            ) : (
              <div style={{ width: 40, height: 40, borderRadius: 13, background: c.acc.soft,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Glyph d={c.icon} size={19} color={c.acc.c} />
              </div>
            )}
            <div>
              <div style={{ fontFamily: sfPro, fontSize: 17, fontWeight: 700, color: PF.ink,
                letterSpacing: "-0.3px" }}>{c.title}</div>
              <div style={{ fontFamily: sfPro, fontSize: 12.5, color: PF.ink2, marginTop: 3,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.sub}</div>
            </div>
            <div aria-hidden style={{ position: "absolute", right: 12, top: 18, opacity: 0.5 }}>
              <Glyph d={ICONS.chevron} size={15} color={c.acc.c} />
            </div>
          </div>
        ))}
      </div>

      <Eyebrow>Показатели</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: GRID.gap }}>
        {metrics.map(([icon, label, value, sub, color, statKey]) => (
          <MetricTile key={label + value} icon={icon} label={label} value={value} sub={sub} color={color}
            onClick={() => onOpenStat && onOpenStat(statKey, detailCtx)} />
        ))}
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: -6, marginBottom: 12 }}>
        <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>Источник: {sourceLabel}</div>
        {/* синхронизация: облако — через бэкенд, телефон — через мост, Bluetooth — напрямую */}
        <button type="button" onClick={async () => {
            setSyncMsg("Синхронизация…");
            let n = 0;
            try {
              if (nativeBridge.available()) n += await nativeBridge.sync();
              for (const p of ["strava", "google_fit"]) if ((survey?.apps || []).includes(p)) n += await cloudSync.pull(p, account?.token);
              setSyncMsg(n ? `Получено записей: ${n}` : "Нет подключённых источников — выберите их в настройках");
            } catch (e) { setSyncMsg("Не удалось: " + (e?.message || "сервер недоступен")); }
          }}
          style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", flexShrink: 0,
            borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "rgba(255,255,255,0.6)",
            fontFamily: sfPro, ...TYPE.caption, fontWeight: 700, color: PF.terra }}>
          Обновить
        </button>
      </div>
      {syncMsg && <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: -6, marginBottom: 12 }}>{syncMsg}</div>}

      <Eyebrow right={<span style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>{(progress?.unlocked || []).length} из {ACHIEVEMENTS.length}</span>}>
        Достижения
      </Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: GRID.gap }}>
        {ACHIEVEMENTS.map((a, i) => [a.title, (progress?.unlocked || []).includes(a.id), a.desc]).map(([label, got, desc], i) => (
          <div key={label} style={{
            display: "flex", alignItems: "center", gap: 10, padding: 14, borderRadius: R.tile,
            ...(got
              ? { background: "rgba(169,112,96,0.16)", borderStyle: "solid", borderWidth: 1, borderColor: "rgba(169,112,96,0.24)", boxShadow: "inset 0 1px 0 rgba(255,255,255,0.7)" }
              : { background: "rgba(255,252,248,0.5)", borderStyle: "dashed", borderWidth: 1, borderColor: PF.line }),
          }}>
            <Glyph d={ICONS.award} size={17} color={got ? [ACCENT.awards.c, ACCENT.goals.c, ACCENT.steps.c, ACCENT.shop.c, ACCENT.food.c, ACCENT.sleep.c][i % 6] : PF.ink3} />
            <div style={{ minWidth: 0 }}>
              <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: got ? 600 : 500, color: got ? PF.ink : PF.ink2 }}>{label}</div>
              <div style={{ fontFamily: sfPro, fontSize: 11, color: PF.ink3, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{desc}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}



/****************************************************************************
 *  ГЛАВА 4. ВХОД В ПРИЛОЖЕНИЕ
 *  Языки, сервер, источники данных, регистрация, анкета
 ****************************************************************************/

// ============================ ЛОКАЛИЗАЦИЯ ============================
// Флаги: полосы в правильном порядке и направлении
const FLAG_STRIPES = {
  ru: { dir: "180deg", colors: ["#FFFFFF", "#0039A6", "#D52B1E"] },
  en: { dir: "135deg", colors: ["#012169", "#FFFFFF", "#C8102E"] },
  zh: { custom: "linear-gradient(115deg, #FFDE00 0%, #FFDE00 9%, #DE2910 9%, #DE2910 100%)" },
  it: { dir: "90deg",  colors: ["#008C45", "#F4F5F0", "#CD212A"] },
  de: { dir: "180deg", colors: ["#000000", "#DD0000", "#FFCE00"] },
  fr: { dir: "90deg",  colors: ["#0055A4", "#FFFFFF", "#EF4135"] },
};
const flagBg = (id) => {
  const f = FLAG_STRIPES[id];
  if (!f) return "transparent";
  if (f.custom) return f.custom;
  const [a, b, c] = f.colors;
  return `linear-gradient(${f.dir}, ${a} 0%, ${a} 33.33%, ${b} 33.33%, ${b} 66.66%, ${c} 66.66%, ${c} 100%)`;
};

const LANGS = [
  { id: "ru", label: "Русский", flag: "RU" },
  { id: "en", label: "English", flag: "EN" },
  { id: "zh", label: "中文", flag: "ZH" },
  { id: "it", label: "Italiano", flag: "IT" },
  { id: "de", label: "Deutsch", flag: "DE" },
  { id: "fr", label: "Français", flag: "FR" },
];
const I18N = {
  ru: { phoneQ:"Ваш номер телефона", phoneSub:"На него придёт код подтверждения", getCode:"Получить код", codeQ:"Введите код", codeSub:"Отправили на", resend:"Отправить снова", wrongCode:"Неверный код", offline:"Сервер недоступен — продолжаем локально", agree:"Продолжая, вы соглашаетесь с условиями",
    reset:"Пройти онбординг заново", resetSub:"Заставка, выбор языка и опрос",
    settings:"Настройки", units:"Единицы", notif:"Напоминания", weightNotif:"Напоминать про вес", weightTime:"Время напоминания", about:"О приложении", weighIn:"Отметьте вес", weighSub:"Каждый день утром — план питания пересчитается", save:"Сохранить", plan:"План питания", kcal:"ккал", prot:"Белки", fat:"Жиры", carb:"Углеводы", recalc:"План пересчитан", call:"Позвонить", audio:"Аудио", video:"Видео", calling:"Соединение…", endCall:"Завершить", mute:"Микрофон", cam:"Камера",
    name:"Как вас зовут?", namePh:"Имя", genderQ:"Ваш пол", female:"Женский", male:"Мужской",
    bodyQ:"Рост, вес и возраст", height:"Рост, см", weightL:"Вес, кг", ageL:"Возраст",
    roleQ:"Кто вы?", trainee:"Тренируюсь", traineeSub:"Личные тренировки и питание",
    trainer:"Я тренер", trainerSub:"Веду подопечных", expQ:"Опыт тренировок",
    goalsQ:"Ваши цели", goalsSub:"Можно выбрать до трёх", contraQ:"Противопоказания",
    contraSub:"Учтём при подборе упражнений", contraOwn:"Своё — не более пяти",
    add:"Добавить", back:"Назад", next:"Далее", finish:"Начать", selected:"выбрано",
    choose:"Выберите язык", chooseSub:"Позже можно изменить в настройках", cont:"Продолжить",
    today:"Сегодня", workouts:"Тренировки", progress:"Прогресс", chats:"Чаты", profile:"Профиль",
    steps:"Шаги", food:"Питание", sleep:"Сон", goals:"Цели", awards:"Достижения", shop:"Магазин",
    tips:"Совет дня", editTiles:"Настроить", done:"Готово", addTile:"Добавить плашку",
    friends:"Друзья", addFriend:"Добавить по номеру", phone:"Номер телефона", search:"Найти",
    language:"Язык" },
  en: { phoneQ:"Your phone number", phoneSub:"We will send a confirmation code", getCode:"Get code", codeQ:"Enter the code", codeSub:"Sent to", resend:"Resend", wrongCode:"Wrong code", offline:"Server unavailable — continuing locally", agree:"By continuing you accept the terms",
    reset:"Restart onboarding", resetSub:"Splash, language and survey",
    settings:"Settings", units:"Units", notif:"Reminders", weightNotif:"Weight reminder", weightTime:"Reminder time", about:"About", weighIn:"Log your weight", weighSub:"Every morning — your plan will be recalculated", save:"Save", plan:"Nutrition plan", kcal:"kcal", prot:"Protein", fat:"Fat", carb:"Carbs", recalc:"Plan updated", call:"Call", audio:"Audio", video:"Video", calling:"Connecting…", endCall:"End", mute:"Mic", cam:"Camera",
    name:"What's your name?", namePh:"Name", genderQ:"Your gender", female:"Female", male:"Male",
    bodyQ:"Height, weight and age", height:"Height, cm", weightL:"Weight, kg", ageL:"Age",
    roleQ:"Who are you?", trainee:"I train", traineeSub:"Personal workouts and nutrition",
    trainer:"I'm a coach", trainerSub:"I guide clients", expQ:"Training experience",
    goalsQ:"Your goals", goalsSub:"Up to three", contraQ:"Health limitations",
    contraSub:"We'll adapt your exercises", contraOwn:"Your own — up to five",
    add:"Add", back:"Back", next:"Next", finish:"Start", selected:"selected",
    choose:"Choose language", chooseSub:"You can change it later in settings", cont:"Continue",
    today:"Today", workouts:"Workouts", progress:"Progress", chats:"Chats", profile:"Profile",
    steps:"Steps", food:"Nutrition", sleep:"Sleep", goals:"Goals", awards:"Awards", shop:"Shop",
    tips:"Tip of the day", editTiles:"Edit", done:"Done", addTile:"Add tile",
    friends:"Friends", addFriend:"Add by phone", phone:"Phone number", search:"Search",
    language:"Language" },
  zh: { phoneQ:"你的手机号", phoneSub:"我们将发送验证码", getCode:"获取验证码", codeQ:"输入验证码", codeSub:"已发送至", resend:"重新发送", wrongCode:"验证码错误", offline:"服务器不可用 — 本地继续", agree:"继续即表示同意条款",
    reset:"重新开始引导", resetSub:"启动页、语言与问卷",
    settings:"设置", units:"单位", notif:"提醒", weightNotif:"体重提醒", weightTime:"提醒时间", about:"关于", weighIn:"记录体重", weighSub:"每天早晨 — 计划将重新计算", save:"保存", plan:"饮食计划", kcal:"千卡", prot:"蛋白质", fat:"脂肪", carb:"碳水", recalc:"计划已更新", call:"通话", audio:"语音", video:"视频", calling:"连接中…", endCall:"结束", mute:"麦克风", cam:"摄像头",
    name:"你叫什么名字？", namePh:"姓名", genderQ:"性别", female:"女", male:"男",
    bodyQ:"身高、体重和年龄", height:"身高 (厘米)", weightL:"体重 (公斤)", ageL:"年龄",
    roleQ:"你是？", trainee:"我在训练", traineeSub:"个人训练与饮食",
    trainer:"我是教练", trainerSub:"我指导学员", expQ:"训练经验",
    goalsQ:"你的目标", goalsSub:"最多三个", contraQ:"健康限制",
    contraSub:"我们会据此调整动作", contraOwn:"自定义 — 最多五个",
    add:"添加", back:"返回", next:"下一步", finish:"开始", selected:"已选",
    choose:"选择语言", chooseSub:"稍后可在设置中更改", cont:"继续",
    today:"今天", workouts:"训练", progress:"进度", chats:"聊天", profile:"我的",
    steps:"步数", food:"饮食", sleep:"睡眠", goals:"目标", awards:"成就", shop:"商店",
    tips:"每日建议", editTiles:"编辑", done:"完成", addTile:"添加卡片",
    friends:"好友", addFriend:"通过手机号添加", phone:"手机号", search:"搜索",
    language:"语言" },
  it: { phoneQ:"Il tuo numero", phoneSub:"Invieremo un codice di conferma", getCode:"Ricevi codice", codeQ:"Inserisci il codice", codeSub:"Inviato a", resend:"Invia di nuovo", wrongCode:"Codice errato", offline:"Server non disponibile — si continua in locale", agree:"Continuando accetti i termini",
    reset:"Rifare onboarding", resetSub:"Splash, lingua e questionario",
    settings:"Impostazioni", units:"Unità", notif:"Promemoria", weightNotif:"Promemoria peso", weightTime:"Orario", about:"Info", weighIn:"Registra il peso", weighSub:"Ogni mattina — il piano verrà ricalcolato", save:"Salva", plan:"Piano alimentare", kcal:"kcal", prot:"Proteine", fat:"Grassi", carb:"Carboidrati", recalc:"Piano aggiornato", call:"Chiama", audio:"Audio", video:"Video", calling:"Connessione…", endCall:"Termina", mute:"Microfono", cam:"Camera",
    name:"Come ti chiami?", namePh:"Nome", genderQ:"Genere", female:"Femminile", male:"Maschile",
    bodyQ:"Altezza, peso ed età", height:"Altezza, cm", weightL:"Peso, kg", ageL:"Età",
    roleQ:"Chi sei?", trainee:"Mi alleno", traineeSub:"Allenamenti e alimentazione",
    trainer:"Sono un coach", trainerSub:"Seguo atleti", expQ:"Esperienza",
    goalsQ:"I tuoi obiettivi", goalsSub:"Fino a tre", contraQ:"Limitazioni",
    contraSub:"Ne terremo conto negli esercizi", contraOwn:"Personali — max cinque",
    add:"Aggiungi", back:"Indietro", next:"Avanti", finish:"Inizia", selected:"selezionati",
    choose:"Scegli la lingua", chooseSub:"Potrai cambiarla nelle impostazioni", cont:"Continua",
    today:"Oggi", workouts:"Allenamenti", progress:"Progressi", chats:"Chat", profile:"Profilo",
    steps:"Passi", food:"Alimentazione", sleep:"Sonno", goals:"Obiettivi", awards:"Premi", shop:"Negozio",
    tips:"Consiglio del giorno", editTiles:"Modifica", done:"Fatto", addTile:"Aggiungi",
    friends:"Amici", addFriend:"Aggiungi per numero", phone:"Numero", search:"Cerca",
    language:"Lingua" },
  de: { phoneQ:"Ihre Telefonnummer", phoneSub:"Wir senden einen Bestätigungscode", getCode:"Code anfordern", codeQ:"Code eingeben", codeSub:"Gesendet an", resend:"Erneut senden", wrongCode:"Falscher Code", offline:"Server nicht erreichbar — lokal fortfahren", agree:"Mit dem Fortfahren akzeptieren Sie die Bedingungen",
    reset:"Onboarding neu starten", resetSub:"Splash, Sprache und Fragebogen",
    settings:"Einstellungen", units:"Einheiten", notif:"Erinnerungen", weightNotif:"Gewichts-Erinnerung", weightTime:"Uhrzeit", about:"Über die App", weighIn:"Gewicht eintragen", weighSub:"Jeden Morgen — der Plan wird neu berechnet", save:"Speichern", plan:"Ernährungsplan", kcal:"kcal", prot:"Eiweiß", fat:"Fett", carb:"Kohlenhydrate", recalc:"Plan aktualisiert", call:"Anrufen", audio:"Audio", video:"Video", calling:"Verbinden…", endCall:"Beenden", mute:"Mikrofon", cam:"Kamera",
    name:"Wie heißen Sie?", namePh:"Name", genderQ:"Geschlecht", female:"Weiblich", male:"Männlich",
    bodyQ:"Größe, Gewicht und Alter", height:"Größe, cm", weightL:"Gewicht, kg", ageL:"Alter",
    roleQ:"Wer sind Sie?", trainee:"Ich trainiere", traineeSub:"Training und Ernährung",
    trainer:"Ich bin Coach", trainerSub:"Ich betreue Klienten", expQ:"Trainingserfahrung",
    goalsQ:"Ihre Ziele", goalsSub:"Bis zu drei", contraQ:"Einschränkungen",
    contraSub:"Wir passen die Übungen an", contraOwn:"Eigene — max fünf",
    add:"Hinzufügen", back:"Zurück", next:"Weiter", finish:"Starten", selected:"ausgewählt",
    choose:"Sprache wählen", chooseSub:"Später in den Einstellungen änderbar", cont:"Weiter",
    today:"Heute", workouts:"Training", progress:"Fortschritt", chats:"Chats", profile:"Profil",
    steps:"Schritte", food:"Ernährung", sleep:"Schlaf", goals:"Ziele", awards:"Erfolge", shop:"Shop",
    tips:"Tipp des Tages", editTiles:"Bearbeiten", done:"Fertig", addTile:"Kachel hinzufügen",
    friends:"Freunde", addFriend:"Per Nummer hinzufügen", phone:"Telefonnummer", search:"Suchen",
    language:"Sprache" },
  fr: { settings:"Réglages", units:"Unités", notif:"Rappels", weightNotif:"Rappel du poids", weightTime:"Heure du rappel", about:"À propos", weighIn:"Notez votre poids", weighSub:"Chaque matin — le plan sera recalculé", save:"Enregistrer", plan:"Plan nutritionnel", kcal:"kcal", prot:"Protéines", fat:"Lipides", carb:"Glucides", recalc:"Plan mis à jour", call:"Appeler", audio:"Audio", video:"Vidéo", calling:"Connexion…", endCall:"Terminer", mute:"Micro", cam:"Caméra",
    reset:"Refaire l'introduction", resetSub:"Splash, langue et questionnaire",
    phoneQ:"Votre numéro", phoneSub:"Nous enverrons un code de confirmation", getCode:"Recevoir le code", codeQ:"Saisissez le code", codeSub:"Envoyé au", resend:"Renvoyer", wrongCode:"Code incorrect", offline:"Serveur indisponible — on continue en local", agree:"En continuant, vous acceptez les conditions",
    name:"Comment vous appelez-vous ?", namePh:"Prénom", genderQ:"Votre genre", female:"Femme", male:"Homme",
    bodyQ:"Taille, poids et âge", height:"Taille, cm", weightL:"Poids, kg", ageL:"Âge",
    roleQ:"Qui êtes-vous ?", trainee:"Je m'entraîne", traineeSub:"Séances et nutrition perso", trainer:"Je suis coach", trainerSub:"J'accompagne des clients", expQ:"Expérience d'entraînement",
    goalsQ:"Vos objectifs", goalsSub:"Jusqu'à trois", contraQ:"Limitations", contraSub:"Nous adapterons les exercices", contraOwn:"Les vôtres — max cinq",
    add:"Ajouter", back:"Retour", next:"Suivant", finish:"Commencer", selected:"choisis",
    choose:"Choisissez la langue", chooseSub:"Modifiable plus tard dans les réglages", cont:"Continuer",
    today:"Aujourd'hui", workouts:"Séances", progress:"Progrès", chats:"Discussions", profile:"Profil",
    steps:"Pas", food:"Nutrition", sleep:"Sommeil", goals:"Objectifs", awards:"Trophées", shop:"Boutique",
    tips:"Conseil du jour", editTiles:"Modifier", done:"Terminé", addTile:"Ajouter une carte",
    friends:"Amis", addFriend:"Ajouter par numéro", phone:"Numéro de téléphone", search:"Chercher", language:"Langue" },
};
const useT = (lang) => (k) => (I18N[lang] && I18N[lang][k]) || I18N.ru[k] || k;


// ============================ СВЯЗЬ С СЕРВЕРОМ ============================
// Единая точка входа для запросов к серверу. При недоступности API
// приложение продолжает работать в локальном режиме.
const API_BASE = "/api";

async function apiCall(path, body, { timeout = 6000, token = null } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    const res = await fetch(API_BASE + path, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),   // токен только в заголовке
      },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) throw new Error("http_" + res.status);
    return { ok: true, data: await res.json() };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  } finally {
    clearTimeout(timer);
  }
}

const authApi = {
  requestCode: (phone) => apiCall("/auth/request-code", { phone }),
  verify: (phone, code) => apiCall("/auth/verify", { phone, code }),
  // профиль уходит на сервер сразу после регистрации
  saveProfile: (token, profile) => apiCall("/profile", { profile }, { token }),
};



// ============================ ИСТОЧНИКИ ДАННЫХ ============================
// Два шага перед номером: приложения здоровья и гаджеты. Оба можно пропустить.
function SourcesScreen({ survey, setSurvey, onDone, onBack, startPage = 0 }) {
  const [page, setPage] = useState(startPage);
  const [showAll, setShowAll] = useState(false);
  const [bleState, setBleState] = useState(null);   // { name, hr } | { error }
  const isApps = page === 0;
  const full = isApps ? APP_SOURCES : GADGETS;
  const list = showAll ? full : full.slice(0, 4);
  React.useEffect(() => { setShowAll(false); }, [page]);
  const connectBle = async () => {
    if (!bleHeartRate.available()) { setBleState({ error: "Bluetooth в этом браузере недоступен — откройте в Chrome или в приложении" }); return; }
    try {
      const name = await bleHeartRate.connect((s) => setBleState((st) => ({ ...(st || {}), name, hr: s[0].value })));
      setBleState({ name, hr: null });
    } catch (e) { setBleState({ error: e && e.message ? e.message : "Не удалось подключить" }); }
  };
  const field = isApps ? "apps" : "gadgets";
  const chosen = survey[field] || [];
  const toggle = (id) => setSurvey((s) => ({ ...s, [field]: chosen.includes(id) ? chosen.filter((x) => x !== id) : [...chosen, id] }));

  return (
    <div className="fit-screen" style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "18px 22px 30px" }}>
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" aria-label="Назад" onClick={() => (page ? setPage(0) : onBack())}
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
            cursor: "pointer", ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}><Glyph d={ICONS.chevron} size={15} color={PF.ink2} /></div>
        </button>
        <div style={{ display: "flex", gap: 6 }}>
          {[0, 1].map((k) => (
            <div key={k} style={{ width: 20, height: 6, borderRadius: 3, transformOrigin: "left center",
              transform: k === page ? "scaleX(1)" : "scaleX(0.3)", background: k <= page ? PF.terra : "rgba(63,48,41,0.16)",
              transition: "transform .25s cubic-bezier(.34,1.3,.5,1), background-color .25s" }} />
          ))}
        </div>
      </div>

      <div key={page} style={{ animation: "fitUp .4s ease-out both" }}>
        <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>
          {isApps ? "Откуда брать данные?" : "Какие гаджеты подключить?"}
        </div>
        <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 8, lineHeight: 1.45 }}>
          {isApps
            ? "Шаги, сон и тренировки подтянутся сами. Можно пропустить и подключить позже в настройках."
            : "Часы, браслет или весы — пульс и вес будут обновляться автоматически. Можно пропустить."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 20 }}>
          {list.map((it, i) => {
            const on = chosen.includes(it.id);
            return (
              <button key={it.id} type="button" onClick={() => toggle(it.id)} className="fit-press"
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "11px 14px", textAlign: "left",
                  borderRadius: R.tile, cursor: "pointer",
                  borderStyle: "solid", borderWidth: 1.5, borderColor: on ? it.c : "transparent",
                  background: on ? it.c + "14" : "rgba(255,255,255,0.7)",
                  transition: "background-color .2s, border-color .2s",
                  animation: `fitUp .4s ease-out ${i * 0.03}s both` }}>
                <div style={{ width: 56, height: 56, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  filter: "drop-shadow(0 4px 8px rgba(63,48,41,0.18))" }}>
                  {isApps ? DEVICE_ART.appIcon(it.c, it.art) : (DEVICE_ART[it.art] || DEVICE_ART.chest)(it.c)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{it.name}</div>
                  <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 2 }}>{it.sub}</div>
                  {on && it.via === "ble" && (
                    <div onClick={(e) => { e.stopPropagation(); connectBle(); }}
                      style={{ marginTop: 6, fontFamily: sfPro, ...TYPE.caption, fontWeight: 700, color: it.c }}>
                      {bleState?.name ? `Подключено: ${bleState.name}${bleState.hr ? ` · ${bleState.hr} уд/мин` : ""}` : (bleState?.error || "Подключить сейчас →")}
                    </div>
                  )}
                  {on && it.via === "native" && (
                    <div style={{ marginTop: 6, fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>
                      {nativeBridge.available() ? "Доступ запросится сейчас" : "Подключится в приложении на телефоне"}
                    </div>
                  )}
                  {on && it.via === "cloud" && (
                    <div style={{ marginTop: 6, fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>Вход через сервис после регистрации</div>
                  )}
                </div>
                <div style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0,
                  borderStyle: "solid", borderWidth: on ? 0 : 2, borderColor: PF.line,
                  background: on ? it.c : "transparent", transition: "background-color .2s",
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
                </div>
              </button>
            );
          })}
        </div>
        {!showAll && full.length > 4 && (
          <button type="button" onClick={() => setShowAll(true)}
            style={{ width: "100%", marginTop: 10, padding: "12px", borderRadius: R.pill, cursor: "pointer",
              borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "rgba(255,255,255,0.55)",
              fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600, color: PF.ink2 }}>
            Ещё {full.length - 4}
          </button>
        )}
        <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginTop: 12, lineHeight: 1.5 }}>
          {chosen.length ? `Выбрано: ${chosen.length}. ` : ""}Доступ к данным запросится при первом открытии на телефоне; приложение читает только шаги, сон, пульс и вес.
        </div>
      </div>

      <div style={{ flex: 1 }} />
      <button type="button" onClick={() => (isApps ? setPage(1) : onDone())}
        style={{ marginTop: 18, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
          background: PF.terra, color: "#fff", fontFamily: sfPro, ...TYPE.headline, padding: 16, borderRadius: R.pill,
          boxShadow: "0 10px 28px rgba(169,112,96,0.42)" }}>
        {chosen.length ? "Далее" : "Пропустить"}
      </button>
    </div>
  );
}

// ============================ РЕГИСТРАЦИЯ ПО НОМЕРУ ============================
function PhoneScreen({ lang, onDone, onBack, profile }) {
  const t = useT(lang);
  const [stage, setStage] = useState("phone");   // phone | code
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [err, setErr] = useState(false);
  const [left, setLeft] = useState(0);

  // Номер всегда начинается с 7 и содержит ровно 11 цифр.
  // Семёрку нельзя стереть и нельзя поставить цифру перед ней.
  const digits = phone.replace(/\D/g, "");
  const rest = digits.startsWith("7") ? digits.slice(1) : digits;   // 10 цифр после семёрки
  const valid = rest.length === 10;
  const tooShort = rest.length > 0 && rest.length < 10;

  const formatPhone = (raw) => {
    let d = String(raw).replace(/\D/g, "");
    if (d.startsWith("8")) d = "7" + d.slice(1);      // 8 в начале — это та же семёрка
    if (!d.startsWith("7")) d = "7" + d;              // семёрку вернуть, если стёрли
    d = d.slice(0, 11);                               // больше 11 цифр не принимаем
    const r = d.slice(1);
    let out = "+7";
    if (r.length) out += " " + r.slice(0, 3);
    if (r.length > 3) out += " " + r.slice(3, 6);
    if (r.length > 6) out += "-" + r.slice(6, 8);
    if (r.length > 8) out += "-" + r.slice(8, 10);
    return out;
  };

  useEffect(() => {
    if (left <= 0) return;
    const i = setInterval(() => setLeft((s) => s - 1), 1000);
    return () => clearInterval(i);
  }, [left]);

  const sendCode = async () => {
    if (!valid || busy) return;
    setBusy(true); setNote("");
    const r = await authApi.requestCode(phone);
    if (!r.ok) setNote(t("offline"));
    setBusy(false); setStage("code"); setLeft(45);
  };

  const setDigit = (i, v) => {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...code]; next[i] = d; setCode(next); setErr(false);
    if (d && i < 3) {
      const el = document.getElementById("fit-code-" + (i + 1));
      if (el) el.focus();
    }
    if (next.every((x) => x)) submit(next.join(""));
  };

  const submit = async (value) => {
    setBusy(true);
    const r = await authApi.verify(phone, value);
    setBusy(false);
    // Бэкенда нет — принимаем локально, чтобы прототип не вставал колом.
    const token = r.ok ? r.data?.token : "local-" + Date.now();
    if (r.ok) await authApi.saveProfile(token, { ...profile, phone });
    onDone({ phone, token, synced: r.ok });
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "18px 22px 30px" }}>
      {/* назад: с кода — к номеру, с номера — к опросу */}
      <div style={{ height: 56, flexShrink: 0, display: "flex", alignItems: "center" }}>
        <button type="button" aria-label="Назад"
          onClick={() => (stage === "code" ? setStage("phone") : onBack && onBack())}
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0,
            borderColor: "transparent", cursor: "pointer", ...glass(0.5),
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}>
            <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
          </div>
        </button>
      </div>
      <div style={{ animation: "fitUp .45s ease-out both" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: PF.terra, marginBottom: 22,
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 10px 26px rgba(169,112,96,0.4)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round">
            <rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" />
          </svg>
        </div>
        <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>
          {stage === "phone" ? t("phoneQ") : t("codeQ")}
        </div>
        <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 8 }}>
          {stage === "phone" ? t("phoneSub") : `${t("codeSub")} ${phone}`}
        </div>
      </div>

      <div style={{ marginTop: 28, animation: "fitUp .45s ease-out .08s both" }}>
        {stage === "phone" ? (
          <input value={phone} onChange={(e) => setPhone(formatPhone(e.target.value))} inputMode="tel" autoFocus
            onKeyDown={(e) => {
              // нельзя стереть «+7» и нельзя встать курсором перед ней
              const start = e.currentTarget.selectionStart ?? 0;
              if ((e.key === "Backspace" && start <= 2) || (e.key === "Delete" && start < 2)) e.preventDefault();
              if ((e.key === "Home" || e.key === "ArrowUp") ) e.preventDefault();
            }}
            onSelect={(e) => {
              const el = e.currentTarget;
              if ((el.selectionStart ?? 0) < 2) el.setSelectionRange(el.value.length, el.value.length);
            }}
            style={{ width: "100%", fontFamily: sfPro, ...TYPE.title1, color: PF.ink, letterSpacing: "0.5px",
              padding: "18px 20px", borderRadius: R.card, outline: "none",
              background: "rgba(255,252,248,0.72)", backdropFilter: "blur(20px)",
              borderStyle: "solid", borderWidth: 1.5, borderColor: `${valid ? PF.terra : tooShort ? "#C0503F" : "rgba(255,255,255,0.9)"}`,
              boxShadow: "0 6px 20px rgba(63,48,41,0.06)" }} />
        ) : (
          <>
            <div style={{ display: "flex", gap: 11, justifyContent: "center" }}>
              {[0, 1, 2, 3].map((i) => (
                <input key={i} id={"fit-code-" + i} value={code[i]}
                  onChange={(e) => setDigit(i, e.target.value)} inputMode="numeric" maxLength={1}
                  style={{ width: 58, height: 68, textAlign: "center", fontFamily: sfPro, ...TYPE.largeTitle,
                    color: PF.ink, borderRadius: R.tile, background: "rgba(255,252,248,0.72)",
                    backdropFilter: "blur(20px)", outline: "none",
                    borderStyle: "solid", borderWidth: 1.5, borderColor: `${err ? "#C0503F" : code[i] ? PF.terra : "rgba(255,255,255,0.9)"}`,
                    boxShadow: code[i] ? "0 6px 18px rgba(169,112,96,0.22)" : "0 2px 8px rgba(63,48,41,0.06)",
                    transition: "transform .2s, opacity .2s, background-color .2s, box-shadow .2s, color .2s, border-color .2s" }} />
              ))}
            </div>
            {err && <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: "#C0503F", textAlign: "center", marginTop: 12 }}>{t("wrongCode")}</div>}
            <button type="button" disabled={left > 0} onClick={sendCode}
              style={{ display: "block", margin: "18px auto 0", borderStyle: "solid", borderWidth: 0, borderColor: "transparent", background: "none",
                cursor: left > 0 ? "default" : "pointer", fontFamily: sfPro, ...TYPE.subhead,
                color: left > 0 ? PF.ink3 : PF.terra }}>
              {left > 0 ? `${t("resend")} · ${left}` : t("resend")}
            </button>
          </>
        )}
      </div>

      {stage === "phone" && (
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, padding: "0 4px" }}>
          <span style={{ fontFamily: sfPro, ...TYPE.caption, color: tooShort ? "#C0503F" : PF.ink3 }}>
            {tooShort ? "Номер должен содержать 11 цифр" : "Формат: +7 и 10 цифр"}
          </span>
          <span style={{ fontFamily: sfPro, ...TYPE.caption, fontWeight: 600,
            color: valid ? PF.terra : PF.ink3 }}>{rest.length}/10</span>
        </div>
      )}

      {note && (
        <div style={{ marginTop: 16, padding: "13px 15px", borderRadius: R.tile,
          background: "rgba(169,112,96,0.12)", fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>
          {note}
        </div>
      )}

      <div style={{ flex: 1 }} />

      {stage === "phone" && (
        <>
          <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, textAlign: "center", marginBottom: 14 }}>
            {t("agree")}
          </div>
          <button type="button" onClick={sendCode} disabled={!valid || busy}
            style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: valid ? "pointer" : "default", padding: 17, borderRadius: R.pill,
              fontFamily: sfPro, ...TYPE.headline,
              background: valid ? PF.terra : PF.bgDeep, color: valid ? "#fff" : PF.ink3,
              boxShadow: valid ? "0 10px 28px rgba(169,112,96,0.42)" : "none",
              transition: "transform .2s, opacity .2s, background-color .2s, box-shadow .2s, color .2s, border-color .2s" }}>
            {busy ? "…" : t("getCode")}
          </button>
        </>
      )}
    </div>
  );
}



// ============================ ФЛАГ-ТКАНЬ ============================
// Одно полотно, одна деформация. Национальный рисунок создаётся как цельная
// текстура и дальше движется только вместе с поверхностью ткани.


// ============================ ВЫБОР ЯЗЫКА ============================
// Барабан, как в системном пикере: выбранный язык по центру, остальные
// сверху и снизу с перспективой. Свайп с инерцией и доводкой до строки.
// За выбранным языком — размытая плашка в цветах флага, растворяющаяся по краям.
function LanguageWheel({ lang, setLang, onNext }) {
  const t = useT(lang);
  const ITEM = 46, ANGLE = 20, RADIUS = 132;
  const N = LANGS.length;

  const [offset, setOffset] = React.useState(() => Math.max(0, LANGS.findIndex((l) => l.id === lang)) * ITEM);
  const stateRef = React.useRef({ dragging: false, v: 0, raf: 0 });
  const [phase, setPhase] = useState(0);
  React.useEffect(() => {
    const a = setTimeout(() => setPhase(1), 120);
    const b = setTimeout(() => setPhase(2), 620);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  const idxFrom = (off) => Math.max(0, Math.min(N - 1, Math.round(off / ITEM)));
  React.useEffect(() => {
    const id = LANGS[idxFrom(offset)].id;
    if (id !== lang) setLang(id);
  }, [offset]);

  const clamp = (v) => Math.max(-ITEM * 0.6, Math.min((N - 1) * ITEM + ITEM * 0.6, v));

  const snap = (from) => {
    const target = idxFrom(from) * ITEM;
    const t0 = performance.now(), dur = 260;
    const step = (now) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setOffset(from + (target - from) * e);
      if (p < 1) stateRef.current.raf = requestAnimationFrame(step);
    };
    cancelAnimationFrame(stateRef.current.raf);
    stateRef.current.raf = requestAnimationFrame(step);
  };
  const glide = (v0, from) => {
    let v = v0, cur = from;
    const step = () => {
      v *= 0.94; cur = clamp(cur + v); setOffset(cur);
      if (Math.abs(v) > 0.4) stateRef.current.raf = requestAnimationFrame(step); else snap(cur);
    };
    cancelAnimationFrame(stateRef.current.raf);
    stateRef.current.raf = requestAnimationFrame(step);
  };

  const onDown = (e) => {
    e.preventDefault();
    cancelAnimationFrame(stateRef.current.raf);
    const s = stateRef.current; s.dragging = true; s.v = 0;
    let lastY = e.clientY, lastT = performance.now(), cur = offset;
    const onMove = (ev) => {
      const now = performance.now();
      const dy = lastY - ev.clientY;
      cur = clamp(cur + dy);
      s.v = (dy / Math.max(1, now - lastT)) * 16;
      lastY = ev.clientY; lastT = now;
      setOffset(cur);
    };
    const onUp = () => {
      s.dragging = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      if (Math.abs(s.v) > 1.2) glide(s.v, cur); else snap(cur);
    };
    // страница не должна прокручиваться или закрываться под пальцем
    const block = (ev) => ev.preventDefault();
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    const onUpAll = () => { window.removeEventListener("touchmove", block); onUp(); };
    window.addEventListener("pointerup", onUpAll);
    window.addEventListener("pointercancel", onUpAll);
  };
  const onWheel = (e) => { cancelAnimationFrame(stateRef.current.raf); snap(clamp(offset + (e.deltaY > 0 ? ITEM : -ITEM))); };

  React.useEffect(() => () => cancelAnimationFrame(stateRef.current.raf), []);
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowDown") snap(clamp(offset + ITEM));
      if (e.key === "ArrowUp") snap(clamp(offset - ITEM));
      if (e.key === "Enter" && phase >= 2) onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const active = idxFrom(offset);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "18px 22px 34px" }}>
      <div style={{ height: 56, flexShrink: 0 }} />
      <div style={{ animation: "fitUp .5s ease-out both" }}>
        <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>{t("choose")}</div>
        <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 8 }}>{t("chooseSub")}</div>
      </div>

      <div style={{ flex: 1, display: "flex", alignItems: "center",
        opacity: phase >= 1 ? 1 : 0,
        transform: phase >= 1 ? "none" : "translateY(18px) scale(.96)",
        transition: "opacity .5s ease, transform .55s cubic-bezier(.22,1,.36,1)" }}>
        <div onPointerDown={onDown} onWheel={onWheel}
          style={{ position: "relative", width: "100%", height: ITEM * 5,
            touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
            cursor: "grab", perspective: "760px", perspectiveOrigin: "50% 50%" }}>

          {/* плашка в цветах страны: каждый флаг — свой слой, смена — растворением */}
          <div style={{ position: "absolute", left: -18, right: -18, top: "50%",
            transform: "translateY(-50%)", height: ITEM + 34, pointerEvents: "none", zIndex: 0 }}>
            {LANGS.map((l, i) => {
              const on = i === active;
              return (
                <div key={l.id} style={{ position: "absolute", inset: 0,
                  backgroundImage: flagBg(l.id),
                  filter: "blur(13px) saturate(170%)",
                  opacity: on ? 0.9 : 0,
                  transform: on ? "scale(1)" : "scale(1.08)",
                  transition: "opacity .42s cubic-bezier(.22,1,.36,1), transform .5s cubic-bezier(.22,1,.36,1)",
                  maskImage: "radial-gradient(closest-side, #000 30%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.2) 76%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(closest-side, #000 30%, rgba(0,0,0,0.6) 55%, rgba(0,0,0,0.2) 76%, transparent 100%)" }} />
              );
            })}
            <div style={{ position: "absolute", inset: 0, background: "rgba(255,252,248,0.34)", filter: "blur(12px)",
              maskImage: "radial-gradient(closest-side, #000 8%, rgba(0,0,0,0.4) 40%, transparent 80%)",
              WebkitMaskImage: "radial-gradient(closest-side, #000 8%, rgba(0,0,0,0.4) 40%, transparent 80%)" }} />
          </div>

          {/* барабан */}
          <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d", pointerEvents: "none", zIndex: 1 }}>
            {LANGS.map((l, i) => {
              const dist = i - offset / ITEM;
              const angle = dist * ANGLE;
              if (Math.abs(angle) > 82) return null;
              const on = i === active;
              const far = Math.abs(dist);
              // чем дальше от центра — тем мельче, но не исчезает: минимум 62% размера и 45% видимости
              const scale = on ? 1.16 : Math.max(0.62, 1 - 0.13 * far);
              const alpha = on ? 1 : Math.max(0.45, Math.pow(Math.max(0, Math.cos((angle * Math.PI) / 180)), 0.9));
              return (
                <div key={l.id} style={{
                  position: "absolute", left: 0, right: 0, top: "50%", height: ITEM, marginTop: -ITEM / 2,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transform: `rotateX(${-angle}deg) translateZ(${RADIUS}px)`,
                  opacity: alpha, backfaceVisibility: "hidden" }}>
                  <span style={{ fontFamily: sfPro, fontSize: 22, letterSpacing: "-0.2px",
                    fontWeight: on ? 700 : 400, color: on ? PF.ink : PF.ink2,
                    display: "inline-block", transformOrigin: "center",
                    transform: `scale(${scale.toFixed(3)})`,
                    transition: "transform .3s cubic-bezier(.34,1.3,.5,1), color .2s, text-shadow .3s, font-weight .2s",
                    textShadow: on
                      ? "0 0 3px rgba(255,252,248,0.95), 0 0 8px rgba(255,252,248,0.9), 0 1px 2px rgba(255,252,248,0.9)"
                      : "none" }}>{l.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, textAlign: "center", marginBottom: 14,
        opacity: phase >= 2 ? 1 : 0, transition: "opacity .4s ease .05s" }}>
        Проведите пальцем вверх или вниз
      </div>
      <button type="button" onClick={onNext} disabled={phase < 2}
        style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
          background: PF.terra, color: "#fff", fontFamily: sfPro, ...TYPE.headline, padding: 17, borderRadius: R.pill,
          boxShadow: "0 10px 28px rgba(169,112,96,0.42)",
          opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "none" : "translateY(14px)",
          transition: "opacity .45s ease, transform .5s cubic-bezier(.22,1,.36,1)" }}>
        {t("cont")}
      </button>
    </div>
  );
}

function SplashScreen({ onDone }) {
  const WORD = "FitOS";
  // Паузы между нажатиями как у живого человека: не по метроному.
  // Перед заглавными дольше — рука тянется к Shift.
  const GAPS = [300, 145, 105, 235, 130];   // F · i · t · O · S
  const DELAY = GAPS.reduce((acc, g) => [...acc, (acc[acc.length - 1] || 0) + g], []);
  const HOLD = 560;                 // пауза после набора
  const SPIN = 2800;                // вихрь: мягкий разгон и долгий уход
  const [vortex, setVortex] = useState(false);
  const typeEnd = DELAY[DELAY.length - 1];

  // onDone держим в ссылке: иначе каждая перерисовка корня перезапускала
  // таймеры заставки — анимация мигала и тянулась вдвое дольше
  const doneRef = React.useRef(onDone);
  doneRef.current = onDone;
  useEffect(() => {
    const a = setTimeout(() => setVortex(true), typeEnd + HOLD);
    const b = setTimeout(() => doneRef.current && doneRef.current(), typeEnd + HOLD + SPIN - 180);
    return () => { clearTimeout(a); clearTimeout(b); };
  }, []);

  const oIndex = WORD.indexOf("O");

  return (
    <div style={{ position: "fixed", inset: 0, background: PF.bg, zIndex: 50,
      display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
      <style>{`
        /* буквы проявляются сами, без перерисовки — отсюда плавность */
        @keyframes fitType {
          0%   { opacity: 0; filter: blur(6px); transform: translateY(10px) scale(.92); }
          60%  { opacity: 1; filter: blur(0);   transform: translateY(-1px) scale(1.02); }
          100% { opacity: 1; filter: blur(0);   transform: none; }
        }
        @keyframes fitCaretMove { from { transform: translateX(-${WORD.length * 17}px); } to { transform: none; } }
        @keyframes fitCaretHold { 0%,100%{opacity:.2} 50%{opacity:1} }
        @keyframes fitCaretFade { 0%,100%{opacity:.15} 50%{opacity:1} }
        @keyframes fitCaretOut  { to { opacity: 0; transform: scaleY(.2); } }
        /* вихрь: разгон плавный, к концу растворяется */
        @keyframes fitSpin {
          0%   { transform: scale(1)    rotate(0deg);     opacity: 1;   filter: blur(0); }
          8%   { transform: scale(.92)  rotate(-14deg);   opacity: 1;   filter: blur(0); }
          18%  { transform: scale(1.15) rotate(24deg);    opacity: 1;   filter: blur(0); }
          30%  { transform: scale(2.1)  rotate(120deg);   opacity: 1;   filter: blur(.15px); }
          42%  { transform: scale(3.6)  rotate(245deg);   opacity: .98; filter: blur(.4px); }
          54%  { transform: scale(6.2)  rotate(390deg);   opacity: .92; filter: blur(.9px); }
          66%  { transform: scale(10.5) rotate(545deg);   opacity: .82; filter: blur(1.7px); }
          78%  { transform: scale(18)   rotate(710deg);   opacity: .64; filter: blur(3px); }
          89%  { transform: scale(31)   rotate(880deg);   opacity: .36; filter: blur(5.4px); }
          100% { transform: scale(52)   rotate(1040deg);  opacity: 0;   filter: blur(8.5px); }
        }
        @keyframes fitBloom {
          0%   { transform: scale(.05); opacity: 0; }
          18%  { opacity: .28; }
          40%  { opacity: .5; }
          100% { transform: scale(3.4); opacity: 0; }
        }
        @keyframes fitLettersOut { to { opacity: 0; filter: blur(4px); transform: translateY(-8px); } }
      `}</style>

      {/* мягкая волна из центра — сглаживает переход к следующему экрану */}
      {vortex && (
        <div aria-hidden style={{
          position: "absolute", width: "120vmax", height: "120vmax", borderRadius: "50%",
          background: `radial-gradient(circle, ${PF.terra}38 0%, ${PF.terra}14 45%, transparent 70%)`,
          opacity: 0,   // до старта анимации слой невидим — иначе вспышка
          animation: `fitBloom ${SPIN}ms cubic-bezier(.45,0,.3,1) 260ms both`,
          pointerEvents: "none",
        }} />
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 1, position: "relative" }}>
        {WORD.split("").map((ch, k) => {
          const isO = k === oIndex;
          return (
            <span key={k} style={{
              fontFamily: sfPro, fontSize: 54, fontWeight: 700, letterSpacing: "-1.6px",
              color: isO ? PF.terra : PF.ink,
              display: "inline-block", transformOrigin: "center",
              willChange: "transform, opacity, filter",
              // «O» уходит вихрем; соседние буквы тают сами, по очереди от центра.
              // Длительность набора слегка гуляет — не выглядит машинным.
              ...(vortex
                ? (isO
                    ? { animation: `fitSpin ${SPIN}ms cubic-bezier(.42,.02,.5,1) forwards`,
                        position: "relative", zIndex: 2 }
                    : { animation: `fitLettersOut 620ms cubic-bezier(.4,0,.55,1) ${Math.abs(k - oIndex) * 70}ms both` })
                : { animation: `fitType ${430 + (k % 3) * 60}ms cubic-bezier(.22,1,.36,1) ${DELAY[k]}ms both` }),
            }}>{ch}</span>
          );
        })}

        {/* курсор едет вместе с набором и мягко гаснет */}
        <span aria-hidden style={{
          width: 3, height: 46, marginLeft: 5, borderRadius: 2, background: PF.terra,
          display: "inline-block", willChange: "opacity, transform",
          animation: vortex
            ? "fitCaretOut 260ms ease forwards"
            : `fitCaretFade 1.1s ease-in-out infinite, fitCaretMove ${typeEnd}ms cubic-bezier(.35,0,.25,1) both`,
        }} />
      </div>
    </div>
  );
}



// ============================ ОПРОС ПРИ РЕГИСТРАЦИИ ============================
// Источники данных: приложения здоровья и носимые устройства.
// Само подключение (OAuth/HealthKit) выполняется на устройстве — здесь фиксируем выбор.
const APP_SOURCES = [
  { id:"apple_health",  name:"Apple Health",   sub:"Шаги, сон, пульс, тренировки", c:"#E0503F", art:"heart", via:"native" },
  { id:"health_connect",name:"Health Connect", sub:"Google: единый доступ на Android", c:"#34A853", art:"pulse", via:"native" },
  { id:"google_fit",    name:"Google Fit",     sub:"Шаги, активность, вес",        c:"#4285F4", art:"steps", via:"cloud" },
  { id:"strava",        name:"Strava",         sub:"Бег, вело, маршруты",          c:"#FC5200", art:"run", via:"cloud" },
  { id:"samsung",       name:"Samsung Health", sub:"Сон, шаги, пульс",             c:"#1B6EF3", art:"pulse" },
  { id:"garmin",        name:"Garmin Connect", sub:"Тренировки, VO₂max, сон",      c:"#2F7BC5", art:"watchRound" },
  { id:"mfp",           name:"MyFitnessPal",   sub:"Питание и калории",            c:"#0B6EE0", art:"plate" },
  { id:"huawei",        name:"Huawei Health",  sub:"Шаги, сон, пульс",             c:"#C8102E", art:"moon" },
  { id:"xiaomi",        name:"Mi Fitness",     sub:"Браслеты и часы Xiaomi",       c:"#FF6900", art:"band" },
];
// Иллюстрации устройств и приложений — объёмные, с материалом и бликами.
// Рисуются кодом, без чужих логотипов; каждое узнаётся по силуэту и цвету.
const S = 56;
const Wrap = ({ children, id }) => (
  <svg viewBox="0 0 56 56" width={S} height={S} aria-hidden>
    <defs>
      <linearGradient id={`g-${id}-body`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#3A3A3E" /><stop offset="1" stopColor="#111114" />
      </linearGradient>
      <linearGradient id={`g-${id}-glass`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff" stopOpacity=".55" /><stop offset=".5" stopColor="#ffffff" stopOpacity=".05" /><stop offset="1" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>
      <linearGradient id={`g-${id}-metal`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#F3EDE4" /><stop offset=".45" stopColor="#B9AFA3" /><stop offset="1" stopColor="#7C7168" />
      </linearGradient>
    </defs>
    {children}
  </svg>
);

const DEVICE_ART = {
  // Apple Watch: квадратный корпус, спортивный ремешок, кольца на экране
  watchSquare: (c) => (<Wrap id="aw">
    <rect x="21" y="2" width="14" height="13" rx="3" fill="#E8DCCB" /><rect x="21" y="41" width="14" height="13" rx="3" fill="#E8DCCB" />
    <rect x="15" y="12" width="26" height="32" rx="8" fill="url(#g-aw-body)" />
    <rect x="18" y="15" width="20" height="26" rx="6" fill="#0A0A0C" />
    <circle cx="28" cy="28" r="8.5" fill="none" stroke="#FF3B5C" strokeWidth="2.6" strokeDasharray="42 12" strokeLinecap="round" transform="rotate(-90 28 28)" />
    <circle cx="28" cy="28" r="5.5" fill="none" stroke="#B2FF39" strokeWidth="2.6" strokeDasharray="26 10" strokeLinecap="round" transform="rotate(-90 28 28)" />
    <circle cx="28" cy="28" r="2.6" fill="none" stroke="#3CE0FF" strokeWidth="2.4" strokeDasharray="10 6" strokeLinecap="round" transform="rotate(-90 28 28)" />
    <rect x="41" y="22" width="3" height="8" rx="1.5" fill="#6B6B70" />
    <rect x="15" y="12" width="26" height="32" rx="8" fill="url(#g-aw-glass)" />
  </Wrap>),
  // Круглые часы (Garmin, Galaxy, Huawei): безель, стрелки, ремешок цвета бренда
  watchRound: (c) => { const id = "wr" + c.slice(1); return (<Wrap id={id}>
    <rect x="22" y="1" width="12" height="13" rx="3" fill={c} opacity=".9" /><rect x="22" y="42" width="12" height="13" rx="3" fill={c} opacity=".9" />
    <circle cx="28" cy="28" r="15.5" fill={`url(#g-${id}-body)`} />
    <circle cx="28" cy="28" r="15.5" fill="none" stroke={`url(#g-${id}-metal)`} strokeWidth="2.4" />
    <circle cx="28" cy="28" r="12.5" fill="#0A0A0C" />
    <path d="M28 28V19M28 28l5 3" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
    <circle cx="28" cy="28" r="1.4" fill={c} />
    <path d="M28 16v2M40 28h-2M28 40v-2M16 28h2" stroke="#9A9A9F" strokeWidth="1.4" strokeLinecap="round" />
    <rect x="43" y="24" width="3" height="8" rx="1.5" fill="#8A8A90" />
    <circle cx="28" cy="28" r="15.5" fill="#fff" opacity=".07" />
  </Wrap>); },
  // Фитнес-браслет: капсула с экраном
  band: (c) => (<Wrap id="bd">
    <rect x="21" y="2" width="14" height="52" rx="7" fill={c} />
    <rect x="23" y="4" width="10" height="48" rx="5" fill="#1A1A1D" />
    <rect x="24" y="14" width="8" height="24" rx="3.5" fill="#0A0A0C" />
    <text x="28" y="23" textAnchor="middle" fontFamily="-apple-system, system-ui" fontSize="4.6" fontWeight="700" fill="#fff">8420</text>
    <text x="28" y="28.5" textAnchor="middle" fontFamily="-apple-system, system-ui" fontSize="3" fill="#9A9A9F">шагов</text>
    <path d="M25.5 32h5" stroke="#FF3B5C" strokeWidth="1.6" strokeLinecap="round" />
    <rect x="23" y="4" width="10" height="48" rx="5" fill="url(#g-bd-glass)" />
  </Wrap>),
  // Ремешок без экрана: вязаный браслет с датчиком
  strap: (c) => (<Wrap id="st">
    <rect x="18" y="4" width="20" height="48" rx="10" fill="#1E1E22" />
    {[10, 16, 22, 28, 34, 40, 46].map((y) => <path key={y} d={`M21 ${y}l14 3`} stroke="#3A3A40" strokeWidth="1.6" strokeLinecap="round" />)}
    <rect x="22" y="22" width="12" height="12" rx="4" fill="#0A0A0C" />
    <circle cx="28" cy="28" r="2.2" fill="#37E36B" />
    <rect x="18" y="4" width="20" height="48" rx="10" fill="url(#g-st-glass)" />
  </Wrap>),
  // Умное кольцо: металл, объём
  ring: (c) => (<Wrap id="rg">
    <ellipse cx="28" cy="31" rx="17" ry="9" fill="#000" opacity=".12" />
    <circle cx="28" cy="27" r="16" fill="url(#g-rg-metal)" />
    <circle cx="28" cy="27" r="9" fill={PF.bg} />
    <circle cx="28" cy="27" r="9" fill="none" stroke="#6E645B" strokeWidth="1.2" />
    <path d="M17 20a13 13 0 0 1 12-6" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" opacity=".85" />
  </Wrap>),
  // Умные весы: стекло, дисплей, четыре датчика
  scale: (c) => (<Wrap id="sc">
    <rect x="6" y="6" width="44" height="44" rx="10" fill="#F4F1EC" stroke="#D9D2C8" />
    <rect x="6" y="6" width="44" height="44" rx="10" fill="url(#g-sc-glass)" />
    <rect x="17" y="12" width="22" height="10" rx="3" fill="#0A0A0C" />
    <text x="28" y="19.5" textAnchor="middle" fontFamily="-apple-system, system-ui" fontSize="6.5" fontWeight="700" fill="#7CE3FF">72.4</text>
    {[[15, 40], [41, 40], [15, 30], [41, 30]].map(([x, y]) => <circle key={x + "" + y} cx={x} cy={y} r="2.2" fill="#B9AFA3" />)}
  </Wrap>),
  // Нагрудный пульсометр: эластичный ремень и датчик
  chest: (c) => (<Wrap id="ch">
    <path d="M2 28h52" stroke="#2A2A2E" strokeWidth="9" strokeLinecap="round" />
    <path d="M2 28h52" stroke="#3E3E44" strokeWidth="5" strokeLinecap="round" strokeDasharray="2 3" />
    <rect x="16" y="20" width="24" height="16" rx="8" fill="url(#g-ch-body)" />
    <path d="M21 28h3l2-3 2 6 2-3h4" stroke="#FF3B5C" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    <rect x="16" y="20" width="24" height="16" rx="8" fill="url(#g-ch-glass)" />
  </Wrap>),

  // Иконки приложений: цветная плашка со скруглением, символ белым
  appIcon: (c, kind) => { const id = "ap" + kind; return (<Wrap id={id}>
    <rect x="6" y="6" width="44" height="44" rx="12" fill={c} />
    <rect x="6" y="6" width="44" height="44" rx="12" fill={`url(#g-${id}-glass)`} />
    {kind === "heart" && <path d="M28 40s-12-7.5-12-16.5a6.5 6.5 0 0 1 12-3.5 6.5 6.5 0 0 1 12 3.5C40 32.5 28 40 28 40z" fill="#fff" />}
    {kind === "steps" && <><path d="M21 15c4 0 5 6 3 11s-5 5-6.5 2-1-13 3.5-13zM19.5 30c3 0 4 4 2.5 7s-5 2.5-5 0 0-7 2.5-7z" fill="#fff" /><path d="M35 20c4 0 5 6 3 11s-5 5-6.5 2-1-13 3.5-13zM33.5 35c3 0 4 4 2.5 7s-5 2.5-5 0 0-7 2.5-7z" fill="#fff" opacity=".8" /></>}
    {kind === "run" && <><circle cx="32" cy="15" r="3.5" fill="#fff" /><path d="M20 43l6-11-4-7 7-3 5 5 5-2M22 24l-5 2M25 33l5 4 3 6" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" /></>}
    {kind === "pulse" && <path d="M12 29h8l4-9 5 17 4-11 3 3h8" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
    {kind === "plate" && <><circle cx="28" cy="28" r="13" fill="none" stroke="#fff" strokeWidth="3" /><circle cx="28" cy="28" r="6" fill="#fff" /></>}
    {kind === "moon" && <path d="M31 13a13 13 0 1 0 12 18A11 11 0 0 1 31 13z" fill="#fff" />}
    {kind === "watchRound" && <><circle cx="28" cy="28" r="11" fill="none" stroke="#fff" strokeWidth="3" /><path d="M28 28v-6M28 28l4 2" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" /></>}
    {kind === "band" && <><rect x="23" y="13" width="10" height="30" rx="5" fill="none" stroke="#fff" strokeWidth="3" /><rect x="25.5" y="20" width="5" height="12" rx="2" fill="#fff" /></>}
  </Wrap>); },
};

const GADGETS = [
  { id:"apple_watch",   name:"Apple Watch",        sub:"Пульс, ЭКГ, сон, кольца",   c:"#3F3029", art:"watchSquare", via:"native" },
  { id:"pixel_watch",   name:"Pixel Watch",        sub:"Google: пульс, сон, шаги",  c:"#4285F4", art:"watchRound", via:"native" },
  { id:"fitbit",        name:"Fitbit",             sub:"Google: браслеты и часы",   c:"#00B0B9", art:"band", via:"native" },
  { id:"garmin_watch",  name:"Часы Garmin",        sub:"Пульс, GPS, восстановление", c:"#2F7BC5", art:"watchRound" },
  { id:"galaxy_watch",  name:"Galaxy Watch",       sub:"Пульс, сон, состав тела",   c:"#1B6EF3", art:"watchRound" },
  { id:"mi_band",       name:"Mi Band / Watch",    sub:"Шаги, сон, пульс",          c:"#FF6900", art:"band" },
  { id:"huawei_watch",  name:"Часы Huawei",        sub:"Пульс, SpO₂, сон",          c:"#C8102E", art:"watchRound" },
  { id:"whoop",         name:"Whoop",              sub:"Нагрузка и восстановление", c:"#3F3029", art:"strap" },
  { id:"oura",          name:"Кольцо Oura",        sub:"Сон и готовность",          c:"#8C5A7A", art:"ring" },
  { id:"scale",         name:"Умные весы",         sub:"Вес и состав тела",         c:"#5B7A52", art:"scale" },
  { id:"hr_strap",      name:"Нагрудный пульсометр", sub:"Bluetooth · подключается прямо сейчас", c:"#A9503F", art:"chest", via:"ble" },
];

const GOAL_OPTIONS = [
  { id:"lose",      ru:"Снизить вес",      en:"Lose weight",    icon:ICONS.flame,    c:"#E0663A" },
  { id:"muscle",    ru:"Набрать мышцы",    en:"Build muscle",   icon:ICONS.dumbbell, c:"#D2483F" },
  { id:"endurance", ru:"Выносливость",     en:"Endurance",      icon:ICONS.heart,    c:"#2E9BA6" },
  { id:"strength",  ru:"Сила",             en:"Strength",       icon:ICONS.dumbbell, c:"#D9A324" },
  { id:"posture",   ru:"Осанка и спина",   en:"Posture",        icon:ICONS.user,     c:"#6B62C4" },
  { id:"health",    ru:"Здоровье в целом", en:"General health", icon:ICONS.heart,    c:"#4E9E5F" },
  { id:"flex",      ru:"Гибкость",         en:"Flexibility",    icon:ICONS.chart,    c:"#C0559A" },
  { id:"energy",    ru:"Больше энергии",   en:"More energy",    icon:ICONS.flame,    c:"#8A6BD1" },
];
const EXP_OPTIONS = [
  { id:"none",  ru:"Никогда не тренировался", en:"Never trained" },
  { id:"lt1",   ru:"Меньше года",             en:"Less than a year" },
  { id:"1to3",  ru:"От года до трёх",         en:"One to three years" },
  { id:"gt3",   ru:"Больше трёх лет",         en:"Over three years" },
];
const CONTRA_OPTIONS = [
  { id:"none",   ru:"Нет ограничений",           en:"No limitations" },
  { id:"knee",   ru:"Колени",                    en:"Knees" },
  { id:"back",   ru:"Поясница",                  en:"Lower back" },
  { id:"shoulder",ru:"Плечи",                    en:"Shoulders" },
  { id:"neck",   ru:"Шея",                       en:"Neck" },
  { id:"hyper",  ru:"Повышенное давление",       en:"High blood pressure" },
  { id:"heart",  ru:"Сердце и сосуды",           en:"Heart conditions" },
  { id:"hernia", ru:"Грыжа",                     en:"Hernia" },
  { id:"diabet", ru:"Диабет",                    en:"Diabetes" },
  { id:"asthma", ru:"Астма",                     en:"Asthma" },
  { id:"preg",   ru:"Беременность",              en:"Pregnancy" },
  { id:"varicose",ru:"Варикоз",                  en:"Varicose veins" },
];
const optLabel = (o, lang) => (lang === "ru" ? o.ru : o.en);

function StepDots({ i, n }) {
  return (
    <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
      {Array.from({ length: n }).map((_, k) => (
        <div key={k} style={{ width: 20, height: 6, borderRadius: 3, transformOrigin: "left center",
          transform: k === i ? "scaleX(1)" : "scaleX(0.3)",
          background: k <= i ? PF.terra : "rgba(63,48,41,0.16)",
          transition: "transform .25s cubic-bezier(.34,1.3,.5,1), background-color .25s" }} />
      ))}
    </div>
  );
}

function Choice({ label, sub, active, onClick, icon }) {
  return (
    <button type="button" onClick={onClick}
      style={{ display: "flex", alignItems: "center", gap: 13, padding: "16px 18px", width: "100%",
        borderRadius: R.card, cursor: "pointer", textAlign: "left", marginBottom: 10,
        ...(active ? { background: "rgba(169,112,96,0.14)", borderStyle: "solid", borderWidth: 1.5, borderColor: `${PF.terra}` } : { ...glass(0.7) }) }}>
      {icon && (
        <div style={{ width: 36, height: 36, borderRadius: 12, flexShrink: 0,
          background: active ? "rgba(169,112,96,0.18)" : PF.bgDeep,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Glyph d={icon} size={17} color={active ? PF.terra : PF.ink2} />
        </div>
      )}
      <span style={{ flex: 1 }}>
        <span style={{ display: "block", fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{label}</span>
        {sub && <span style={{ display: "block", fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 2 }}>{sub}</span>}
      </span>
      {active && <Glyph d={<path d="M5 13l4 4L19 7" />} size={18} color={PF.terra} />}
    </button>
  );
}

function Field({ label, value, onChange, suffix, ...rest }) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginBottom: 6 }}>{label}</div>
      <div style={{ position: "relative" }}>
        <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="numeric" {...rest}
          style={{ width: "100%", fontFamily: sfPro, ...TYPE.title3, color: PF.ink, textAlign: "center",
            padding: "14px 10px", borderRadius: R.tile, borderStyle: "solid", borderWidth: 1, borderColor: PF.line,
            background: "#fff", outline: "none" }} />
      </div>
    </div>
  );
}


// Единый заголовок для всех вопросов онбординга.
function QTitle({ title, hint }) {
  return (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>{title}</div>
      {hint && (
        <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 8 }}>{hint}</div>
      )}
    </div>
  );
}

function SurveyScreen({ lang, setLang, survey, setSurvey, onDone, onBack, step, setStep }) {
  const t = useT(lang);
  const [customText, setCustomText] = useState("");
  const s = survey;
  const set = (patch) => setSurvey((p) => ({ ...p, ...patch }));

  const toggleGoal = (id) => set({ goals: s.goals.includes(id)
    ? s.goals.filter((g) => g !== id)
    : s.goals.length < 3 ? [...s.goals, id] : s.goals });

  const toggleContra = (id) => {
    if (id === "none") return set({ contra: s.contra.includes("none") ? [] : ["none"] });
    const rest = s.contra.filter((c) => c !== "none");
    set({ contra: rest.includes(id) ? rest.filter((c) => c !== id) : [...rest, id] });
  };
  const addCustom = () => {
    const v = customText.trim();
    if (!v || s.customContra.length >= 5) return;
    set({ customContra: [...s.customContra, v] });
    setCustomText("");
  };

  const steps = ["name", "role", "gender", "body", "goals", "exp", "contra"];
  const key = steps[step];
  const canNext = {
    name:   s.name.trim().length > 0,
    gender: !!s.gender,
    body:   Number(s.height) > 90 && Number(s.weight) > 25 && Number(s.age) > 9,
    role:   !!s.role,
    exp:    !!s.exp,
    goals:  s.goals.length > 0,
    contra: true,
  }[key];

  const next = () => step === steps.length - 1 ? onDone() : setStep(step + 1);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", padding: "18px 22px 26px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
        {step > 0 || onBack ? (
          <button type="button" aria-label="Назад" onClick={() => (step > 0 ? setStep(step - 1) : onBack())}
            style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
              ...glass(0.7), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ transform: "rotate(180deg)", display: "flex" }}>
              <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
            </div>
          </button>
        ) : <div style={{ width: 38 }} />}
        <StepDots i={step} n={steps.length} />
      </div>

      {/* вопросы прижаты к середине экрана, а не к верхнему краю */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center",
        paddingBottom: 24 }}>
        {key === "name" && (<>
          <QTitle title={t("name")} />
          <input autoFocus value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder={t("namePh")}
            style={{ width: "100%", fontFamily: sfPro, ...TYPE.title2, color: PF.ink,
              padding: "16px 18px", borderRadius: R.card, background: "#fff", outline: "none",
              borderStyle: "solid", borderWidth: 1.5, borderColor: `${s.name ? PF.terra : PF.line}` }} />
        </>)}

        {key === "gender" && (<>
          <QTitle title={t("genderQ")} />
          <Choice label={t("female")} active={s.gender === "female"} onClick={() => set({ gender: "female" })} />
          <Choice label={t("male")} active={s.gender === "male"} onClick={() => set({ gender: "male" })} />
        </>)}

        {key === "body" && (<>
          <QTitle title={t("bodyQ")} />
          <div style={{ display: "flex", gap: 10 }}>
            <Field label={t("height")} value={s.height} onChange={(v) => set({ height: v })} placeholder="170" />
            <Field label={t("weightL")} value={s.weight} onChange={(v) => set({ weight: v })} placeholder="65" />
            <Field label={t("ageL")} value={s.age} onChange={(v) => set({ age: v })} placeholder="28" />
          </div>
          <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink3, marginTop: 14, lineHeight: 1.5 }}>
            Вес можно будет отмечать каждый день — план питания пересчитается автоматически.
          </div>
        </>)}

        {key === "role" && (<>
          <QTitle title={t("roleQ")} />
          <Choice label={t("trainee")} sub={t("traineeSub")} icon={ICONS.user}
            active={s.role === "trainee"} onClick={() => set({ role: "trainee" })} />
          <Choice label={t("trainer")} sub={t("trainerSub")} icon={ICONS.award}
            active={s.role === "trainer"} onClick={() => set({ role: "trainer" })} />
        </>)}

        {key === "exp" && (<>
          <QTitle title={t("expQ")} />
          {EXP_OPTIONS.map((o) => (
            <Choice key={o.id} label={optLabel(o, lang)} active={s.exp === o.id} onClick={() => set({ exp: o.id })} />
          ))}
        </>)}

        {key === "goals" && (<>
          <QTitle title={t("goalsQ")} hint={`${t("goalsSub")} · ${s.goals.length}/3 ${t("selected")}`} />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: GRID.gap }}>
            {GOAL_OPTIONS.map((o) => {
              const on = s.goals.includes(o.id);
              const full = !on && s.goals.length >= 3;
              return (
                <button key={o.id} type="button" onClick={() => toggleGoal(o.id)} disabled={full}
                  style={{ padding: 15, borderRadius: R.tile, cursor: full ? "default" : "pointer",
                    textAlign: "left", opacity: full ? 0.4 : 1,
                    ...(on
                      ? { background: (o.c || PF.terra) + "22", borderStyle: "solid", borderWidth: 1.5, borderColor: o.c || PF.terra }
                      : { ...glass(0.7) }) }}>
                  <Glyph d={o.icon} size={17} color={o.c || PF.terra} />
                  <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600, color: PF.ink, marginTop: 8 }}>
                    {optLabel(o, lang)}
                  </div>
                </button>
              );
            })}
          </div>
        </>)}

        {key === "contra" && (<>
          <QTitle title={t("contraQ")} hint={t("contraSub")} />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {CONTRA_OPTIONS.map((o) => {
              const on = s.contra.includes(o.id);
              return (
                <button key={o.id} type="button" onClick={() => toggleContra(o.id)}
                  style={{ padding: "10px 15px", borderRadius: R.pill, cursor: "pointer",
                    fontFamily: sfPro, ...TYPE.subhead,
                    ...(on ? { background: PF.terra, color: "#fff", borderStyle: "solid", borderWidth: 1, borderColor: "transparent" }
                           : { ...glass(0.7), color: PF.ink }) }}>
                  {optLabel(o, lang)}
                </button>
              );
            })}
          </div>

          <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
            textTransform: "uppercase", letterSpacing: "0.06em", margin: "22px 0 10px" }}>
            {t("contraOwn")} · {s.customContra.length}/5
          </div>
          <div style={{ display: "flex", gap: 9, alignItems: "stretch", width: "100%" }}>
            <input value={customText} onChange={(e) => setCustomText(e.target.value)}
              disabled={s.customContra.length >= 5} size={1}
              style={{ flex: "1 1 0", minWidth: 0, fontFamily: sfPro, ...TYPE.body, color: PF.ink, padding: "13px 14px",
                borderRadius: R.tile, borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "#fff", outline: "none" }} />
            <button type="button" onClick={addCustom} disabled={!customText.trim() || s.customContra.length >= 5}
              style={{ flexShrink: 0, whiteSpace: "nowrap", borderStyle: "solid", borderWidth: 0, borderColor: "transparent", padding: "0 18px", borderRadius: R.tile,
                cursor: customText.trim() ? "pointer" : "default",
                fontFamily: sfPro, ...TYPE.headline,
                background: customText.trim() ? PF.terra : PF.bgDeep,
                color: customText.trim() ? "#fff" : PF.ink3 }}>
              {t("add")}
            </button>
          </div>
          {s.customContra.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
              {s.customContra.map((c, i) => (
                <span key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 14px",
                  borderRadius: R.pill, background: PF.bgDeep, fontFamily: sfPro, ...TYPE.subhead, color: PF.ink }}>
                  {c}
                  <button type="button" onClick={() => set({ customContra: s.customContra.filter((_, k) => k !== i) })}
                    style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", background: "none", cursor: "pointer", padding: 0, display: "flex" }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={PF.ink2} strokeWidth="2.6" strokeLinecap="round">
                      <path d="M6 6l12 12M18 6L6 18" />
                    </svg>
                  </button>
                </span>
              ))}
            </div>
          )}
        </>)}
      </div>

      <button type="button" onClick={next} disabled={!canNext}
        style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: canNext ? "pointer" : "default", marginTop: 24,
          background: canNext ? PF.terra : PF.bgDeep, color: canNext ? "#fff" : PF.ink3,
          fontFamily: sfPro, ...TYPE.headline, padding: 16, borderRadius: R.pill,
          boxShadow: canNext ? "0 8px 24px rgba(169,112,96,0.4)" : "none" }}>
        {step === steps.length - 1 ? t("finish") : t("next")}
      </button>
    </div>
  );
}



// Зелёная шкала: чем выше столбец, тем насыщеннее и темнее зелёный.
// hue уходит от травяного к хвойному, насыщенность и глубина растут вместе со значением.
/****************************************************************************
 *  ГЛАВА 5. РАСЧЁТЫ И ПРОГРЕСС
 *  КБЖУ, вес, достижения, статистика плашек
 ****************************************************************************/

// ============================ РАСЧЁТ КБЖУ ============================
// Mifflin-St Jeor: детерминированная формула, а не модель.
// Модель может объяснять текстом, но цифры должны быть воспроизводимы.
function computeMacros({ gender, heightCm, weightKg, age, goals = [], activity = 1.45 }) {
  const h = Number(heightCm) || 170, wt = Number(weightKg) || 65, a = Number(age) || 28;
  const bmr = gender === "male"
    ? 10 * wt + 6.25 * h - 5 * a + 5
    : 10 * wt + 6.25 * h - 5 * a - 161;
  const tdee = bmr * activity;
  let kcal = tdee;
  if (goals.includes("lose")) kcal = tdee * 0.82;          // мягкий дефицит 18%
  else if (goals.includes("muscle")) kcal = tdee * 1.12;   // умеренный профицит
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(wt * (goals.includes("muscle") ? 2.0 : 1.8));
  const fat = Math.round(wt * 0.9);
  const carbs = Math.max(0, Math.round((kcal - protein * 4 - fat * 9) / 4));
  return { kcal, protein, fat, carbs, bmr: Math.round(bmr), tdee: Math.round(tdee) };
}

// ============================ ЕЖЕДНЕВНЫЙ ВЕС ============================
function WeightBody({ lang, survey, weightLog, setWeightLog, macros, setMacros, compact = false }) {
  const t = useT(lang);
  const [val, setVal] = useState("");
  const [flash, setFlash] = useState(false);
  const today = new Date().toISOString().slice(0, 10);
  const loggedToday = weightLog.some((e) => e.date === today);
  const current = weightLog.length ? weightLog[weightLog.length - 1].kg : Number(survey.weight);

  const submit = () => {
    const kg = parseFloat(String(val).replace(",", "."));
    if (!kg || kg < 25 || kg > 300) return;
    const log = [...weightLog.filter((e) => e.date !== today), { date: today, kg }];
    setWeightLog(log);
    // Пересчитываем, если вес заметно изменился относительно веса плана
    const base = macros?.atWeight ?? Number(survey.weight);
    if (Math.abs(kg - base) >= 1.5 || !macros) {
      const raw = computeMacros({ gender: survey.gender, heightCm: survey.height, weightKg: kg, age: survey.age, goals: survey.goals });
      const g = guardNutrition(raw, { ...survey, weight: kg });
      setMacros({ ...g.macros, atWeight: kg, at: today, safetyFlags: g.flags });
      setFlash(true);
      setTimeout(() => setFlash(false), 2600);
    }
    setVal("");
  };

  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TileHead icon={ICONS.chart} label="Вес" color={ACCENT.weight.c} />
        <div style={{ flex: 1 }} />
        {loggedToday ? (
          <>
            <div style={{ fontFamily: sfPro, fontSize: 30, fontWeight: 700, color: PF.ink, lineHeight: 1, letterSpacing: "-0.6px" }}>
              {current}<span style={{ fontSize: 14, fontWeight: 600, color: PF.ink2, marginLeft: 4 }}>кг</span>
            </div>
            <div style={{ fontFamily: sfPro, fontSize: 12.5, color: PF.ink2, marginTop: 5 }}>сегодня отмечено</div>
          </>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" size={1}
              placeholder={String(current)}
              style={{ flex: "1 1 0", minWidth: 0, fontFamily: sfPro, fontSize: 20, fontWeight: 700, color: PF.ink,
                textAlign: "center", padding: "9px 6px", borderRadius: 12,
                borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "#fff", outline: "none" }} />
            <ArrowButton onClick={submit} color={ACCENT.weight.c} disabled={!val} />
          </div>
        )}
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 38, height: 38, borderRadius: 12, background: "rgba(169,112,96,0.13)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Glyph d={ICONS.chart} size={18} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{t("weighIn")}</div>
          <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 2 }}>
            {loggedToday ? `${current} кг · сегодня отмечено` : t("weighSub")}
          </div>
        </div>
      </div>

      {!loggedToday && (
        <div style={{ display: "flex", gap: 9, marginTop: 13, alignItems: "stretch", width: "100%" }}>
          <input value={val} onChange={(e) => setVal(e.target.value)} inputMode="decimal" size={1}
            placeholder={String(current)}
            style={{ flex: "1 1 0", minWidth: 0, fontFamily: sfPro, ...TYPE.title3, color: PF.ink, textAlign: "center",
              padding: "12px 10px", borderRadius: R.tile, borderStyle: "solid", borderWidth: 1, borderColor: PF.line,
              background: "#fff", outline: "none" }} />
          <button type="button" onClick={submit}
            style={{ flexShrink: 0, whiteSpace: "nowrap", borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", padding: "0 20px", borderRadius: R.tile,
              background: PF.terra, color: "#fff", fontFamily: sfPro, ...TYPE.headline }}>
            {t("save")}
          </button>
        </div>
      )}

      {flash && (
        <div className="fit-pop" style={{ marginTop: 12, padding: "12px 14px", borderRadius: R.tile,
          background: "rgba(169,112,96,0.14)", fontFamily: sfPro, ...TYPE.subhead, color: PF.ink }}>
          {t("recalc")}: {macros.kcal} {t("kcal")} · Б{macros.protein} Ж{macros.fat} У{macros.carbs}
        </div>
      )}
    </div>
  );
}

function MacrosBody({ lang, macros, compact = false }) {
  const t = useT(lang);
  if (!macros) return null;
  const items = [[t("kcal"), macros.kcal], [t("prot"), macros.protein + " г"],
                 [t("fat"), macros.fat + " г"], [t("carb"), macros.carbs + " г"]];
  if (compact) {
    const parts = [
      ["Белки", macros.protein, ACCENT.goals.c],
      ["Жиры", macros.fat, ACCENT.awards.c],
      ["Углев.", macros.carbs, ACCENT.steps.c],
    ];
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TileHead icon={ICONS.plate} label="План питания" color={ACCENT.macros.c} />
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: sfPro, fontSize: 30, fontWeight: 700, color: PF.ink, lineHeight: 1, letterSpacing: "-0.6px" }}>
          {macros.kcal}
        </div>
        <div style={{ fontFamily: sfPro, fontSize: 12.5, color: PF.ink2, marginTop: 4 }}>ккал в день</div>
        {/* три макроса — компактной полосой с цветными метками, без переносов */}
        <div style={{ display: "flex", gap: 6, marginTop: 9 }}>
          {parts.map(([l, v, c]) => (
            <div key={l} style={{ flex: "1 1 0", minWidth: 0, padding: "5px 6px", borderRadius: 9,
              background: c + "1A", display: "flex", flexDirection: "column", alignItems: "center" }}>
              <span style={{ fontFamily: sfPro, fontSize: 12.5, fontWeight: 700, color: PF.ink, lineHeight: 1 }}>{v}</span>
              <span style={{ fontFamily: sfPro, fontSize: 9.5, fontWeight: 600, color: c, marginTop: 3,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
        textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("plan")}</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        {items.map(([l, v]) => (
          <div key={l} style={{ textAlign: "center", flex: 1 }}>
            <div style={{ fontFamily: sfPro, ...TYPE.title3, color: PF.ink }}>{v}</div>
            <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 2 }}>{l}</div>
          </div>
        ))}
      </div>
      <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginTop: 12, lineHeight: 1.5 }}>
        Обмен покоя {macros.bmr} ккал · дневной расход {macros.tdee} ккал.
        Пересчитается, когда вес изменится на 1.5 кг.
      </div>
    </div>
  );
}

// ============================ ЗВОНОК ============================
function CallScreen({ lang, peer, mode, onEnd }) {
  const t = useT(lang);
  const [sec, setSec] = useState(0);
  const [connected, setConnected] = useState(false);
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(mode === "video");

  useEffect(() => {
    const c = setTimeout(() => setConnected(true), 1400);
    return () => clearTimeout(c);
  }, []);
  useEffect(() => {
    if (!connected) return;
    const i = setInterval(() => setSec((s) => s + 1), 1000);
    return () => clearInterval(i);
  }, [connected]);
  const mmss = `${String(Math.floor(sec / 60)).padStart(2, "0")}:${String(sec % 60).padStart(2, "0")}`;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60,
      background: mode === "video" ? "#2A211C" : PF.bg,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between",
      padding: "72px 22px 46px" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 108, height: 108, borderRadius: 999, margin: "0 auto",
          background: mode === "video" ? "rgba(255,255,255,0.12)" : PF.bgDeep,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: sfPro, ...TYPE.largeTitle,
            color: mode === "video" ? "#fff" : PF.ink2 }}>{peer[0]}</span>
        </div>
        <div style={{ fontFamily: sfPro, ...TYPE.title2, marginTop: 18,
          color: mode === "video" ? "#fff" : PF.ink }}>{peer}</div>
        <div style={{ fontFamily: sfPro, ...TYPE.subhead, marginTop: 6,
          color: mode === "video" ? "rgba(255,255,255,0.65)" : PF.ink2 }}>
          {connected ? mmss : t("calling")}
        </div>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <button type="button" onClick={() => setMicOn((v) => !v)} title={t("mute")}
          style={{ width: 58, height: 58, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            background: micOn ? (mode === "video" ? "rgba(255,255,255,0.16)" : PF.bgDeep) : "#8C5A4C",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={micOn ? (mode === "video" ? "#fff" : PF.ink) : "#fff"} strokeWidth="1.9" strokeLinecap="round">
            <rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0014 0M12 18v3" />
            {!micOn && <path d="M4 4l16 16" />}
          </svg>
        </button>

        <button type="button" onClick={onEnd} title={t("endCall")}
          style={{ width: 68, height: 68, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            background: "#C0503F", display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 10px 28px rgba(192,80,63,0.45)" }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round">
            <path d="M3 9a14 14 0 0118 0v3l-4 1-1-3a10 10 0 00-8 0l-1 3-4-1z" transform="rotate(135 12 12)" />
          </svg>
        </button>

        <button type="button" onClick={() => setCamOn((v) => !v)} title={t("cam")}
          style={{ width: 58, height: 58, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            background: camOn ? (mode === "video" ? "rgba(255,255,255,0.16)" : PF.bgDeep) : "#8C5A4C",
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={camOn ? (mode === "video" ? "#fff" : PF.ink) : "#fff"} strokeWidth="1.9" strokeLinecap="round">
            <rect x="3" y="6" width="12" height="12" rx="3" /><path d="M15 11l6-3v8l-6-3z" />
            {!camOn && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>

      <div style={{ fontFamily: sfPro, ...TYPE.caption,
        color: mode === "video" ? "rgba(255,255,255,0.5)" : PF.ink3, textAlign: "center", maxWidth: 280 }}>
        Интерфейс звонка. Реальное соединение заработает после подключения WebRTC и TURN-сервера.
      </div>
    </div>
  );
}

// ============================ НАСТРОЙКИ ============================
function SettingsScreen({ lang, setLang, onBack, survey, weightNotif, setWeightNotif, notifTime, setNotifTime, onResetOnboarding }) {
  const t = useT(lang);
  const Row = ({ label, children }) => (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "15px 18px", borderBottom: `1px solid ${PF.line}` }}>
      <span style={{ fontFamily: sfPro, ...TYPE.body, color: PF.ink }}>{label}</span>
      {children}
    </div>
  );
  return (
    <div style={{ padding: "0 22px 24px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0 10px" }}>
        <button type="button" onClick={onBack}
          style={{ width: 40, height: 40, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            ...glass(0.7), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}>
            <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
          </div>
        </button>
        <span style={{ fontFamily: sfPro, ...TYPE.title1, color: PF.ink }}>{t("settings")}</span>
      </div>

      <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
        textTransform: "uppercase", letterSpacing: "0.06em", margin: "18px 0 10px" }}>{t("language")}</div>
      <div style={{ borderRadius: R.card, overflow: "hidden", ...glass(0.78) }}>
        {LANGS.map((l, i) => (
          <button key={l.id} type="button" onClick={() => setLang(l.id)}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px",
              borderStyle: "solid", borderWidth: 0, borderColor: "transparent", background: lang === l.id ? "rgba(169,112,96,0.12)" : "transparent",
              borderBottom: i < LANGS.length - 1 ? `1px solid ${PF.line}` : "none", cursor: "pointer" }}>
            <span style={{ fontFamily: sfPro, ...TYPE.caption2, fontWeight: 700,
              width: 30, height: 30, borderRadius: 999, background: lang === l.id ? "#fff" : PF.bgDeep,
              color: lang === l.id ? PF.terra : PF.ink3,
              display: "flex", alignItems: "center", justifyContent: "center" }}>{l.flag}</span>
            <span style={{ flex: 1, textAlign: "left", fontFamily: sfPro, ...TYPE.body, color: PF.ink }}>{l.label}</span>
            {lang === l.id && <Glyph d={<path d="M5 13l4 4L19 7" />} size={17} color={PF.terra} />}
          </button>
        ))}
      </div>

      <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
        textTransform: "uppercase", letterSpacing: "0.06em", margin: "22px 0 10px" }}>{t("notif")}</div>
      <div style={{ borderRadius: R.card, overflow: "hidden", ...glass(0.78) }}>
        <Row label={t("weightNotif")}>
          <button type="button" onClick={() => setWeightNotif((v) => !v)}
            style={{ width: 50, height: 30, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
              background: weightNotif ? PF.terra : "rgba(63,48,41,0.18)", position: "relative", transition: "background .2s" }}>
            <span style={{ position: "absolute", top: 3, left: weightNotif ? 23 : 3, width: 24, height: 24,
              borderRadius: 999, background: "#fff", transition: "left .2s",
              boxShadow: "0 1px 4px rgba(0,0,0,0.25)" }} />
          </button>
        </Row>
        {weightNotif && (
          <Row label={t("weightTime")}>
            <input type="time" value={notifTime} onChange={(e) => setNotifTime(e.target.value)}
              style={{ fontFamily: sfPro, ...TYPE.body, color: PF.ink, borderStyle: "solid", borderWidth: 1, borderColor: PF.line,
                borderRadius: 10, padding: "7px 10px", background: "#fff", outline: "none" }} />
          </Row>
        )}
      </div>

      <button type="button" onClick={onResetOnboarding}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 13, padding: 18, marginTop: 22,
          borderRadius: R.card, cursor: "pointer", textAlign: "left", ...glass(0.78) }}>
        <div style={{ width: 40, height: 40, borderRadius: 13, background: "rgba(169,112,96,0.13)",
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={PF.terra} strokeWidth="1.9" strokeLinecap="round">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" />
          </svg>
        </div>
        <span style={{ flex: 1 }}>
          <span style={{ display: "block", fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{t("reset")}</span>
          <span style={{ display: "block", fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 2 }}>{t("resetSub")}</span>
        </span>
        <Glyph d={ICONS.chevron} size={16} color={PF.ink2} />
      </button>

      <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
        textTransform: "uppercase", letterSpacing: "0.06em", margin: "22px 0 10px" }}>{t("about")}</div>
      <SectionCard>
        <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, lineHeight: 1.6 }}>
          FIT288 · прототип<br />
          Профиль: {survey.name || "—"} · {survey.height || "—"} см · {survey.weight || "—"} кг<br />
          Целей выбрано: {survey.goals.length} · ограничений: {survey.contra.length + survey.customContra.length}
        </div>
      </SectionCard>
    </div>
  );
}

// ============================ ПЕРЕИСПОЛЬЗУЕМЫЕ БЛОКИ ============================
function ScreenTitle({ eyebrow, title, right }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", paddingTop: 8 }}>
      <div>
        <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2, textTransform: "uppercase", letterSpacing: "0.06em" }}>{eyebrow}</div>
        <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink, marginTop: 4 }}>{title}</div>
      </div>
      {right}
    </div>
  );
}

function Ring({ pct, size = 82, stroke = 8, label, value, color = PF.terra }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div style={{ position: "relative", width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color + "26"} strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - Math.min(pct, 100) / 100)} strokeLinecap="round"
          style={{ animation: "fitRing 1.1s cubic-bezier(.22,1,.36,1) both",
                   ["--fit-dash"]: c, strokeDashoffset: c * (1 - Math.min(pct, 100) / 100) }} />
      </svg>
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontFamily: sfPro, ...TYPE.title3, color: PF.ink, lineHeight: 1 }}>{value}</div>
        <div style={{ fontFamily: sfPro, ...TYPE.caption2, color: PF.ink2, marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
}

function SectionCard({ children, onClick, style, className }) {
  return (
    <div onClick={onClick} className={"fit-glass " + (className || (onClick ? "fit-press" : ""))} style={{ padding: 18, borderRadius: R.card, ...glass(0.46), cursor: onClick ? "pointer" : "default", ...style }}>
      {children}
    </div>
  );
}



// Содержимое плашки «Тренировка дня» — фирменная карточка целиком
function WorkoutDayBody({ onStartWorkout, plan, compact = false }) {
  const acc = ACCENT.workout;
  const count = plan ? plan.exercises.length : 6;
  const mins = 20 + count * 5;
  const goalName = {
    lose:"жиросжигающая", muscle:"на массу", strength:"на силу", endurance:"на выносливость",
    posture:"на осанку", health:"общая", flex:"на гибкость", energy:"тонизирующая",
  }[plan ? plan.goal : "health"] || "общая";

  if (compact) {
    return (
      <div style={{ width: "100%", height: "100%", padding: 16, borderRadius: R.tile,
        position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
        backgroundImage: `linear-gradient(150deg, ${acc.c} 0%, #B03A33 100%)`,
        boxShadow: `0 10px 28px ${acc.c}55, inset 0 1px 0 rgba(255,255,255,0.22)` }}>
        <div style={{ fontFamily: sfPro, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>Тренировка</div>
        <div style={{ flex: 1 }} />
        <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: sfPro, fontSize: 30, fontWeight: 700, color: "#fff", lineHeight: 1, letterSpacing: "-0.6px" }}>{count}</div>
            <div style={{ fontFamily: sfPro, fontSize: 12.5, color: "rgba(255,255,255,0.82)", marginTop: 5,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>упражнений · {mins} мин</div>
          </div>
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onStartWorkout} aria-label="Начать"
            style={{ width: 40, height: 40, borderRadius: 999, flexShrink: 0,
              borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
              background: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 6px 16px rgba(0,0,0,0.18)" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill={acc.c}><path d="M7 4l13 8-13 8z" /></svg>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%", height: "100%", padding: 18, borderRadius: R.tile,
      position: "relative", overflow: "hidden", display: "flex", flexDirection: "column",
      backgroundImage: `linear-gradient(150deg, ${acc.c} 0%, #B03A33 100%)`,
      boxShadow: `0 10px 28px ${acc.c}55, inset 0 1px 0 rgba(255,255,255,0.22)` }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden",
        borderRadius: R.tile, pointerEvents: "none" }}>
        <div style={{ position: "absolute", right: -6, bottom: -10, opacity: 0.22, transform: "rotate(-10deg)" }}>
          <svg width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="#fff"
            strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">{ICONS.dumbbell}</svg>
        </div>
      </div>
      <div style={{ fontFamily: sfPro, fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.78)" }}>
        Тренировка на сегодня
      </div>
      <div style={{ fontFamily: sfPro, fontSize: 22, fontWeight: 700, color: "#fff",
        letterSpacing: "-0.3px", marginTop: 4, lineHeight: 1.15 }}>
        {count} упражнений · {goalName}
      </div>
      <div style={{ fontFamily: sfPro, fontSize: 12.5, color: "rgba(255,255,255,0.8)", marginTop: 3 }}>
        примерно {mins} минут
      </div>
      <div style={{ flex: 1 }} />
      <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onStartWorkout}
        style={{ alignSelf: "flex-start", borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
          cursor: "pointer", background: "#fff", color: acc.c,
          fontFamily: sfPro, fontSize: 14, fontWeight: 700, padding: "11px 20px", borderRadius: R.pill }}>
        Начать
      </button>
    </div>
  );
}


// Содержимое плашки «Питание» — чек-лист приёмов пищи
function MealsBody({ doneToday, setDoneToday, compact = false }) {
  const meals = [
    ["Завтрак", "Овсянка с ягодами", "420 ккал"],
    ["Обед", "Курица с киноа", "610 ккал"],
    ["Ужин", "Лосось и овощи", "540 ккал"],
  ];
  if (compact) {
    const next = meals.find(([slot]) => !doneToday.includes(slot));
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
        <TileHead icon={ICONS.cutlery} label="Питание" color={ACCENT.meals.c} />
        <div style={{ flex: 1 }} />
        <div style={{ fontFamily: sfPro, fontSize: 30, fontWeight: 700, color: PF.ink, lineHeight: 1, letterSpacing: "-0.6px" }}>
          {doneToday.length}<span style={{ fontSize: 14, fontWeight: 600, color: PF.ink2 }}> / {meals.length}</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 7 }}>
          {meals.map(([slot]) => (
            <span key={slot} style={{ width: 8, height: 8, borderRadius: 999,
              background: doneToday.includes(slot) ? ACCENT.meals.c : "rgba(63,48,41,0.14)" }} />
          ))}
          <span style={{ fontFamily: sfPro, fontSize: 12, color: PF.ink2, marginLeft: 4,
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {next ? `дальше ${next[0].toLowerCase()}` : "всё отмечено"}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <span style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
          textTransform: "uppercase", letterSpacing: "0.06em" }}>Питание</span>
        <span style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>{doneToday.length} из 3</span>
      </div>
      {meals.map(([slot, dish, kcal]) => {
        const on = doneToday.includes(slot);
        return (
          <div key={slot} onPointerDown={(e) => e.stopPropagation()}
            onClick={() => setDoneToday((d) => on ? d.filter((x) => x !== slot) : [...d, slot])}
            style={{ display: "flex", alignItems: "center", gap: 12, padding: "9px 0", cursor: "pointer",
              borderTopStyle: "solid", borderTopWidth: slot === "Завтрак" ? 0 : 1, borderTopColor: PF.line }}>
            <div style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0,
              borderStyle: "solid", borderWidth: on ? 0 : 2, borderColor: PF.line,
              background: on ? PF.terra : "transparent",
              display: "flex", alignItems: "center", justifyContent: "center" }}>
              {on && <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round"><path d="M5 13l4 4L19 7" /></svg>}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: sfPro, ...TYPE.caption, fontWeight: 600, color: PF.ink2 }}>{slot}</div>
              <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink, marginTop: 1 }}>{dish}</div>
            </div>
            <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>{kcal}</div>
          </div>
        );
      })}
    </div>
  );
}


// Кольца активности. При сжатии три кольца съезжаются в одно концентрическое,
// как на Apple Watch, и подписи растворяются. При растяжении — обратный ход.
function ActivityRings({ openness = 1, data }) {
  const o = Math.max(0, Math.min(1, openness));
  const S = 120;                       // сторона области колец
  const C = S / 2;
  const R = [50, 38, 26];              // радиусы: внешнее, среднее, внутреннее
  const SW = 10;                       // толщина

  return (
    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center",
      gap: 14, padding: 0 }}>

      {/* Кольца всегда концентрические, как на часах — читается в любом размере */}
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{ flexShrink: 0 }}>
        {data.map((d, i) => {
          const r = R[i];
          const c = 2 * Math.PI * r;
          const filled = Math.min(d.pct, 100) / 100;
          return (
            <g key={d.label}>
              <circle cx={C} cy={C} r={r} fill="none" stroke={d.color} strokeOpacity="0.16" strokeWidth={SW} />
              <circle cx={C} cy={C} r={r} fill="none" stroke={d.color} strokeWidth={SW}
                strokeDasharray={c} strokeDashoffset={c * (1 - filled)} strokeLinecap="round"
                transform={`rotate(-90 ${C} ${C})`}
                style={{ transition: "stroke-dashoffset .6s cubic-bezier(.4,0,.2,1)" }} />
            </g>
          );
        })}
      </svg>

      {/* Подписи справа — появляются при растяжении, в сжатом виде кольца говорят сами */}
      <div style={{ flex: 1, minWidth: 0, overflow: "hidden",
        opacity: Math.max(0, (o - 0.2) / 0.8),
        transform: `translateX(${(1 - o) * 12}px)`,
        transition: "opacity .3s ease, transform .4s cubic-bezier(.4,0,.2,1)" }}>
        {data.map((d) => (
          <div key={d.label} style={{ display: "flex", alignItems: "baseline", gap: 7, marginBottom: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: 999, background: d.color, flexShrink: 0 }} />
            <span style={{ fontFamily: sfPro, fontSize: 19, fontWeight: 700, color: PF.ink,
              letterSpacing: "-0.3px", lineHeight: 1 }}>{d.value}</span>
            <span style={{ fontFamily: sfPro, fontSize: 11.5, color: PF.ink2,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.full}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Шапка составной плашки в компактном виде — как у обычных виджетов
function TileHead({ icon, label, color }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: color + "22",
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Glyph d={icon} size={15} color={color} />
      </div>
      <span style={{ fontFamily: sfPro, fontSize: 12, fontWeight: 600, color, letterSpacing: "-0.1px",
        whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
    </div>
  );
}

// Маленькая круглая кнопка-стрелка для компактных форм
function ArrowButton({ onClick, color, disabled }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label="Сохранить"
      style={{ width: 38, height: 38, borderRadius: 999, flexShrink: 0,
        borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
        cursor: disabled ? "default" : "pointer",
        background: disabled ? "rgba(63,48,41,0.10)" : color, color: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center",
        boxShadow: disabled ? "none" : `0 6px 16px ${color}55`, transition: "transform .2s, opacity .2s, background-color .2s, box-shadow .2s, color .2s, border-color .2s" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={disabled ? PF.ink3 : "#fff"}
        strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
    </button>
  );
}



// ============================ ПРОГРЕСС, ДОСТИЖЕНИЯ, АВАТАР ============================
// Одна функция считает всё из фактов: тренировок, отметок питания, веса и метрик.
// Аватар и достижения читают только её результат — расхождений между ними быть не может.
const ACHIEVEMENTS = [
  { id: "first",     title: "Первый шаг",       desc: "Первая завершённая тренировка",        icon: ICONS.dumbbell, test: (p) => p.workouts >= 1 },
  { id: "ten",       title: "Десятка",          desc: "10 тренировок",                        icon: ICONS.dumbbell, test: (p) => p.workouts >= 10 },
  { id: "fifty",     title: "Полсотни",         desc: "50 тренировок",                        icon: ICONS.trophy,   test: (p) => p.workouts >= 50 },
  { id: "week",      title: "Неделя в строю",   desc: "3 тренировки за 7 дней",               icon: ICONS.flame,    test: (p) => p.workoutsWeek >= 3 },
  { id: "steps10k",  title: "10 000",           desc: "10 000 шагов за день",                 icon: ICONS.sneaker,  test: (p) => p.bestSteps >= 10000 },
  { id: "walker",    title: "Ходок",            desc: "Неделя со средним 8 000+ шагов",       icon: ICONS.sneaker,  test: (p) => p.avgSteps >= 8000 },
  { id: "sleeper",   title: "Выспался",         desc: "7 ночей подряд от 7 часов",            icon: ICONS.moon,     test: (p) => p.sleepStreak >= 7 },
  { id: "meals7",    title: "По плану",         desc: "Все приёмы пищи отмечены 7 дней",      icon: ICONS.cutlery,  test: (p) => p.mealStreak >= 7 },
  { id: "weigh7",    title: "На весах",         desc: "7 взвешиваний",                        icon: ICONS.chart,    test: (p) => p.weighIns >= 7 },
  { id: "hrv",       title: "Восстановлен",     desc: "HRV выше 50 мс",                       icon: ICONS.heart,    test: (p) => p.hrv >= 50 },
  { id: "vo2",       title: "Мотор",            desc: "VO₂max выше 42",                        icon: ICONS.rings,    test: (p) => p.vo2 >= 42 },
  { id: "goal",      title: "Цель ближе",       desc: "Вес сдвинулся к цели на 2 кг",         icon: ICONS.trophy,   test: (p) => p.toGoalKg >= 2 },
];

// Уровень подготовки — только явный выбор пользователя (анкета), 0..3.
// Выводить его из веса или внешности нельзя: рост и вес не говорят о составе тела.
const TRAINING_LEVEL = { none: 0, lt1: 1, "1to3": 2, gt3: 3 };
function trainingLevel(survey) { return TRAINING_LEVEL[survey?.exp] ?? 0; }

// Мышечный параметр аватара: уровень + насыщение после 150 тренировок.
// Это художественное приближение, а не прогноз реального набора мышц.
function muscleParam(level, workouts) {
  return (level / 3) * 0.65 + Math.min(workouts, 150) / 150 * 0.35;
}

function computeProgress({ health, weightLog = [], mealsLog = {}, survey = {} }) {
  const week = health.week("workouts").map((d) => d.v || 0);
  const workoutsWeek = week.reduce((a, b) => a + b, 0);
  const workouts = health.all().filter((s) => s.type === "workouts").reduce((a, s) => a + s.value, 0);
  const stepsWeek = health.week("steps").map((d) => d.v || 0);
  const avgSteps = stepsWeek.length ? Math.round(stepsWeek.reduce((a, b) => a + b, 0) / stepsWeek.length) : 0;
  const bestSteps = Math.max(0, ...stepsWeek);
  const sleepWeek = health.week("sleep").map((d) => d.v || 0);
  let sleepStreak = 0; for (let i = sleepWeek.length - 1; i >= 0 && sleepWeek[i] >= 7; i--) sleepStreak++;
  const days = Object.keys(mealsLog).sort();
  let mealStreak = 0; for (let i = days.length - 1; i >= 0 && (mealsLog[days[i]] || []).length >= 3; i--) mealStreak++;
  const weighIns = weightLog.length;
  const first = weightLog[0]?.weight, last = weightLog[weightLog.length - 1]?.weight;
  const goal = (survey.goals || [])[0];
  const toGoalKg = first != null && last != null ? (goal === "lose" ? first - last : (goal === "muscle" ? last - first : 0)) : 0;
  const hrv = health.daily("hrv") || 0, vo2 = health.daily("vo2max") || 0;
  const p = { workouts, workoutsWeek, avgSteps, bestSteps, sleepStreak, mealStreak, weighIns, toGoalKg, hrv, vo2 };
  const unlocked = ACHIEVEMENTS.filter((a) => a.test(p)).map((a) => a.id);
  // стадия аватара: тренировки дают форму, питание и сон — тонус. 0..1
  const level = trainingLevel(survey);
  const form = muscleParam(level, workouts);
  const tone = Math.min(1, (mealStreak / 14) * 0.5 + (sleepStreak / 7) * 0.3 + Math.min(1, avgSteps / 10000) * 0.2);
  return { ...p, level, unlocked,
    avatar: { form, tone, level, workouts, stage: form < 0.2 ? 0 : form < 0.5 ? 1 : form < 0.85 ? 2 : 3 } };
}

// ============================ СТАТИСТИКА ПЛАШКИ ============================
// Каждая плашка открывается в экран с цифрами за неделю и советами.
// Советы — правила по опубликованным нормам: ВОЗ (шаги, активность),
// Национальный фонд сна (сон), ISSN (белок), ACSM (силовые), EFSA (вода).
// Порог и источник указаны у каждого совета — их можно проверить.

const NORMS = {
  steps:   { src: "ВОЗ, 2020 / Tudor-Locke, 2011", low: 5000, goal: 8000, high: 12000 },
  sleep:   { src: "National Sleep Foundation, 2015", low: 6, goal: 7, high: 9 },
  active:  { src: "ВОЗ, 2020", weekMin: 150, weekGood: 300 },
  protein: { src: "ISSN, 2017", perKgLow: 1.2, perKgGoal: 1.6, perKgHigh: 2.2 },
  water:   { src: "EFSA, 2010", mlPerKg: 33 },
  strength:{ src: "ACSM, 2021", perWeekMin: 2 },
  weight:  { src: "NIH / NHLBI", safeLossPerWeek: [0.25, 0.9] },
};

// семидневная история: пока сервер не подключён — детерминированная по дню
function weekSeries(seed, base, spread) {
  const out = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const h = (d.getDate() * 31 + d.getMonth() * 7 + seed) % 100;
    out.push({ day: ["Вс","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()], v: Math.round(base + (h / 100 - 0.5) * spread) });
  }
  return out;
}

function tileStats(key, ctx) {
  const { survey, weightLog, macros, doneToday, workoutPlan } = ctx;
  const kg = Number(survey?.weight) || 75;
  switch (key) {
    case "steps": case "rings": {
      const s = weekSeries(1, 8400, 5000);
      const avg = Math.round(s.reduce((a, b) => a + b.v, 0) / 7);
      const tips = [];
      if (avg < NORMS.steps.low) tips.push({ t: `В среднем ${avg.toLocaleString("ru")} шагов — ниже 5 000. Добавьте 15 минут ходьбы в день: это около 1 500 шагов.`, s: NORMS.steps.src });
      else if (avg < NORMS.steps.goal) tips.push({ t: `Средний день ${avg.toLocaleString("ru")} шагов. До 8 000 не хватает ${(NORMS.steps.goal - avg).toLocaleString("ru")} — одна прогулка после ужина закрывает разрыв.`, s: NORMS.steps.src });
      else tips.push({ t: `Средний день ${avg.toLocaleString("ru")} шагов — в зоне, где риск сердечно-сосудистых заболеваний заметно ниже. Так и держите.`, s: NORMS.steps.src });
      tips.push({ t: "Пять коротких прогулок по 10 минут дают тот же эффект, что одна на 50 — разбивайте, если нет времени.", s: NORMS.active.src });
      return { title: "Шаги", unit: "шагов", series: s, headline: avg.toLocaleString("ru"), sub: "в среднем за день", color: ACCENT.steps.c, tips };
    }
    case "sleep": {
      const s = weekSeries(2, 7.2, 2.4).map((x) => ({ ...x, v: Math.round(x.v * 10) / 10 }));
      const avg = Math.round(s.reduce((a, b) => a + b.v, 0) / 7 * 10) / 10;
      const spread = Math.max(...s.map((x) => x.v)) - Math.min(...s.map((x) => x.v));
      const tips = [];
      if (avg < NORMS.sleep.goal) tips.push({ t: `Среднее ${avg} ч — меньше 7. Недосып снижает силу и увеличивает аппетит на следующий день. Сдвиньте отбой на 30 минут раньше.`, s: NORMS.sleep.src });
      else tips.push({ t: `Среднее ${avg} ч — в норме для взрослых (7–9 ч).`, s: NORMS.sleep.src });
      if (spread > 2) tips.push({ t: `Разброс ${spread.toFixed(1)} ч между ночами. Стабильное время подъёма важнее длительности: держите его одинаковым и в выходные.`, s: NORMS.sleep.src });
      return { title: "Сон", unit: "ч", series: s, headline: `${avg} ч`, sub: "в среднем за ночь", color: ACCENT.sleep.c, tips };
    }
    case "weight": {
      const log = (weightLog || []).slice(-7);
      const s = log.length ? log.map((e) => ({ day: e.date.slice(5), v: e.weight })) : weekSeries(3, kg, 1.4);
      const first = s[0].v, last = s[s.length - 1].v, delta = Math.round((last - first) * 10) / 10;
      const goal = (survey?.goals || [])[0];
      const tips = [];
      const [lo, hi] = NORMS.weight.safeLossPerWeek;
      if (goal === "lose") {
        if (delta < -hi) tips.push({ t: `Минус ${Math.abs(delta)} кг за неделю — быстрее безопасных ${hi} кг. Так уходит и мышца. Добавьте 150–200 ккал к рациону.`, s: NORMS.weight.src });
        else if (delta <= -lo) tips.push({ t: `Минус ${Math.abs(delta)} кг за неделю — оптимальный темп. Дефицит подобран верно.`, s: NORMS.weight.src });
        else tips.push({ t: `Вес стоит (${delta >= 0 ? "+" : ""}${delta} кг). Взвешивайтесь утром натощак и смотрите среднее за неделю — суточные колебания до 1.5 кг это вода.`, s: NORMS.weight.src });
      } else if (goal === "muscle") {
        tips.push({ t: `Для набора мышц ориентир +0.25–0.5 кг в неделю. Сейчас ${delta >= 0 ? "+" : ""}${delta} кг.`, s: NORMS.weight.src });
      } else {
        tips.push({ t: `За неделю ${delta >= 0 ? "+" : ""}${delta} кг. Колебания в пределах ±1 кг — норма.`, s: NORMS.weight.src });
      }
      tips.push({ t: "Одно взвешивание ничего не говорит; тренд за 2–3 недели — говорит всё.", s: NORMS.weight.src });
      return { title: "Вес", unit: "кг", series: s, headline: `${last} кг`, sub: `${delta >= 0 ? "+" : ""}${delta} кг за неделю`, color: ACCENT.weight.c, tips };
    }
    case "macros": case "food": case "meals": {
      const prot = macros?.protein || 0, kcal = macros?.kcal || 0;
      const perKg = Math.round(prot / kg * 100) / 100;
      const water = Math.round(kg * NORMS.water.mlPerKg / 100) / 10;
      const s = weekSeries(4, kcal * 0.92, kcal * 0.3);
      const tips = [];
      if (perKg < NORMS.protein.perKgLow) tips.push({ t: `Белка ${prot} г — это ${perKg} г/кг. Для сохранения мышц нужно от 1.6 г/кг: ещё ${Math.round(kg * 1.6 - prot)} г в день.`, s: NORMS.protein.src });
      else if (perKg < NORMS.protein.perKgGoal) tips.push({ t: `Белка ${perKg} г/кг — близко к цели 1.6. Добавьте порцию творога или яйца.`, s: NORMS.protein.src });
      else tips.push({ t: `Белка ${perKg} г/кг — в рабочем диапазоне 1.6–2.2 для тренирующихся.`, s: NORMS.protein.src });
      tips.push({ t: `Вода: ориентир ${water} л в день при вашем весе, больше в жару и в дни тренировок.`, s: NORMS.water.src });
      tips.push({ t: "Распределяйте белок по 3–4 приёмам примерно по 0.4 г/кг — так синтез мышечного белка выше, чем от одной большой порции.", s: NORMS.protein.src });
      return { title: "Питание", unit: "ккал", series: s, headline: `${kcal} ккал`, sub: `план на день · ${doneToday?.length || 0} из 3 приёмов`, color: ACCENT.food.c, tips };
    }
    case "workout": case "workoutDay": case "awards": case "goals": {
      const s = weekSeries(5, 0.6, 1.2).map((x) => ({ ...x, v: x.v > 0 ? 1 : 0 }));
      const n = s.reduce((a, b) => a + b.v, 0);
      const mins = n * (20 + (workoutPlan?.exercises.length || 6) * 5);
      const tips = [];
      if (n < NORMS.strength.perWeekMin) tips.push({ t: `${n} силовых за неделю. Минимум для роста силы — 2 на все группы мышц. Даже 25 минут считаются.`, s: NORMS.strength.src });
      else tips.push({ t: `${n} силовых за неделю — норма ACSM выполнена.`, s: NORMS.strength.src });
      if (mins < NORMS.active.weekMin) tips.push({ t: `Активности ${mins} мин за неделю, ориентир 150. Добавьте быструю ходьбу — она тоже считается.`, s: NORMS.active.src });
      else tips.push({ t: `Активности ${mins} мин — выше 150 в неделю. Для дополнительной пользы ориентир 300.`, s: NORMS.active.src });
      tips.push({ t: "Между тренировками одной группы мышц оставляйте 48 часов — восстановление и есть рост.", s: NORMS.strength.src });
      return { title: "Тренировки", unit: "трен.", series: s, headline: `${n} из 7`, sub: "дней с тренировкой", color: ACCENT.workout.c, tips };
    }
    default:
      return { title: TILE_CATALOG[key]?.unit || "Статистика", unit: "", series: weekSeries(9, 50, 40), headline: "—", sub: "данных пока нет", color: ACCENT.tips.c,
        tips: [{ t: "Подключите приложение здоровья в настройках — здесь появятся ваши цифры и советы по ним.", s: "" }] };
  }
}

function TileDetail({ tileKey, ctx, onClose }) {
  const st = React.useMemo(() => tileStats(tileKey, ctx), [tileKey, ctx]);
  const max = Math.max(1, ...st.series.map((x) => x.v));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(63,48,41,0.35)", backdropFilter: "blur(6px)", animation: "fitIn .25s ease both" }} />
      <div style={{ position: "relative", maxHeight: "88vh", overflowY: "auto", borderRadius: "28px 28px 0 0",
        background: PF.bg, padding: "12px 20px 34px", animation: "fitSheetUp .42s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ width: 38, height: 5, borderRadius: 3, background: "rgba(63,48,41,0.18)", margin: "0 auto 14px" }} />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 700, color: st.color, textTransform: "uppercase", letterSpacing: "0.06em" }}>{st.title}</div>
            <div style={{ fontFamily: sfPro, fontSize: 34, fontWeight: 700, color: PF.ink, letterSpacing: "-0.8px", marginTop: 4, lineHeight: 1 }}>{st.headline}</div>
            <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 5 }}>{st.sub}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть"
            style={{ width: 34, height: 34, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
              cursor: "pointer", background: "rgba(63,48,41,0.08)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={PF.ink2} strokeWidth="3" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* неделя — столбики */}
        <div style={{ marginTop: 20, padding: 16, borderRadius: R.tile, background: "rgba(255,255,255,0.7)",
          borderStyle: "solid", borderWidth: 1, borderColor: st.color + "2E" }}>
          {(() => {
            const vals = st.series.map((x) => x.v);
            const mn = Math.min(...vals), mx = Math.max(...vals);
            const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10;
            const trend = vals[vals.length - 1] - vals[0];
            return (
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                {[["мин", mn], ["среднее", avg], ["макс", mx], ["тренд", (trend > 0 ? "+" : "") + Math.round(trend * 10) / 10]].map(([l, v]) => (
                  <div key={l} style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: sfPro, fontSize: 16, fontWeight: 700, color: PF.ink }}>{v}</div>
                    <div style={{ fontFamily: sfPro, fontSize: 10.5, color: PF.ink3, textTransform: "uppercase", letterSpacing: "0.05em" }}>{l}</div>
                  </div>
                ))}
              </div>
            );
          })()}
          <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 160 }}>
            {st.series.map((x, i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, height: "100%", justifyContent: "flex-end" }}>
                <div style={{ fontFamily: sfPro, fontSize: 10.5, color: PF.ink2 }}>{x.v}</div>
                <div style={{ width: "100%", borderRadius: 6, background: st.color, opacity: i === st.series.length - 1 ? 1 : 0.55,
                  height: `${Math.max(6, (x.v / max) * 78)}%`, transformOrigin: "bottom",
                  animation: `fitGrowY .5s cubic-bezier(.22,1,.36,1) ${i * 0.04}s both` }} />
                <div style={{ fontFamily: sfPro, fontSize: 11, color: PF.ink3 }}>{x.day}</div>
              </div>
            ))}
          </div>
        </div>

        <Eyebrow>Рекомендации по вашим цифрам</Eyebrow>
        {st.tips.map((tip, i) => (
          <div key={i} style={{ padding: "14px 16px", borderRadius: R.tile, background: "rgba(255,255,255,0.7)", marginTop: 8,
            animation: `fitUp .4s ease-out ${0.05 * i + 0.1}s both` }}>
            <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink, lineHeight: 1.45 }}>{tip.t}</div>
            {tip.s && <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginTop: 6 }}>Источник: {tip.s}</div>}
          </div>
        ))}
        <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginTop: 16, lineHeight: 1.5 }}>
          Советы построены по опубликованным нормам и не заменяют консультацию врача. При хронических заболеваниях согласуйте нагрузку и рацион со специалистом.
        </div>
      </div>
    </div>
  );
}

/****************************************************************************
 *  ГЛАВА 6. ГЛАВНЫЙ ЭКРАН
 *  Плашки-виджеты, перетаскивание, растягивание
 ****************************************************************************/

// ============================ РЕДАКТИРУЕМЫЕ ПЛАШКИ ============================
// Каталог плашек. Каждая умеет быть квадратной (кратко) и прямоугольной (подробно).
// Карточки колец, веса и плана — такие же плашки: двигаются, растягиваются, убираются.
// custom = собственная отрисовка внутри общей оболочки плашки.
const WIDE_TILES = {
  rings:  { key:"rings",  icon:ICONS.rings,  unit:"Активность", custom:"rings" },
  weight: { key:"weight", icon:ICONS.chart,  unit:"Вес",        custom:"weight" },
  macros: { key:"macros", icon:ICONS.plate,  unit:"План питания", custom:"macros" },
  workoutDay: { key:"workoutDay", icon:ICONS.dumbbell, unit:"Тренировка дня", custom:"workoutDay", bare:true },
  meals:      { key:"meals",      icon:ICONS.cutlery,  unit:"Питание",         custom:"meals" },
};
const TILE_CATALOG = {
  food:   { key:"food",   icon:ICONS.cutlery,  unit:"Питание",   value:"1 570", sub:"ккал из 2 300",
            rows:[["Осталось","730 ккал"],["Белки","96 г"],["Жиры","52 г"],["Углеводы","168 г"]] },
  steps:  { key:"steps",  icon:ICONS.sneaker,  unit:"Шаги",      value:"8 420", sub:"из 10 000",
            rows:[["Дистанция","5.9 км"],["Осталось","1 580"],["Этажей","12"]] },
  sleep:  { key:"sleep",  icon:ICONS.moon,     unit:"Сон",       value:"7:24",  sub:"часа",
            rows:[["Глубокий","1:48"],["Пробуждений","2"],["Качество","78%"]] },
  workout:{ key:"workout",icon:ICONS.dumbbell, unit:"Тренировки",value:"127",   sub:"всего",
            rows:[["На неделе","4 из 5"],["Серия","12 дней"],["Часов","4:20"]] },
  awards: { key:"awards", icon:ICONS.trophy,   unit:"Награды",   value:"4",     sub:"из 6",
            rows:[["Ближайшая","200 трен."],["Осталось","73"]] },
  goals:  { key:"goals",  icon:ICONS.chart,    unit:"Цели",      value:"3",     sub:"активные",
            rows:[["Снизить вес","−1.2 кг"],["Выносливость","в работе"],["Осанка","в работе"]] },
  shop:   { key:"shop",   icon:ICONS.bag,      unit:"Магазин",   value:"—",     sub:"баллов",
            rows:[["Доступно","6 образов"],["Новинка","на неделе"]] },
  tips:   { key:"tips",   icon:ICONS.heart,    unit:"Совет дня", value:"Вода",  sub:"до тренировки",
            rows:[["Зачем","снижает пульс"],["Сколько","300–500 мл"],["Когда","за 30 минут"]] },
  ...WIDE_TILES,
};
// Стартовая раскладка: показаны ВСЕ плашки каталога, ширины чередуются —
// пользователь сразу видит оба вида и перестраивает под себя.
const DEFAULT_TILES = [
  { key: "rings",      wide: true  },   // кольца активности — во всю ширину
  { key: "weight",     wide: true  },   // отметить вес
  { key: "steps",      wide: false },   // квадрат
  { key: "food",       wide: false },   // квадрат
  { key: "macros",     wide: true  },   // план питания — во всю ширину
  { key: "sleep",      wide: false },
  { key: "workout",    wide: false },
  { key: "workoutDay", wide: true  },   // тренировка дня
  { key: "goals",      wide: true  },   // цели — подробно
  { key: "awards",     wide: false },
  { key: "shop",       wide: false },
  { key: "meals",      wide: true  },   // питание — чек-лист
  { key: "tips",       wide: true  },   // совет дня — подробно
];

function Tile({ cfg, wide, editing, onRemove, onResize, onGrab, onOpen, state, t, dragging, ratio, widthPx, offset, rowH, wobble, jiggleSeed, rightCol = false, shiftLeft = 0, extra }) {
  const acc = ACCENT[cfg.key] || { c: PF.terra, soft: "rgba(169,112,96,0.13)" };
  const isWide = ratio != null ? ratio > 0.5 : wide;
  const openness = ratio != null ? ratio : (wide ? 1 : 0);

  return (
    <div
      onPointerDown={editing ? onGrab : undefined}
      onClick={onOpen}
      role={onOpen ? "button" : undefined}
      className={"fit-glass" + (wobble ? ` fit-wobble j${(jiggleSeed || 0) % 5}` : "") + (dragging || ratio != null ? "" : " fit-tile-move")}
      style={{
        width: widthPx != null ? `${widthPx}px` : "100%",
        maxWidth: widthPx != null ? "none" : "100%", minWidth: 0, boxSizing: "border-box",
        marginLeft: shiftLeft ? -shiftLeft : 0,
        // Высота одинаковая у квадратной и у широкой — как у виджетов iOS,
        // где маленький и средний виджет стоят в одном ряду.
        // высота одинаковая у всех плашек
        height: rowH || 150,
        padding: cfg.custom ? 0 : (cfg.bare ? 0 : 16), borderRadius: R.tile,
        ...(cfg.bare
          ? { background: "transparent", borderStyle: "solid", borderWidth: 0, borderColor: "transparent", boxShadow: "none" }
          : editing
            // в правке плашка выглядит как обычно, но приподнята и обведена
            ? { backgroundImage: `linear-gradient(152deg, ${acc.c}1F 0%, ${acc.c}12 45%, rgba(255,255,255,0.72) 100%)`,
                backgroundColor: "rgba(255,253,250,0.72)",
                backdropFilter: "blur(34px) saturate(190%)",
                WebkitBackdropFilter: "blur(34px) saturate(190%)",
                borderStyle: "solid", borderWidth: 1.5, borderColor: `${acc.c}66`,
                boxShadow: `0 14px 34px rgba(63,48,41,0.16), 0 0 0 4px rgba(255,255,255,0.55), inset 0 1px 0 rgba(255,255,255,0.9)` }
            // цвет плашки — по её теме, поверх едва заметный знак
            : { backgroundImage: `linear-gradient(152deg, ${acc.c}1F 0%, ${acc.c}12 45%, rgba(255,255,255,0.72) 100%)`,
                backgroundColor: "rgba(255,253,250,0.62)",
                backdropFilter: "blur(34px) saturate(190%)",
                WebkitBackdropFilter: "blur(34px) saturate(190%)",
                borderStyle: "solid", borderWidth: 1, borderColor: `${acc.c}2E`,
                boxShadow: `0 10px 28px ${acc.c}1A, inset 0 1px 0 rgba(255,255,255,0.9)` }),
        position: "relative",
        display: "flex", flexDirection: "column",
        touchAction: editing ? "none" : "auto",
        cursor: editing ? "grab" : "default",
        // в правке плашка ужимается — освобождает место под элементы управления
        transform: state === "leaving"
          ? "translateY(64px) scale(.82)"
          : dragging
            ? "translate(var(--dx, 0px), var(--dy, 0px)) scale(0.98)"
            : editing ? `scale(${GRID.editScale})` : "scale(1)",
        opacity: state === "leaving" ? 0 : 1,
        filter: state === "leaving" ? "grayscale(1)" : "none",
        boxShadow: dragging ? "0 22px 48px rgba(63,48,41,0.22)" : undefined,
        transition: (ratio != null || dragging) ? "none" : [
          "translate .28s cubic-bezier(.4,0,.2,1)",
          "transform .34s cubic-bezier(.4,0,.2,1)",
          "opacity .3s ease", "filter .3s ease", "box-shadow .2s ease",
          "width .42s cubic-bezier(.4,0,.2,1)",
        ].join(", "),
        zIndex: ratio != null ? 6 : (dragging ? 5 : 1),
      }}>

      {/* фоновый знак: обрезан по форме плашки, наружу не выходит */}
      {!cfg.bare && (
        <div aria-hidden style={{ position: "absolute", inset: 0, overflow: "hidden",
          borderRadius: R.tile, pointerEvents: "none" }}>
          <div style={{ position: "absolute", right: -6, bottom: -10, transform: "rotate(-10deg)",
            opacity: 0.18 }}>
            <svg width="92" height="92" viewBox="0 0 24 24" fill="none" stroke={acc.c}
              strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              {cfg.icon}
            </svg>
          </div>
        </div>
      )}

      {cfg.custom ? (
        <div onClick={(e) => { if (e.target.closest("button, input, a")) e.stopPropagation(); }}
          style={{ width: "100%", height: "100%", overflow: "hidden", borderRadius: R.tile - 1,
          padding: cfg.bare ? 0 : 16, boxSizing: "border-box",
          pointerEvents: editing ? "none" : "auto", userSelect: editing ? "none" : "auto" }}>
          {typeof extra === "function" ? extra(openness) : extra}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", height: "100%",
          position: "relative", zIndex: 1, minWidth: 0, overflow: "hidden",
          pointerEvents: editing ? "none" : "auto", userSelect: editing ? "none" : "auto" }}>
          {/* шапка виджета: значок и название раздела */}
          {/* шапка: значок + раздел. Один размер во всех плашках. */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <div style={{ width: 28, height: 28, borderRadius: 9, background: acc.soft,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Glyph d={cfg.icon} size={15} color={acc.c} />
            </div>
            <span style={{ fontFamily: sfPro, fontSize: 12, fontWeight: 600, color: acc.c,
              letterSpacing: "-0.1px",
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {cfg.unit}
            </span>
          </div>

          {/* тело: слева крупное значение, справа подробности у широкой */}
          <div style={{ flex: 1, display: "flex", alignItems: "flex-end", gap: 14, minHeight: 0, minWidth: 0 }}>
            <div style={{ flex: "0 1 auto", minWidth: 0 }}>
              {/* значение — один кегль везде, подпись — один кегль везде */}
              <div style={{ fontFamily: sfPro, fontSize: 30, fontWeight: 700, letterSpacing: "-0.6px",
                color: PF.ink, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {cfg.value}
              </div>
              {cfg.sub && (
                <div style={{ fontFamily: sfPro, fontSize: 12.5, color: PF.ink2, marginTop: 5,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {cfg.sub}
                </div>
              )}
            </div>

            {/* правая колонка появляется по мере растяжения */}
            <div style={{ flex: 1, minWidth: 0, overflow: "hidden",
              opacity: Math.max(0, (openness - 0.25) / 0.75),
              transform: `translateX(${(1 - openness) * 10}px)`,
              transition: ratio != null ? "none" : "opacity .3s ease .06s, transform .4s cubic-bezier(.4,0,.2,1)" }}>
              {(cfg.rows || []).map(([label, val], k) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between",
                  gap: 8, paddingBottom: 5, marginBottom: 5,
                  borderBottom: k < (cfg.rows.length - 1) ? `1px solid ${PF.line}` : "none" }}>
                  <span style={{ fontFamily: sfPro, fontSize: 12, color: PF.ink2,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
                  <span style={{ fontFamily: sfPro, fontSize: 12, fontWeight: 600, color: PF.ink,
                    whiteSpace: "nowrap", flexShrink: 0 }}>{val}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {editing && (
        <>
          {/* удалить — правый верхний угол */}
          <button type="button" onPointerDown={(e) => e.stopPropagation()} onClick={onRemove}
            aria-label="Убрать" title="Убрать"
            style={{ position: "absolute", top: 8, right: 8, width: 26, height: 26, borderRadius: 999,
              borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
              cursor: "pointer", zIndex: 8, padding: 0,
              background: PF.ink, display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 10px rgba(63,48,41,0.3), 0 0 0 2px rgba(255,255,255,0.9)" }}>
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>

          <div onPointerDown={onResize}
            title={rightCol ? "Потяните влево — растянуть" : (wide ? "Потяните влево — сузить" : "Потяните вправо — растянуть")}
            style={{ position: "absolute", ...(rightCol ? { left: 8 } : { right: 8 }), top: "50%", transform: "translateY(-50%)",
              width: 26, height: 40, cursor: "ew-resize", zIndex: 7, touchAction: "none",
              display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 999, background: PF.ink,
              boxShadow: "0 3px 10px rgba(63,48,41,0.3), 0 0 0 2px rgba(255,255,255,0.9)" }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff"
              strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 6l-5 6 5 6M15 6l5 6-5 6" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}

// Убранные плашки: серые, внизу, с плюсом
function RemovedTile({ cfg, onAdd, state, t }) {
  return (
    <div className="fit-glass" style={{
      position: "relative", padding: 14, borderRadius: R.tile, ...glass(0.22),
      filter: "grayscale(0.85)", opacity: state === "entering" ? 0 : 0.72,
      transform: state === "entering" ? "translateY(-150px) scale(.8)" : "translateY(0) scale(1)",
      transition: "transform .42s cubic-bezier(.34,1.3,.5,1), opacity .34s ease",
      minHeight: 86, display: "flex", flexDirection: "column", alignItems: "flex-start",
    }}>
      <div style={{ width: 28, height: 28, borderRadius: 9, background: "rgba(63,48,41,0.10)",
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Glyph d={cfg.icon} size={15} color={PF.ink2} />
      </div>
      <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600, color: PF.ink2, marginTop: 8 }}>
        {cfg.unit}
      </div>
      <button type="button" onClick={onAdd} aria-label="Вернуть" title="Вернуть"
        style={{ position: "absolute", top: -11, right: -11, width: 28, height: 28, borderRadius: 999,
          borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", padding: 0, zIndex: 5,
          background: PF.terra, display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "0 3px 10px rgba(169,112,96,0.42), 0 0 0 2px rgba(250,246,241,0.95)" }}>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  );
}

function TileGrid({ tiles, setTiles, editing, t, renderers = {}, onOpen, balance }) {
  const gridRef = React.useRef(null);
  const refs = React.useRef({});
  const [drag, setDrag] = React.useState(null);
  const tilesRef = React.useRef(tiles);
  React.useEffect(() => { tilesRef.current = tiles; }, [tiles]);      // ключ перетаскиваемой плашки
  const [anim, setAnim] = React.useState({});        // ключ -> leaving | entering
  const [resize, setResize] = React.useState(null);   // { key, ratio } пока тянем
  const resizeRef = React.useRef(null);
  const resizeGeom = React.useRef(null);   // замеры ячейки на время жеста
  const [dragOff, setDragOff] = React.useState({ x: 0, y: 0 });
  const originRef = React.useRef({ x: 0, y: 0 });     // точка отсчёта смещения
  const lastPointRef = React.useRef({ x: 0, y: 0 });  // последнее положение пальца
  const rebaseRef = React.useRef(null);               // { key, before } — ждёт перерисовки сетки

  // Плавный переезд соседей (FLIP): запоминаем, где ячейки были, и после
  // перестройки сетки анимируем их из старого места в новое. Так же
  // определяем, в какой колонке реально стоит каждая ячейка.
  const prevRects = React.useRef(new Map());
  const [colMap, setColMap] = React.useState({});
  React.useLayoutEffect(() => {
    const gridEl = gridRef.current;
    if (!gridEl) return;
    const g = gridEl.getBoundingClientRect();
    const next = new Map();
    const cols = {};
    tiles.forEach((tl) => {
      const el = refs.current[tl.key];
      if (!el) return;
      const r = el.getBoundingClientRect();
      next.set(tl.key, r);
      cols[tl.key] = !tl.wide && r.left > g.left + g.width * 0.25;
    });
    next.forEach((r, key) => {
      const p = prevRects.current.get(key);
      if (!p || key === drag || (resize && resize.key === key)) return;
      const dx = p.left - r.left, dy = p.top - r.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      const el = refs.current[key];
      el.style.transition = "none";
      el.style.transform = `translate(${dx}px, ${dy}px)`;
      void el.offsetWidth;                                    // фиксируем стартовое положение
      el.style.transition = "transform .42s cubic-bezier(.4,0,.2,1)";   // ровный разгон и торможение, без рывка на первом кадре
      el.style.transform = "";
    });
    prevRects.current = next;
    setColMap((old) => {
      const keys = Object.keys(cols);
      if (keys.length === Object.keys(old).length && keys.every((k) => old[k] === cols[k])) return old;
      return cols;
    });
  }, [tiles, editing, resize && resize.key]);

  // Сразу после того как сетка перестроилась (до отрисовки кадра):
  // насколько уехала ячейка плашки — настолько сдвигаем точку отсчёта.
  React.useLayoutEffect(() => {
    const rb = rebaseRef.current;
    if (!rb) return;
    rebaseRef.current = null;
    const el = refs.current[rb.key];
    if (!el || !rb.before) return;
    const after = el.getBoundingClientRect();
    originRef.current.x += after.left - rb.before.left;
    originRef.current.y += after.top - rb.before.top;
    const p = lastPointRef.current, o = originRef.current;
    const tileEl = el.firstElementChild;
    if (tileEl) { tileEl.style.setProperty("--dx", `${p.x - o.x}px`); tileEl.style.setProperty("--dy", `${p.y - o.y}px`); }
  }, [tiles]);
  // подрагивание идёт, пока пользователь не тронул ни одну плашку
  const [touched, setTouched] = React.useState(false);
  React.useEffect(() => { if (!editing) setTouched(false); }, [editing]);
  // Высота строки = ширине колонки: квадрат остаётся квадратом,
  // широкая плашка имеет ту же высоту — как маленький и средний виджет iOS.
  const [rowH, setRowH] = React.useState(150);
  React.useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.getBoundingClientRect().width;
      // чуть ниже квадрата: так плашки компактнее и их больше помещается
      if (w > 0) setRowH(Math.round(((w - GRID.gap) / 2) * GRID.rowRatio));
    };
    measure();
    const RO = typeof window !== "undefined" && window.ResizeObserver;
    if (RO) { const ro = new RO(measure); ro.observe(el); return () => ro.disconnect(); }
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const removed = Object.keys(TILE_CATALOG).filter((k) => !tiles.some((x) => x.key === k));

  // ---- удалить: плашка уезжает вниз, потом попадает в серый список ----
  const remove = (key) => {
    setTouched(true);
    setAnim((a) => ({ ...a, [key]: "leaving" }));
    setTimeout(() => {
      setTiles((ts) => ts.filter((x) => x.key !== key));
      setAnim((a) => { const n = { ...a }; delete n[key]; return n; });
    }, 320);
  };

  // ---- вернуть: прилетает сверху и встаёт первой ----
  const add = (key) => {
    setAnim((a) => ({ ...a, [key]: "entering" }));
    setTiles((ts) => [{ key, wide: false }, ...ts]);
    requestAnimationFrame(() => {
      setTimeout(() => setAnim((a) => { const n = { ...a }; delete n[key]; return n; }), 30);
    });
  };

  // ---- перетаскивание по сетке ----
  const onGrab = (key) => (e) => {
    if (!editing) return;
    e.preventDefault();
    setTouched(true);
    setDrag(key);
    setDragOff({ x: 0, y: 0 });

    originRef.current = { x: e.clientX, y: e.clientY };
    lastPointRef.current = { x: e.clientX, y: e.clientY };
    { const el = refs.current[key] && refs.current[key].firstElementChild;
      if (el) { el.style.setProperty("--dx", "0px"); el.style.setProperty("--dy", "0px"); el.style.willChange = "transform"; } }
    let lockUntil = 0;
    let armed = true;
    const lastSwapAt = { x: 0, y: 0 };

    const tileEl = () => refs.current[key] && refs.current[key].firstElementChild;
    const applyOffset = () => {
      const el = tileEl(); if (!el) return;
      const o = originRef.current, pnt = lastPointRef.current;
      el.style.setProperty("--dx", `${pnt.x - o.x}px`);
      el.style.setProperty("--dy", `${pnt.y - o.y}px`);
    };
    const onMove = (ev) => {
      lastPointRef.current = { x: ev.clientX, y: ev.clientY };
      applyOffset();                              // без перерисовки React: 60 раз в секунду только DOM

      const now = performance.now();
      if (now < lockUntil) return;
      if (!armed) {
        if (Math.abs(ev.clientX - lastSwapAt.x) < 22 && Math.abs(ev.clientY - lastSwapAt.y) < 18) return;
        armed = true;
      }

      const list = tilesRef.current;
      const meEl = refs.current[key];
      if (!meEl) return;
      // центр перетаскиваемой плашки = центр её ячейки + смещение пальца
      const mr = meEl.getBoundingClientRect();
      const cx = mr.left + mr.width / 2 + (ev.clientX - originRef.current.x);
      const cy = mr.top + mr.height / 2 + (ev.clientY - originRef.current.y);
      const from0 = list.findIndex((x) => x.key === key);
      // Сосед, над центром которого мы прошли. Меняемся только когда наш центр
      // пересёк центр соседа по направлению движения — после обмена условие
      // сразу становится ложным, поэтому обратного обмена не бывает.
      const over = list.find((tl, i) => {
        if (tl.key === key) return false;
        const el = refs.current[tl.key];
        if (!el) return false;
        const r = el.getBoundingClientRect();
        if (cx < r.left || cx > r.right || cy < r.top || cy > r.bottom) return false;
        const ncx = r.left + r.width / 2, ncy = r.top + r.height / 2;
        const forward = i > from0;
        // «тот же ряд» — по домашней ячейке, а не по текущему положению под пальцем
        const homeCy = mr.top + mr.height / 2;
        const sameRow = Math.abs(ncy - homeCy) < r.height * 0.5;
        const pad = 0.12;
        if (sameRow) return forward ? cx > ncx + r.width * pad : cx < ncx - r.width * pad;
        return forward ? cy > ncy + r.height * pad : cy < ncy - r.height * pad;
      });
      if (!over) return;

      const from = list.findIndex((x) => x.key === key);
      const to = list.findIndex((x) => x.key === over.key);
      if (from < 0 || to < 0 || from === to) return;

      // Запоминаем, где плашка была ДО перестановки. После того как React
      // перерисует сетку, useLayoutEffect сравнит с новым положением и
      // сдвинет точку отсчёта — плашка останется под пальцем.
      const el = refs.current[key];
      rebaseRef.current = { key, before: el ? el.getBoundingClientRect() : null };
      setTiles((ts) => {
        const f = ts.findIndex((x) => x.key === key);
        let t2 = ts.findIndex((x) => x.key === over.key);
        if (f < 0 || t2 < 0 || f === t2) return ts;
        const dragged = ts[f];
        const target = ts[t2];
        const rest = ts.filter((x) => x.key !== key);
        // Широкая плашка на квадрат: целимся в начало ряда этого квадрата.
        // Ряды считаем как их раскладывает сетка: квадраты парами, широкие — строкой.
        if (dragged.wide && !target.wide) {
          let col = 0, rowStart = 0;
          for (let i = 0; i < rest.length; i++) {
            const w = rest[i].wide ? 2 : 1;
            if (col + w > 2) { col = 0; rowStart = i; }
            if (col === 0) rowStart = i;
            if (rest[i].key === target.key) { t2 = rowStart; break; }
            col += w; if (col >= 2) col = 0;
          }
        } else {
          t2 = rest.findIndex((x) => x.key === target.key);
          if (t2 < 0) return ts;
          // квадрат, брошенный на плашку правее себя, встаёт после неё
          if (f < ts.findIndex((x) => x.key === target.key)) t2 += 1;
        }
        rest.splice(Math.max(0, Math.min(rest.length, t2)), 0, dragged);
        return rest;
      });
      lastSwapAt.x = ev.clientX; lastSwapAt.y = ev.clientY;
      armed = false;
      lockUntil = now + 110;
    };
    const onUp = () => {
      { const el = refs.current[key] && refs.current[key].firstElementChild;
        if (el) { el.style.removeProperty("--dx"); el.style.removeProperty("--dy"); el.style.willChange = ""; } }
      setDrag(null);
      setDragOff({ x: 0, y: 0 });
      rebaseRef.current = null;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // страница не должна прокручиваться или закрываться под пальцем
    const block = (ev) => ev.preventDefault();
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    const onUpAll = () => { window.removeEventListener("touchmove", block); onUp(); };
    window.addEventListener("pointerup", onUpAll);
    window.addEventListener("pointercancel", onUpAll);
  };

  // Растягивание: слушаем окно, а не всплытие. Палец может уйти за пределы плашки,
  // события всё равно дойдут. Обновляем через requestAnimationFrame, чтобы шло плавно.
  const rafRef = React.useRef(0);

  const onResize = (key, wide, rightCol = false) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setTouched(true);
    const cell = refs.current[key]?.getBoundingClientRect();
    const cellW = cell ? cell.width : 160;
    // ширина в двух крайних состояниях, в пикселях
    const GAP = editing ? GRID.editGap : GRID.gap;
    const narrowW = wide ? (cellW - GAP) / 2 : cellW;
    const wideW = wide ? cellW : cellW * 2 + GAP;
    resizeRef.current = { key, wide, rightCol, startX: e.clientX, narrowW, wideW,
      full: wideW, lastRatio: wide ? 1 : 0 };
    resizeGeom.current = { narrowW, wideW };
    setResize({ key, ratio: wide ? 1 : 0, widthPx: wide ? wideW : narrowW });

    const onMove = (ev) => {
      const r = resizeRef.current;
      if (!r) return;
      ev.preventDefault();
      const dx = (ev.clientX - r.startX) * (r.rightCol ? -1 : 1);   // правая плашка тянется влево
      const span = Math.max(1, r.wideW - r.narrowW);
      const base = r.wide ? 1 : 0;
      // жёсткий предел 0..1 — за границы сетки плашку не вытянуть
      const ratio = Math.max(0, Math.min(1, base + dx / span));
      r.widthPx = r.narrowW + (r.wideW - r.narrowW) * ratio;
      r.lastRatio = ratio;
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => setResize({ key: r.key, ratio, widthPx: r.widthPx }));
    };
    const onUp = () => {
      cancelAnimationFrame(rafRef.current);
      const r = resizeRef.current;
      resizeRef.current = null;
      if (!r || r.lastRatio == null) { setResize(null); return; }

      // мягкая доводка: ratio доезжает до 0 или 1, и только потом
      // плашка переключается на обычную раскладку — без рывка
      const from = r.lastRatio;
      const target = from > 0.5 ? 1 : 0;
      const t0 = performance.now();
      const dur = 280;
      const settle = (now) => {
        const p = Math.min(1, (now - t0) / dur);
        const e = 1 - Math.pow(1 - p, 3);
        setResize({ key: r.key, ratio: from + (target - from) * e,
          widthPx: r.narrowW + (r.wideW - r.narrowW) * (from + (target - from) * e) });
        if (p < 1) { rafRef.current = requestAnimationFrame(settle); }
        else {
          setTiles((ts) => {
            const next = ts.map((x) => x.key === r.key ? { ...x, wide: target === 1 } : x);
            if (target === 1 && r.rightCol) {
              // расширилась правая: ставим её перед левым соседом того же ряда
              const idx = next.findIndex((x) => x.key === r.key);
              let col = 0, rowStart = 0;
              for (let i = 0; i < idx; i++) { const w = next[i].wide ? 2 : 1; if (col === 0) rowStart = i; col = (col + w) % 2; if (next[i].wide) col = 0; }
              if (rowStart < idx) { const [me] = next.splice(idx, 1); next.splice(rowStart, 0, me); }
            }
            return next;
          });
          setResize(null);
          resizeGeom.current = null;
        }
      };
      rafRef.current = requestAnimationFrame(settle);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    // страница не должна прокручиваться или закрываться под пальцем
    const block = (ev) => ev.preventDefault();
    window.addEventListener("touchmove", block, { passive: false });
    window.addEventListener("pointermove", onMove, { passive: false });
    const onUpAll = () => { window.removeEventListener("touchmove", block); onUp(); };
    window.addEventListener("pointerup", onUpAll);
    window.addEventListener("pointercancel", onUpAll);
  };


  return (
    <>
      {/* в правке фон приглушается, чтобы плашки читались как объекты */}
      {editing && (
        <div aria-hidden style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
          background: "rgba(255,252,248,0.22)",
          backdropFilter: "saturate(70%)", WebkitBackdropFilter: "saturate(70%)",
          animation: "fitDim .3s ease both" }} />
      )}
      <div ref={gridRef}
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
          position: "relative", zIndex: editing ? 2 : "auto",
          rowGap: editing ? GRID.editGap : GRID.gap, columnGap: editing ? GRID.editGap : GRID.gap,
          marginTop: editing ? 20 : 12,
          width: "100%", maxWidth: "100%",
          transition: "gap .3s cubic-bezier(.4,0,.2,1), margin-top .3s cubic-bezier(.4,0,.2,1)" }}>
        {tiles.map((tl) => {
          const rightCol = !tl.wide && !!colMap[tl.key];
          return (
          <div key={tl.key} ref={(el) => { refs.current[tl.key] = el; }}
            style={{
              // пока палец на ручке — ячейка занимает две колонки, соседи расходятся,
              // а сама плашка внутри тянется ровно за пальцем
              // раскладка НЕ трогается, пока палец на ручке: плашка растёт поверх
              // соседей, поэтому ничего не прыгает. Колонки переключатся один раз,
              // когда жест закончится.
              gridColumn: ((resize && resize.key === tl.key && !colMap[tl.key]) || tl.wide) ? "span 2" : "span 1",
              display: "grid", position: "relative", minWidth: 0,
              // правая плашка растёт влево поверх соседа: сдвиг задаётся отступом,
              // потому что justify-items: end для элемента шире ячейки браузер игнорирует
              justifyItems: "stretch",
              overflow: "visible",
              zIndex: (resize && resize.key === tl.key) ? 30 : (drag === tl.key ? 25 : (editing ? 5 : 1)),
              // пока тащим — её собственная ячейка не перехватывает касания
              pointerEvents: drag === tl.key ? "none" : undefined,
              overflow: "visible" }}>
            <Tile cfg={tl.key === "shop" && balance != null
                ? { ...TILE_CATALOG[tl.key], value: balance.toLocaleString("ru") }
                : TILE_CATALOG[tl.key]} wide={tl.wide} editing={editing} t={t}
              onOpen={!editing && onOpen ? () => onOpen(tl.key) : undefined}
              ratio={resize && resize.key === tl.key ? resize.ratio : null}
              offset={drag === tl.key ? dragOff : null}
              rowH={rowH}
              wobble={editing && !(resize && resize.key === tl.key) && drag !== tl.key}
              jiggleSeed={[...tl.key].reduce((a, c) => a + c.charCodeAt(0), 0)}
              widthPx={resize && resize.key === tl.key ? resize.widthPx : null}
              extra={TILE_CATALOG[tl.key].custom ? renderers[TILE_CATALOG[tl.key].custom] : null}
              state={anim[tl.key]} dragging={drag === tl.key}
              onGrab={onGrab(tl.key)}
              onResize={onResize(tl.key, tl.wide, rightCol)}
              shiftLeft={(resize && resize.key === tl.key && rightCol && resizeGeom.current)
                ? Math.max(0, resize.widthPx - resizeGeom.current.narrowW) : 0}
              onRemove={() => remove(tl.key)}
              rightCol={rightCol} />
          </div>
          );
        })}
      </div>

      {editing && removed.length > 0 && (
        <>
          <div style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
            textTransform: "uppercase", letterSpacing: "0.06em", margin: "22px 0 10px" }}>
            Убранные плашки
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: GRID.gap }}>
            {removed.map((k) => (
              <RemovedTile key={k} cfg={TILE_CATALOG[k]} t={t} state={anim[k]} onAdd={() => add(k)} />
            ))}
          </div>
        </>
      )}

      {editing && (
        <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginTop: 14, lineHeight: 1.5 }}>
          Перетащите плашку, чтобы поменять порядок. Потяните за правый край, чтобы растянуть или сжать.
        </div>
      )}
    </>
  );
}

// ============================ ЭКРАН «СЕГОДНЯ» ============================
function TodayScreen({ onStartWorkout, doneToday, setDoneToday, lang, tiles, setTiles, survey, weightLog, setWeightLog, macros, setMacros, onEditingChange, onOpenStat, onOpenShop, balance }) {
  // тот же план, что и на экране тренировки — чтобы плашка не врала
  const health = useHealth();
  // Прогрессия зависит от завершённых тренировок, а не от числа взвешиваний.
  const workoutsDone = React.useMemo(
    () => health.all().filter((s) => s.type === "workouts").reduce((a, s) => a + s.value, 0),
    [health.all().length]);
  const workoutPlan = React.useMemo(() => {
    const raw = buildWorkout(survey || {}, workoutsDone);
    const g = guardWorkout(raw, survey, health);
    return { ...raw, exercises: g.exercises, safety: g };
  }, [survey, workoutsDone, health.all().length]);
  const detailCtx = React.useMemo(() => ({ survey, weightLog, macros, doneToday, workoutPlan }),
    [survey, weightLog, macros, doneToday, workoutPlan]);
  const t = useT(lang);
  const [editing, setEditing] = useState(false);
  useEffect(() => { onEditingChange && onEditingChange(editing); return () => onEditingChange && onEditingChange(false); }, [editing]);
  const rings = [
    { label: "шаги",   full: "шагов из 10 000",   value: "8 420", pct: 84, color: "#A9503F" },
    { label: "ккал",   full: "ккал сожжено",       value: "620",   pct: 62, color: "#C08A4A" },
    { label: "минуты", full: "минут активности",   value: "38",    pct: 76, color: "#7E7A52" },
  ];
  const meals = [
    ["Завтрак", "Овсянка с ягодами", "420 ккал"],
    ["Обед", "Курица с киноа", "610 ккал"],
    ["Ужин", "Лосось и овощи", "540 ккал"],
  ];
  return (
    <div className="fit-screen" style={{ padding: "6px 22px 24px" }}>
      {/* в правке подпись меняется, чтобы было понятно, что делать */}
      <ScreenTitle
        eyebrow={editing ? "Перетащите, растяните или уберите" :
          (survey?.name ? `Вторник, 12 февраля · ${survey.name}` : "Вторник, 12 февраля")}
        title={editing ? "Настройка" : t("today")}
        right={
          <button type="button" onClick={() => setEditing((v) => !v)}
            aria-label={editing ? t("done") : t("editTiles")} title={editing ? t("done") : t("editTiles")}
            style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", height: 42, borderRadius: 999,
              width: editing ? "auto" : 42, padding: editing ? "0 20px" : 0,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform .22s cubic-bezier(.34,1.4,.5,1), opacity .22s cubic-bezier(.34,1.4,.5,1), background-color .22s cubic-bezier(.34,1.4,.5,1), box-shadow .22s cubic-bezier(.34,1.4,.5,1), color .22s cubic-bezier(.34,1.4,.5,1), border-color .22s cubic-bezier(.34,1.4,.5,1)",
              ...(editing
                ? { background: PF.terra, boxShadow: "0 8px 22px rgba(169,112,96,0.45)" }
                : { ...glass(0.5) }) }}>
            {editing ? (
              <span style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: "#fff" }}>Готово</span>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke={PF.ink} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
              </svg>
            )}
          </button>
        } />

      <TileGrid balance={balance} onOpen={(key) => (key === "shop" ? onOpenShop && onOpenShop() : onOpenStat && onOpenStat(key, detailCtx))} tiles={tiles} setTiles={setTiles} editing={editing} t={t}
        renderers={{
          shop: () => null,
          rings: (o) => <ActivityRings openness={o} data={rings} />,
          weight: (o) => (
            <WeightBody lang={lang} survey={survey} weightLog={weightLog} setWeightLog={setWeightLog}
              macros={macros} setMacros={setMacros} compact={o < 0.5} />
          ),
          macros: (o) => <MacrosBody lang={lang} macros={macros} compact={o < 0.5} />,
          workoutDay: (o) => <WorkoutDayBody onStartWorkout={onStartWorkout} plan={workoutPlan} compact={o < 0.5} />,
          meals: (o) => <MealsBody doneToday={doneToday} setDoneToday={setDoneToday} compact={o < 0.5} />,
        }} />

    </div>
  );
}

/****************************************************************************
 *  ГЛАВА 7. ТРЕНИРОВКИ
 *  План, анимация техники, журнал подходов
 ****************************************************************************/

// ============================ ЭКРАН «ТРЕНИРОВКИ» ============================
// ============================ АНИМАЦИЯ ТЕХНИКИ ============================
// Схематичный показ движения: фигура в профиль, ключевые сегменты вращаются
// по ключевым кадрам. Это разбор траектории, а не видеоурок — для продакшена
// сюда встанут записанные ролики или Lottie, компонент менять не придётся.

const EX_ANIM_CSS = `
@keyframes exPressArm   { 0%{transform:rotate(0deg)} 45%{transform:rotate(-72deg)} 55%{transform:rotate(-72deg)} 100%{transform:rotate(0deg)} }
@keyframes exPressBar   { 0%{transform:translateY(0)} 45%{transform:translateY(-30px)} 55%{transform:translateY(-30px)} 100%{transform:translateY(0)} }
@keyframes exRowArm     { 0%,100%{transform:rotate(6deg)}   50%{transform:rotate(-46deg)} }
@keyframes exRowBar     { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-26px)} }
@keyframes exOhpArm     { 0%,100%{transform:rotate(0deg)}   50%{transform:rotate(-96deg)} }
@keyframes exOhpBar     { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-42px)} }
@keyframes exPullBody   { 0%,100%{transform:translateY(0)}  50%{transform:translateY(-30px)} }
@keyframes exPullArm    { 0%,100%{transform:rotate(0deg)}   50%{transform:rotate(34deg)} }
@keyframes exSquatBody  { 0%{transform:translateY(0)} 42%{transform:translateY(26px)} 52%{transform:translateY(26px)} 100%{transform:translateY(0)} }
@keyframes exSquatShin  { 0%,100%{transform:rotate(0deg)}   50%{transform:rotate(-16deg)} }
@keyframes exSquatThigh { 0%{transform:rotate(0deg)} 42%{transform:rotate(58deg)} 52%{transform:rotate(58deg)} 100%{transform:rotate(0deg)} }
@keyframes exBreathe    { 0%,100%{transform:scaleY(1)}      50%{transform:scaleY(1.045)} }
@keyframes exReach      { 0%,100%{transform:rotate(0deg)}   50%{transform:rotate(-26deg)} }
@keyframes exPathDash   { to { stroke-dashoffset: -34; } }
@keyframes exPhaseDown  { 0%,45%{opacity:1} 55%,100%{opacity:0} }
@keyframes exPhaseUp    { 0%,45%{opacity:0} 55%,100%{opacity:1} }
@keyframes exCount      { 0%,88%{transform:scale(1)} 94%{transform:scale(1.28)} 100%{transform:scale(1)} }
`;

/** Пунктирная траектория движения — показывает, куда идёт снаряд. */
function MotionPath({ d }) {
  return (
    <path d={d} fill="none" stroke={PF.terra} strokeOpacity="0.5" strokeWidth="2"
      strokeLinecap="round" strokeDasharray="5 6"
      style={{ animation: "exPathDash 1.1s linear infinite" }} />
  );
}

function ExerciseAnimation({ kind, playing = true, phases }) {
  const S = { skin: "#E8C4A6", line: PF.ink, cloth: PF.terra, bar: "#4A413C" };
  const [speed, setSpeed] = useState(1);        // 0.5 — разбор по фазам, 1 — рабочий темп
  const [paused, setPaused] = useState(false);
  const secs = (2.4 / speed).toFixed(2) + "s";
  const run = playing && !paused;
  const anim = (name, delay = "0s") => ({
    animationName: name,
    animationDuration: secs,
    animationTimingFunction: "ease-in-out",
    animationDelay: delay,
    animationIterationCount: "infinite",
    animationPlayState: run ? "running" : "paused",
    transformBox: "fill-box",
  });
  const ph = phases || ["опускание", "подъём"];

  const Head = ({ cx, cy, r = 11 }) => <circle cx={cx} cy={cy} r={r} fill={S.skin} />;
  const Limb = (p) => <path fill="none" stroke={S.skin} strokeWidth="11" strokeLinecap="round" {...p} />;
  const Torso = (p) => <path fill={S.cloth} {...p} />;

  return (
    <div style={{ width: "100%", height: 190, borderRadius: R.tile, overflow: "hidden",
      background: `linear-gradient(160deg, ${PF.bgDeep}, ${PF.bg})`, position: "relative" }}>
      <style>{EX_ANIM_CSS}</style>
      <svg viewBox="0 0 220 190" width="100%" height="100%">
        {/* пол */}
        <line x1="18" y1="168" x2="202" y2="168" stroke={PF.ink3} strokeOpacity="0.35" strokeWidth="2" strokeLinecap="round" />

        {kind === "benchPress" && (
          <g>
            <rect x="52" y="122" width="118" height="10" rx="5" fill={PF.sandDeep} />
            <line x1="72" y1="132" x2="72" y2="168" stroke={PF.ink3} strokeWidth="5" strokeLinecap="round" />
            <line x1="150" y1="132" x2="150" y2="168" stroke={PF.ink3} strokeWidth="5" strokeLinecap="round" />
            <Head cx="62" cy="112" />
            <Torso d="M74 104 h72 a8 8 0 0 1 0 18 h-72 z" />
            <Limb d="M92 168 L112 140" /><Limb d="M112 140 L146 128" />
            <g style={anim("exPressArm")}>
              <Limb d="M110 110 L128 88" />
              <Limb d="M128 88 L110 70" />
            </g>
            <g style={anim("exPressBar")}>
              <rect x="70" y="64" width="96" height="7" rx="3.5" fill={S.bar} />
              <circle cx="74" cy="67" r="13" fill={S.bar} />
              <circle cx="162" cy="67" r="13" fill={S.bar} />
            </g>
            <MotionPath d="M118 70 L118 104" />
          </g>
        )}

        {kind === "row" && (
          <g>
            <Head cx="66" cy="62" />
            <Torso d="M76 66 L150 96 L146 110 L72 80 z" />
            <Limb d="M148 104 L152 140" /><Limb d="M152 140 L142 168" />
            <g style={anim("exRowArm")}>
              <Limb d="M110 88 L112 126" />
            </g>
            <g style={anim("exRowBar")}>
              <rect x="72" y="124" width="80" height="7" rx="3.5" fill={S.bar} />
              <circle cx="76" cy="127" r="12" fill={S.bar} />
              <circle cx="148" cy="127" r="12" fill={S.bar} />
            </g>
            <MotionPath d="M112 126 L112 96" />
          </g>
        )}

        {kind === "overheadPress" && (
          <g>
            <Head cx="110" cy="52" />
            <Torso d="M98 64 h24 a7 7 0 0 1 0 14 v34 h-24 v-34 a7 7 0 0 1 0 -14 z" />
            <Limb d="M104 112 L100 168" /><Limb d="M116 112 L122 168" />
            <g style={anim("exOhpArm")}>
              <Limb d="M100 76 L88 104" />
              <Limb d="M120 76 L132 104" />
            </g>
            <g style={anim("exOhpBar")}>
              <rect x="62" y="96" width="96" height="7" rx="3.5" fill={S.bar} />
              <circle cx="66" cy="99" r="13" fill={S.bar} />
              <circle cx="154" cy="99" r="13" fill={S.bar} />
            </g>
            <MotionPath d="M110 96 L110 56" />
          </g>
        )}

        {kind === "pullUp" && (
          <g>
            <rect x="46" y="26" width="128" height="8" rx="4" fill={S.bar} />
            <g style={anim("exPullBody")}>
              <Head cx="110" cy="72" />
              <Torso d="M98 84 h24 v42 h-24 z" />
              <g style={anim("exPullArm")}>
                <Limb d="M100 84 L86 38" />
                <Limb d="M120 84 L134 38" />
              </g>
              <Limb d="M104 126 L100 160" /><Limb d="M116 126 L122 160" />
            </g>
            <MotionPath d="M110 88 L110 58" />
          </g>
        )}

        {kind === "squat" && (
          <g>
            <g style={anim("exSquatBody")}>
              <Head cx="110" cy="48" />
              <Torso d="M98 60 h24 a7 7 0 0 1 0 14 v32 h-24 v-32 a7 7 0 0 1 0 -14 z" />
              <rect x="70" y="66" width="80" height="7" rx="3.5" fill={S.bar} />
              <circle cx="74" cy="69" r="12" fill={S.bar} />
              <circle cx="146" cy="69" r="12" fill={S.bar} />
              <Limb d="M100 72 L82 84" /><Limb d="M120 72 L138 84" />
            </g>
            <g style={anim("exSquatThigh")}>
              <Limb d="M104 106 L102 136" />
              <Limb d="M116 106 L118 136" />
            </g>
            <Limb d="M102 136 L100 168" /><Limb d="M118 136 L120 168" />
            <MotionPath d="M110 108 L110 134" />
          </g>
        )}

        {kind === "plank" && (
          <g style={anim("exBreathe")}>
            <Head cx="58" cy="118" />
            <Torso d="M70 116 L154 128 L152 142 L68 130 z" />
            <Limb d="M76 126 L72 166" />
            <Limb d="M148 132 L162 166" />
            <Limb d="M150 134 L156 166" />
            <line x1="56" y1="112" x2="168" y2="126" stroke={PF.terra} strokeOpacity="0.45"
              strokeWidth="2" strokeDasharray="5 6" strokeLinecap="round"
              style={{ animation: "exPathDash 1.1s linear infinite" }} />
          </g>
        )}

        {kind === "stretch" && (
          <g>
            <Head cx="110" cy="52" />
            <Torso d="M98 64 h24 a7 7 0 0 1 0 14 v32 h-24 v-32 a7 7 0 0 1 0 -14 z" />
            <Limb d="M104 110 L96 168" /><Limb d="M116 110 L126 168" />
            <g style={anim("exReach")}>
              <Limb d="M100 76 L78 52" />
            </g>
            <g style={anim("exReach", "1.2s")}>
              <Limb d="M120 76 L142 52" />
            </g>
          </g>
        )}
      </svg>

      {/* счётчик темпа: пульсирует на завершении повтора */}
      <div style={{ position: "absolute", right: 12, top: 10, width: 30, height: 30, borderRadius: 999,
        ...glass(0.55), display: "flex", alignItems: "center", justifyContent: "center",
        ...(run ? { animationName: "exCount", animationDuration: secs,
          animationTimingFunction: "ease-in-out", animationIterationCount: "infinite" } : {}) }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={PF.terra} strokeWidth="2" strokeLinecap="round">
          <path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" />
        </svg>
      </div>

      {/* фаза движения — подписи сменяются в такт анимации */}
      <div style={{ position: "absolute", left: 12, bottom: 10, height: 24, minWidth: 96,
        padding: "0 12px", borderRadius: 999, ...glass(0.55),
        display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ position: "absolute", fontFamily: sfPro, ...TYPE.caption2, color: PF.ink2,
          ...(run ? { animationName: "exPhaseDown", animationDuration: secs,
            animationTimingFunction: "step-end", animationIterationCount: "infinite" } : { opacity: 1 }) }}>{ph[0]}</span>
        <span style={{ position: "absolute", fontFamily: sfPro, ...TYPE.caption2, color: PF.terra, fontWeight: 700,
          ...(run ? { animationName: "exPhaseUp", animationDuration: secs,
            animationTimingFunction: "step-end", animationIterationCount: "infinite" } : { opacity: 0 }) }}>{ph[1]}</span>
      </div>

      {/* пауза и замедленный разбор */}
      <div style={{ position: "absolute", right: 12, bottom: 10, display: "flex", gap: 6 }}>
        <button type="button" onClick={(e) => { e.stopPropagation(); setPaused((v) => !v); }}
          aria-label={paused ? "Продолжить" : "Пауза"} title={paused ? "Продолжить" : "Пауза"}
          style={{ width: 30, height: 30, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            ...glass(0.6), display: "flex", alignItems: "center", justifyContent: "center" }}>
          {paused
            ? <svg width="13" height="13" viewBox="0 0 24 24" fill={PF.ink2}><path d="M7 4l13 8-13 8z" /></svg>
            : <svg width="13" height="13" viewBox="0 0 24 24" fill={PF.ink2}><rect x="6" y="4" width="4" height="16" rx="1.5" /><rect x="14" y="4" width="4" height="16" rx="1.5" /></svg>}
        </button>
        <button type="button" onClick={(e) => { e.stopPropagation(); setSpeed((s) => s === 1 ? 0.5 : 1); }}
          aria-label="Скорость" title="Замедленный разбор"
          style={{ height: 30, padding: "0 11px", borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            fontFamily: sfPro, ...TYPE.caption2, fontWeight: 700,
            ...(speed === 0.5
              ? { background: PF.terra, color: "#fff" }
              : { ...glass(0.6), color: PF.ink2 }) }}>
          {speed === 0.5 ? "0.5×" : "1×"}
        </button>
      </div>
    </div>
  );
}

function WorkoutScreen({ onBack, survey, workoutsCompleted }) {
  // План собирается правилами из анкеты: цель, опыт и противопоказания
  const plan = React.useMemo(() => buildWorkout(survey || {}, workoutsCompleted || 0),
    [survey, workoutsCompleted]);
  const PHASES = { benchPress:["опускание","жим"], row:["опускание","тяга"],
    overheadPress:["к плечам","жим вверх"], pullUp:["опускание","подъём"],
    squat:["присед","вставание"], plank:["вдох","выдох"], stretch:["тянемся","возврат"] };
  const PLAN = plan.exercises.map((e, i) => ({
    id: i + 1, name: e.name, target: `${e.sets} × ${e.reps}`, rest: e.rest,
    kind: e.kind, desc: e.desc, cues: e.cues, phases: PHASES[e.kind],
  }));

  const [open, setOpen] = useState(null);
  const [done, setDone] = useState([]);
  const [log, setLog] = useState({});      // id -> [{reps, weight}]

  const pct = Math.round((done.length / PLAN.length) * 100);
  const addSet = (id) => setLog((l) => ({ ...l, [id]: [...(l[id] || []), { reps: "", weight: "" }] }));
  const setField = (id, i, field, v) =>
    setLog((l) => ({ ...l, [id]: (l[id] || []).map((s, k) => k === i ? { ...s, [field]: v } : s) }));
  const delSet = (id, i) => setLog((l) => ({ ...l, [id]: (l[id] || []).filter((_, k) => k !== i) }));
  const toggleDone = (id) => setDone((d) => d.includes(id) ? d.filter((x) => x !== id) : [...d, id]);
  // все упражнения закрыты — тренировка засчитана в метрики (один раз за день).
  // Запись идёт в эффекте, чтобы не обновлять корень во время рендера этого экрана.
  useEffect(() => {
    if (PLAN.length && done.length === PLAN.length) {
      const today = dayKey(Date.now());
      // повторное завершение и повторная синхронизация не увеличивают счётчик второй раз
      if (!healthStore.all().some((s) => s.type === "workouts" && dayKey(s.ts) === today && s.source === "FIT288")) {
        healthStore.add([{ type: "workouts", value: 1, unit: "шт.", ts: Date.now(), source: "FIT288" },
          { type: "activeMin", value: 20 + PLAN.length * 5, unit: "мин", ts: Date.now(), source: "FIT288" }]);
      }
    }
  }, [done.length, PLAN.length]);

  return (
    <div className="fit-screen" style={{ padding: "6px 22px 24px" }}>
      <ScreenTitle eyebrow="45 минут · всё тело" title="Power & Poise" />

      <SectionCard className="fit-glass fit-pop" style={{ marginTop: 18, display: "flex", alignItems: "center", gap: 16 }}>
        <Ring pct={pct} value={`${pct}%`} label="готово" size={72} stroke={7} color={PF.terra} />
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>
            {done.length} из {PLAN.length} упражнений
          </div>
          <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 3 }}>
            Нажмите на упражнение — покажем технику и запишем подходы.
          </div>
        </div>
      </SectionCard>

      {/* прозрачность: что подобрано и почему */}
      <SectionCard style={{ marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 30, height: 30, borderRadius: 10, background: ACCENT.goals.soft,
            display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Glyph d={ICONS.chart} size={16} color={ACCENT.goals.c} />
          </div>
          <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink }}>
            Подобрано под вашу анкету
          </div>
        </div>
        <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 9, lineHeight: 1.5 }}>
          {plan.scheme.note}. Режим {plan.scheme.sets} × {plan.scheme.reps}, отдых {plan.scheme.rest}.
        </div>
        {plan.limits.length > 0 && (
          <div style={{ marginTop: 10, paddingTop: 10, borderTopStyle: "solid", borderTopWidth: 1, borderTopColor: PF.line }}>
            <div style={{ fontFamily: sfPro, ...TYPE.caption, fontWeight: 700, color: ACCENT.workout.c,
              textTransform: "uppercase", letterSpacing: "0.05em" }}>Учтены ограничения</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 7 }}>
              {plan.limits.map((l) => (
                <span key={l} style={{ padding: "5px 11px", borderRadius: 999,
                  background: ACCENT.workout.soft, fontFamily: sfPro, ...TYPE.caption,
                  color: ACCENT.workout.c }}>{LIMIT_LABEL[l] || l}</span>
              ))}
            </div>
          </div>
        )}
        {plan.log.length > 0 && (
          <div style={{ marginTop: 10 }}>
            {plan.log.map((r, i) => (
              <div key={i} style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2,
                marginTop: 5, lineHeight: 1.45 }}>
                {r.to
                  ? <>«{r.from}» заменено на «{r.to}» — {r.reason.map((x) => LIMIT_LABEL[x] || x).join(", ")}</>
                  : <>«{r.from}» исключено — {r.reason.map((x) => LIMIT_LABEL[x] || x).join(", ")}</>}
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Eyebrow>План</Eyebrow>

      {PLAN.map((ex) => {
        const isOpen = open === ex.id;
        const isDone = done.includes(ex.id);
        const sets = log[ex.id] || [];
        return (
          <div key={ex.id} style={{ marginBottom: 10, borderRadius: R.card, ...glass(0.46),
            overflow: "hidden", transition: "background .25s" }}>

            {/* строка упражнения */}
            <div style={{ display: "flex", alignItems: "center", gap: 13, padding: 16, cursor: "pointer" }}
              onClick={() => setOpen(isOpen ? null : ex.id)}>
              <button type="button" aria-label={isDone ? "Снять отметку" : "Выполнено"}
                onClick={(e) => { e.stopPropagation(); toggleDone(ex.id); }}
                style={{ width: 30, height: 30, borderRadius: 999, flexShrink: 0, cursor: "pointer",
                  border: isDone ? "none" : `2px solid ${PF.line}`,
                  background: isDone ? PF.terra : "transparent",
                  boxShadow: isDone ? "0 4px 12px rgba(169,112,96,0.4)" : "none",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform .22s cubic-bezier(.34,1.4,.5,1), opacity .22s cubic-bezier(.34,1.4,.5,1), background-color .22s cubic-bezier(.34,1.4,.5,1), box-shadow .22s cubic-bezier(.34,1.4,.5,1), color .22s cubic-bezier(.34,1.4,.5,1), border-color .22s cubic-bezier(.34,1.4,.5,1)" }}>
                {isDone && <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 13l4 4L19 7" /></svg>}
              </button>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink,
                  textDecoration: isDone ? "line-through" : "none", opacity: isDone ? 0.6 : 1 }}>{ex.name}</div>
                <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 2 }}>
                  {ex.target} · отдых {ex.rest}{sets.length ? ` · записано ${sets.length}` : ""}
                </div>
              </div>

              <div style={{ transform: isOpen ? "rotate(90deg)" : "rotate(0deg)",
                transition: "transform .3s cubic-bezier(.34,1.4,.5,1)", display: "flex" }}>
                <Glyph d={ICONS.chevron} size={17} color={PF.ink2} />
              </div>
            </div>

            {/* раскрывающаяся часть */}
            <div style={{ maxHeight: isOpen ? 900 : 0, opacity: isOpen ? 1 : 0,
              overflow: "hidden", willChange: isOpen ? "max-height, opacity" : "auto",
              transition: "max-height .45s cubic-bezier(.4,0,.2,1), opacity .3s ease" }}>
              <div style={{ padding: "0 16px 16px" }}>
                <ExerciseAnimation kind={ex.kind} playing={isOpen} phases={ex.phases} />

                <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink, marginTop: 14, lineHeight: 1.5 }}>
                  {ex.desc}
                </div>
                <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none" }}>
                  {ex.cues.map((c, i) => (
                    <li key={i} style={{ display: "flex", gap: 8, marginTop: 7 }}>
                      <span style={{ width: 5, height: 5, borderRadius: 999, background: PF.terra,
                        marginTop: 7, flexShrink: 0 }} />
                      <span style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, lineHeight: 1.45 }}>{c}</span>
                    </li>
                  ))}
                </ul>

                {/* журнал подходов */}
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${PF.line}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
                    <span style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 600, color: PF.ink2,
                      textTransform: "uppercase", letterSpacing: "0.06em" }}>Подходы</span>
                    <span style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>цель {ex.target}</span>
                  </div>

                  {sets.map((s, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ width: 26, height: 26, borderRadius: 999, flexShrink: 0,
                        background: PF.bgDeep, color: PF.ink2, fontFamily: sfPro, ...TYPE.caption2, fontWeight: 700,
                        display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                      <input value={s.reps} onChange={(e) => setField(ex.id, i, "reps", e.target.value)}
                        placeholder="раз" inputMode="numeric" size={1}
                        style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", fontFamily: sfPro, ...TYPE.subhead,
                          color: PF.ink, padding: "10px 8px", borderRadius: 12,
                          borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "#fff", outline: "none" }} />
                      <span style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>×</span>
                      <input value={s.weight} onChange={(e) => setField(ex.id, i, "weight", e.target.value)}
                        placeholder="кг" inputMode="decimal" size={1}
                        style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", fontFamily: sfPro, ...TYPE.subhead,
                          color: PF.ink, padding: "10px 8px", borderRadius: 12,
                          borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "#fff", outline: "none" }} />
                      <button type="button" aria-label="Убрать подход" onClick={() => delSet(ex.id, i)}
                        style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
                          cursor: "pointer", background: PF.bgDeep,
                          display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={PF.ink2} strokeWidth="3" strokeLinecap="round"><path d="M6 12h12" /></svg>
                      </button>
                    </div>
                  ))}

                  <button type="button" onClick={() => addSet(ex.id)}
                    style={{ width: "100%", padding: "11px", borderRadius: 12, cursor: "pointer",
                      borderStyle: "dashed", borderWidth: 1, borderColor: PF.line, background: "transparent",
                      fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600, color: PF.terra }}>
                    + Добавить подход
                  </button>

                  {sets.length > 0 && (
                    <button type="button" onClick={() => { toggleDone(ex.id); setOpen(null); }}
                      style={{ width: "100%", marginTop: 9, padding: "13px", borderRadius: 12,
                        borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
                        background: isDone ? PF.bgDeep : PF.terra, color: isDone ? PF.ink2 : "#fff",
                        fontFamily: sfPro, ...TYPE.headline }}>
                      {isDone ? "Упражнение отмечено" : "Закончить упражнение"}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}


function ChatsScreen({ lang, onCall, onRoomChange }) {
  const t = useT(lang);
  const [phone, setPhone] = useState("");
  const [adding, setAdding] = useState(false);
  const [openChat, setOpenChat] = useState(null);
  const [found, setFound] = useState(null);
  const [friends, setFriends] = useState([
    { id: 1, name: "Дана С.", phone: "+7 916 000-11-22", last: "Как прошла тренировка?", when: "2 ч", unread: 2,
      history: [
        { me: false, text: "Привет! Как прошла тренировка?", at: "12:04" },
        { me: true, text: "Отлично, добавила подход на жиме", at: "12:09" },
        { me: false, text: "Красота. Завтра ноги?", at: "12:11" },
      ] },
    { id: 2, name: "Марк Л.", phone: "+7 903 555-33-44", last: "Скинь план на неделю", when: "вчера", unread: 0,
      history: [{ me: false, text: "Скинь план на неделю", at: "19:40" }] },
    { id: 3, name: "Ирина П.", phone: "+7 925 777-88-99", last: "Спасибо!", when: "пн", unread: 0,
      history: [{ me: true, text: "Готово, отправила", at: "10:02" }, { me: false, text: "Спасибо!", at: "10:05" }] },
  ]);

  const digits = phone.replace(/\D/g, "");
  const canSearch = digits.length >= 10;
  const doSearch = () => {
    if (!canSearch) return;
    const exists = friends.find((f) => f.phone.replace(/\D/g, "").endsWith(digits.slice(-10)));
    setFound(exists ? { ...exists, already: true } : { id: Date.now(), name: "Новый пользователь", phone, already: false });
  };
  const addFriend = () => {
    if (!found || found.already) return;
    setFriends((f) => [{ ...found, last: "Добавлен в друзья", when: "сейчас", unread: 0, history: [] }, ...f]);
    setFound(null); setPhone(""); setAdding(false);
  };

  const openRoom = (f) => {
    setFriends((list) => list.map((x) => x.id === f.id ? { ...x, unread: 0 } : x));
    setOpenChat(f.id);
    onRoomChange?.(true);
  };
  const send = (text) => {
    setFriends((list) => list.map((x) => x.id === openChat
      ? { ...x, history: [...x.history, { me: true, text, at: "сейчас" }], last: text, when: "сейчас" } : x));
  };

  const chat = friends.find((f) => f.id === openChat);
  if (chat) {
    return <ChatRoom chat={chat} onSend={send} onCall={onCall}
      onBack={() => { setOpenChat(null); onRoomChange?.(false); }} />;
  }

  return (
    <div className="fit-screen" style={{ padding: "6px 22px 24px" }}>
      <ScreenTitle eyebrow={`${friends.length} ${t("friends").toLowerCase()}`} title={t("chats")}
        right={
          <button type="button" onClick={() => { setAdding((v) => !v); setFound(null); }}
            aria-label={t("addFriend")} title={t("addFriend")}
            style={{ width: 42, height: 42, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform .22s cubic-bezier(.34,1.4,.5,1), opacity .22s cubic-bezier(.34,1.4,.5,1), background-color .22s cubic-bezier(.34,1.4,.5,1), box-shadow .22s cubic-bezier(.34,1.4,.5,1), color .22s cubic-bezier(.34,1.4,.5,1), border-color .22s cubic-bezier(.34,1.4,.5,1)",
              ...(adding
                ? { background: PF.terra, boxShadow: "0 8px 22px rgba(169,112,96,0.45)", transform: "rotate(45deg)" }
                : { ...glass(0.5) }) }}>
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
              stroke={adding ? "#fff" : PF.ink} strokeWidth="2" strokeLinecap="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </button>
        } />

      {adding && (
        <SectionCard style={{ marginTop: 16 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginBottom: 8 }}>{t("phone")}</div>
          <div style={{ display: "flex", gap: 9, alignItems: "stretch", width: "100%" }}>
            <input value={phone} onChange={(e) => { setPhone(e.target.value); setFound(null); }}
              placeholder="+7 900 000-00-00" inputMode="tel" size={1}
              style={{ flex: "1 1 0", minWidth: 0, fontFamily: sfPro, ...TYPE.body, color: PF.ink,
                padding: "13px 14px", borderRadius: R.tile, borderStyle: "solid", borderWidth: 1, borderColor: PF.line,
                background: "#fff", outline: "none" }} />
            <button type="button" onClick={doSearch} disabled={!canSearch}
              style={{ flexShrink: 0, whiteSpace: "nowrap", borderStyle: "solid", borderWidth: 0, borderColor: "transparent", padding: "0 20px",
                cursor: canSearch ? "pointer" : "default", borderRadius: R.tile,
                fontFamily: sfPro, ...TYPE.headline,
                background: canSearch ? PF.terra : PF.bgDeep, color: canSearch ? "#fff" : PF.ink3 }}>
              {t("search")}
            </button>
          </div>
          {found && (
            <div style={{ display: "flex", alignItems: "center", gap: 13, marginTop: 14,
              paddingTop: 14, borderTop: `1px solid ${PF.line}` }}>
              <div style={{ width: 42, height: 42, borderRadius: 999, background: PF.bgDeep, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink2 }}>{found.name[0]}</span>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{found.name}</div>
                <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>{found.phone}</div>
              </div>
              <button type="button" onClick={addFriend} disabled={found.already}
                style={{ borderStyle: "solid", borderWidth: 0, borderColor: "transparent", padding: "10px 16px", borderRadius: R.pill,
                  cursor: found.already ? "default" : "pointer", fontFamily: sfPro, ...TYPE.subhead, fontWeight: 600,
                  background: found.already ? PF.bgDeep : PF.terra, color: found.already ? PF.ink3 : "#fff" }}>
                {found.already ? "Уже в друзьях" : "Добавить"}
              </button>
            </div>
          )}
        </SectionCard>
      )}

      <div style={{ marginTop: 16 }}>
        {friends.map((f) => (
          <div key={f.id} style={{ position: "relative", marginBottom: 14 }}>
            <SectionCard onClick={() => openRoom(f)}
              style={{ display: "flex", alignItems: "center", gap: 13 }}>
              <div style={{ width: 46, height: 46, borderRadius: 999, background: PF.bgDeep, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink2 }}>{f.name[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{f.name}</div>
                <div style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2, marginTop: 2,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.last}</div>
              </div>
              <div style={{ display: "flex", gap: 7, flexShrink: 0 }}>
                <button type="button" title="Аудио" onClick={(e) => { e.stopPropagation(); onCall(f.name, "audio"); }}
                  style={{ width: 34, height: 34, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
                    background: PF.bgDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PF.terra} strokeWidth="1.9" strokeLinecap="round">
                    <path d="M4 5c0 8 7 15 15 15l2-4-5-2-2 2a13 13 0 01-6-6l2-2-2-5z" />
                  </svg>
                </button>
                <button type="button" title="Видео" onClick={(e) => { e.stopPropagation(); onCall(f.name, "video"); }}
                  style={{ width: 34, height: 34, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
                    background: PF.bgDeep, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={PF.terra} strokeWidth="1.9" strokeLinecap="round">
                    <rect x="3" y="6" width="12" height="12" rx="3" /><path d="M15 11l6-3v8l-6-3z" />
                  </svg>
                </button>
              </div>
              <span style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, flexShrink: 0 }}>{f.when}</span>
            </SectionCard>

            {/* счётчик выходит за угол плашки и наполовину лежит на ней */}
            {f.unread > 0 && (
              <div style={{ position: "absolute", top: -9, right: -9, minWidth: 24, height: 24,
                padding: "0 7px", borderRadius: 999, background: PF.terra, color: "#fff",
                fontFamily: sfPro, ...TYPE.caption2, fontWeight: 700, zIndex: 3,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(169,112,96,0.45), 0 0 0 2.5px rgba(250,246,241,0.96)" }}>
                {f.unread}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Экран переписки
function ChatRoom({ chat, onBack, onSend, onCall }) {
  const [text, setText] = useState("");
  const inputRef = React.useRef(null);
  // Насколько снизу поднялась клавиатура. Считаем по видимой области окна:
  // когда клавиатура выезжает, visualViewport становится ниже, чем окно.
  const [kb, setKb] = useState(0);

  // при входе в чат сразу ставим курсор в поле — клавиатура открывается
  React.useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 120);
    return () => clearTimeout(id);
  }, []);

  React.useEffect(() => {
    const vv = typeof window !== "undefined" && window.visualViewport;
    if (!vv) return;
    const onResize = () => {
      const overlap = window.innerHeight - vv.height - vv.offsetTop;
      setKb(Math.max(0, Math.round(overlap)));
    };
    onResize();
    vv.addEventListener("resize", onResize);
    vv.addEventListener("scroll", onResize);
    return () => { vv.removeEventListener("resize", onResize); vv.removeEventListener("scroll", onResize); };
  }, []);

  const submit = () => {
    const v = text.trim(); if (!v) return;
    onSend(v); setText("");
    inputRef.current?.focus();          // клавиатура остаётся открытой
  };

  return (
    <div className="fit-screen" style={{ padding: "6px 22px 0", display: "flex",
      flexDirection: "column", height: "100vh", boxSizing: "border-box" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0 14px" }}>
        <button type="button" onClick={onBack} aria-label="Назад"
          style={{ width: 40, height: 40, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}>
            <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
          </div>
        </button>
        <div style={{ width: 40, height: 40, borderRadius: 999, background: PF.bgDeep,
          display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink2 }}>{chat.name[0]}</span>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{chat.name}</div>
          <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2 }}>в сети</div>
        </div>
        <button type="button" onClick={() => onCall(chat.name, "audio")} aria-label="Аудио"
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={PF.terra} strokeWidth="1.9" strokeLinecap="round">
            <path d="M4 5c0 8 7 15 15 15l2-4-5-2-2 2a13 13 0 01-6-6l2-2-2-5z" />
          </svg>
        </button>
        <button type="button" onClick={() => onCall(chat.name, "video")} aria-label="Видео"
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke={PF.terra} strokeWidth="1.9" strokeLinecap="round">
            <rect x="3" y="6" width="12" height="12" rx="3" /><path d="M15 11l6-3v8l-6-3z" />
          </svg>
        </button>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: "auto",
        display: "flex", flexDirection: "column", gap: 9,
        paddingBottom: 12 }}>
        {chat.history.map((m, i) => (
          <div key={i} style={{ alignSelf: m.me ? "flex-end" : "flex-start", maxWidth: "78%" }}>
            <div style={{ padding: "11px 15px", borderRadius: 20,
              borderBottomRightRadius: m.me ? 6 : 20, borderBottomLeftRadius: m.me ? 20 : 6,
              fontFamily: sfPro, ...TYPE.subhead,
              ...(m.me
                ? { background: PF.terra, color: "#fff", boxShadow: "0 4px 14px rgba(169,112,96,0.3)" }
                : { ...glass(0.5), color: PF.ink }) }}>
              {m.text}
            </div>
            <div style={{ fontFamily: sfPro, ...TYPE.caption2, color: PF.ink3, marginTop: 3,
              textAlign: m.me ? "right" : "left" }}>{m.at}</div>
          </div>
        ))}
      </div>

      {/* поле ввода прижато к низу; при открытой клавиатуре поднимается над ней,
          при закрытой — опускается обратно */}
      <div style={{ display: "flex", gap: 9, alignItems: "stretch", width: "100%",
        flexShrink: 0, paddingTop: 10,
        paddingBottom: kb > 0 ? 10 : 22,
        marginBottom: kb,
        transition: "margin-bottom .22s ease, padding-bottom .22s ease" }}>
        <input ref={inputRef} value={text} onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") submit(); }}
          placeholder="Сообщение" size={1} autoFocus
          style={{ flex: "1 1 0", minWidth: 0, fontFamily: sfPro, ...TYPE.body, color: PF.ink,
            padding: "13px 16px", borderRadius: R.pill, borderStyle: "solid", borderWidth: 1, borderColor: PF.line,
            background: "#fff", outline: "none" }} />
        <button type="button" onClick={submit} aria-label="Отправить"
          style={{ flexShrink: 0, width: 48, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer", borderRadius: 999,
            background: text.trim() ? PF.terra : PF.bgDeep,
            display: "flex", alignItems: "center", justifyContent: "center" }}>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none"
            stroke={text.trim() ? "#fff" : PF.ink3} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 12l16-8-6 8 6 8z" />
          </svg>
        </button>
      </div>
    </div>
  );
}


/****************************************************************************
 *  ГЛАВА 8. НАВИГАЦИЯ И ПИТАНИЕ
 *  Панель вкладок, дневник питания
 ****************************************************************************/

// ============================ НИЖНЯЯ НАВИГАЦИЯ ============================
// Индикатор — отдельный слой, который едет за активной вкладкой и слушает палец:
// можно не тыкать, а вести пальцем вдоль панели, разделы переключаются на лету.
const TAB_OF = { editor: "profile", appearance: "profile", settings: "profile", workout: "workout" };

function TabBar({ tabs, screen, setScreen, disabled = false }) {
  const barRef = React.useRef(null);
  const currentTab = TAB_OF[screen] || screen;
  const n = tabs.length;
  const activeIndex = Math.max(0, tabs.findIndex(([id]) => id === currentTab));

  // Координаты в единицах viewBox: каждая вкладка — 20 единиц, центр i*20+10.
  const CELL = 20, H = 20;
  const centerOf = (i) => i * CELL + CELL / 2;

  // Ведущая капля летит к цели, ведомая тянется следом — между ними
  // остаётся перемычка, которая истончается и отрывается.
  const [lead, setLead] = React.useState(centerOf(activeIndex));
  const [tail, setTail] = React.useState(centerOf(activeIndex));
  const anim = React.useRef({ lead: centerOf(activeIndex), tail: centerOf(activeIndex), raf: 0, target: centerOf(activeIndex) });
  const uid = React.useId ? React.useId().replace(/:/g, "") : "goo";

  React.useEffect(() => {
    anim.current.target = centerOf(activeIndex);
    cancelAnimationFrame(anim.current.raf);
    const step = () => {
      const a = anim.current;
      a.lead += (a.target - a.lead) * 0.26;          // ведущая — быстрее
      a.tail += (a.lead - a.tail) * 0.13;            // ведомая — с отставанием
      setLead(a.lead); setTail(a.tail);
      if (Math.abs(a.target - a.lead) > 0.05 || Math.abs(a.lead - a.tail) > 0.05) {
        a.raf = requestAnimationFrame(step);
      } else {
        a.lead = a.target; a.tail = a.target;
        setLead(a.target); setTail(a.target);
      }
    };
    anim.current.raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(anim.current.raf);
  }, [activeIndex]);

  // растяжение: чем дальше капли, тем они тоньше — перемычка рвётся
  const gap = Math.abs(lead - tail);
  const stretch = Math.min(1, gap / (CELL * 1.6));
  const rLead = 8.6 - stretch * 1.2;                 // половина ширины
  const rTail = 8.6 - stretch * 4.4;
  const hLead = 7.4 - stretch * 0.5;                 // половина высоты
  const hTail = Math.max(1.6, 7.4 - stretch * 3.4);

  // ---- палец: ведём вдоль панели, разделы переключаются на лету ----
  const indexFromClientX = (clientX) => {
    const el = barRef.current;
    if (!el) return activeIndex;
    const r = el.getBoundingClientRect();
    const inner = r.width - 12;
    const x = Math.min(Math.max(clientX - r.left - 6, 0), inner);
    return Math.min(n - 1, Math.max(0, Math.floor((x / inner) * n)));
  };
  const move = (clientX) => {
    if (disabled) return;
    const id = tabs[indexFromClientX(clientX)][0];
    if (id !== currentTab) setScreen(id);
  };
  const onDown = (e) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    move(e.clientX);
  };
  const onMove = (e) => { if (e.buttons > 0 || e.pressure > 0) move(e.clientX); };

  return (
    <div
      ref={barRef}
      onPointerDown={onDown}
      onPointerMove={onMove}
      aria-disabled={disabled}
      style={{
        // в правке плашек панель недоступна: нажатия не проходят, вид приглушён
        pointerEvents: disabled ? "none" : "auto",
        opacity: disabled ? 0.45 : 1,
        filter: disabled ? "saturate(60%)" : "none",
        transition: "opacity .25s ease, filter .25s ease",
        // фиксирована к окну; ширина окна не меняется — полоса прокрутки всегда на месте
        position: "fixed", bottom: 22, left: 0, right: 0, zIndex: 60,
        marginLeft: "auto", marginRight: "auto",
        width: "calc(100% - 28px)", maxWidth: 402,
        display: "flex", padding: "9px 6px", borderRadius: 999,
        touchAction: "none", userSelect: "none", WebkitUserSelect: "none",
        background: "linear-gradient(150deg, rgba(255,255,255,0.22) 0%, rgba(255,253,250,0.08) 100%)",
        backdropFilter: "blur(30px) saturate(160%)",
        WebkitBackdropFilter: "blur(30px) saturate(160%)",
        borderStyle: "solid", borderWidth: 1, borderColor: "rgba(255,255,255,0.45)",
        boxShadow: "0 18px 48px rgba(63,48,41,0.16), inset 0 1px 0 rgba(255,255,255,0.98), inset 0 -1px 0 rgba(169,112,96,0.10)",
      }}>

      {/* желейный слой: две капли + фильтр слипания */}
      <svg viewBox={`0 0 ${n * CELL} ${H}`} preserveAspectRatio="none"
        style={{ position: "absolute", left: 6, right: 6, top: 7, bottom: 7,
          width: "calc(100% - 12px)", height: "calc(100% - 14px)", pointerEvents: "none", zIndex: 0 }}>
        <defs>
          <filter id={`goo-${uid}`}>
            {/* размытие + резкий контраст по альфе = капли слипаются и тянутся */}
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.9" result="blur" />
            <feColorMatrix in="blur" mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 26 -12" result="goo" />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
          <linearGradient id={`gooFill-${uid}`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.94" />
            <stop offset="60%" stopColor="#FBF1EA" stopOpacity="0.88" />
            <stop offset="100%" stopColor="#F3E3DA" stopOpacity="0.86" />
          </linearGradient>
          <filter id={`gooGlow-${uid}`} x="-30%" y="-50%" width="160%" height="200%">
            <feDropShadow dx="0" dy="0.7" stdDeviation="0.9" floodColor={PF.ink} floodOpacity="0.16" />
          </filter>
        </defs>
        <g filter={`url(#goo-${uid})`} style={{ filter: `url(#gooGlow-${uid})` }}>
          {/* капсулы, а не овалы — повторяют форму самой панели */}
          <rect x={tail - rTail} y={H / 2 - hTail} width={rTail * 2} height={hTail * 2}
            rx={hTail} ry={hTail} fill={`url(#gooFill-${uid})`} />
          <rect x={lead - rLead} y={H / 2 - hLead} width={rLead * 2} height={hLead * 2}
            rx={hLead} ry={hLead} fill={`url(#gooFill-${uid})`} />
        </g>
      </svg>

      {tabs.map(([id, label, icon], i) => {
        const active = i === activeIndex;
        return (
          <button key={id} type="button" onClick={() => { if (!disabled) setScreen(id); }}
            disabled={disabled} aria-label={label} title={label}
            style={{
              flex: 1, minWidth: 0, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", background: "transparent",
              cursor: "pointer", position: "relative", zIndex: 1, height: 46, borderRadius: 999,
              display: "flex", alignItems: "center", justifyContent: "center",
              transition: "transform .28s cubic-bezier(.34,1.5,.5,1)",
              transform: active ? "scale(1.06)" : "scale(0.95)",
            }}>
            <Glyph d={icon} size={id === "workout" ? 26 : 22} color={active ? PF.wineDeep : PF.ink2} />
          </button>
        );
      })}
    </div>
  );
}


// Справочник продуктов на 100 г — перенесён из fitOS.
const FOOD_CATALOG = [
  { id:"buckwheat-porridge", name:"Каша гречневая на воде", a:"каша гречка крупа завтрак", kcal:101, p:3.6, c:18.6, f:1.1 },
  { id:"oat-porridge", name:"Каша овсяная на воде", a:"каша овсянка геркулес завтрак", kcal:88, p:3, c:15, f:1.7 },
  { id:"rice-porridge", name:"Каша рисовая на молоке", a:"каша рис молочная завтрак", kcal:97, p:2.5, c:16, f:2.3 },
  { id:"millet-porridge", name:"Каша пшённая на воде", a:"каша пшено крупа", kcal:90, p:3, c:17, f:0.7 },
  { id:"semolina-porridge", name:"Каша манная на молоке", a:"каша манка молочная", kcal:98, p:3, c:15.3, f:3.2 },
  { id:"corn-porridge", name:"Каша кукурузная", a:"каша кукуруза полента", kcal:81, p:2.1, c:16.7, f:0.6 },
  { id:"barley-porridge", name:"Каша перловая", a:"каша перловка ячмень", kcal:109, p:3.1, c:22.2, f:0.4 },
  { id:"quinoa-cooked", name:"Киноа варёная", a:"крупа гарнир quinoa", kcal:120, p:4.4, c:21.3, f:1.9 },
  { id:"buckwheat-cooked", name:"Гречка варёная", a:"гречневая крупа гарнир", kcal:110, p:4.2, c:21.3, f:1.1 },
  { id:"rice-white-cooked", name:"Рис белый варёный", a:"рис гарнир крупа", kcal:130, p:2.7, c:28.2, f:0.3 },
  { id:"rice-brown-cooked", name:"Рис бурый варёный", a:"рис коричневый гарнир", kcal:123, p:2.7, c:25.6, f:1 },
  { id:"pasta-cooked", name:"Макароны варёные", a:"паста спагетти гарнир", kcal:158, p:5.8, c:30.9, f:0.9 },
  { id:"potato-boiled", name:"Картофель варёный", a:"картошка гарнир", kcal:82, p:2, c:16.7, f:0.4 },
  { id:"potato-mashed", name:"Картофельное пюре с молоком", a:"картошка пюре гарнир", kcal:106, p:2.1, c:15, f:4.2 },
  { id:"bread-rye", name:"Хлеб ржаной", a:"хлеб черный бородинский", kcal:210, p:6.6, c:40.7, f:1.2 },
  { id:"bread-wheat", name:"Хлеб пшеничный", a:"хлеб белый батон", kcal:265, p:8.5, c:49, f:3.2 },
  { id:"chicken-breast", name:"Куриная грудка запечённая", a:"курица филе грудка мясо", kcal:165, p:31, c:0, f:3.6 },
  { id:"chicken-thigh", name:"Куриное бедро без кожи", a:"курица бедро мясо", kcal:185, p:26, c:0, f:8 },
  { id:"turkey-breast", name:"Филе индейки запечённое", a:"индейка грудка мясо", kcal:135, p:29, c:0, f:1.8 },
  { id:"beef-lean", name:"Говядина постная тушёная", a:"говядина мясо тушеное", kcal:187, p:26, c:0, f:8.8 },
  { id:"pork-lean", name:"Свинина постная запечённая", a:"свинина мясо", kcal:242, p:27.3, c:0, f:14 },
  { id:"meatball-beef", name:"Котлеты из говядины", a:"котлета мясо фарш", kcal:238, p:16.5, c:8, f:15.5 },
  { id:"chicken-cutlet", name:"Котлета куриная", a:"котлеты курица фарш", kcal:190, p:19, c:8, f:9 },
  { id:"salmon-baked", name:"Лосось запечённый", a:"рыба семга лосось", kcal:208, p:22, c:0, f:13 },
  { id:"cod-baked", name:"Треска запечённая", a:"рыба треска филе", kcal:105, p:23, c:0, f:0.9 },
  { id:"tuna-canned", name:"Тунец в собственном соку", a:"рыба консервы тунец", kcal:116, p:25.5, c:0, f:0.8 },
  { id:"shrimp-boiled", name:"Креветки варёные", a:"морепродукты креветка", kcal:99, p:24, c:0.2, f:0.3 },
  { id:"egg-boiled", name:"Яйцо куриное варёное", a:"яйца белок желток", kcal:155, p:12.6, c:1.1, f:10.6 },
  { id:"omelet-milk", name:"Омлет с молоком", a:"яйца омлет завтрак", kcal:154, p:10, c:2.1, f:11.5 },
  { id:"cottage-2", name:"Творог 2%", a:"творог молочное сыр", kcal:103, p:18, c:3.3, f:2 },
  { id:"cottage-5", name:"Творог 5%", a:"творог молочное сыр", kcal:121, p:17, c:3, f:5 },
  { id:"yogurt-greek", name:"Йогурт греческий 2%", a:"йогурт молочное греческий", kcal:73, p:9.5, c:3.9, f:2 },
  { id:"kefir-1", name:"Кефир 1%", a:"кефир напиток молочное", kcal:40, p:3, c:4, f:1 },
  { id:"milk-25", name:"Молоко 2,5%", a:"молоко напиток молочное", kcal:52, p:2.8, c:4.7, f:2.5 },
  { id:"cheese-hard", name:"Сыр твёрдый", a:"сыр молочное", kcal:356, p:25, c:0.5, f:28 },
  { id:"banana", name:"Банан", a:"фрукт бананы", kcal:89, p:1.1, c:22.8, f:0.3 },
  { id:"apple", name:"Яблоко", a:"фрукт яблоки", kcal:52, p:0.3, c:13.8, f:0.2 },
  { id:"orange", name:"Апельсин", a:"фрукт цитрус", kcal:47, p:0.9, c:11.8, f:0.1 },
  { id:"pear", name:"Груша", a:"фрукт груши", kcal:57, p:0.4, c:15.2, f:0.1 },
  { id:"kiwi", name:"Киви", a:"фрукт киви", kcal:61, p:1.1, c:14.7, f:0.5 },
  { id:"strawberry", name:"Клубника", a:"ягоды клубника", kcal:32, p:0.7, c:7.7, f:0.3 },
  { id:"blueberry", name:"Черника", a:"ягоды черника голубика", kcal:57, p:0.7, c:14.5, f:0.3 },
  { id:"avocado", name:"Авокадо", a:"фрукт авокадо", kcal:160, p:2, c:8.5, f:14.7 },
  { id:"tomato", name:"Помидор", a:"овощ томат", kcal:18, p:0.9, c:3.9, f:0.2 },
  { id:"cucumber", name:"Огурец", a:"овощ огурцы", kcal:15, p:0.7, c:3.6, f:0.1 },
  { id:"broccoli", name:"Брокколи на пару", a:"овощ капуста брокколи", kcal:35, p:2.4, c:7.2, f:0.4 },
  { id:"cauliflower", name:"Цветная капуста варёная", a:"овощ капуста", kcal:23, p:1.8, c:4.1, f:0.5 },
  { id:"carrot", name:"Морковь", a:"овощ морковка", kcal:41, p:0.9, c:9.6, f:0.2 },
  { id:"salad-vegetable", name:"Салат из свежих овощей без масла", a:"салат овощи помидор огурец", kcal:35, p:1.3, c:6, f:0.5 },
  { id:"salad-caesar", name:"Салат Цезарь с курицей", a:"салат цезарь курица", kcal:180, p:13, c:8, f:11 },
  { id:"salad-olivier", name:"Салат Оливье", a:"салат оливье майонез", kcal:198, p:5.5, c:7.8, f:16.5 },
  { id:"borscht", name:"Борщ с говядиной", a:"суп борщ свекла", kcal:62, p:3.8, c:5.5, f:2.7 },
  { id:"chicken-soup", name:"Куриный суп с лапшой", a:"суп курица лапша бульон", kcal:55, p:4.2, c:5.8, f:1.8 },
  { id:"lentil-soup", name:"Суп чечевичный", a:"суп чечевица бобовые", kcal:71, p:4.2, c:10.5, f:1.3 },
  { id:"cream-soup-pumpkin", name:"Крем-суп тыквенный", a:"суп пюре тыква", kcal:65, p:1.5, c:8.5, f:3 },
  { id:"pelmeni", name:"Пельмени отварные", a:"пельмени тесто мясо", kcal:275, p:11.9, c:30, f:12.5 },
  { id:"vareniki-potato", name:"Вареники с картофелем", a:"вареники тесто картошка", kcal:190, p:4.5, c:36, f:3.2 },
  { id:"syrniki", name:"Сырники из творога", a:"сырники творог завтрак", kcal:230, p:15, c:20, f:10 },
  { id:"pancakes", name:"Блины на молоке", a:"блинчики завтрак тесто", kcal:186, p:5.1, c:29, f:5.7 },
  { id:"cheesecake", name:"Чизкейк", a:"десерт торт сыр", kcal:321, p:5.5, c:25.5, f:22.5 },
  { id:"dark-chocolate", name:"Шоколад тёмный 70%", a:"шоколад десерт сладкое", kcal:598, p:7.8, c:45.9, f:42.6 },
  { id:"honey", name:"Мёд", a:"мед сладкое", kcal:304, p:0.3, c:82.4, f:0 },
  { id:"almonds", name:"Миндаль", a:"орех орехи миндаль", kcal:579, p:21.2, c:21.6, f:49.9 },
  { id:"walnuts", name:"Грецкие орехи", a:"орех орехи грецкий", kcal:654, p:15.2, c:13.7, f:65.2 },
  { id:"peanut-butter", name:"Арахисовая паста без сахара", a:"арахис орех паста", kcal:588, p:25, c:20, f:50 },
  { id:"olive-oil", name:"Оливковое масло", a:"масло заправка", kcal:884, p:0, c:0, f:100 },
  { id:"protein-whey", name:"Протеин сывороточный", a:"спортпит белок протеин", kcal:390, p:78, c:8, f:6 },
  { id:"protein-shake", name:"Протеиновый коктейль на молоке", a:"коктейль протеин напиток", kcal:105, p:12, c:7, f:3 },
  { id:"coffee-black", name:"Кофе чёрный без сахара", a:"кофе американо напиток", kcal:2, p:0.1, c:0, f:0 },
  { id:"cappuccino", name:"Капучино без сахара", a:"кофе молоко напиток", kcal:46, p:2.5, c:4, f:2.2 },
  { id:"tea", name:"Чай без сахара", a:"чай напиток", kcal:1, p:0, c:0.2, f:0 },
  { id:"pizza-margherita", name:"Пицца Маргарита", a:"пицца сыр томат", kcal:266, p:11, c:33, f:10 },
  { id:"burger-beef", name:"Бургер с говядиной", a:"бургер гамбургер фастфуд", kcal:250, p:13, c:24, f:12 },
  { id:"shawarma-chicken", name:"Шаурма с курицей", a:"шаверма курица лаваш", kcal:210, p:12, c:20, f:9 },
  { id:"pilaf-chicken", name:"Плов с курицей", a:"плов рис курица блюдо", kcal:170, p:8.5, c:21, f:6 },
  { id:"pasta-bolognese", name:"Паста болоньезе", a:"макароны спагетти мясо", kcal:165, p:8.5, c:22, f:5 },
];

// Приёмы пищи и их доля от дневной нормы калорий
const MEAL_SLOTS = [
  { id:"breakfast", name:"Завтрак", share:0.25, hint:"Овсянка на воде с ягодами, варёное яйцо, кофе без сахара", color:"food" },
  { id:"snack1",    name:"Перекус", share:0.10, hint:"Творог 5% или яблоко с горстью миндаля",                  color:"goals" },
  { id:"lunch",     name:"Обед",    share:0.30, hint:"Куриная грудка на гриле, гречка, большой овощной салат",   color:"steps" },
  { id:"snack2",    name:"Перекус", share:0.10, hint:"Кефир 1% и огурец",                                        color:"goals" },
  { id:"dinner",    name:"Ужин",    share:0.25, hint:"Запечённая рыба с овощами на пару",                        color:"sleep" },
];

// Поиск по названию и синонимам
function searchFood(q) {
  const s = q.trim().toLowerCase();
  if (!s) return [];
  return FOOD_CATALOG
    .map((f) => {
      const name = f.name.toLowerCase();
      let score = 0;
      if (name.startsWith(s)) score = 3;
      else if (name.includes(s)) score = 2;
      else if (f.a.includes(s)) score = 1;
      return { f, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 12)
    .map((x) => x.f);
}

// ============================ ПИТАНИЕ ============================
function NutritionScreen({ lang, macros, entries, setEntries }) {
  const t = useT(lang);
  const goal = macros || { kcal: 2300, protein: 150, fat: 75, carbs: 250 };
  const [dayShift, setDayShift] = useState(0);          // 0 — сегодня, отрицательные — назад
  const [sheet, setSheet] = useState(null);             // открытый поиск: { slot }
  const dayKey = (sh) => { const d = new Date(); d.setDate(d.getDate() + sh); return d.toISOString().slice(0, 10); };
  const key = dayKey(dayShift);
  const dayEntries = (entries[key] || []);

  const dayTitle = dayShift === 0 ? "Сегодня" : dayShift === -1 ? "Вчера"
    : new Date(Date.now() + dayShift * 86400000).toLocaleDateString("ru-RU", { weekday: "long" });
  const dayFull = new Date(Date.now() + dayShift * 86400000)
    .toLocaleDateString("ru-RU", { day: "numeric", month: "long" });

  const sum = (k, slot) => dayEntries
    .filter((e) => !slot || e.slot === slot)
    .reduce((a, e) => a + e[k] * e.grams / 100, 0);
  const kcal = sum("kcal");
  const left = Math.max(0, Math.round(goal.kcal - kcal));
  const pct = Math.min(100, Math.round((kcal / goal.kcal) * 100));

  const addEntry = (food, grams, slot) => {
    setEntries((all) => ({ ...all,
      [key]: [...(all[key] || []), { ...food, grams, slot, uid: Date.now() + Math.random() }] }));
    setSheet(null);
  };
  const removeEntry = (uid) =>
    setEntries((all) => ({ ...all, [key]: (all[key] || []).filter((e) => e.uid !== uid) }));

  const MacroLine = ({ label, val, max, color }) => (
    <div style={{ marginBottom: 7 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
        <span style={{ fontFamily: sfPro, ...TYPE.caption, fontWeight: 600, color: PF.ink2 }}>{label}</span>
        <span style={{ fontFamily: sfPro, ...TYPE.caption2, fontWeight: 700, color: PF.ink }}>
          {Math.round(val)}/{Math.round(max)} г
        </span>
      </div>
      <div style={{ height: 4, borderRadius: 99, background: color + "26", overflow: "hidden" }}>
        <div style={{ height: "100%", width: "100%", background: color, borderRadius: 99,
          transformOrigin: "left center",
          transform: `scaleX(${Math.min(1, val / max)})`,
          transition: "transform .4s cubic-bezier(.4,0,.2,1)" }} />
      </div>
    </div>
  );

  return (
    <div className="fit-screen" style={{ padding: "6px 22px 24px" }}>
      <ScreenTitle eyebrow="Дневник" title={t("food")} />

      {/* переключение дня */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16 }}>
        <button type="button" onClick={() => setDayShift((s) => s - 1)} aria-label="Предыдущий день"
          style={{ width: 40, height: 40, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
            ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}>
            <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
          </div>
        </button>
        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontFamily: sfPro, ...TYPE.title3, color: PF.ink, textTransform: "capitalize" }}>{dayTitle}</div>
          <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>{dayFull}</div>
        </div>
        <button type="button" onClick={() => setDayShift((s) => Math.min(0, s + 1))}
          disabled={dayShift === 0} aria-label="Следующий день"
          style={{ width: 40, height: 40, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
            cursor: dayShift === 0 ? "default" : "pointer", opacity: dayShift === 0 ? 0.4 : 1,
            ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Glyph d={ICONS.chevron} size={15} color={PF.ink2} />
        </button>
      </div>

      {/* сводка дня */}
      <SectionCard className="fit-glass fit-pop" style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 16 }}>
        <Ring pct={pct} value={Math.round(kcal)} label={`из ${goal.kcal}`} size={104} stroke={9} color={ACCENT.food.c} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.title2, color: PF.ink }}>{left} ккал</div>
          <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginBottom: 10 }}>осталось</div>
          <MacroLine label="Белки"    val={sum("p")} max={goal.protein} color={ACCENT.goals.c} />
          <MacroLine label="Углеводы" val={sum("c")} max={goal.carbs}   color={ACCENT.steps.c} />
          <MacroLine label="Жиры"     val={sum("f")} max={goal.fat}     color={ACCENT.sleep.c} />
        </div>
      </SectionCard>

      <Eyebrow>Дневник питания</Eyebrow>

      {MEAL_SLOTS.map((slot) => {
        const list = dayEntries.filter((e) => e.slot === slot.id);
        const slotKcal = Math.round(list.reduce((a, e) => a + e.kcal * e.grams / 100, 0));
        const slotTarget = Math.round(goal.kcal * slot.share);
        const acc = ACCENT[slot.color] || ACCENT.food;
        return (
          <div key={slot.id} style={{ marginBottom: 10, borderRadius: R.card, ...glass(0.46), overflow: "hidden" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 11, padding: "13px 12px 13px 16px" }}>
              <div style={{ width: 32, height: 32, borderRadius: 10, background: acc.soft, flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Glyph d={ICONS.flame} size={16} color={acc.c} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{slot.name}</div>
                <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2 }}>
                  {slotKcal} / {slotTarget} ккал
                </div>
              </div>
              <button type="button" onClick={() => setSheet({ slot })} aria-label="Добавить продукт"
                style={{ width: 34, height: 34, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
                  background: acc.soft, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={acc.c} strokeWidth="2.4" strokeLinecap="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </button>
            </div>

            {list.length === 0 ? (
              <div style={{ margin: "0 12px 12px", padding: 12, borderRadius: 16,
                background: "rgba(63,48,41,0.045)" }}>
                <div style={{ fontFamily: sfPro, fontSize: 9.5, fontWeight: 700, letterSpacing: "0.1em",
                  color: PF.ink3, textTransform: "uppercase" }}>Рекомендуем</div>
                <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 4, lineHeight: 1.4 }}>
                  {slot.hint}
                </div>
              </div>
            ) : list.map((e) => (
              <div key={e.uid} style={{ display: "flex", alignItems: "center", gap: 10,
                padding: "10px 8px 10px 14px", borderTop: `1px solid ${PF.line}` }}>
                <div style={{ width: 38, height: 38, borderRadius: 12, background: acc.soft, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Glyph d={ICONS.flame} size={16} color={acc.c} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: PF.ink,
                    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{e.name}</div>
                  <div style={{ fontFamily: sfPro, ...TYPE.caption2, color: PF.ink2, marginTop: 2 }}>
                    {e.grams} г · {(e.p * e.grams / 100).toFixed(1)} Б ·
                    {" "}{(e.c * e.grams / 100).toFixed(1)} У · {(e.f * e.grams / 100).toFixed(1)} Ж
                  </div>
                </div>
                <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: PF.ink,
                  textAlign: "right", flexShrink: 0 }}>
                  {Math.round(e.kcal * e.grams / 100)}
                  <div style={{ fontFamily: sfPro, ...TYPE.caption2, fontWeight: 400, color: PF.ink3 }}>ккал</div>
                </div>
                <button type="button" onClick={() => removeEntry(e.uid)} aria-label="Удалить продукт"
                  style={{ width: 28, height: 28, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
                    background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={PF.ink3} strokeWidth="2.4" strokeLinecap="round">
                    <path d="M6 6l12 12M18 6L6 18" />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        );
      })}

      {sheet && <FoodSearchSheet slot={sheet.slot} onClose={() => setSheet(null)} onAdd={addEntry} />}
    </div>
  );
}

// Поиск продукта и выбор порции
function FoodSearchSheet({ slot, onClose, onAdd }) {
  const [q, setQ] = useState("");
  const inputRef = React.useRef(null);
  // поле неуправляемое: текст хранит сам DOM, iOS не подменяет его подсказкой
  const setQuery = (v) => { if (inputRef.current) inputRef.current.value = v; setQ(v); setPicked(null); };
  const [picked, setPicked] = useState(null);
  const [grams, setGrams] = useState(100);
  const results = searchFood(q);
  const quick = ["Курица", "Рис", "Творог", "Банан"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column",
      justifyContent: "flex-end", background: "rgba(42,35,32,0.32)" }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ background: PF.bg, borderRadius: "28px 28px 0 0", maxHeight: "92vh",
          display: "flex", flexDirection: "column", padding: "18px 20px 24px",
          animation: "fitUp .32s cubic-bezier(.22,1,.36,1) both" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: sfPro, ...TYPE.title2, color: PF.ink }}>Добавить продукт</div>
            <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2 }}>{slot.name}</div>
          </div>
          <button type="button" onClick={onClose} aria-label="Закрыть"
            style={{ width: 36, height: 36, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
              ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={PF.ink2} strokeWidth="2.4" strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <input ref={inputRef} defaultValue="" autoFocus
          onChange={(e) => { setQ(e.target.value); setPicked(null); }}
          autoCorrect="off" autoCapitalize="off" autoComplete="off" spellCheck={false}
          placeholder="Название продукта" size={1}
          style={{ width: "100%", fontFamily: sfPro, ...TYPE.body, color: PF.ink, padding: "13px 16px",
            borderRadius: R.pill, borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "#fff", outline: "none" }} />

        {!q && (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 12 }}>
            {quick.map((x) => (
              <button key={x} type="button" onClick={() => setQuery(x)}
                style={{ padding: "8px 15px", borderRadius: 999, cursor: "pointer",
                  borderStyle: "solid", borderWidth: 1, borderColor: PF.line, background: "transparent",
                  fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2 }}>{x}</button>
            ))}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", marginTop: 14, minHeight: 0 }}>
          {q && results.length === 0 && (
            <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink3, textAlign: "center", padding: 24 }}>
              Ничего не нашлось. Попробуйте другое название.
            </div>
          )}
          {results.map((f) => {
            const on = picked && picked.id === f.id;
            return (
              <div key={f.id} onClick={() => { setPicked(f); setGrams(100); }}
                style={{ padding: 14, borderRadius: R.card, marginBottom: 8, cursor: "pointer",
                  ...(on ? { background: ACCENT.food.soft, borderStyle: "solid", borderWidth: 1.5, borderColor: `${ACCENT.food.c}` } : { ...glass(0.5) }) }}>
                <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 13, background: ACCENT.food.soft, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Glyph d={ICONS.flame} size={17} color={ACCENT.food.c} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: PF.ink }}>{f.name}</div>
                    <div style={{ fontFamily: sfPro, ...TYPE.caption2, color: PF.ink2, marginTop: 2 }}>
                      на 100 г · {f.kcal} ккал · {f.p} Б · {f.c} У · {f.f} Ж
                    </div>
                  </div>
                </div>

                {on && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: `1px solid ${PF.line}` }}>
                    <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginBottom: 10 }}>
                      {[50, 100, 150, 200, 300].map((g) => (
                        <button key={g} type="button" onClick={(e) => { e.stopPropagation(); setGrams(g); }}
                          style={{ padding: "8px 14px", borderRadius: 999, cursor: "pointer",
                            fontFamily: sfPro, ...TYPE.caption, fontWeight: 600,
                            borderStyle: "solid", borderWidth: 1, borderColor: `${grams === g ? ACCENT.food.c : PF.line}`,
                            background: grams === g ? ACCENT.food.c : "transparent",
                            color: grams === g ? "#fff" : PF.ink2 }}>{g} г</button>
                      ))}
                    </div>
                    <div style={{ display: "flex", gap: 9, alignItems: "stretch" }}>
                      <input value={grams} onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setGrams(Math.max(1, Math.min(2000, +e.target.value.replace(/\D/g, "") || 0)))}
                        inputMode="numeric" size={1}
                        style={{ flex: "1 1 0", minWidth: 0, textAlign: "center", fontFamily: sfPro, ...TYPE.title3,
                          color: PF.ink, padding: "11px", borderRadius: 12, borderStyle: "solid", borderWidth: 1, borderColor: PF.line,
                          background: "#fff", outline: "none" }} />
                      <button type="button" onClick={(e) => { e.stopPropagation(); onAdd(f, grams, slot.id); }}
                        style={{ flexShrink: 0, padding: "0 22px", borderRadius: 12, borderStyle: "solid", borderWidth: 0, borderColor: "transparent", cursor: "pointer",
                          background: ACCENT.food.c, color: "#fff", fontFamily: sfPro, ...TYPE.headline }}>
                        Добавить {Math.round(f.kcal * grams / 100)} ккал
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}



/****************************************************************************
 *  ГЛАВА 10. МАГАЗИН И ЭКОНОМИКА БАЛЛОВ
 *  Начисление за активность, витрина одежды, примерка на аватар
 ****************************************************************************/

// ============================ БАЛЛЫ ============================
// Начисляются за реальные действия. Правила простые и проверяемые:
// баллы нельзя получить дважды за одно и то же событие.
const POINTS = {
  perWorkout: 50,            // завершённая тренировка
  perMealDay: 20,            // день, где отмечены все приёмы пищи
  per1000steps: 5,           // каждая тысяча шагов
  perSleepNight: 10,         // ночь 7 часов и больше
  perAchievement: 100,       // открытое достижение
  weeklyGoalBonus: 150,      // 150+ активных минут за неделю
  perLogin: 10,              // вход в приложение — раз в день
  loginStreak7: 70,          // семь дней подряд без пропуска
  loginStreak30: 300,        // тридцать дней подряд
  workoutStreak3: 60,        // три тренировки за неделю
  perWeighIn: 5,             // взвешивание — раз в день
};

// Журнал входов: день -> true. Хранится локально, начисляется один раз в день.
function loadLogins() {
  try { return JSON.parse(window.localStorage.getItem("fit288-logins") || "{}"); } catch { return {}; }
}
function recordLogin() {
  const log = loadLogins();
  const today = dayKey(Date.now());
  const fresh = !log[today];
  if (fresh) { log[today] = true; try { window.localStorage.setItem("fit288-logins", JSON.stringify(log)); } catch {} }
  return { log, fresh };
}
function loginStreak(log) {
  let n = 0;
  for (let i = 0; ; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (!log[dayKey(d.getTime())]) break;
    n++;
  }
  return n;
}

function computePoints({ health, progress, mealsLog = {}, logins = {}, weightLog = [] }) {
  const rows = [];
  // ежедневные входы и серии
  const days = Object.keys(logins).length;
  if (days) rows.push({ label: "Входы в приложение", count: days, each: POINTS.perLogin, sum: days * POINTS.perLogin });
  const streak = loginStreak(logins);
  if (streak >= 30) rows.push({ label: "30 дней подряд", count: 1, each: POINTS.loginStreak30, sum: POINTS.loginStreak30 });
  else if (streak >= 7) rows.push({ label: "7 дней подряд", count: 1, each: POINTS.loginStreak7, sum: POINTS.loginStreak7 });
  if ((progress?.workoutsWeek || 0) >= 3) rows.push({ label: "3 тренировки за неделю", count: 1, each: POINTS.workoutStreak3, sum: POINTS.workoutStreak3 });
  const weighDays = new Set((weightLog || []).map((e) => e.date)).size;
  if (weighDays) rows.push({ label: "Взвешивания", count: weighDays, each: POINTS.perWeighIn, sum: weighDays * POINTS.perWeighIn });
  const w = progress?.workouts || 0;
  if (w) rows.push({ label: "Тренировки", count: w, each: POINTS.perWorkout, sum: w * POINTS.perWorkout });

  const fullDays = Object.values(mealsLog).filter((d) => (d || []).length >= 3).length;
  if (fullDays) rows.push({ label: "Дни по плану питания", count: fullDays, each: POINTS.perMealDay, sum: fullDays * POINTS.perMealDay });

  const steps = health.all().filter((s) => s.type === "steps").reduce((a, s) => a + s.value, 0);
  const stepK = Math.floor(steps / 1000);
  if (stepK) rows.push({ label: "Шаги", count: `${stepK} тыс.`, each: POINTS.per1000steps, sum: stepK * POINTS.per1000steps });

  const nights = health.all().filter((s) => s.type === "sleep" && s.value >= 7).length;
  if (nights) rows.push({ label: "Ночи сна 7ч+", count: nights, each: POINTS.perSleepNight, sum: nights * POINTS.perSleepNight });

  const ach = (progress?.unlocked || []).length;
  if (ach) rows.push({ label: "Достижения", count: ach, each: POINTS.perAchievement, sum: ach * POINTS.perAchievement });

  const activeWeek = health.week("activeMin").reduce((a, d) => a + (d.v || 0), 0);
  if (activeWeek >= 150) rows.push({ label: "Недельная норма активности", count: 1, each: POINTS.weeklyGoalBonus, sum: POINTS.weeklyGoalBonus });

  return { rows, total: rows.reduce((a, r) => a + r.sum, 0) };
}

// ============================ ВИТРИНА ============================
// id совпадают с каталогом пакета аватара: купленная вещь сразу надевается
// на 3D-модель и подгоняется под её фигуру.
const SHOP_ITEMS = [
  // верх
  { id: "fit288_sport_top", slot: "top", name: "Спортивный топ", sub: "База, идёт в комплекте", price: 0, gender: "female" },
  { id: "joepal_crude_t-shirt_female", slot: "top", name: "Футболка", sub: "Хлопок, прямой крой", price: 400, gender: "female" },
  { id: "skalldyrssuppe_tube_top_funky_colors", slot: "top", name: "Топ-бандо", sub: "Для зала", price: 550 },
  { id: "elvs_crude_t-shirt_male", slot: "top", name: "Футболка", sub: "Хлопок, прямой крой", price: 400, gender: "male" },
  { id: "namuhekam_male_polo_shirt", slot: "top", name: "Поло", sub: "Воротник, две пуговицы", price: 900, money: 149, gender: "male" },
  // низ
  { id: "fit288_leggings", slot: "bottom", name: "Легинсы", sub: "База, идут в комплекте", price: 0, gender: "female" },
  { id: "cortu_jeans_shorts", slot: "bottom", name: "Шорты джинсовые", sub: "На лето", price: 350 },
  { id: "cortu_cargo_pants", slot: "bottom", name: "Карго", sub: "Свободный крой, карманы", price: 500 },
  { id: "toigo_harem_pants", slot: "bottom", name: "Свободные брюки", sub: "Мягкая посадка", price: 650, gender: "female" },
  { id: "toigo_wool_pants", slot: "bottom", name: "Брюки шерстяные", sub: "Прямые, со стрелкой", price: 850, money: 149, gender: "male" },
  // обувь
  { id: "shoes01", slot: "shoes", name: "Кроссовки классические", sub: "Повседневные", price: 300 },
  { id: "shoes02", slot: "shoes", name: "Кроссовки беговые", sub: "Лёгкая подошва", price: 550 },
  { id: "shoes03", slot: "shoes", name: "Кроссовки высокие", sub: "Поддержка голеностопа", price: 700 },
  { id: "shoes05", slot: "shoes", name: "Кроссовки премиум", sub: "Ограниченная серия", price: 1500, money: 249 },
];
const SHOP_SLOTS = [
  { id: "top", label: "Верх", icon: "top" },
  { id: "bottom", label: "Низ", icon: "bottom" },
  { id: "shoes", label: "Обувь", icon: "shoes" },
];

// Простые силуэты вещей — предпросмотр до примерки на модель
const ITEM_ART = {
  top: (c) => (<svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round">
    <path d="M22 12l-10 6 4 8 6-3v29h20V23l6 3 4-8-10-6-5 4h-10z" fill={c} fillOpacity=".12" /></svg>),
  bottom: (c) => (<svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round">
    <path d="M20 10h24l-2 44h-8l-2-24-2 24h-8z" fill={c} fillOpacity=".12" /></svg>),
  shoes: (c) => (<svg viewBox="0 0 64 64" width="52" height="52" fill="none" stroke={c} strokeWidth="2.2" strokeLinejoin="round">
    <path d="M8 44h34l12-7c3-2 4-5 1-7l-5-3-8 5-6-9-16 2c-4 1-6 3-6 7z" fill={c} fillOpacity=".12" />
    <path d="M8 44v6h46v-6" /></svg>),
};

function ShopScreen({ onBack, points, spent, owned, equipped, onBuy, onEquip, survey }) {
  const [slot, setSlot] = useState("top");
  const [msg, setMsg] = useState(null);
  const balance = points.total - spent;
  const list = SHOP_ITEMS.filter((i) => i.slot === slot &&
    (!i.gender || i.gender === (survey?.gender === "male" ? "male" : "female")));

  const buy = (item) => {
    if (owned.includes(item.id)) { onEquip(item); return; }
    if (item.price > balance) {
      setMsg(`Не хватает ${item.price - balance} баллов. ${item.money ? "Можно купить за " + item.money + " ₽." : ""}`);
      return;
    }
    onBuy(item); setMsg(null);
  };

  return (
    <div className="fit-screen" style={{ minHeight: "100vh", padding: "18px 22px 120px" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button type="button" aria-label="Назад" onClick={onBack}
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
            cursor: "pointer", ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}><Glyph d={ICONS.chevron} size={15} color={PF.ink2} /></div>
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 14px", borderRadius: 999,
          background: ACCENT.awards.soft }}>
          <Glyph d={ICONS.trophy} size={15} color={ACCENT.awards.c} />
          <span style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: ACCENT.awards.c }}>
            {balance.toLocaleString("ru")}
          </span>
        </div>
      </div>

      <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>Магазин</div>
      <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 6 }}>
        Баллы начисляются за тренировки, питание, шаги и достижения
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
        {SHOP_SLOTS.map((s) => (
          <button key={s.id} type="button" onClick={() => setSlot(s.id)}
            style={{ flex: 1, padding: "10px 8px", borderRadius: R.pill, cursor: "pointer",
              borderStyle: "solid", borderWidth: 1.5, borderColor: slot === s.id ? PF.terra : "transparent",
              background: slot === s.id ? "rgba(169,112,96,0.12)" : "rgba(255,255,255,0.6)",
              fontFamily: sfPro, ...TYPE.subhead, fontWeight: slot === s.id ? 700 : 500,
              color: slot === s.id ? PF.terra : PF.ink2, transition: "background-color .2s, border-color .2s, color .2s" }}>
            {s.label}
          </button>
        ))}
      </div>

      {msg && (
        <div className="fit-pop" style={{ marginTop: 14, padding: "12px 14px", borderRadius: R.tile,
          background: ACCENT.workout.soft, fontFamily: sfPro, ...TYPE.subhead, color: PF.ink }}>{msg}</div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: GRID.gap, marginTop: 16 }}>
        {list.map((item, i) => {
          const has = owned.includes(item.id), on = equipped[item.slot] === item.id;
          const acc = item.slot === "top" ? ACCENT.goals : item.slot === "bottom" ? ACCENT.sleep : ACCENT.steps;
          return (
            <div key={item.id} onClick={() => buy(item)} role="button" className="fit-press"
              style={{ padding: 14, borderRadius: R.tile, cursor: "pointer", position: "relative", overflow: "hidden",
                backgroundImage: `linear-gradient(152deg, ${acc.c}1F 0%, ${acc.c}12 45%, rgba(255,255,255,0.72) 100%)`,
                backgroundColor: "rgba(255,253,250,0.62)",
                borderStyle: "solid", borderWidth: on ? 2 : 1, borderColor: on ? acc.c : `${acc.c}2E`,
                boxShadow: `0 8px 22px ${acc.c}1A`,
                animation: `fitUp .4s ease-out ${i * 0.04}s both` }}>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
                {ITEM_ART[item.slot](acc.c)}
              </div>
              <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: PF.ink }}>{item.name}</div>
              <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 2,
                whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.sub}</div>
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                <span style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 700,
                  color: on ? acc.c : has ? PF.ink2 : (item.price > balance ? PF.ink3 : PF.ink) }}>
                  {on ? "Надето" : has ? "Надеть" : item.price === 0 ? "Бесплатно" : `${item.price} б.`}
                </span>
                {!has && item.money && (
                  <span style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3 }}>или {item.money} ₽</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Eyebrow>Как заработать</Eyebrow>
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          ["Вход каждый день", `+${POINTS.perLogin}`, ICONS.home, ACCENT.tips],
          ["7 дней подряд", `+${POINTS.loginStreak7}`, ICONS.flame, ACCENT.food],
          ["Тренировка", `+${POINTS.perWorkout}`, ICONS.dumbbell, ACCENT.workout],
          ["3 тренировки в неделю", `+${POINTS.workoutStreak3}`, ICONS.trophy, ACCENT.awards],
          ["День по плану питания", `+${POINTS.perMealDay}`, ICONS.cutlery, ACCENT.meals],
          ["1 000 шагов", `+${POINTS.per1000steps}`, ICONS.sneaker, ACCENT.steps],
          ["Ночь сна 7ч+", `+${POINTS.perSleepNight}`, ICONS.moon, ACCENT.sleep],
          ["Достижение", `+${POINTS.perAchievement}`, ICONS.award, ACCENT.awards],
        ].map(([l, v, ic, acc]) => (
          <div key={l} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 14,
            background: acc.soft }}>
            <Glyph d={ic} size={15} color={acc.c} />
            <div style={{ flex: 1, minWidth: 0, fontFamily: sfPro, fontSize: 12, color: PF.ink,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{l}</div>
            <div style={{ fontFamily: sfPro, fontSize: 12.5, fontWeight: 700, color: acc.c }}>{v}</div>
          </div>
        ))}
      </div>

      <Eyebrow>Ваши начисления</Eyebrow>
      <div style={{ padding: 16, borderRadius: R.tile, background: "rgba(255,255,255,0.7)" }}>
        {points.rows.length === 0 && (
          <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2 }}>
            Пока пусто. Завершите тренировку или отметьте приёмы пищи — баллы появятся.
          </div>
        )}
        {points.rows.map((r) => (
          <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline",
            padding: "7px 0", borderTopStyle: "solid", borderTopWidth: 1, borderTopColor: PF.line }}>
            <span style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink }}>{r.label}</span>
            <span style={{ fontFamily: sfPro, ...TYPE.footnote, color: PF.ink2 }}>
              {r.count} × {r.each} = <b style={{ color: PF.ink }}>{r.sum}</b>
            </span>
          </div>
        ))}
        {spent > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", paddingTop: 9, marginTop: 4,
            borderTopStyle: "solid", borderTopWidth: 1, borderTopColor: PF.line }}>
            <span style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2 }}>Потрачено</span>
            <span style={{ fontFamily: sfPro, ...TYPE.footnote, fontWeight: 700, color: ACCENT.workout.c }}>−{spent}</span>
          </div>
        )}
      </div>
      <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginTop: 12, lineHeight: 1.5 }}>
        Купленные вещи надеваются на вашу модель и подстраиваются под её фигуру: на полной фигуре
        одежда сидит иначе, чем на спортивной.
      </div>
    </div>
  );
}


/****************************************************************************
 *  ГЛАВА 11. ТРЕНЕРЫ И ПОДБОР
 *  Анкета тренера, два уровня противопоказаний, подбор с объяснением
 ****************************************************************************/

// ============================ ПРАВИЛА ПОДБОРА ============================
// Цель — про желание: нужно пересечение. Противопоказание — про безопасность:
// тренер должен уметь работать со ВСЕМИ ограничениями клиента.
//
// Серьёзные ограничения тренер подтверждает явно (по умолчанию — не работает).
// Бытовые считаются посильными любому тренеру; отмечаются только исключения.
// Свободный текст клиента считается серьёзным: нужна отметка «по консультации».
const SERIOUS_CONTRA = ["heart", "hyper", "hernia", "diabet", "preg"];
const COMMON_CONTRA  = ["knee", "back", "shoulder", "neck", "asthma", "varicose"];

const TRAINER_DEFAULTS = {
  goals: [],              // какие цели закрывает
  serious: [],            // серьёзные ограничения, с которыми подтвердил работу
  excluded: [],           // бытовые, за которые не берётся
  customOk: false,        // работает с индивидуальными ограничениями после консультации
  formats: ["online"],    // online | gym
  city: "",
  price: 2500,            // за занятие, ₽
  about: "",
  subscriptionActive: false,
};

/** Почему тренер не подходит клиенту — пустой массив, если подходит. */
function trainerRejects(trainer, client) {
  const reasons = [];
  if (!trainer.subscriptionActive) reasons.push("подписка не активна");
  const mainGoal = (client.goals || [])[0];
  if (mainGoal && !(trainer.goals || []).includes(mainGoal)) reasons.push("не закрывает главную цель");
  const contra = (client.contra || []).filter((c) => c !== "none");
  for (const c of contra) {
    if (SERIOUS_CONTRA.includes(c) && !(trainer.serious || []).includes(c)) reasons.push(`не подтвердил работу: ${LIMIT_LABEL[c] || c}`);
    if (COMMON_CONTRA.includes(c) && (trainer.excluded || []).includes(c)) reasons.push(`не работает: ${LIMIT_LABEL[c] || c}`);
  }
  if ((client.customContra || []).length && !trainer.customOk) reasons.push("не работает с индивидуальными ограничениями");
  return reasons;
}

/** Ранжирование среди подходящих: почему именно этот. */
function trainerScore(trainer, client) {
  const why = [];
  let score = 0;
  const goals = client.goals || [];
  if (goals[0] && trainer.goals.includes(goals[0])) { score += 3; why.push("закрывает вашу главную цель"); }
  const extra = goals.slice(1).filter((g) => trainer.goals.includes(g));
  if (extra.length) { score += extra.length; why.push(`ещё ${extra.length} из ваших целей`); }
  const contra = (client.contra || []).filter((c) => c !== "none");
  const exp = contra.filter((c) => trainer.serious.includes(c));
  if (exp.length) { score += exp.length * 2; why.push(`опыт: ${exp.map((c) => (LIMIT_LABEL[c] || c).toLowerCase()).join(", ")}`); }
  score += (trainer.rating || 0) / 2;
  if (trainer.formats.includes("online")) { score += 0.5; why.push("занимается онлайн"); }
  return { score, why };
}

function matchTrainers(trainers, client) {
  return trainers
    .map((t) => ({ trainer: t, rejects: trainerRejects(t, client) }))
    .filter((x) => x.rejects.length === 0)
    .map((x) => ({ ...x, ...trainerScore(x.trainer, client) }))
    .sort((a, b) => b.score - a.score);
}

/** Сколько клиентов потеряет тренер из-за пробелов анкеты — подсказка при заполнении. */
function trainerGaps(trainer) {
  // доли клиентов с каждым серьёзным ограничением — оценка по типичной аудитории
  const share = { hyper: 0.14, heart: 0.06, hernia: 0.09, diabet: 0.07, preg: 0.04 };
  return SERIOUS_CONTRA.filter((c) => !(trainer.serious || []).includes(c))
    .map((c) => ({ id: c, label: LIMIT_LABEL[c] || c, share: share[c] }));
}

// Демо-тренеры: подписка у всех активна, анкеты заполнены по-разному
const DEMO_TRAINERS = [
  { id: "t1", name: "Марина Ковалёва", rating: 4.9, goals: ["lose", "health", "energy"], serious: ["hyper", "diabet"], excluded: [], customOk: true, formats: ["online", "gym"], city: "Москва", price: 3000, about: "Снижение веса без голодовок. 11 лет, медицинское образование.", subscriptionActive: true },
  { id: "t2", name: "Илья Громов", rating: 4.8, goals: ["muscle", "strength"], serious: [], excluded: ["back"], customOk: false, formats: ["gym"], city: "Санкт-Петербург", price: 3500, about: "Силовые и гипертрофия. Мастер спорта по пауэрлифтингу.", subscriptionActive: true },
  { id: "t3", name: "Анна Северова", rating: 4.7, goals: ["posture", "flex", "health", "lose"], serious: ["hernia", "preg"], excluded: [], customOk: true, formats: ["online"], city: "", price: 2200, about: "Реабилитация спины, ЛФК, работа с беременными.", subscriptionActive: true },
  { id: "t4", name: "Денис Орлов", rating: 4.6, goals: ["endurance", "lose", "energy"], serious: ["heart"], excluded: ["knee"], customOk: false, formats: ["online", "gym"], city: "Казань", price: 2000, about: "Бег и выносливость. Кардиореабилитация по протоколам.", subscriptionActive: true },
  { id: "t5", name: "Ольга Мирная", rating: 4.5, goals: ["muscle", "lose", "health"], serious: [], excluded: [], customOk: false, formats: ["online"], city: "", price: 1800, about: "Домашние тренировки с минимумом инвентаря.", subscriptionActive: false },
];

// ============================ АНКЕТА ТРЕНЕРА ============================
function TrainerSetupScreen({ trainer, setTrainer, onBack }) {
  const t = trainer;
  const toggle = (field, id) => setTrainer((x) => ({ ...x, [field]: x[field].includes(id) ? x[field].filter((v) => v !== id) : [...x[field], id] }));
  const gaps = trainerGaps(t);
  const lost = Math.round(gaps.reduce((a, g) => a + g.share, 0) * 100);
  const Chip = ({ on, label, color, onClick, muted }) => (
    <button type="button" onClick={onClick}
      style={{ padding: "9px 14px", borderRadius: 999, cursor: "pointer",
        borderStyle: "solid", borderWidth: 1.5, borderColor: on ? color : "rgba(63,48,41,0.12)",
        background: on ? color + "1F" : "rgba(255,255,255,0.65)",
        fontFamily: sfPro, ...TYPE.subhead, fontWeight: on ? 700 : 500,
        color: on ? color : (muted ? PF.ink3 : PF.ink2), transition: "background-color .2s, border-color .2s" }}>
      {label}
    </button>
  );

  return (
    <div className="fit-screen" style={{ minHeight: "100vh", padding: "18px 22px 120px" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center" }}>
        <button type="button" aria-label="Назад" onClick={onBack}
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
            cursor: "pointer", ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}><Glyph d={ICONS.chevron} size={15} color={PF.ink2} /></div>
        </button>
      </div>
      <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>Анкета тренера</div>
      <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 6, lineHeight: 1.45 }}>
        По ней клиенты увидят вас в рекомендациях. Цели — с чем работаете; ограничения — с чем умеете безопасно.
      </div>

      {/* подписка */}
      <div style={{ marginTop: 18, padding: 16, borderRadius: R.tile, display: "flex", alignItems: "center", gap: 14,
        background: t.subscriptionActive ? ACCENT.goals.soft : ACCENT.workout.soft }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{t.subscriptionActive ? "Подписка активна" : "Подписка не активна"}</div>
          <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 2 }}>
            {t.subscriptionActive ? "Клиенты видят вас и могут написать" : "Без подписки вас нет в рекомендациях"}
          </div>
        </div>
        <button type="button" onClick={() => setTrainer((x) => ({ ...x, subscriptionActive: !x.subscriptionActive }))}
          style={{ padding: "10px 16px", borderRadius: 999, cursor: "pointer", borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
            background: t.subscriptionActive ? "rgba(63,48,41,0.08)" : PF.terra, color: t.subscriptionActive ? PF.ink2 : "#fff",
            fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700 }}>
          {t.subscriptionActive ? "Отключить" : "Оформить · 1 990 ₽/мес"}
        </button>
      </div>

      <Eyebrow>Какие цели закрываете</Eyebrow>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {GOAL_OPTIONS.map((g) => <Chip key={g.id} on={t.goals.includes(g.id)} label={g.ru} color={g.c || PF.terra} onClick={() => toggle("goals", g.id)} />)}
      </div>

      <Eyebrow>Серьёзные ограничения — подтвердите, с чем работаете</Eyebrow>
      <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginBottom: 10, lineHeight: 1.45 }}>
        По умолчанию — не работаете. Клиенту с таким ограничением вы покажетесь, только если подтвердили.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SERIOUS_CONTRA.map((c) => <Chip key={c} on={t.serious.includes(c)} label={LIMIT_LABEL[c]} color={ACCENT.workout.c} onClick={() => toggle("serious", c)} />)}
      </div>
      {gaps.length > 0 && (
        <div style={{ marginTop: 10, padding: "10px 14px", borderRadius: 14, background: ACCENT.awards.soft,
          fontFamily: sfPro, ...TYPE.caption, color: PF.ink, lineHeight: 1.45 }}>
          Не подтверждено: {gaps.map((g) => g.label.toLowerCase()).join(", ")} — вас не увидят около {lost}% клиентов.
        </div>
      )}

      <Eyebrow>Бытовые ограничения — отметьте, с чем НЕ работаете</Eyebrow>
      <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink3, marginBottom: 10, lineHeight: 1.45 }}>
        По умолчанию считается, что работаете со всеми. Ничего не отметили — ничего не потеряли.
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {COMMON_CONTRA.map((c) => <Chip key={c} on={t.excluded.includes(c)} label={"не " + LIMIT_LABEL[c].toLowerCase()} color={PF.ink2} muted onClick={() => toggle("excluded", c)} />)}
      </div>

      <Eyebrow>Индивидуальные ограничения</Eyebrow>
      <Chip on={t.customOk} label="Работаю после консультации с врачом клиента" color={ACCENT.sleep.c}
        onClick={() => setTrainer((x) => ({ ...x, customOk: !x.customOk }))} />

      <Eyebrow>Формат</Eyebrow>
      <div style={{ display: "flex", gap: 8 }}>
        <Chip on={t.formats.includes("online")} label="Онлайн" color={ACCENT.steps.c} onClick={() => toggle("formats", "online")} />
        <Chip on={t.formats.includes("gym")} label="В зале" color={ACCENT.steps.c} onClick={() => toggle("formats", "gym")} />
      </div>
    </div>
  );
}

// ============================ ТРЕНЕРЫ ДЛЯ КЛИЕНТА ============================
function TrainersScreen({ survey, onBack, onWrite }) {
  const matched = React.useMemo(() => matchTrainers(DEMO_TRAINERS, survey || {}), [survey]);
  const hidden = DEMO_TRAINERS.length - matched.length;
  return (
    <div className="fit-screen" style={{ minHeight: "100vh", padding: "18px 22px 120px" }}>
      <div style={{ height: 56, display: "flex", alignItems: "center" }}>
        <button type="button" aria-label="Назад" onClick={onBack}
          style={{ width: 38, height: 38, borderRadius: 999, borderStyle: "solid", borderWidth: 0, borderColor: "transparent",
            cursor: "pointer", ...glass(0.5), display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ transform: "rotate(180deg)", display: "flex" }}><Glyph d={ICONS.chevron} size={15} color={PF.ink2} /></div>
        </button>
      </div>
      <div style={{ fontFamily: sfPro, ...TYPE.largeTitle, color: PF.ink }}>Тренеры для вас</div>
      <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink2, marginTop: 6, lineHeight: 1.45 }}>
        Показаны только те, кто закрывает вашу цель и умеет работать с вашими ограничениями.
        {hidden > 0 && ` Скрыто: ${hidden}.`}
      </div>
      {matched.length === 0 && (
        <div style={{ marginTop: 20, padding: 16, borderRadius: R.tile, background: "rgba(255,255,255,0.7)",
          fontFamily: sfPro, ...TYPE.subhead, color: PF.ink, lineHeight: 1.45 }}>
          Пока нет тренера, подтвердившего работу со всеми вашими ограничениями. Так безопаснее, чем показать неподходящего.
        </div>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 18 }}>
        {matched.map(({ trainer: tr, why }, i) => (
          <div key={tr.id} style={{ padding: 16, borderRadius: R.tile, background: "rgba(255,255,255,0.72)",
            borderStyle: "solid", borderWidth: 1, borderColor: i === 0 ? PF.terra : "rgba(255,255,255,0.9)",
            boxShadow: "0 8px 22px rgba(63,48,41,0.06)", animation: `fitUp .4s ease-out ${i * 0.05}s both` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 46, height: 46, borderRadius: 999, background: PF.terra + "26",
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontFamily: sfPro, fontSize: 17, fontWeight: 700, color: PF.terra }}>{tr.name[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: sfPro, ...TYPE.headline, color: PF.ink }}>{tr.name}</div>
                <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 2 }}>
                  ★ {tr.rating} · {tr.formats.map((f) => f === "online" ? "онлайн" : "зал").join(", ")}{tr.city ? " · " + tr.city : ""} · {tr.price.toLocaleString("ru")} ₽
                </div>
              </div>
              {i === 0 && <span style={{ fontFamily: sfPro, ...TYPE.caption, fontWeight: 700, color: PF.terra }}>Лучший</span>}
            </div>
            <div style={{ fontFamily: sfPro, ...TYPE.subhead, color: PF.ink, marginTop: 10, lineHeight: 1.45 }}>{tr.about}</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {why.map((w) => (
                <span key={w} style={{ padding: "5px 10px", borderRadius: 999, background: ACCENT.goals.soft,
                  fontFamily: sfPro, ...TYPE.caption, color: ACCENT.goals.c }}>{w}</span>
              ))}
            </div>
            <button type="button" onClick={() => onWrite(tr)}
              style={{ marginTop: 12, width: "100%", padding: 12, borderRadius: R.pill, cursor: "pointer",
                borderStyle: "solid", borderWidth: 0, borderColor: "transparent", background: PF.terra, color: "#fff",
                fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700 }}>
              Написать
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

/****************************************************************************
 *  ГЛАВА 9. СБОРКА
 *  Состояние приложения, маршрутизация экранов
 ****************************************************************************/

// ============================ КОРНЕВОЙ КОМПОНЕНТ ============================
export default function App() {
  const [gender, setGender] = useState("female");
  const [view, setView] = useState("front");
  const [screen, setScreen] = useState("home");
  const [doneToday, setDoneToday] = useState([]);
  // отметки приёмов пищи попадают в журнал по дням — отсюда серия «По плану»
  useEffect(() => { setMealsLog((log) => ({ ...log, [dayKey(Date.now())]: doneToday })); }, [doneToday]);
  const [tiles, setTiles] = useState(DEFAULT_TILES);
  const [boot, setBoot] = useState("splash");   // splash | language | app
  const [lang, setLang] = useState("ru");
  const [langChosen, setLangChosen] = useState(false);
  const [surveyDone, setSurveyDone] = useState(false);
  const [surveyStep, setSurveyStep] = useState(0);   // чтобы возврат с номера не сбрасывал прогресс
  const [sourcesPage, setSourcesPage] = useState(0); // с номера — назад на страницу гаджетов
  // ПРОТОТИП: онбординг показывается при каждом открытии, иначе его не пересмотреть.
  // Для боевой версии поставить false — тогда пройденный опрос запомнится.
  const ALWAYS_ONBOARD = true;
  const [account, setAccount] = useState(null);   // { phone, token, synced }
  const [weightLog, setWeightLog] = useState([]);
  const [macros, setMacros] = useState(null);
  const [weightNotif, setWeightNotif] = useState(true);
  const [notifTime, setNotifTime] = useState("09:00");
  const [call, setCall] = useState(null);   // { peer, mode }
  const [foodEntries, setFoodEntries] = useState({});   // день -> съеденное
  const [inChatRoom, setInChatRoom] = useState(false);
  const [tilesEditing, setTilesEditing] = useState(false);   // правка плашек — панель заблокирована
  const [stat, setStat] = useState(null);                    // открытый лист статистики { key, ctx }
  const [trainer, setTrainer] = useState(() => ({ ...TRAINER_DEFAULTS, goals: [], serious: [], excluded: [], formats: ["online"] }));

  const openStat = (key, ctx) => setStat({ key, ctx });
  // каждая вкладка открывается с верха страницы
  useEffect(() => {
    if (typeof window !== "undefined") window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [screen]);   // открыта переписка — панель прячем
  const [survey, setSurvey] = useState({
    name: "", gender: "", height: "", weight: "", age: "",
    role: "", exp: "", goals: [], contra: [], customContra: [], apps: [], gadgets: [],
  });
  const health = useHealth();
  useEffect(() => { seedDemoHealth(); }, []);                 // без источников — демо, помечено
  const [mealsLog, setMealsLog] = useState({});                // день -> отмеченные приёмы
  const [owned, setOwned] = useState(["fit288_sport_top", "fit288_leggings", "shoes01"]);
  const [spent, setSpent] = useState(0);
  const [equipped, setEquipped] = useState({ top: "fit288_sport_top", bottom: "fit288_leggings", shoes: "shoes01" });
  const progress = React.useMemo(() => computeProgress({ health, weightLog, mealsLog, survey }),
    [health.all().length, weightLog, mealsLog, survey]);
  const [logins, setLogins] = useState(() => loadLogins());
  const [bonusToast, setBonusToast] = useState(null);
  const toastTimer = React.useRef(null);
  const showBonus = (text, sub) => {
    setBonusToast({ text, sub });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setBonusToast(null), 3600);
  };
  const points = React.useMemo(() => computePoints({ health, progress, mealsLog, logins, weightLog }),
    [health.all().length, progress, mealsLog, logins, weightLog]);
  // Вход засчитывается при первом попадании на главный экран — раз в день
  useEffect(() => {
    if (boot !== "app") return;
    const { log, fresh } = recordLogin();
    setLogins(log);
    if (fresh) {
      const streak = loginStreak(log);
      const bonus = POINTS.perLogin + (streak === 7 ? POINTS.loginStreak7 : streak === 30 ? POINTS.loginStreak30 : 0);
      showBonus(`+${bonus} баллов за вход`, streak > 1 ? `Серия: ${streak} ${streak >= 5 ? "дней" : streak === 1 ? "день" : "дня"} подряд` : "Заходите каждый день — серия растёт");
    }
  }, [boot]);
  // Начисления за остальное: следим за общей суммой и показываем разницу с причиной
  const prevPoints = React.useRef(null);
  useEffect(() => {
    if (prevPoints.current == null) { prevPoints.current = points; return; }
    const before = prevPoints.current, after = points;
    prevPoints.current = after;
    if (after.total <= before.total) return;
    const grown = after.rows.find((r) => r.sum > (before.rows.find((b) => b.label === r.label)?.sum || 0));
    const reason = grown ? grown.label.toLowerCase() : "активность";
    if (!/входы/.test(reason)) showBonus(`+${after.total - before.total} баллов`, `За: ${reason}`);
  }, [points.total]);
  // Список вещей для 3D-модели: то, что надето сейчас
  const wardrobe = React.useMemo(() => Object.values(equipped).filter(Boolean), [equipped]);
  const [face, setFace] = useState({
    hairLength: "long", hairTexture: "wavy", ponytail: false,
    eyes: "brown", nose: "n1", skin: "tan", lips: "nude",
  });

  // localStorage читаем только после монтирования и только в браузере.
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const g = window.localStorage.getItem("forma-gender");
      const v = window.localStorage.getItem("forma-view");
      if (g === "female" || g === "male") setGender(g);
      if (v === "front" || v === "back") setView(v);
      const f = window.localStorage.getItem("forma-face");
      if (f) setFace((prev) => ({ ...prev, ...JSON.parse(f) }));
      const lg = window.localStorage.getItem("fit288-lang");
      if (lg && I18N[lg]) { setLang(lg); if (!ALWAYS_ONBOARD) setLangChosen(true); }
      const wl = window.localStorage.getItem("fit288-weight");
      if (wl) { const p = JSON.parse(wl); if (Array.isArray(p)) setWeightLog(p); }
      const mc = window.localStorage.getItem("fit288-macros");
      if (mc) setMacros(JSON.parse(mc));
      const ac = window.localStorage.getItem("fit288-account");
      if (ac && !ALWAYS_ONBOARD) setAccount(JSON.parse(ac));
      const sv = window.localStorage.getItem("fit288-survey");
      if (sv) { const p = JSON.parse(sv); if (p && p.name) { setSurvey(p); if (!ALWAYS_ONBOARD) setSurveyDone(true); } }
      // В прототипе всегда стартуем с полной раскладки.
      const tl = ALWAYS_ONBOARD ? null : window.localStorage.getItem("fit288-tiles");
      if (tl) {
        const saved = JSON.parse(tl);
        if (Array.isArray(saved) && saved.length) {
          // Порядок и размеры пользователя сохраняем, новые плашки дописываем в конец.
          const known = saved.filter((x) => TILE_CATALOG[x.key]);
          const missing = DEFAULT_TILES.filter((d) => !known.some((x) => x.key === d.key));
          setTiles([...known, ...missing]);
        }
      }
    } catch (e) {
      /* приватный режим — просто пропускаем */
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem("forma-gender", gender);
      window.localStorage.setItem("forma-view", view);
      window.localStorage.setItem("forma-face", JSON.stringify(face));
      if (langChosen) window.localStorage.setItem("fit288-lang", lang);
      if (surveyDone) window.localStorage.setItem("fit288-survey", JSON.stringify(survey));
      // токен в localStorage не храним; номер — только маскированный, для отображения
      if (account) window.localStorage.setItem("fit288-account", JSON.stringify({
        phoneMasked: String(account.phone || "").replace(/(\+7 \d{3}) \d{3}-\d{2}-(\d{2})/, "$1 •••-••-$2"),
        synced: !!account.synced,
      }));
      window.localStorage.setItem("fit288-weight", JSON.stringify(weightLog));
      if (macros) window.localStorage.setItem("fit288-macros", JSON.stringify(macros));
      window.localStorage.setItem("fit288-tiles", JSON.stringify(tiles));
    } catch (e) { /* игнорируем */ }
  }, [gender, view, face, lang, tiles, langChosen, surveyDone, survey, weightLog, macros, account]);

  const t = useT(lang);
  const tabs = [
    ["home", t("today"), ICONS.home],
    ["workout", t("workouts"), ICONS.dumbbell],
    ["chats", t("chats"), ICONS.chat],
    ["nutrition", t("food"), ICONS.cutlery],
    ["profile", t("profile"), ICONS.user],
  ];

  if (boot === "splash") {
    return <SplashScreen onDone={() => setBoot(!langChosen ? "language" : !surveyDone ? "survey" : !account ? "phone" : "app")} />;
  }
  if (boot === "language") {
    return (
      <div style={{ minHeight: "100vh", background: PF.bg, color: PF.ink, fontFamily: sfPro,
        display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 430 }}>
          <LanguageWheel lang={lang} setLang={setLang}
            onNext={() => { setLangChosen(true); setBoot(!surveyDone ? "survey" : !account ? "phone" : "app"); }} />
        </div>
      </div>
    );
  }
  if (boot === "sources") {
    return (
      <div style={{ minHeight: "100vh", background: PF.bg, color: PF.ink, fontFamily: sfPro,
        display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 430 }}>
          <SourcesScreen survey={survey} setSurvey={setSurvey} startPage={sourcesPage}
            onBack={() => setBoot("survey")} onDone={() => setBoot("phone")} />
        </div>
      </div>
    );
  }
  if (boot === "phone") {
    return (
      <div style={{ minHeight: "100vh", background: PF.bg, color: PF.ink, fontFamily: sfPro,
        display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 430 }}>
          <PhoneScreen lang={lang} profile={survey} onBack={() => { setSourcesPage(1); setBoot("sources"); }}
            onDone={(acc) => { setAccount(acc); setBoot("app"); }} />
        </div>
      </div>
    );
  }
  if (boot === "survey") {
    return (
      <div style={{ minHeight: "100vh", background: PF.bg, color: PF.ink, fontFamily: sfPro,
        display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 430 }}>
          <SurveyScreen lang={lang} setLang={setLang} survey={survey} setSurvey={setSurvey}
            step={surveyStep} setStep={setSurveyStep}
            onBack={() => setBoot("language")}
            onDone={() => {
              // ответы опроса становятся данными профиля
              if (survey.gender) setGender(survey.gender);
              const raw = computeMacros({ gender: survey.gender, heightCm: survey.height,
                weightKg: survey.weight, age: survey.age, goals: survey.goals });
              const g = guardNutrition(raw, survey);
              setMacros({ ...g.macros, atWeight: Number(survey.weight), at: new Date().toISOString().slice(0,10), safetyFlags: g.flags });
              setLangChosen(true);
              setSurveyDone(true);
              setBoot(account ? "app" : "sources");
            }} />
        </div>
      </div>
    );
  }
  if (boot === "language") {
    return (
      <div style={{ minHeight: "100vh", background: PF.bg, color: PF.ink, fontFamily: sfPro,
        display: "flex", justifyContent: "center" }}>
        <div style={{ width: "100%", maxWidth: 430 }}>
          <LanguageWheel lang={lang} setLang={setLang} onNext={() => { setLangChosen(true); setBoot(!surveyDone ? "survey" : !account ? "sources" : "app"); }} />
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: "100vh", background: PF.bg, color: PF.ink, fontFamily: sans,
      display: "flex", justifyContent: "center",
    }}>
      <style>{`
        * { box-sizing: border-box; }
        html { scrollbar-gutter: stable both-edges; overscroll-behavior: none; }
        body { margin: 0; overflow-y: scroll; overscroll-behavior: none; }
        @keyframes fitUp { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fitIn { from{opacity:0;transform:scale(.96)} to{opacity:1;transform:scale(1)} }
        @keyframes fitSlide { from{opacity:0;transform:translateX(16px)} to{opacity:1;transform:translateX(0)} }
        @keyframes fitShimmer { 0%{background-position:-180% 0} 100%{background-position:180% 0} }
        @keyframes fitGlow { 0%,100%{box-shadow:0 8px 26px rgba(169,112,96,.32)} 50%{box-shadow:0 12px 38px rgba(169,112,96,.52)} }
        @keyframes fitFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
        /* элементы появляются каскадом */
        .fit-stagger > * { animation: fitUp .5s cubic-bezier(.22,1,.36,1) both; }
        .fit-stagger > *:nth-child(1){animation-delay:.02s} .fit-stagger > *:nth-child(2){animation-delay:.06s}
        .fit-stagger > *:nth-child(3){animation-delay:.10s} .fit-stagger > *:nth-child(4){animation-delay:.14s}
        .fit-stagger > *:nth-child(5){animation-delay:.18s} .fit-stagger > *:nth-child(6){animation-delay:.22s}
        .fit-stagger > *:nth-child(7){animation-delay:.26s} .fit-stagger > *:nth-child(8){animation-delay:.30s}
        .fit-screen { animation: fitUp .42s cubic-bezier(.22,1,.36,1) both; }
        .fit-press { transition: transform .14s ease, box-shadow .2s ease; }
        .fit-press:active { transform: scale(.97); }
        @keyframes fitJiggle {
          0%   { transform: rotate(-.25deg); }
          25%  { transform: rotate(.2deg); }
          50%  { transform: rotate(-.2deg); }
          75%  { transform: rotate(.25deg); }
          100% { transform: rotate(-.25deg); }
        }
        @keyframes fitDim { from{opacity:0} to{opacity:1} }
        @keyframes fitSheetUp { from{transform:translateY(40px);opacity:0} to{transform:none;opacity:1} }
        @keyframes fitGrowY { from{transform:scaleY(0)} to{transform:scaleY(1)} }
        @keyframes fitGrow { from{transform:scaleY(0);opacity:0} to{transform:scaleY(1);opacity:1} }
        @keyframes fitRing { from{stroke-dashoffset:var(--fit-dash)} }
        @keyframes fitPop { 0%{transform:scale(.85);opacity:0} 60%{transform:scale(1.04)} 100%{transform:scale(1);opacity:1} }
        .fit-pop { animation: fitPop .38s cubic-bezier(.34,1.4,.5,1) both; }
        /* мягкая реакция на касание у всего кликабельного */
        button { -webkit-tap-highlight-color: transparent; }
        button:active { transform: scale(.96); }
        button { transition: transform .14s ease; }
        .fit-wobble { animation: fitJiggle .34s ease-in-out infinite; transform-origin: 50% 50%; will-change: transform; }
        /* соседние плашки качаются не синхронно — как иконки на домашнем экране */
        .fit-wobble.j1 { animation-delay: -.07s; }
        .fit-wobble.j2 { animation-delay: -.14s; animation-direction: reverse; }
        .fit-wobble.j3 { animation-delay: -.21s; }
        .fit-wobble.j4 { animation-delay: -.04s; animation-direction: reverse; }
        .fit-tile-move { transition: transform .34s cubic-bezier(.4,0,.2,1), opacity .3s ease; }
        /* жидкое стекло: подвижный блик по верхней кромке */
        .fit-glass { position: relative; isolation: isolate; }
        .fit-glass::before {
          content: ""; position: absolute; inset: 0; pointer-events: none; z-index: 1;
          border-radius: inherit; overflow: hidden;
          background: linear-gradient(115deg,
            rgba(255,255,255,0.55) 0%, rgba(255,255,255,0.10) 22%,
            rgba(255,255,255,0) 45%, rgba(255,255,255,0) 62%,
            rgba(255,255,255,0.22) 88%, rgba(255,255,255,0.42) 100%);
          mix-blend-mode: overlay;
        }
        .fit-glass::after {
          content: ""; position: absolute; left: 8%; right: 8%; top: 0; height: 1px;
          pointer-events: none; z-index: 2; border-radius: inherit;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent);
        }
      `}</style>

      <div style={{ width: "100%", maxWidth: 430, paddingBottom: inChatRoom ? 0 : 96, position: "relative" }}>
        {screen !== "chats" && inChatRoom && setTimeout(() => setInChatRoom(false), 0)}
        {screen === "settings" ? (
          <SettingsScreen lang={lang} setLang={setLang} onBack={() => setScreen("profile")}
            survey={survey} weightNotif={weightNotif} setWeightNotif={setWeightNotif}
            notifTime={notifTime} setNotifTime={setNotifTime}
            onResetOnboarding={() => {
              try {
                ["fit288-lang","fit288-survey","fit288-tiles","fit288-weight","fit288-macros","fit288-account",
                 "forma-gender","forma-view","forma-face"].forEach((k) => window.localStorage.removeItem(k));
              } catch (e) { /* приватный режим */ }
              setLangChosen(false);
              setSurveyDone(false);
              setSurvey({ name:"", gender:"", height:"", weight:"", age:"",
                role:"", exp:"", goals:[], contra:[], customContra:[] });
              setWeightLog([]); setMacros(null); setTiles(DEFAULT_TILES); setAccount(null);
              setScreen("home");
              setBoot("splash");
            }} />
        ) : screen === "chats" ? (
          <ChatsScreen lang={lang} onCall={(peer, mode) => setCall({ peer, mode })} onRoomChange={setInChatRoom} />
        ) : screen === "home" ? (
          <TodayScreen onStartWorkout={() => setScreen("workout")} doneToday={doneToday} setDoneToday={setDoneToday} lang={lang} tiles={tiles} setTiles={setTiles} survey={survey} weightLog={weightLog} setWeightLog={setWeightLog} macros={macros} setMacros={setMacros} onEditingChange={setTilesEditing} onOpenStat={openStat}
            onOpenShop={() => setScreen("shop")} balance={points.total - spent} />
        ) : screen === "workout" ? (
          <WorkoutScreen onBack={() => setScreen("home")} survey={survey} workoutsCompleted={progress.workouts} />
        ) : screen === "nutrition" ? (
          <NutritionScreen lang={lang} macros={macros} entries={foodEntries} setEntries={setFoodEntries} />
        ) : screen === "appearance" ? (
          <AppearanceScreen face={face} setFace={setFace} onBack={() => setScreen("profile")} />
        ) : screen === "trainerSetup" ? (
          <TrainerSetupScreen trainer={trainer} setTrainer={setTrainer} onBack={() => setScreen("profile")} />
        ) : screen === "trainers" ? (
          <TrainersScreen survey={survey} onBack={() => setScreen("chats")}
            onWrite={() => setScreen("chats")} />
        ) : screen === "shop" ? (
          <ShopScreen onBack={() => setScreen("profile")} points={points} spent={spent}
            owned={owned} equipped={equipped} survey={survey}
            onBuy={(item) => { setOwned((o) => [...o, item.id]); setSpent((v) => v + item.price);
              setEquipped((e) => ({ ...e, [item.slot]: item.id })); }}
            onEquip={(item) => setEquipped((e) => ({ ...e, [item.slot]: item.id }))} />
        ) : screen === "editor" ? (
          <EditorScreen
            gender={gender} setGender={setGender}
            view={view} setView={setView}
            onBack={() => setScreen("profile")}
          />
        ) : (
          <ProfileScreen
            gender={gender} view={view} setView={setView}
            face={face} survey={survey} account={account} weightLog={weightLog} macros={macros}
            onOpenStat={openStat} progress={progress} mealsLog={mealsLog}
            onOpenEditor={() => setScreen("editor")}
            onOpenAppearance={() => setScreen("appearance")}
            onOpenSettings={() => setScreen("settings")}
            onOpenTrainer={() => setScreen(survey.role === "trainer" ? "trainerSetup" : "trainers")}
            trainerActive={trainer.subscriptionActive}
          />
        )}

        {call && <CallScreen lang={lang} peer={call.peer} mode={call.mode} onEnd={() => setCall(null)} />}

        {/* нижняя навигация — индикатор следует за пальцем */}
        {!inChatRoom && <TabBar tabs={tabs} screen={screen} setScreen={setScreen} disabled={tilesEditing} />}
        {stat && <TileDetail tileKey={stat.key} ctx={stat.ctx} onClose={() => setStat(null)} />}
        {bonusToast && (
          <div onClick={() => setBonusToast(null)} style={{ position: "fixed", top: 14, left: 0, right: 0, zIndex: 90,
            display: "flex", justifyContent: "center", pointerEvents: "none" }}>
            <div className="fit-pop" style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12,
              padding: "12px 18px 12px 14px", borderRadius: 999, maxWidth: 360,
              background: "rgba(255,253,250,0.92)", backdropFilter: "blur(30px) saturate(180%)",
              borderStyle: "solid", borderWidth: 1, borderColor: "rgba(255,255,255,0.9)",
              boxShadow: `0 14px 40px ${ACCENT.awards.c}44, 0 2px 8px rgba(63,48,41,0.12)` }}>
              <div style={{ width: 36, height: 36, borderRadius: 999, background: ACCENT.awards.c,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Glyph d={ICONS.trophy} size={17} color="#fff" />
              </div>
              <div>
                <div style={{ fontFamily: sfPro, ...TYPE.subhead, fontWeight: 700, color: PF.ink }}>{bonusToast.text}</div>
                <div style={{ fontFamily: sfPro, ...TYPE.caption, color: PF.ink2, marginTop: 1 }}>{bonusToast.sub}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
