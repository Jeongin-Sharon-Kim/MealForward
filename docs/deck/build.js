const pptxgen = require("pptxgenjs");
const { imageSize } = require("image-size");
const path = require("path");
const fs = require("fs");
function sizeOf(p) { return imageSize(fs.readFileSync(p)); }

const A = path.join(__dirname, "assets");

const C = {
  primary: "047857",
  primaryDark: "03543f",
  mint: "dcf5ea",
  mintDeep: "b7ead1",
  accent: "e11d48",
  accentBg: "fff1f3",
  text: "1a1815",
  muted: "57534e",
  white: "FFFFFF",
  bg: "FFFFFF",
  card: "FFFFFF",
  border: "E4E1D9",
  info: "1d4ed8",
  infoBg: "eff6ff",
};

function newDeck() {
  const p = new pptxgen();
  p.layout = "LAYOUT_WIDE"; // 13.3 x 7.5
  return p;
}

function baseSlide(p, opts = {}) {
  const s = p.addSlide();
  s.background = { color: opts.bg || C.bg };
  return s;
}

function pageNum(s, n) {
  s.addText(String(n).padStart(2, "0"), {
    x: 12.55, y: 7.1, w: 0.6, h: 0.35, fontSize: 10, color: C.muted,
    fontFace: "Apple SD Gothic Neo", align: "right", isTextBox: true, margin: 0,
  });
}

function kicker(s, text) {
  s.addText(text, {
    x: 0.6, y: 0.42, w: 9, h: 0.35, fontSize: 14.5, bold: true,
    color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
    charSpacing: 1,
  });
}

