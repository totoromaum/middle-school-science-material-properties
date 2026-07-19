(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const liveRegion = $("#liveRegion");
  const announce = (message) => { liveRegion.textContent = message; };

  // Slide deck
  const slides = $$(".slide");
  const topicButtons = $$(".topic-button");
  const currentSlideLabel = $("#currentSlide");
  const totalSlidesLabel = $("#totalSlides");
  const deckProgress = $("#deckProgress");
  const previousButton = $("#prevSlide");
  const nextButton = $("#nextSlide");
  let currentSlide = 0;

  totalSlidesLabel.textContent = String(slides.length).padStart(2, "0");

  function showSlide(index, focusStage = false) {
    const target = clamp(Number(index), 0, slides.length - 1);
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === target;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", String(!active));
      if (active) $(".slide-scroll", slide).scrollTop = 0;
    });
    topicButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === target;
      button.classList.toggle("active", active);
      if (active) button.setAttribute("aria-current", "page");
      else button.removeAttribute("aria-current");
    });
    currentSlide = target;
    currentSlideLabel.textContent = String(target + 1).padStart(2, "0");
    deckProgress.style.width = `${((target + 1) / slides.length) * 100}%`;
    previousButton.disabled = target === 0;
    nextButton.disabled = target === slides.length - 1;
    nextButton.setAttribute("aria-label", target === slides.length - 1 ? "마지막 슬라이드" : "다음 슬라이드");
    history.replaceState(null, "", `#slide-${target + 1}`);
    if (focusStage) $("#slideStage").focus({ preventScroll: true });
    if (target === 2) updateSolubilityLab();
    if (target === 3) drawHeatingChart();
    if (target === 4) drawPurityChart();
    announce(`${target + 1}번 슬라이드, ${$("h2", slides[target]).textContent.replace(/\s+/g, " ")}`);
  }

  document.addEventListener("click", (event) => {
    const navigationButton = event.target.closest("[data-go]");
    if (navigationButton) showSlide(navigationButton.dataset.go, true);
  });
  previousButton.addEventListener("click", () => showSlide(currentSlide - 1, true));
  nextButton.addEventListener("click", () => showSlide(currentSlide + 1, true));
  document.addEventListener("keydown", (event) => {
    const tag = event.target.tagName;
    const isControl = ["INPUT", "SELECT", "TEXTAREA", "BUTTON"].includes(tag) || event.target.isContentEditable;
    if (isControl || $("#overviewDialog").open) return;
    if (["ArrowRight", "PageDown", " "].includes(event.key)) { event.preventDefault(); showSlide(currentSlide + 1); }
    if (["ArrowLeft", "PageUp"].includes(event.key)) { event.preventDefault(); showSlide(currentSlide - 1); }
    if (event.key === "Home") { event.preventDefault(); showSlide(0); }
    if (event.key === "End") { event.preventDefault(); showSlide(slides.length - 1); }
  });

  const hashMatch = location.hash.match(/slide-(\d+)/);
  showSlide(hashMatch ? Number(hashMatch[1]) - 1 : 0);

  // Teacher notes and overview
  const teacherToggle = $("#teacherToggle");
  let teacherMode = false;
  try { teacherMode = localStorage.getItem("science-teacher-mode") === "true"; } catch (_) { /* local preference only */ }
  function setTeacherMode(enabled) {
    teacherMode = enabled;
    document.body.classList.toggle("teacher-mode", enabled);
    teacherToggle.setAttribute("aria-pressed", String(enabled));
    try { localStorage.setItem("science-teacher-mode", String(enabled)); } catch (_) { /* storage may be unavailable */ }
    announce(enabled ? "교사 노트를 켰습니다." : "교사 노트를 껐습니다.");
  }
  setTeacherMode(teacherMode);
  teacherToggle.addEventListener("click", () => setTeacherMode(!teacherMode));
  const overviewDialog = $("#overviewDialog");
  $("#overviewButton").addEventListener("click", () => overviewDialog.showModal());

  $("#fullscreenButton").addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) await document.documentElement.requestFullscreen();
      else await document.exitFullscreen();
    } catch (_) {
      announce("이 브라우저에서는 전체 화면을 사용할 수 없습니다.");
    }
  });
  document.addEventListener("fullscreenchange", () => {
    $("#fullscreenButton").textContent = document.fullscreenElement ? "×" : "⛶";
    $("#fullscreenButton").setAttribute("aria-label", document.fullscreenElement ? "전체 화면 끝내기" : "전체 화면으로 보기");
  });

  // Density lab
  const massRange = $("#massRange");
  const volumeRange = $("#volumeRange");
  const sampleBlock = $("#sampleBlock");
  const densityPresets = {
    wood: { mass: 28, volume: 40, name: "나무" },
    aluminum: { mass: 108, volume: 40, name: "알루미늄" },
    iron: { mass: 157, volume: 20, name: "철" },
  };
  function updateDensityLab() {
    const mass = Number(massRange.value);
    const volume = Number(volumeRange.value);
    const density = mass / volume;
    $("#massOutput").textContent = `${mass} g`;
    $("#volumeOutput").textContent = `${volume} mL`;
    $("#densityOutput").textContent = density.toFixed(2);
    const relative = density - 1;
    let position = 28;
    let conclusion = "물보다 밀도가 작으므로 물 위에 뜹니다.";
    if (Math.abs(relative) < 0.03) {
      position = 49;
      conclusion = "물과 밀도가 거의 같아 물속에 떠 있는 상태가 됩니다.";
    } else if (relative > 0) {
      position = Math.min(82, 65 + Math.log2(density + 1) * 7);
      conclusion = `물보다 밀도가 ${density.toFixed(2)}배 정도 크므로 바닥으로 가라앉습니다.`;
    }
    sampleBlock.style.top = `${position}%`;
    sampleBlock.style.borderRadius = density > 3 ? "8px" : density < 1 ? "50%" : "15px";
    sampleBlock.style.background = density > 5 ? "#7f8b94" : density > 1 ? "#f39a3f" : "#c49a62";
    $("#densityConclusion").textContent = conclusion;
  }
  [massRange, volumeRange].forEach((input) => input.addEventListener("input", updateDensityLab));
  $$("[data-density-preset]").forEach((button) => button.addEventListener("click", () => {
    const preset = densityPresets[button.dataset.densityPreset];
    massRange.value = preset.mass;
    volumeRange.value = preset.volume;
    sampleBlock.textContent = preset.name;
    updateDensityLab();
  }));
  $("#densityReset").addEventListener("click", () => {
    massRange.value = 78; volumeRange.value = 40; sampleBlock.textContent = "시료"; updateDensityLab();
  });
  updateDensityLab();

  // Solubility lab
  const solubilitySeries = {
    kno3: { name: "질산 칼륨", color: "#c84b4b", points: [[0,13.3],[10,20.9],[20,31.6],[30,45.8],[40,63.9],[50,85.5],[60,109.2],[70,138],[80,169]] },
    boric: { name: "붕산", color: "#1f9d8a", points: [[0,2.7],[10,3.7],[20,5],[30,6.9],[40,9.9],[50,14.2],[60,20.4],[70,28.5],[80,38]] },
    nacl: { name: "염화 나트륨", color: "#3b82a0", points: [[0,35.7],[10,35.8],[20,35.9],[30,36.2],[40,36.5],[50,36.9],[60,37.3],[70,37.8],[80,38.4]] },
  };
  const soluteSelect = $("#soluteSelect");
  const temperatureRange = $("#temperatureRange");
  const soluteAmountRange = $("#soluteAmountRange");
  function interpolate(points, x) {
    if (x <= points[0][0]) return points[0][1];
    for (let index = 1; index < points.length; index += 1) {
      const [x2, y2] = points[index]; const [x1, y1] = points[index - 1];
      if (x <= x2) return y1 + ((x - x1) / (x2 - x1)) * (y2 - y1);
    }
    return points[points.length - 1][1];
  }
  function drawAxes(context, width, height, xMax, yMax, xLabel, yLabel) {
    const margin = { left: 48, right: 18, top: 18, bottom: 38 };
    const graphWidth = width - margin.left - margin.right;
    const graphHeight = height - margin.top - margin.bottom;
    context.clearRect(0, 0, width, height);
    context.fillStyle = "#fffdf8"; context.fillRect(0, 0, width, height);
    context.strokeStyle = "#dfe3df"; context.lineWidth = 1;
    for (let index = 0; index <= 5; index += 1) {
      const x = margin.left + (graphWidth / 5) * index;
      const y = margin.top + (graphHeight / 5) * index;
      context.beginPath(); context.moveTo(x, margin.top); context.lineTo(x, margin.top + graphHeight); context.stroke();
      context.beginPath(); context.moveTo(margin.left, y); context.lineTo(margin.left + graphWidth, y); context.stroke();
    }
    context.strokeStyle = "#536575"; context.lineWidth = 1.5;
    context.beginPath(); context.moveTo(margin.left, margin.top); context.lineTo(margin.left, margin.top + graphHeight); context.lineTo(margin.left + graphWidth, margin.top + graphHeight); context.stroke();
    context.fillStyle = "#6a7a88"; context.font = "11px system-ui"; context.textAlign = "center";
    for (let index = 0; index <= 4; index += 1) {
      const value = (xMax / 4) * index;
      context.fillText(String(Math.round(value)), margin.left + (graphWidth / 4) * index, height - 18);
    }
    context.textAlign = "right";
    for (let index = 0; index <= 4; index += 1) {
      const value = (yMax / 4) * index;
      context.fillText(String(Math.round(value)), margin.left - 7, margin.top + graphHeight - (graphHeight / 4) * index + 4);
    }
    context.textAlign = "center"; context.fillText(xLabel, margin.left + graphWidth / 2, height - 2);
    context.save(); context.translate(12, margin.top + graphHeight / 2); context.rotate(-Math.PI / 2); context.fillText(yLabel, 0, 0); context.restore();
    return { margin, graphWidth, graphHeight };
  }
  function drawSolubilityChart() {
    const canvas = $("#solubilityChart");
    const context = canvas.getContext("2d");
    const width = canvas.width; const height = canvas.height;
    const { margin, graphWidth, graphHeight } = drawAxes(context, width, height, 80, 180, "온도 (°C)", "용해도 (g / 물 100 g)");
    Object.entries(solubilitySeries).forEach(([key, series]) => {
      context.beginPath(); context.lineWidth = key === soluteSelect.value ? 4 : 1.8; context.strokeStyle = series.color; context.globalAlpha = key === soluteSelect.value ? 1 : .28;
      series.points.forEach(([temp, value], index) => {
        const x = margin.left + (temp / 80) * graphWidth;
        const y = margin.top + graphHeight - (value / 180) * graphHeight;
        if (index === 0) context.moveTo(x, y); else context.lineTo(x, y);
      });
      context.stroke(); context.globalAlpha = 1;
    });
    const series = solubilitySeries[soluteSelect.value];
    const temp = Number(temperatureRange.value); const value = interpolate(series.points, temp);
    const x = margin.left + (temp / 80) * graphWidth; const y = margin.top + graphHeight - (value / 180) * graphHeight;
    context.setLineDash([4,4]); context.strokeStyle = series.color; context.lineWidth = 1;
    context.beginPath(); context.moveTo(x, margin.top + graphHeight); context.lineTo(x, y); context.lineTo(margin.left, y); context.stroke(); context.setLineDash([]);
    context.fillStyle = series.color; context.beginPath(); context.arc(x, y, 6, 0, Math.PI * 2); context.fill();
    context.fillStyle = "#102a43"; context.font = "bold 12px system-ui"; context.textAlign = "left"; context.fillText(`${value.toFixed(1)} g`, Math.min(x + 9, width - 70), Math.max(y - 8, 18));
  }
  function updateSolubilityLab() {
    const series = solubilitySeries[soluteSelect.value];
    const temperature = Number(temperatureRange.value);
    const amount = Number(soluteAmountRange.value);
    const solubility = interpolate(series.points, temperature);
    const solid = Math.max(0, amount - solubility);
    $("#temperatureOutput").textContent = `${temperature} °C`;
    $("#soluteAmountOutput").textContent = `${amount} g`;
    $("#solubilityValue").textContent = `${solubility.toFixed(1)} g`;
    $("#solidMass").textContent = `${solid.toFixed(1)} g`;
    let state = "불포화 용액";
    if (Math.abs(amount - solubility) <= 1) state = "포화 용액";
    if (amount > solubility + 1) state = "포화 용액 + 고체";
    $("#solutionState").textContent = state;
    $("#solidPile").style.height = `${Math.min(45, solid * .55)}%`;
    $("#solutionFill").style.background = `linear-gradient(rgba(67,170,196,${.25 + Math.min(.35, amount / 260)}), rgba(67,170,196,.68))`;
    drawSolubilityChart();
  }
  [soluteSelect, temperatureRange, soluteAmountRange].forEach((control) => control.addEventListener("input", updateSolubilityLab));
  updateSolubilityLab();

  // Heating curve lab
  const heatingProfiles = {
    water: { name: "물", point: 100, start: 20, after: 112, action: "끓는 중", type: "끓는점" },
    ethanol: { name: "에탄올", point: 78.2, start: 20, after: 92, action: "끓는 중", type: "끓는점" },
    lauric: { name: "로르산", point: 43.8, start: 20, after: 66, action: "녹는 중", type: "녹는점" },
    palmitic: { name: "팔미트산", point: 62.5, start: 20, after: 82, action: "녹는 중", type: "녹는점" },
  };
  let heatingProgress = 0;
  let heatingFrame = 0;
  let heatingRunning = false;
  let heatingLastTime = 0;
  function heatingTemperature(profile, progress, amount) {
    const plateauStart = .33 + ((amount - 50) / 100) * .13;
    const plateauEnd = plateauStart + .26;
    if (progress <= plateauStart) return profile.start + (profile.point - profile.start) * (progress / plateauStart);
    if (progress <= plateauEnd) return profile.point;
    return profile.point + (profile.after - profile.point) * ((progress - plateauEnd) / (1 - plateauEnd));
  }
  function drawHeatingChart() {
    const canvas = $("#heatingChart"); const context = canvas.getContext("2d");
    const profile = heatingProfiles[$("#substanceSelect").value]; const amount = Number($("#massSelect").value);
    const yMax = 130; const { margin, graphWidth, graphHeight } = drawAxes(context, canvas.width, canvas.height, 20, yMax, "가열 시간 (상대값)", "온도 (°C)");
    const drawCurve = (limit, color, width) => {
      context.beginPath(); context.strokeStyle = color; context.lineWidth = width;
      for (let index = 0; index <= 120 * limit; index += 1) {
        const progress = index / 120; const temp = heatingTemperature(profile, progress, amount);
        const x = margin.left + progress * graphWidth; const y = margin.top + graphHeight - (temp / yMax) * graphHeight;
        if (index === 0) context.moveTo(x,y); else context.lineTo(x,y);
      }
      context.stroke();
    };
    drawCurve(1, "#d8dedc", 5); drawCurve(heatingProgress, "#1f9d8a", 4);
    const currentTemperature = heatingTemperature(profile, heatingProgress, amount);
    const x = margin.left + heatingProgress * graphWidth; const y = margin.top + graphHeight - (currentTemperature / yMax) * graphHeight;
    context.fillStyle = "#f39a3f"; context.beginPath(); context.arc(x,y,6,0,Math.PI*2); context.fill();
    context.fillStyle = "#102a43"; context.font = "bold 12px system-ui"; context.textAlign = "left"; context.fillText(`${currentTemperature.toFixed(1)} °C`, Math.min(x + 10, canvas.width - 78), Math.max(y - 9, 16));
    $("#thermometerText").textContent = `${currentTemperature.toFixed(1)} °C`;
    $("#thermometerFill").style.height = `${clamp((currentTemperature / yMax) * 85, 8, 85)}%`;
    const plateauStart = .33 + ((amount - 50) / 100) * .13; const plateauEnd = plateauStart + .26;
    if (heatingProgress === 0) { $("#phaseState").textContent = "가열 전"; $("#heatingInsight").textContent = "물질을 고르고 가열을 시작해 보세요."; }
    else if (heatingProgress < plateauStart) { $("#phaseState").textContent = "온도 상승"; $("#heatingInsight").textContent = `${profile.name}의 입자 운동이 빨라지며 ${profile.type}에 가까워지고 있습니다.`; }
    else if (heatingProgress <= plateauEnd) { $("#phaseState").textContent = profile.action; $("#heatingInsight").textContent = `${profile.type} ${profile.point} °C에서 온도가 일정합니다. 공급한 에너지는 상태 변화에 쓰입니다.`; }
    else { $("#phaseState").textContent = "상태 변화 완료"; $("#heatingInsight").textContent = `상태 변화가 끝난 뒤 온도가 다시 올라갑니다.`; }
  }
  function heatingTick(timestamp) {
    if (!heatingRunning) return;
    if (!heatingLastTime) heatingLastTime = timestamp;
    const elapsed = timestamp - heatingLastTime; heatingLastTime = timestamp;
    const amount = Number($("#massSelect").value);
    heatingProgress = clamp(heatingProgress + elapsed / (6200 * (amount / 100)), 0, 1);
    drawHeatingChart();
    if (heatingProgress < 1) heatingFrame = requestAnimationFrame(heatingTick);
    else { heatingRunning = false; $("#heatStart").textContent = "다시 가열"; }
  }
  $("#heatStart").addEventListener("click", () => {
    cancelAnimationFrame(heatingFrame);
    if (heatingProgress >= 1) heatingProgress = 0;
    heatingRunning = !heatingRunning;
    heatingLastTime = 0;
    $("#heatStart").textContent = heatingRunning ? "일시 정지" : "계속 가열";
    if (heatingRunning) heatingFrame = requestAnimationFrame(heatingTick);
  });
  $("#heatingReset").addEventListener("click", () => { cancelAnimationFrame(heatingFrame); heatingRunning = false; heatingProgress = 0; heatingLastTime = 0; $("#heatStart").textContent = "가열 시작"; drawHeatingChart(); });
  [$("#substanceSelect"), $("#massSelect")].forEach((control) => control.addEventListener("change", () => { heatingProgress = 0; heatingRunning = false; cancelAnimationFrame(heatingFrame); $("#heatStart").textContent = "가열 시작"; drawHeatingChart(); }));
  drawHeatingChart();

  // Pure substance vs mixture
  function drawPurityChart() {
    const canvas = $("#purityChart"); const context = canvas.getContext("2d");
    const { margin, graphWidth, graphHeight } = drawAxes(context, canvas.width, canvas.height, 10, 110, "냉각 시간", "온도 (°C)");
    const toPoint = (time, temp) => [margin.left + (time / 10) * graphWidth, margin.top + graphHeight - (temp / 110) * graphHeight];
    const curves = [
      { color: "#1f9d8a", dash: [], points: [[0,105],[3,62],[6,62],[10,15]] },
      { color: "#f39a3f", dash: [8,5], points: [[0,105],[3,70],[6,43],[10,14]] },
    ];
    curves.forEach((curve) => {
      context.beginPath(); context.strokeStyle = curve.color; context.lineWidth = 4; context.setLineDash(curve.dash);
      curve.points.forEach(([time,temp], index) => { const [x,y] = toPoint(time,temp); if (index === 0) context.moveTo(x,y); else context.lineTo(x,y); });
      context.stroke(); context.setLineDash([]);
    });
    context.fillStyle = "#102a43"; context.font = "bold 12px system-ui"; context.fillText("순물질: 어는점 일정", margin.left + graphWidth * .46, margin.top + graphHeight * .42);
    context.fillText("혼합물: 어는 동안 변화", margin.left + graphWidth * .53, margin.top + graphHeight * .64);
  }
  drawPurityChart();

  const materialBank = $("#materialBank");
  const pureZone = $("#pureZone");
  const mixtureZone = $("#mixtureZone");
  let selectedMaterial = null;
  function selectMaterial(button) {
    $$(".material-bank button, .drop-zone button").forEach((item) => item.classList.remove("selected"));
    selectedMaterial = button;
    button.classList.add("selected");
    $("#sortFeedback").textContent = `‘${button.textContent}’을 놓을 영역을 선택하세요.`;
  }
  materialBank.addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) selectMaterial(button); });
  [pureZone, mixtureZone].forEach((zone) => {
    zone.tabIndex = 0; zone.setAttribute("role", "button"); zone.setAttribute("aria-label", zone === pureZone ? "선택한 카드를 순물질로 분류" : "선택한 카드를 혼합물로 분류");
    const place = () => {
      if (!selectedMaterial) { $("#sortFeedback").textContent = "먼저 물질 카드를 선택하세요."; return; }
      zone.appendChild(selectedMaterial); selectedMaterial.classList.remove("selected"); selectedMaterial = null; $("#sortFeedback").textContent = "다른 카드도 분류해 보세요.";
    };
    zone.addEventListener("click", place); zone.addEventListener("keydown", (event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); place(); } });
  });
  pureZone.addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) { event.stopPropagation(); selectMaterial(button); } });
  mixtureZone.addEventListener("click", (event) => { const button = event.target.closest("button"); if (button) { event.stopPropagation(); selectMaterial(button); } });
  $("#sortCheck").addEventListener("click", () => {
    const all = $$("#pureZone button, #mixtureZone button");
    if (all.length < 6) { $("#sortFeedback").textContent = "6개 카드를 모두 분류하세요."; return; }
    const correct = $$("#pureZone button").every((button) => button.dataset.kind === "pure") && $$("#mixtureZone button").every((button) => button.dataset.kind === "mixture");
    $("#sortFeedback").textContent = correct ? "정확합니다! 물질의 구성과 특성을 근거로 분류했습니다." : "아직 섞인 카드가 있습니다. 공기와 우유의 성분을 떠올려 보세요.";
  });
  $("#sortReset").addEventListener("click", () => { $$("#pureZone button, #mixtureZone button").forEach((button) => materialBank.appendChild(button)); selectedMaterial = null; $("#sortFeedback").textContent = ""; });

  // Separatory funnel
  let separatorOpen = false;
  let separatorTimer = 0;
  let waterPercent = 55;
  let oilPercent = 45;
  let collectedPercent = 0;
  function renderSeparator() {
    $("#waterLayer").style.height = `${waterPercent}%`;
    $("#oilLayer").style.top = "auto"; $("#oilLayer").style.bottom = `${waterPercent}%`; $("#oilLayer").style.height = `${oilPercent}%`;
    $("#collectedWater").style.height = `${Math.min(88, collectedPercent)}%`;
    $("#separatorStream").style.height = separatorOpen ? "75px" : "0";
    $("#stopcockButton").setAttribute("aria-pressed", String(separatorOpen));
    $("#separatorAction").textContent = separatorOpen ? "꼭지 잠그기" : "꼭지 열기";
  }
  function stopSeparator() {
    separatorOpen = false; clearInterval(separatorTimer); renderSeparator();
    if (waterPercent <= 1 && oilPercent >= 42) { $("#separatorStatus").textContent = "분리 성공!"; $("#separatorHint").textContent = "경계면에서 꼭지를 잠가 아래층 물만 받았습니다."; announce("분별 깔때기 분리에 성공했습니다."); }
    else if (oilPercent < 45) { $("#separatorStatus").textContent = "기름이 섞였습니다."; $("#separatorHint").textContent = "경계면을 지난 뒤에도 꼭지를 열어 두었습니다. 다시 시도해 보세요."; }
    else { $("#separatorStatus").textContent = "아직 물이 남았습니다."; $("#separatorHint").textContent = "아래층 물을 더 받은 뒤 경계면에서 꼭지를 잠그세요."; }
  }
  function toggleSeparator() {
    if (separatorOpen) { stopSeparator(); return; }
    if (waterPercent <= 0 && oilPercent <= 0) return;
    separatorOpen = true; $("#separatorStatus").textContent = "아래층 액체가 흐릅니다."; $("#separatorHint").textContent = "경계면이 꼭지에 닿으면 잠그세요."; renderSeparator();
    separatorTimer = window.setInterval(() => {
      if (waterPercent > 0) {
        const step = Math.min(2.2, waterPercent); waterPercent -= step; collectedPercent += step * .85;
        if (waterPercent <= 7) { $("#separatorStatus").textContent = "곧 경계면입니다!"; }
      } else if (oilPercent > 0) {
        oilPercent = Math.max(0, oilPercent - 1.5); collectedPercent += 1.2; $("#separatorStatus").textContent = "경고: 기름이 흐릅니다!"; $("#separatorHint").textContent = "지금 꼭지를 잠그세요.";
      } else stopSeparator();
      renderSeparator();
    }, 110);
  }
  [$("#separatorAction"), $("#stopcockButton")].forEach((button) => button.addEventListener("click", toggleSeparator));
  $("#separatorReset").addEventListener("click", () => { clearInterval(separatorTimer); separatorOpen = false; waterPercent = 55; oilPercent = 45; collectedPercent = 0; $("#separatorStatus").textContent = "두 층이 나뉘었습니다."; $("#separatorHint").textContent = "어떤 액체가 아래층인지 밀도로 판단한 뒤 꼭지를 여세요."; renderSeparator(); });
  renderSeparator();

  // Crystallization lab
  const coolingRange = $("#coolingRange");
  function boricSolubility(temp) { return interpolate(solubilitySeries.boric.points, temp); }
  function updateCrystalLab() {
    const temperature = Number(coolingRange.value); const soluble = boricSolubility(temperature); const crystalMass = Math.max(0, 10 - soluble);
    $("#coolingOutput").textContent = `${temperature} °C`; $("#crystalMass").textContent = crystalMass.toFixed(1);
    $("#crystals").style.height = `${(crystalMass / 6.3) * 52}%`;
    $("#crystalSolution").style.background = `rgba(81,176,194,${.45 + (70 - temperature) / 300})`;
    if (crystalMass < .1) { $("#crystalState").textContent = "모두 녹아 있음"; $("#crystalInsight").textContent = "온도를 천천히 낮춰 결정이 생기는 지점을 찾아보세요."; }
    else { $("#crystalState").textContent = "붕산 석출"; $("#crystalInsight").textContent = `붕산 약 ${crystalMass.toFixed(1)} g이 결정으로 나옵니다. 황산 구리(Ⅱ) 10 g은 여전히 녹아 있습니다.`; }
  }
  coolingRange.addEventListener("input", updateCrystalLab);
  $("#crystalReset").addEventListener("click", () => { coolingRange.value = 70; updateCrystalLab(); });
  updateCrystalLab();

  // Distillation lab
  let distillRunning = false;
  let distillValue = 0;
  let distillFrame = 0;
  let distillLastTime = 0;
  function distillTemperature(progress) {
    if (progress < .35) return 20 + (78.2 - 20) * (progress / .35);
    if (progress < .64) return 78.2 + Math.sin(progress * 40) * .15;
    return 78.2 + (100 - 78.2) * ((progress - .64) / .36);
  }
  function renderDistillation() {
    const temperature = distillTemperature(distillValue);
    $("#distillTemp").textContent = `${temperature.toFixed(1)} °C`;
    $("#distillProgress").style.width = `${distillValue * 100}%`;
    const boiling = distillValue >= .35;
    $(".heater").classList.toggle("active", distillRunning);
    $("#distillBubbles").classList.toggle("active", boiling && distillRunning);
    $("#vaporFlow").style.width = boiling ? "100%" : "0";
    $("#dropFlow").style.height = boiling ? "82px" : "0";
    const collected = clamp((distillValue - .35) / .65, 0, 1);
    $("#distillate").style.height = `${collected * 76}%`;
    $("#mixtureLiquid").style.height = `${48 - collected * 25}%`;
    if (distillValue < .35) $("#distillProduct").textContent = "아직 없음";
    else if (distillValue < .68) $("#distillProduct").textContent = "에탄올이 많은 액체";
    else $("#distillProduct").textContent = "물이 많은 액체";
  }
  function distillTick(timestamp) {
    if (!distillRunning) return;
    if (!distillLastTime) distillLastTime = timestamp;
    distillValue = clamp(distillValue + (timestamp - distillLastTime) / 10000, 0, 1); distillLastTime = timestamp; renderDistillation();
    if (distillValue < 1) distillFrame = requestAnimationFrame(distillTick);
    else { distillRunning = false; $("#distillStart").textContent = "실험 완료"; renderDistillation(); announce("증류 가상실험이 완료되었습니다."); }
  }
  $("#distillStart").addEventListener("click", () => {
    if (distillValue >= 1) return;
    distillRunning = !distillRunning; distillLastTime = 0; $("#distillStart").textContent = distillRunning ? "가열 정지" : "계속 가열";
    if (distillRunning) distillFrame = requestAnimationFrame(distillTick); else cancelAnimationFrame(distillFrame);
    renderDistillation();
  });
  $("#distillReset").addEventListener("click", () => { cancelAnimationFrame(distillFrame); distillRunning = false; distillValue = 0; distillLastTime = 0; $("#distillStart").textContent = "가열 시작"; renderDistillation(); });
  renderDistillation();

  // Capstone separation mission
  const missionStages = [
    { method: "filter", label: "구슬 거르기", component: "plastic", score: 1, success: "플라스틱 구슬은 액체에 녹지 않고 크기가 커서 거름 장치로 먼저 분리할 수 있습니다.", hint: "남은 혼합물은 기름과 소금물입니다. 서로 섞이지 않는 두 액체의 특성을 보세요." },
    { method: "funnel", label: "기름 분리", component: "oil", score: 2, success: "기름은 물과 섞이지 않고 밀도가 작아 위층을 이루므로 분별 깔때기로 분리합니다.", hint: "이제 소금물만 남았습니다. 물과 소금의 끓는점 차를 이용하세요." },
    { method: "distill", label: "소금물 증류", component: "salt", score: 4, success: "물을 기화시켜 냉각하면 물을 모으고, 플라스크에는 소금이 남습니다. 네 성분을 모두 분리했습니다!", hint: "분리 설계 완료! 다른 순서가 가능한지도 토론해 보세요." },
  ];
  let missionIndex = 0;
  function renderMission() {
    const finished = missionIndex >= missionStages.length;
    $("#missionStep").textContent = finished ? "완료" : `${missionIndex + 1} / 3`;
    $("#missionScore").textContent = `${finished ? 4 : (missionIndex ? missionStages[missionIndex - 1].score : 0)} / 4`;
    $("#missionQuestion").textContent = finished ? "분리 설계가 완성되었습니다." : missionIndex === 0 ? "가장 먼저 분리할 물질과 방법을 선택하세요." : "남은 혼합물을 다음 방법으로 분리하세요.";
    $$("#methodGrid button").forEach((button) => { button.disabled = finished; });
    $$("#separationTimeline > div").forEach((item, index) => { item.classList.toggle("active", index === missionIndex && !finished); $("b", item).textContent = index < missionIndex ? missionStages[index].label : "?"; });
  }
  $("#methodGrid").addEventListener("click", (event) => {
    const button = event.target.closest("button"); if (!button || missionIndex >= missionStages.length) return;
    const stage = missionStages[missionIndex]; const feedback = $("#missionFeedback");
    if (button.dataset.method !== stage.method) {
      feedback.classList.remove("success"); feedback.innerHTML = `<span>다시 생각</span><p>${missionIndex === 0 ? "분별 깔때기는 액체를 분리하는 도구입니다. 먼저 크기가 큰 고체 구슬을 분리하세요." : missionIndex === 1 ? "기름과 물은 서로 섞이지 않고 밀도가 다릅니다." : "소금은 물에 녹아 있어 거름종이를 통과합니다. 물의 끓는점을 이용하세요."}</p>`;
      return;
    }
    const component = $(`[data-component="${stage.component}"]`, $("#mixtureVessel")); if (component) component.classList.add("removed");
    feedback.classList.add("success"); feedback.innerHTML = `<span>성공</span><p>${stage.success}</p>`;
    missionIndex += 1; renderMission(); announce(stage.success);
    if (missionIndex < missionStages.length) setTimeout(() => { feedback.classList.remove("success"); feedback.innerHTML = `<span>힌트</span><p>${stage.hint}</p>`; }, 1700);
  });
  $("#missionReset").addEventListener("click", () => {
    missionIndex = 0; $$("#mixtureVessel .removed").forEach((item) => item.classList.remove("removed"));
    $("#missionFeedback").classList.remove("success"); $("#missionFeedback").innerHTML = "<span>힌트</span><p>고체 구슬은 물과 기름에 녹지 않고 크기가 큽니다.</p>"; renderMission();
  });
  renderMission();

  // Quiz
  const quizData = [
    { question: "Q1. 같은 물질의 양을 두 배로 늘리면 밀도는 어떻게 될까?", options: ["두 배가 된다", "변하지 않는다", "절반이 된다"], answer: 1, explanation: "질량과 부피가 같은 비율로 늘어나므로 질량÷부피인 밀도는 일정합니다." },
    { question: "Q2. 일반적으로 물에 녹은 기체를 더 많이 유지하려면?", options: ["온도를 높인다", "압력을 낮춘다", "온도를 낮추고 압력을 높인다"], answer: 2, explanation: "기체의 용해도는 일반적으로 온도가 낮을수록, 압력이 높을수록 커집니다." },
    { question: "Q3. 물과 콩기름 혼합물의 아래층은 무엇일까?", options: ["콩기름", "물", "상황마다 다르다"], answer: 1, explanation: "물의 밀도 1.00 g/mL가 콩기름 0.92 g/mL보다 크므로 물이 아래층입니다." },
    { question: "Q4. 물과 에탄올 혼합물을 가열하면 처음에 주로 분리되는 것은?", options: ["에탄올", "물", "소금"], answer: 0, explanation: "에탄올의 끓는점 78.2 °C가 물의 100 °C보다 낮아 에탄올이 먼저 주로 기화합니다." },
  ];
  let quizIndex = 0;
  let quizAnswered = false;
  function renderQuiz() {
    const quiz = quizData[quizIndex]; quizAnswered = false;
    $("#quizQuestion").textContent = quiz.question; $("#quizExplanation").textContent = "답을 선택하면 핵심 근거가 나타납니다.";
    $("#quizOptions").innerHTML = quiz.options.map((option, index) => `<button type="button" data-index="${index}">${option}</button>`).join("");
    $("#quizNext").disabled = true; $("#quizNext").textContent = quizIndex === quizData.length - 1 ? "처음부터" : "다음 문제"; $("#quizCount").textContent = `${quizIndex + 1} / ${quizData.length}`;
  }
  $("#quizOptions").addEventListener("click", (event) => {
    const button = event.target.closest("button"); if (!button || quizAnswered) return;
    quizAnswered = true; const quiz = quizData[quizIndex]; const chosen = Number(button.dataset.index);
    $$("#quizOptions button").forEach((item, index) => { item.disabled = true; if (index === quiz.answer) item.classList.add("correct"); else if (index === chosen) item.classList.add("wrong"); });
    $("#quizExplanation").textContent = `${chosen === quiz.answer ? "정답!" : "다시 확인:"} ${quiz.explanation}`; $("#quizNext").disabled = false;
  });
  $("#quizNext").addEventListener("click", () => { quizIndex = quizIndex === quizData.length - 1 ? 0 : quizIndex + 1; renderQuiz(); });
  renderQuiz();

  window.addEventListener("resize", () => {
    if (currentSlide === 2) drawSolubilityChart();
    if (currentSlide === 3) drawHeatingChart();
    if (currentSlide === 4) drawPurityChart();
  });
})();
