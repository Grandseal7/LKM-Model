
const C2 = 100;
const $ = (id) => document.getElementById(id);

let timeChart = null;
let speedChart = null;
let lastInputs = null;

function readInputs() {
  return {
    volume: Number($("volume").value),
    speed: Number($("speed").value),
    time: Number($("time").value),
    g1: Number($("g1").value),
    g2: Number($("g2").value),
    c1: Number($("c1").value),
    c0: Number($("c0").value),
    intensity: Number($("intensity").value),
    cmin: Number($("cmin").value),
    cmax: Number($("cmax").value)
  };
}

function validate(p) {
  const ranges = [
    ["volume", 10, 1000, "Объём должен быть от 10 до 1000 л."],
    ["speed", 100, 500, "Скорость должна быть от 100 до 500 об/мин."],
    ["time", 1, 20, "Время должно быть от 1 до 20 минут."],
    ["g1", 0.1, 1000, "Расход смолы должен быть положительным."],
    ["g2", 0.1, 1000, "Расход растворителя должен быть положительным."],
    ["c1", 0, 100, "C1 должна находиться в диапазоне 0–100%."],
    ["c0", 0, 100, "C0 должна находиться в диапазоне 0–100%."],
    ["intensity", 0.5, 2, "Коэффициент интенсивности должен быть 0.5–2."],
    ["cmin", 0, 100, "Cmin должна находиться в диапазоне 0–100%."],
    ["cmax", 0, 100, "Cmax должна находиться в диапазоне 0–100%."]
  ];
  for (const [key, min, max, message] of ranges) {
    if (!Number.isFinite(p[key]) || p[key] < min || p[key] > max) return message;
  }
  if (p.cmin > p.cmax) return "Cmin не может быть больше Cmax.";
  return "";
}


function calculate(p, speed = p.speed, time = p.time) {
  const totalFlow = p.g1 + p.g2;
  const pi = (p.g1 * p.c1 + p.g2 * C2) / totalFlow;
  const baseT = p.volume / totalFlow;
  const effectiveT = baseT * (300 / speed) / p.intensity;
  const concentration = pi + (p.c0 - pi) * Math.exp(-time / effectiveT);

 
  const energy = Math.pow(speed / 300, 3) * time * p.intensity;
  const acceptable = concentration >= p.cmin && concentration <= p.cmax;

  return { totalFlow, pi, baseT, effectiveT, concentration, energy, acceptable };
}

function fmt(value, digits = 2) {
  return Number(value).toFixed(digits);
}

function showError(message) {
  $("errorMessage").textContent = message;
}

function renderCurrent(p) {
  const r = calculate(p);
  $("resultC").textContent = `${fmt(r.concentration)} %`;
  $("resultPi").textContent = `${fmt(r.pi)} %`;
  $("resultT").textContent = `${fmt(r.effectiveT)} мин`;
  $("resultEnergy").textContent = `${fmt(r.energy)} усл. ед.`;

  const status = $("resultStatus");
  status.className = `status ${r.acceptable ? "good" : "bad"}`;
  status.textContent = r.acceptable
    ? `Концентрация находится в заданном диапазоне ${p.cmin}–${p.cmax}%.`
    : `Концентрация вне заданного диапазона ${p.cmin}–${p.cmax}%.`;

  renderCharts(p);
  renderExperiments(p);
  $("conclusion").textContent =
    `При заданных параметрах установившаяся концентрация Pi составляет ${fmt(r.pi)}%, ` +
    `а концентрация через ${p.time} мин — ${fmt(r.concentration)}%. ` +
    `Эффективная постоянная времени равна ${fmt(r.effectiveT)} мин. ` +
    (r.acceptable
      ? "Полученная концентрация соответствует установленным границам."
      : "Полученная концентрация не попадает в установленный диапазон; необходимо изменить состав или режим.");
}