function title(s, text, opts = {}) {
  s.addText(text, {
    x: 0.6, y: 0.72, w: opts.w || 11.5, h: opts.h || 0.7, fontSize: opts.fontSize || 31,
    bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
}

function iconCircle(s, x, y, size, emoji, fill) {
  s.addShape("ellipse", { x, y, w: size, h: size, fill: { color: fill || C.mint }, line: { type: "none" } });
  s.addText(emoji, {
    x, y, w: size, h: size, fontSize: size * 34, align: "center", valign: "middle",
    isTextBox: true, margin: 0, fontFace: "Apple SD Gothic Neo",
  });
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape("roundRect", {
    x, y, w, h, rectRadius: 0.12,
    fill: { color: opts.fill || C.card },
    line: opts.line === false ? { type: "none" } : { color: C.border, width: 1 },
    shadow: opts.shadow === false ? undefined : {
      type: "outer", color: "1a1815", opacity: 0.08, blur: 8, offset: 2, angle: 90,
    },
  });
}

// Fit a real screenshot into a content box, preserving aspect ratio, centered.
function fitImage(s, file, box, opts = {}) {
  const dim = sizeOf(path.join(A, file));
  const ratio = dim.width / dim.height;
  let w = box.w, h = w / ratio;
  if (h > box.h) { h = box.h; w = h * ratio; }
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  s.addImage({ path: path.join(A, file), x, y, w, h });
  return { x, y, w, h };
}

function screenSlide(pptx, kickerText, titleText, file, caption) {
  const s = baseSlide(pptx);
  kicker(s, kickerText);
  title(s, titleText);
  fitImage(s, file, { x: 0.6, y: 1.55, w: 12.1, h: 5.15 });
  if (caption) {
    s.addText(caption, {
      x: 0.6, y: 6.8, w: 12.1, h: 0.35, fontSize: 11, italic: true, color: C.muted,
      fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
    });
  }
  pageNum(s, pptx.slides.length);
  return s;
}

const pptx = newDeck();

/* ========== 1. Title ========== */
{
  const s = pptx.addSlide();
  s.background = { color: C.primaryDark };
  s.addShape("ellipse", { x: 9.8, y: -1.8, w: 5.5, h: 5.5, fill: { color: C.primary, transparency: 55 }, line: { type: "none" } });
  s.addShape("ellipse", { x: -1.6, y: 5.2, w: 4, h: 4, fill: { color: C.primary, transparency: 55 }, line: { type: "none" } });

  s.addText("Mini-project ① · AI 웹 서비스 설계", {
    x: 0.9, y: 1.4, w: 8, h: 0.4, fontSize: 14.5, bold: true, color: C.mintDeep,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, charSpacing: 1,
  });
  s.addText("MealForward", {
    x: 0.85, y: 2.7, w: 10, h: 1.3, fontSize: 60, bold: true, color: C.white,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText("세무 리스크 없는 B2B 식대 이월 & 복지 정산 플랫폼", {
    x: 0.9, y: 3.9, w: 9.5, h: 0.55, fontSize: 20.5, color: C.mint,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText("“안 쓰고 소멸되는 식대, 세무 리스크 없이 차월 복지 자산으로.”", {
    x: 0.9, y: 4.5, w: 9, h: 0.4, fontSize: 15, italic: true, color: C.mintDeep,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });

  s.addText("김정인  ·  2026.09  ·  github.com/Jeongin-Sharon-Kim/MealForward", {
    x: 0.9, y: 6.7, w: 9, h: 0.4, fontSize: 13, color: C.mintDeep,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
}

/* ========== 2. Contents ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "CONTENTS");
  title(s, "발표 순서");

  const items = [
    ["01", "왜 필요한가", "복지제도 설문 통계 + 페인포인트"],
    ["02", "문제 정의 & 해결 방향", "Pain Points → Solution"],
    ["03", "액터 & 시스템 아키텍처", "임직원 / 관리자, 서버·DB·AI 구조"],
    ["04", "전체 UI 흐름도", "화면 간 이동 경로"],
    ["05", "화면 상세 (실제 데모)", "회원가입부터 구매·환불까지 9개 화면 (실제 캡처)"],
    ["06", "Guardrail AX 설계", "LLM Tool Calling 기반 세무 가드레일"],
    ["07", "데이터 모델 & API 명세", "실제 ERD, Swagger UI · 21개 엔드포인트"],
    ["08", "다음 단계", "MCC Fast-path, Multi-Agent 큐레이션"],
  ];
  const colW = 5.6, gapX = 0.35, startX = 0.6, startY = 1.7, rowH = 1.32;
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = startX + col * (colW + gapX);
    const y = startY + row * rowH;
    s.addText(it[0], {
      x, y, w: 0.9, h: 0.9, fontSize: 30, bold: true, color: C.mintDeep,
      fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
    });
    s.addText(it[1], {
      x: x + 0.9, y: y + 0.02, w: colW - 0.9, h: 0.4, fontSize: 16.5, bold: true, color: C.text,
      fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
    });
    s.addText(it[2], {
      x: x + 0.9, y: y + 0.44, w: colW - 0.9, h: 0.45, fontSize: 12.5, color: C.muted,
      fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
    });
  });
  pageNum(s, pptx.slides.length);
}

/* ========== 3. Hook stats (native charts) ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "01. 왜 필요한가");
  title(s, "복지 중에서도, '식사'가 유독 크다");

  // Chart A
  s.addText("직장인이 가장 바라는 기업의 복지제도", {
    x: 0.6, y: 1.55, w: 5.9, h: 0.35, fontSize: 14.5, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  const dataA = [{
    name: "응답률",
    labels: ["정기 보너스", "식사 제공", "연월차 지급", "인센티브제", "자기계발비"],
    values: [37.5, 26.9, 18.8, 18.3, 16.0],
  }];
  s.addChart(pptx.charts.BAR, dataA, {
    x: 0.6, y: 2.0, w: 5.9, h: 3.1,
    barDir: "bar",
    chartColors: [C.muted, C.accent, C.muted, C.muted, C.muted],
    showTitle: false, showLegend: false,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0\"%\"", dataLabelFontSize: 12.5, dataLabelColor: C.text, dataLabelFontFace: "Apple SD Gothic Neo",
    catAxisLabelFontSize: 12.5, catAxisLabelColor: C.text, catAxisLabelFontFace: "Apple SD Gothic Neo",
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    plotArea: { fill: { color: C.white } },
  });
  s.addText("식사 제공이 정기 보너스 다음으로 2위 — 재직자 1,484명 복수응답 · 출처: 잡코리아", {
    x: 0.6, y: 5.15, w: 5.9, h: 0.5, fontSize: 11, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.25,
  });

  // Chart B
  s.addText("\"이런 복지 있는 기업 가고 싶다!\" (취업준비생)", {
    x: 6.8, y: 1.55, w: 5.9, h: 0.35, fontSize: 14.5, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  const dataB = [{
    name: "응답률",
    labels: ["식대 제공/사내식당", "자기계발비 지원", "휴가·포상금 지원"],
    values: [34.4, 25.1, 18.4],
  }];
  s.addChart(pptx.charts.BAR, dataB, {
    x: 6.8, y: 2.0, w: 5.9, h: 2.4,
    barDir: "bar",
    chartColors: [C.accent, C.muted, C.muted],
    showTitle: false, showLegend: false,
    showValue: true, dataLabelPosition: "outEnd", dataLabelFormatCode: "0.0\"%\"", dataLabelFontSize: 12.5, dataLabelColor: C.text, dataLabelFontFace: "Apple SD Gothic Neo",
    catAxisLabelFontSize: 12.5, catAxisLabelColor: C.text, catAxisLabelFontFace: "Apple SD Gothic Neo",
    valAxisHidden: true, valGridLine: { style: "none" }, catGridLine: { style: "none" },
    plotArea: { fill: { color: C.white } },
  });
  card(s, 6.8, 4.55, 5.9, 1.1, { fill: C.accentBg, shadow: false, line: false });
  s.addText("식대 제공 — 취준생이 가장 원하는 복지 1위(34.4%)", {
    x: 7.05, y: 4.75, w: 5.4, h: 0.7, fontSize: 14.5, bold: true, color: C.accent, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, valign: "middle",
  });
  s.addText("취업준비생 610명 복수응답 · 출처: 잡코리아", {
    x: 6.8, y: 5.75, w: 5.9, h: 0.35, fontSize: 11, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  pageNum(s, pptx.slides.length);
}

/* ========== 4. Story / Pain ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "01. 왜 필요한가");
  title(s, "연봉·성과급만으로는 더는 어려운 Retention");

  card(s, 0.6, 1.65, 12.1, 1.35, { fill: C.mint, shadow: false, line: false });
  s.addText(
    "삼성전자 · SK하이닉스 — 연봉·복지 수렴, 성과급 변동성은 명확한 한계",
    { x: 0.9, y: 1.85, w: 11.5, h: 0.95, fontSize: 16, bold: true, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.3, valign: "middle" }
  );

  s.addText("남은 차별점: 매일 피부로 느끼는 일상 속 세심한 복지 경험", {
    x: 0.6, y: 3.25, w: 12.1, h: 0.55, fontSize: 17, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });

  card(s, 0.6, 4.1, 12.1, 2.55, { shadow: false });
  s.addText("“재택근무하느라 이번 달 안 쓴 식대, 그대로 소멸”", {
    x: 0.9, y: 4.35, w: 11.5, h: 0.6, fontSize: 17, bold: true, color: C.accent, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText(
    "이런 소소한 손실감을 챙기는 세심함이 곧 채용 브랜딩\nMealForward — 세무 리스크 없는 미사용 식대의 차월 복지 자산 전환\n상품권 현금화 등 오남용은 API·DB 단에서 엄격 차단하는 가드레일 내장",
    { x: 0.9, y: 5.05, w: 11.5, h: 1.5, fontSize: 14.5, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.5 }
  );
  pageNum(s, pptx.slides.length);
}

/* ========== 5. Problem: C방식 & 세무리스크 ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "02. 문제 정의");
  title(s, "C방식의 함정: 못 쓴 포인트는 그냥 소멸");

  const steps = [
    ["A", "현금 지급", "정산은 편하나 과세 대상, 목적 외 사용 통제 불가"],
    ["B", "법인카드/영수증", "극심한 정산 피로도, 증빙 관리 부담"],
    ["C", "모바일 식권 포인트", "정산 자동화, 단 미사용분 매월 말 100% 소멸\n예: 식권대장·벤디스·식신e식권 등 도입 확대"],
  ];
  steps.forEach((st, i) => {
    const x = 0.6 + i * 4.1;
    card(s, x, 1.65, 3.85, 2.35, { shadow: false, fill: i === 2 ? C.accentBg : C.card });
    s.addText(st[0], { x: x + 0.2, y: 1.8, w: 1, h: 0.5, fontSize: 24, bold: true, color: i === 2 ? C.accent : C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    s.addText(st[1], { x: x + 0.2, y: 2.32, w: 3.4, h: 0.4, fontSize: 15.5, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    s.addText(st[2], { x: x + 0.2, y: 2.8, w: 3.4, h: 1.1, fontSize: 12.5, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.35 });
  });

  card(s, 0.6, 4.25, 12.1, 1.35, { shadow: false, fill: C.mint, line: false });
  s.addText("조건 없이 현금·일반 포인트로 전환 시:", {
    x: 0.9, y: 4.43, w: 11.5, h: 0.4, fontSize: 15.5, bold: true, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText("국세청 비과세(월 20만원) 기준 위반 + 상품권 재테크식 부정 유용 → 세무 가산세 리스크", {
    x: 0.9, y: 4.9, w: 11.5, h: 0.6, fontSize: 14, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });

  s.addText("MealForward의 답: C방식 정산 자동화 유지 + 소멸 포인트만 세무 리스크 없이 이월", {
    x: 0.6, y: 5.9, w: 12.1, h: 0.9, fontSize: 17, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.3,
  });
  pageNum(s, pptx.slides.length);
}

/* ========== 6. Pain Points -> Solution ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "02. 문제 정의 → 해결");
  title(s, "Pain Points → Solution");

  const rows = [
    ["임직원", "재택·외근으로 남는 식대가 매월 말 그냥 사라짐", "1-Click 이월 신청 → 차월 복지 포인트로 자동 전환"],
    ["임직원", "이월 포인트로 상품권을 사면 세무상 문제가 되는지 알 수 없음", "Guardrail AX가 결제 시점에 실시간으로 자동 차단·안내"],
    ["HR/총무", "미사용 식대를 조건 없이 풀어주면 현금 유용 리스크 발생", "이월 포인트 결제만 선별 검증(일반 포인트는 자유 결제)"],
    ["HR/총무", "복지 상품·차단 정책 관리가 파편화되어 있음", "관리자 화면에서 상품 CRUD + 정책 + 정산 통합 관리"],
  ];
  const startY = 1.65, rowH = 1.22;
  rows.forEach((r, i) => {
    const y = startY + i * rowH;
    card(s, 0.6, y, 12.1, rowH - 0.18, { shadow: false });
    s.addShape("roundRect", { x: 0.6, y, w: 1.55, h: rowH - 0.18, rectRadius: 0.12, fill: { color: C.primary }, line: { type: "none" } });
    s.addText(r[0], { x: 0.6, y, w: 1.55, h: rowH - 0.18, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", isTextBox: true, margin: 0, fontFace: "Apple SD Gothic Neo" });
    s.addText(r[1], { x: 2.35, y: y + 0.1, w: 4.9, h: rowH - 0.4, fontSize: 13, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.25 });
    s.addText("→", { x: 7.35, y, w: 0.5, h: rowH - 0.18, fontSize: 18, color: C.accent, align: "center", valign: "middle", isTextBox: true, margin: 0, fontFace: "Apple SD Gothic Neo" });
    s.addText(r[2], { x: 7.95, y: y + 0.1, w: 4.6, h: rowH - 0.4, fontSize: 13, bold: true, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.25 });
  });
  pageNum(s, pptx.slides.length);
}

/* ========== 7. Actors & System Architecture ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "03. 시스템 액터 & 아키텍처");
  title(s, "누가 쓰고, 어떤 구조로 동작하는가");

  const actors = [
    ["🧑‍💻", "임직원 (User)", "식대 잔액 조회 · 이월 신청\n포인트 상점 · 구매 내역"],
    ["🛡️", "HR/총무 관리자 (Admin)", "전사 이월 정산 · 가드레일 정책\n복지 상품 관리"],
  ];
  actors.forEach((a, i) => {
    const y = 1.65 + i * 1.75;
    card(s, 0.6, y, 5.5, 1.55, {});
    iconCircle(s, 0.85, y + 0.28, 1.0, a[0], C.mint);
    s.addText(a[1], { x: 2.0, y: y + 0.2, w: 3.9, h: 0.4, fontSize: 14.5, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    s.addText(a[2], { x: 2.0, y: y + 0.62, w: 3.9, h: 0.8, fontSize: 12, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.3 });
  });

  s.addText("회원가입 정책", { x: 0.6, y: 5.35, w: 5.5, h: 0.35, fontSize: 13.5, bold: true, color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
  s.addText(
    "관리자는 사전 발급 인증 키 필요(불일치 시 403 거부)\n관리자 가입 시 같은 계정으로 임직원 화면도 이용 가능(역방향 불가)",
    { x: 0.6, y: 5.75, w: 5.5, h: 1.1, fontSize: 12.5, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.35 }
  );

  // ---- 시스템 아키텍처 다이어그램 ----
  card(s, 6.5, 1.65, 6.2, 5.15, {});
  s.addText("시스템 아키텍처", { x: 6.8, y: 1.85, w: 5.6, h: 0.4, fontSize: 15, bold: true, color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });

  function abox(x, y, w, h, label, sub, fill) {
    s.addShape("roundRect", { x, y, w, h, rectRadius: 0.07, fill: { color: fill || C.white }, line: fill ? { type: "none" } : { color: C.border, width: 1.2 } });
    s.addText(label, { x: x + 0.1, y: y + 0.05, w: w - 0.2, h: 0.3, fontSize: 11.5, bold: true, color: fill ? C.white : C.text, align: "center", fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    if (sub) s.addText(sub, { x: x + 0.1, y: y + h - 0.3, w: w - 0.2, h: 0.26, fontSize: 8.5, color: fill ? C.mintDeep : C.muted, align: "center", fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
  }
  function avline(x, y, h) {
    s.addShape("line", { x, y, w: 0, h, line: { color: C.muted, width: 1.5, endArrowType: "triangle" } });
  }

  abox(7.1, 2.4, 5.0, 0.62, "Client — Vanilla JS", "브라우저에서 fetch로 REST 호출", C.primaryDark);
  avline(9.6, 3.02, 0.22);
  abox(7.1, 3.24, 5.0, 0.62, "Express Routes", "인증·검증 미들웨어 + REST 엔드포인트");
  avline(9.6, 3.86, 0.22);

  abox(7.1, 4.08, 2.35, 0.85, "OpenAI gpt-4o-mini", "Guardrail AX\nTool Calling", C.primary);
  s.addText("실패 시", { x: 9.35, y: 4.2, w: 0.7, h: 0.3, fontSize: 8, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, align: "center" });
  abox(9.75, 4.08, 2.35, 0.85, "룰 기반 폴백", "키워드 매칭\n(AI 응답 실패 시)", C.accent);
  avline(9.6, 4.93, 0.22);

  abox(7.1, 5.15, 5.0, 0.62, "db.js — PostgreSQL", "진실 공급원(source of truth) + seed.json 미러");
  avline(9.6, 5.77, 0.22);

  abox(7.1, 5.99, 5.0, 0.55, "Swagger UI (/api-docs)", "OpenAPI 3.0 명세 실시간 문서화");
  pageNum(s, pptx.slides.length);
}

/* ========== 8. 전체 UI 흐름도 ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "04. 전체 UI 흐름도");
  title(s, "화면은 어떻게 이어지는가");

  function box(x, y, w, h, label, sub, filled) {
    s.addShape("roundRect", {
      x, y, w, h, rectRadius: 0.08,
      fill: { color: filled ? C.primary : C.white },
      line: { color: filled ? C.primary : C.border, width: 1.5 },
    });
    s.addText(label, { x: x + 0.08, y: y + 0.06, w: w - 0.16, h: 0.3, fontSize: 12, bold: true, color: filled ? C.white : C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, align: "center" });
    if (sub) s.addText(sub, { x: x + 0.08, y: y + h - 0.32, w: w - 0.16, h: 0.28, fontSize: 9.5, color: filled ? C.mintDeep : C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, align: "center" });
  }
  function arrow(x1, y1, x2, y2) {
    s.addShape("line", { x: x1, y: y1, w: x2 - x1, h: y2 - y1, line: { color: C.muted, width: 1.5, endArrowType: "triangle" } });
  }

  s.addText("임직원", { x: 0.6, y: 1.55, w: 2, h: 0.3, fontSize: 12, bold: true, color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
  box(0.6, 1.95, 1.9, 0.85, "로그인/가입", "/login");
  box(2.9, 1.95, 2.1, 0.85, "대시보드", "총 포인트 · 이월신청");
  box(5.4, 1.95, 2.1, 0.85, "포인트 상점", "/store.html");
  box(7.9, 1.95, 2.3, 0.85, "결제 팝업", "Guardrail AX 검증", true);
  box(10.6, 1.95, 2.1, 0.85, "구매 내역", "사용·환불");

  arrow(2.5, 2.37, 2.9, 2.37);
  arrow(5.0, 2.37, 5.4, 2.37);
  arrow(7.5, 2.37, 7.9, 2.37);
  arrow(10.2, 2.37, 10.6, 2.37);

  s.addText("승인(APPROVED) → 상점 복귀 / 차단(BLOCKED) → 사유·risk score 안내, 화면 유지", {
    x: 7.9, y: 2.85, w: 4.8, h: 0.35, fontSize: 10, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });

  s.addText("관리자", { x: 0.6, y: 3.55, w: 2, h: 0.3, fontSize: 12, bold: true, color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
  box(0.6, 3.95, 1.9, 0.85, "로그인/가입", "/login");
  box(2.9, 3.95, 2.5, 0.85, "관리자 대시보드", "KPI · 정산 목록");
  box(5.8, 3.95, 2.3, 0.85, "복지 상품 관리", "등록·수정·삭제");
  box(8.5, 3.95, 2.3, 0.85, "가드레일 정책", "risk threshold");
  box(11.2, 3.95, 1.5, 0.85, "정산 승인", "9월 말", true);

  arrow(2.5, 4.37, 2.9, 4.37);
  arrow(5.4, 4.37, 5.8, 4.37);
  arrow(8.1, 4.37, 8.5, 4.37);
  arrow(10.8, 4.37, 11.2, 4.37);

  card(s, 0.6, 5.25, 12.1, 1.55, { shadow: false, fill: C.mint, line: false });
  s.addText("역할별 네비게이션 완전 분리", { x: 0.9, y: 5.42, w: 11.5, h: 0.35, fontSize: 14, bold: true, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
  s.addText(
    "임직원·관리자 화면 간 이동 없음(로그인 후 자동 분기)\n단, 관리자 가입 시 같은 계정으로 임직원 화면도 이용 가능 — 두 플로우 모두 진입 가능",
    { x: 0.9, y: 5.82, w: 11.5, h: 0.9, fontSize: 12.5, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.35 }
  );
  pageNum(s, pptx.slides.length);
}

/* ========== 9~16. 화면 상세 — 실제 캡처 + 네이티브(수정 가능) 주석 박스 ========== */
// 박스/화살표/텍스트를 이미지 위에 "합성"하지 않고 파워포인트 도형으로 따로 올려서
// 나중에 각각 클릭해서 위치·문구를 자유롭게 고칠 수 있게 함.
const CALLOUT_COLOR = {
  red: [C.accent, "FFF1F3"],
  green: [C.primary, C.mint],
  blue: [C.info, C.infoBg],
};

function placeShot(s, file, box) {
  const dim = sizeOf(path.join(A, file));
  const ratio = dim.width / dim.height;
  let w = box.w, h = w / ratio;
  if (h > box.h) { h = box.h; w = h * ratio; }
  const x = box.x + (box.w - w) / 2;
  const y = box.y + (box.h - h) / 2;
  s.addShape("rect", { x: x - 0.03, y: y - 0.03, w: w + 0.06, h: h + 0.06, fill: { color: "FFFFFF" }, line: { color: C.border, width: 1 } });
  s.addImage({ path: path.join(A, file), x, y, w, h });
  return { x, y, w, h, nativeW: dim.width, nativeH: dim.height };
}

function shotPoint(shot, px, py) {
  return { x: shot.x + (px / shot.nativeW) * shot.w, y: shot.y + (py / shot.nativeH) * shot.h };
}

function calloutBox(s, box, colorName, header, body) {
  const [fg, bg] = CALLOUT_COLOR[colorName];
  s.addShape("roundRect", { x: box.x, y: box.y, w: box.w, h: box.h, rectRadius: 0.07, fill: { color: bg }, line: { color: fg, width: 1.25 } });
  s.addText(header, {
    x: box.x + 0.13, y: box.y + 0.08, w: box.w - 0.26, h: 0.32, fontSize: 13, bold: true, color: fg,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText(body, {
    x: box.x + 0.13, y: box.y + 0.42, w: box.w - 0.26, h: box.h - 0.5, fontSize: 11, color: C.text,
    fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.2,
  });
  return { x: box.x, y: box.y + box.h / 2 };
}

function calloutArrow(s, from, to, colorName) {
  const [fg] = CALLOUT_COLOR[colorName];
  s.addShape("line", {
    x: Math.min(from.x, to.x), y: Math.min(from.y, to.y),
    w: Math.abs(to.x - from.x), h: Math.abs(to.y - from.y),
    flipH: to.x < from.x, flipV: to.y < from.y,
    line: { color: fg, width: 1.5, endArrowType: "triangle" },
  });
}

// ---- 01. 회원가입 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 01");
  title(s, "회원가입 (/signup.html)");
  const shot = placeShot(s, "signup2.png", { x: 0.6, y: 1.55, w: 7.5, h: 5.3 });
  const b1 = calloutBox(s, { x: 8.35, y: 1.55, w: 4.35, h: 1.9 }, "blue", "관리자 인증 키 검증", "관리자 탭 가입 시 사전 발급된 인증 키 필수 입력. 키 불일치 시 403으로 가입 자체가 거부됨.");
  calloutArrow(s, b1, shotPoint(shot, 730, 590), "blue");
  const b2 = calloutBox(s, { x: 8.35, y: 3.75, w: 4.35, h: 1.7 }, "red", "POST /auth/signup/{role}", "임직원: /auth/signup/user\n관리자: /auth/signup/admin — role별로 라우트 자체가 분리됨");
  calloutArrow(s, b2, shotPoint(shot, 900, 90), "red");
  pageNum(s, pptx.slides.length);
}

// ---- 02. 로그인 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 02");
  title(s, "로그인 (/login.html)");
  const shot = placeShot(s, "login.png", { x: 0.6, y: 1.55, w: 5.4, h: 5.3 });
  const b1 = calloutBox(s, { x: 6.4, y: 1.55, w: 6.3, h: 1.55 }, "green", "로그인 성공 → 역할별 자동 이동", "role=user → /dashboard.html\nrole=admin → /admin.html");
  calloutArrow(s, b1, shotPoint(shot, 218, 15), "green");
  const b2 = calloutBox(s, { x: 6.4, y: 4.45, w: 6.3, h: 1.55 }, "red", "POST /auth/login", "{email, password, role} 전송 → 성공 시 세션 저장");
  calloutArrow(s, b2, shotPoint(shot, 188, 328), "red");
  pageNum(s, pptx.slides.length);
}

// ---- 03. 대시보드 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 03");
  title(s, "대시보드 — 총 포인트 & 이월 신청 (/dashboard.html)");
  const shot = placeShot(s, "dashboard.png", { x: 0.6, y: 1.55, w: 7.2, h: 5.3 });
  const b1 = calloutBox(s, { x: 8.05, y: 1.55, w: 4.65, h: 1.25 }, "red", "GET /user/points", "일반+이월 포인트 합계, 연간 소멸 예정일 반환");
  calloutArrow(s, b1, shotPoint(shot, 490, 150), "red");
  const b2 = calloutBox(s, { x: 8.05, y: 3.0, w: 4.65, h: 1.25 }, "red", "GET /user/meal-balance", "당월 잔액 · 이월여부 · 당월 소멸 예정일 반환");
  calloutArrow(s, b2, shotPoint(shot, 490, 340), "red");
  const b3 = calloutBox(s, { x: 8.05, y: 4.45, w: 4.65, h: 1.75 }, "green", "1-Click 이월 신청", "POST /user/rollover/apply → 위 두 값이 같은 화면에서 즉시 갱신(화면 전환 없음). 이미 이월했으면 버튼 비활성화.");
  calloutArrow(s, b3, shotPoint(shot, 700, 480), "green");

  const nav = placeShot(s, "navdrop.png", { x: 0.6, y: 6.55, w: 2.5, h: 0.75 });
  s.addText("이름 클릭 → 드롭다운으로 두 화면 진입", { x: 3.25, y: 6.7, w: 4.5, h: 0.5, fontSize: 10, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.2 });
  pageNum(s, pptx.slides.length);
}

// ---- 04. 포인트 상점 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 04");
  title(s, "포인트 상점 (/store.html)");
  const shot = placeShot(s, "store_grid.png", { x: 0.6, y: 1.55, w: 7.8, h: 5.3 });
  const b1 = calloutBox(s, { x: 8.55, y: 1.55, w: 4.15, h: 2.0 }, "green", "GET /store/products?category=", "isCashLike=true 상품에만 \"이월 포인트 결제 불가\" 배지 표시. 카테고리 탭 클릭 시 그리드만 새로고침(화면 전환 없음).");
  calloutArrow(s, b1, shotPoint(shot, 218, 385), "green");
  calloutArrow(s, b1, shotPoint(shot, 528, 385), "green");
  pageNum(s, pptx.slides.length);
}

// ---- 05. 결제 & 현금성 자산 제한 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 05");
  title(s, "결제 & Guardrail AX 실시간 차단");
  const shot1 = placeShot(s, "store_split.png", { x: 0.55, y: 1.55, w: 5.9, h: 2.9 });
  const shot2 = placeShot(s, "block_alert.png", { x: 6.85, y: 1.55, w: 5.9, h: 2.9 });
  const b1 = calloutBox(s, { x: 0.55, y: 4.65, w: 5.9, h: 2.1 }, "red", "POST /payments/checkout", "{userId, itemName, generalAmount, flexiAmount} 전송. flexiAmount>0일 때만 Guardrail AX 검증. 현금성 자산(isCashLike)은 \"나눠서 결제\" 탭 자체가 숨겨짐.");
  calloutArrow(s, { x: b1.x + 3, y: b1.y - 1.55 }, shotPoint(shot1, 245, 285), "red");
  const b2 = calloutBox(s, { x: 6.85, y: 4.65, w: 5.9, h: 2.1 }, "blue", "실제 차단 메시지 (risk score 노출)", "\"현금화 가능한 자산으로 분류되어 결제가 차단됩니다\" + risk score를 화면에 직접 노출 — 사유가 즉시 확인됨.");
  calloutArrow(s, { x: b2.x + 3, y: b2.y - 1.55 }, shotPoint(shot2, 200, 320), "blue");
  pageNum(s, pptx.slides.length);
}

// ---- 06. 관리자 대시보드 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 06");
  title(s, "관리자 대시보드 — KPI & 정산 목록 (/admin.html)");
  const shot = placeShot(s, "admin_kpi.png", { x: 0.6, y: 1.55, w: 7.8, h: 5.3 });
  const b1 = calloutBox(s, { x: 8.55, y: 1.55, w: 4.15, h: 1.7 }, "red", "GET /admin/settlements/summary", "(userId, itemName) 조합당 최초 차단 1건만 집계 — AI 차단 건수 중복 카운팅 방지");
  calloutArrow(s, b1, shotPoint(shot, 175, 137), "red");
  const b2 = calloutBox(s, { x: 8.55, y: 3.45, w: 4.15, h: 1.4 }, "red", "GET /admin/settlements/list", "부서별/직원별 이월 포인트 현황 테이블");
  calloutArrow(s, b2, shotPoint(shot, 480, 300), "red");
  pageNum(s, pptx.slides.length);
}

// ---- 07. 복지 상품 관리 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 07");
  title(s, "복지 상품 관리 (/admin.html)");
  const shot = placeShot(s, "admin_products.png", { x: 0.6, y: 1.55, w: 7.8, h: 5.3 });
  const b1 = calloutBox(s, { x: 8.55, y: 1.55, w: 4.15, h: 1.15 }, "red", "GET /admin/products", "복지 상품 전체 목록 조회");
  calloutArrow(s, b1, shotPoint(shot, 300, 103), "red");
  const b2 = calloutBox(s, { x: 8.55, y: 2.9, w: 4.15, h: 1.95 }, "green", "수정 / 삭제 버튼", "수정 → 프리필된 모달 오픈 → PUT /admin/products/{id}\n삭제 → 확인 후 즉시 DELETE /admin/products/{id}");
  calloutArrow(s, b2, shotPoint(shot, 771, 147), "green");
  pageNum(s, pptx.slides.length);
}

// ---- 07-1. 복지 상품 등록 폼 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 07-1");
  title(s, "복지 상품 등록 폼");
  const shot = placeShot(s, "admin_addform.png", { x: 0.6, y: 1.55, w: 12.1, h: 3.1 });
  const b1 = calloutBox(s, { x: 2.5, y: 5.0, w: 8.3, h: 1.85 }, "red", "POST /admin/products", "{name, category, price, isCashLike} 전송. 카테고리 \"직접 입력...\" 선택 시 같은 폼에서 텍스트 입력창 노출(화면 전환 없음).");
  calloutArrow(s, { x: b1.x + 4, y: b1.y - 0.85 }, shotPoint(shot, 133, 330), "red");
  pageNum(s, pptx.slides.length);
}

// ---- 08. 구매 내역 & 환불 ----
{
  const s = baseSlide(pptx);
  kicker(s, "05. 화면 상세 · 08");
  title(s, "구매 내역 & 환불 (/purchases.html)");
  const shot = placeShot(s, "purchases_refund.png", { x: 0.6, y: 1.55, w: 7.8, h: 5.3 });
  const b1 = calloutBox(s, { x: 8.55, y: 1.55, w: 4.15, h: 1.4 }, "green", "GET /user/purchases", "approval_status=APPROVED 건만 반환 (BLOCKED 시도는 목록에서 제외)");
  calloutArrow(s, b1, shotPoint(shot, 200, 160), "green");
  const b2 = calloutBox(s, { x: 8.55, y: 3.15, w: 4.15, h: 2.05 }, "blue", "환불 확인 모달", "\"환불을 원하십니까?\" + 결제에 사용한 포인트로만 환불되며 교차 환불 불가 안내 고정 노출");
  calloutArrow(s, b2, shotPoint(shot, 623, 396), "blue");
  pageNum(s, pptx.slides.length);
}

/* ========== 16. Guardrail AX ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "06. Guardrail AX");
  title(s, "LLM Tool Calling으로 현금성 자산만 걸러낸다");

  s.addText(
    "키워드 블랙리스트로는 신종 변종 상품권(핀번호 교환권, SSG머니 등) 차단 불가\nLLM에 4가지 세무 원칙을 부여, classify_purchase 함수 직접 호출 강제",
    { x: 0.6, y: 1.55, w: 6.3, h: 1.1, fontSize: 14, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.4 }
  );

  const principles = [
    "상품권·기프트카드·충전권 등 범용 구매력을 가진 것은 무조건 차단",
    "주유권 등 실물 재화 아닌 화폐성 가치도 즉시 환금 가능하면 차단",
    "도서·강의·식음료·운동 등 실질 소비재/서비스는 허용",
    "\"이용권\" 이름만으로 차단하지 않음 — 매장 전용 이용권 허용, 범용 현금가치 전환분만 차단",
  ];
  principles.forEach((t, i) => {
    const y = 2.95 + i * 0.68;
    s.addShape("ellipse", { x: 0.6, y, w: 0.36, h: 0.36, fill: { color: C.primary }, line: { type: "none" } });
    s.addText(String(i + 1), { x: 0.6, y, w: 0.36, h: 0.36, fontSize: 14, bold: true, color: C.white, align: "center", valign: "middle", isTextBox: true, margin: 0, fontFace: "Apple SD Gothic Neo" });
    s.addText(t, { x: 1.12, y: y - 0.05, w: 5.8, h: 0.65, fontSize: 12.5, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 });
  });

  card(s, 7.2, 1.55, 5.5, 5.15, {});
  s.addText("판정 흐름", { x: 7.5, y: 1.8, w: 4.8, h: 0.4, fontSize: 15.5, bold: true, color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });

  const flow = [
    ["결제 요청", "generalAmount + flexiAmount", false],
    ["flexiAmount > 0 ?", "일반 포인트 결제분은 검증 대상 아님", false],
    ["OpenAI gpt-4o-mini", "Tool Calling으로 classify_purchase 강제 호출", true],
    ["실패 시 룰 기반 폴백", "키워드 매칭 기반 자체 판정 로직으로 대체", false],
    ["isBlocked / riskScore / blockReason", "구조화된 JSON 스키마로 응답", "accent"],
  ];
  flow.forEach((f, i) => {
    const y = 2.4 + i * 0.86;
    const filled = f[2] === true ? C.primary : f[2] === "accent" ? C.accent : C.white;
    const fg = f[2] ? C.white : C.text;
    s.addShape("roundRect", { x: 7.5, y, w: 4.9, h: 0.7, rectRadius: 0.08, fill: { color: filled }, line: f[2] ? { type: "none" } : { color: C.border, width: 1 } });
    s.addText(f[0], { x: 7.65, y: y + 0.06, w: 4.6, h: 0.32, fontSize: 12.5, bold: true, color: fg, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    s.addText(f[1], { x: 7.65, y: y + 0.37, w: 4.6, h: 0.3, fontSize: 10, color: f[2] ? (f[2] === "accent" ? "ffe4ea" : C.mintDeep) : C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    if (i < flow.length - 1) {
      s.addShape("line", { x: 9.95, y: y + 0.7, w: 0, h: 0.16, line: { color: C.muted, width: 1.5, endArrowType: "triangle" } });
    }
  });
  pageNum(s, pptx.slides.length);
}

/* ========== 17. Data model (real ERD, annotated directly on the capture) ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "07. 데이터 모델");
  title(s, "9개 엔티티로 정리한 도메인 ERD");

  // 왼쪽: 핵심 설계 포인트 리스트 (참고자료 스타일)
  card(s, 0.6, 1.55, 2.95, 5.4, { fill: C.mint, shadow: false, line: false });
  s.addText("[핵심 설계 포인트]", { x: 0.85, y: 1.75, w: 2.45, h: 0.35, fontSize: 13, bold: true, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
  const kpoints = [
    "User/Admin 역할별 테이블 분리",
    "GENERAL/FLEXI_MEAL 이원 포인트 관리",
    "PaymentTransaction–GuardrailLog 1:1 감사 추적",
    "회사별 GuardrailPolicy로 유연한 정책 적용",
    "ENUM(point_type/status)으로 상태값 무결성 확보",
  ];
  kpoints.forEach((t, i) => {
    const y = 2.25 + i * 0.92;
    s.addText("—", { x: 0.85, y, w: 0.25, h: 0.8, fontSize: 11, bold: true, color: C.primary, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    s.addText(t, { x: 1.1, y, w: 2.25, h: 0.8, fontSize: 10.5, color: C.primaryDark, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.25 });
  });

  // 중앙: ERD 캡처 원본
  const shot = placeShot(s, "erd.png", { x: 3.7, y: 1.55, w: 7.3, h: 5.4 });

  // 캡처 위/옆에 직접 다는 짧은 주석 (박스+화살표, 개별 도형이라 위치·문구 수정 가능)
  function note(x, y, w, h, colorName, text) {
    const [fg, bg] = CALLOUT_COLOR[colorName];
    s.addShape("roundRect", { x, y, w, h, rectRadius: 0.05, fill: { color: bg }, line: { color: fg, width: 1.25 } });
    s.addText(text, { x: x + 0.12, y: y + 0.06, w: w - 0.24, h: h - 0.12, fontSize: 10, bold: true, color: fg, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, valign: "middle", lineSpacingMultiple: 1.15 });
    return { x, y, w, h };
  }

  const n1 = note(9.55, 1.85, 3.15, 0.95, "red", "GuardrailLog — flexi 결제 건만 AI 판정 로그 생성 (risk score 기록)");
  calloutArrow(s, { x: n1.x, y: n1.y + n1.h / 2 }, shotPoint(shot, 1230, 370), "red");

  const n2 = note(9.55, 3.0, 3.15, 0.95, "green", "User / Admin — 역할별 테이블 분리, company_id로 소속 회사 연결");
  calloutArrow(s, { x: n2.x, y: n2.y + n2.h / 2 }, shotPoint(shot, 495, 390), "green");

  const n3 = note(9.55, 4.15, 3.15, 0.95, "red", "PointLedger — GENERAL/FLEXI_MEAL 구분, 이월분만 상태 관리");
  calloutArrow(s, { x: n3.x, y: n3.y + n3.h / 2 }, shotPoint(shot, 860, 560), "red");

  const n4 = note(9.55, 5.3, 3.15, 0.95, "blue", "PaymentTransaction — 일반/이월 분할 결제 + voucher_code");
  calloutArrow(s, { x: n4.x, y: n4.y + n4.h / 2 }, shotPoint(shot, 860, 840), "blue");

  pageNum(s, pptx.slides.length);
}

/* ========== 18. API spec (real Swagger UI) ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "07. API 명세");
  title(s, "OpenAPI 3.0 · 실제 Swagger UI (/api-docs)");

  s.addText("spec/openapi.yaml 기반 — 태그별 그룹화, 메서드 컬러 배지로 21개 엔드포인트 한눈에 확인", {
    x: 0.6, y: 1.48, w: 12.1, h: 0.35, fontSize: 13, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });

  placeShot(s, "swagger1.png", { x: 0.6, y: 1.95, w: 5.95, h: 3.2 });
  placeShot(s, "swagger2.png", { x: 6.75, y: 1.95, w: 5.95, h: 3.2 });
  s.addText("Auth · User · Store", { x: 0.6, y: 5.15, w: 5.95, h: 0.3, fontSize: 10.5, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, align: "center" });
  s.addText("Payments · Admin", { x: 6.75, y: 5.15, w: 5.95, h: 0.3, fontSize: 10.5, italic: true, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, align: "center" });

  const shot = placeShot(s, "dup409.png", { x: 0.6, y: 5.6, w: 2.5, h: 1.35 });
  const b = calloutBox(s, { x: 3.35, y: 5.6, w: 9.35, h: 1.35 }, "red", "409 Conflict 응답 예시", "회원가입 시 이메일 중복 → EMAIL_ALREADY_EXISTS 에러 코드와 메시지를 스키마로 고정 — 모든 실패 케이스를 Swagger 스키마에서 확인 가능");
  calloutArrow(s, { x: b.x, y: b.y + 0.68 }, { x: shot.x + shot.w, y: shot.y + shot.h / 2 }, "red");
  pageNum(s, pptx.slides.length);
}

/* ========== 19. Future work ========== */
{
  const s = baseSlide(pptx);
  kicker(s, "08. 다음 단계");
  title(s, "수업 범위를 넘어선 확장 아이디어");

  const items = [
    ["⚡", "MCC Fast-path", "오프라인 카드 결제의 가맹점 업종 코드가 명백히 안전하면 LLM 호출 없이 즉시 승인, 애매할 때만 LLM Heavy-path로 분기해 비용·응답속도 최적화"],
    ["🤖", "Multi-Agent 복지 큐레이션", "이월 포인트 소멸 D-Day를 감지해 가드레일을 통과한 맞춤 복지 상품을 미리 추천하는 ReAct 기반 에이전트"],
    ["🔗", "Webhook 실시간 연동", "식권대장·벤디스 등 외부 모바일 식권 솔루션과 API Real-time Webhook으로 잔액 자동 동기화"],
    ["📊", "비과세 한도 리포팅", "연말정산 시 비과세 한도 소진율을 자동 측정하고 리포트로 확장"],
  ];
  items.forEach((it, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = 0.6 + col * 6.15, y = 1.7 + row * 2.5;
    card(s, x, y, 5.85, 2.25, {});
    iconCircle(s, x + 0.3, y + 0.28, 0.6, it[0], C.mint);
    s.addText(it[1], { x: x + 1.05, y: y + 0.3, w: 4.6, h: 0.4, fontSize: 15, bold: true, color: C.text, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0 });
    s.addText(it[2], { x: x + 0.3, y: y + 1.05, w: 5.3, h: 1.1, fontSize: 11.5, color: C.muted, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0, lineSpacingMultiple: 1.3 });
  });
  pageNum(s, pptx.slides.length);
}

/* ========== 20. Closing ========== */
{
  const s = pptx.addSlide();
  s.background = { color: C.primaryDark };
  s.addShape("ellipse", { x: -1.8, y: -1.8, w: 5, h: 5, fill: { color: C.primary, transparency: 55 }, line: { type: "none" } });
  s.addText("감사합니다", {
    x: 0.9, y: 2.9, w: 8, h: 1.1, fontSize: 48, bold: true, color: C.white, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText("MealForward — 세무 리스크 없는 B2B 식대 이월 & 복지 정산 플랫폼", {
    x: 0.95, y: 3.95, w: 9, h: 0.5, fontSize: 16, color: C.mint, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
  s.addText("github.com/Jeongin-Sharon-Kim/MealForward", {
    x: 0.95, y: 4.5, w: 9, h: 0.4, fontSize: 14, color: C.mintDeep, fontFace: "Apple SD Gothic Neo", isTextBox: true, margin: 0,
  });
}

pptx.writeFile({ fileName: "MealForward_발표자료.pptx" }).then(() => {
  console.log("done, slides:", pptx.slides.length);
});