function renderCharts(p) {
  const current = calculate(p);
  const timeLabels = [];
  const timeValues = [];
  const points = 60;
  for (let i = 0; i <= points; i++) {
    const t = p.time * i / points;
    timeLabels.push(fmt(t, 1));
    timeValues.push(Number(calculate(p, p.speed, t).concentration.toFixed(3)));
  }

  const speedLabels = [100, 150, 200, 250, 300, 350, 400, 450, 500];
  const speedValues = speedLabels.map(n =>
    Number(calculate(p, n, p.time).concentration.toFixed(3))
  );

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { labels: { color: "#edf2f7" } } },
    scales: {
      x: { ticks: { color: "#aab7c5" }, title: { display: true, color: "#aab7c5" } },
      y: { ticks: { color: "#aab7c5" }, title: { display: true, color: "#aab7c5" }, min: 0, max: 100 }
    }
  };

  if (timeChart) timeChart.destroy();
  timeChart = new Chart($("timeChart"), {
    type: "line",
    data: {
      labels: timeLabels,
      datasets: [{
        label: "Концентрация, %",
        data: timeValues,
        borderColor: "#e6a23c",
        backgroundColor: "rgba(230,162,60,.15)",
        fill: true,
        tension: .25,
        pointRadius: 0
      }, {
        label: "Установившаяся концентрация Pi",
        data: timeLabels.map(() => current.pi),
        borderColor: "#82d6a2",
        borderDash: [6, 5],
        pointRadius: 0,
        fill: false
      }]
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        x: { ...commonOptions.scales.x, title: { display: true, text: "Время, мин", color: "#aab7c5" } },
        y: { ...commonOptions.scales.y, title: { display: true, text: "Концентрация, %", color: "#aab7c5" } }
      }
    }
  });

  if (speedChart) speedChart.destroy();
  speedChart = new Chart($("speedChart"), {
    type: "line",
    data: {
      labels: speedLabels,
      datasets: [{
        label: `Концентрация через ${p.time} мин, %`,
        data: speedValues,
        borderColor: "#72b7e8",
        backgroundColor: "rgba(114,183,232,.12)",
        fill: true,
        tension: .25
      }]
    },
    options: {
      ...commonOptions,
      scales: {
        ...commonOptions.scales,
        x: { ...commonOptions.scales.x, title: { display: true, text: "Скорость мешалки, об/мин", color: "#aab7c5" } },
        y: { ...commonOptions.scales.y, title: { display: true, text: "Концентрация, %", color: "#aab7c5" } }
      }
    }
  });
}

function renderExperiments(p) {
  const experiments = [
    [100, 5], [200, 5], [300, 10], [400, 10], [500, 15]
  ];
  $("experimentTable").innerHTML = experiments.map(([speed, time], index) => {
    const r = calculate(p, speed, time);
    return `<tr>
      <td>${index + 1}</td>
      <td>${speed}</td>
      <td>${time}</td>
      <td>${fmt(r.concentration)}%</td>
      <td>${fmt(r.energy)}</td>
      <td class="${r.acceptable ? "good-text" : "bad-text"}">${r.acceptable ? "Да" : "Нет"}</td>
    </tr>`;
  }).join("");
}

function optimize(p) {
  let best = null;
  for (let speed = 100; speed <= 500; speed += 10) {
    for (let time = 1; time <= 20.0001; time += 0.5) {
      const result = calculate(p, speed, time);
      if (result.acceptable && (!best || result.energy < best.energy)) {
        best = { speed, time, ...result };
      }
    }
  }
  return best;
}

$("modelForm").addEventListener("submit", (event) => {
  event.preventDefault();
  const p = readInputs();
  const error = validate(p);
  if (error) {
    showError(error);
    return;
  }
  showError("");
  lastInputs = p;
  renderCurrent(p);
});

$("resetBtn").addEventListener("click", () => {
  $("modelForm").reset();
  showError("");
  $("resultC").textContent = "—";
  $("resultPi").textContent = "—";
  $("resultT").textContent = "—";
  $("resultEnergy").textContent = "—";
  $("resultStatus").className = "status";
  $("resultStatus").textContent = "Измени параметры и нажми «Рассчитать».";
  $("optimizationResult").textContent = "Нажми кнопку, чтобы выполнить поиск.";
  $("experimentTable").innerHTML = "";
  $("conclusion").textContent = "После расчёта здесь появится краткий анализ влияния параметров.";
  if (timeChart) { timeChart.destroy(); timeChart = null; }
  if (speedChart) { speedChart.destroy(); speedChart = null; }
});

$("optimizeBtn").addEventListener("click", () => {
  const p = readInputs();
  const error = validate(p);
  if (error) {
    showError(error);
    $("optimizationResult").textContent = "Исправь параметры формы и повтори поиск.";
    return;
  }
  showError("");
  const best = optimize(p);
  if (!best) {
    $("optimizationResult").textContent =
      "Подходящий режим не найден в заданных пределах. Проверь Cmin/Cmax и состав смеси: установившаяся концентрация может не попадать в требуемый диапазон.";
    return;
  }
  $("optimizationResult").innerHTML =
    `<b>Найденный режим:</b> скорость ${best.speed} об/мин; время ${fmt(best.time, 1)} мин; ` +
    `концентрация ${fmt(best.concentration)}%; условные энергозатраты ${fmt(best.energy)}.`;
});

$("modelForm").requestSubmit();
