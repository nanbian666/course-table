/* =========================================================
   课程表 · 渲染逻辑
   纯原生 JavaScript，不依赖任何框架，双击 index.html 就能跑。
   改数据看 data/courses.js，改学期设置看 data/meta.js。
   ========================================================= */
(function () {
  "use strict";

  var META = window.COURSE_META || {};
  var COURSES = Array.isArray(window.COURSE_LIST) ? window.COURSE_LIST : [];
  var SECTIONS = Array.isArray(META.sections) ? META.sections : [];

  var DAY_NAMES = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];

  /* 8 种颜色，按课程名自动分配，同一门课永远同色 */
  var COLORS = [
    "#4C7DF0", "#2FA36B", "#C98A0E", "#7B61D9",
    "#2B9FC4", "#D2722B", "#1E8A85", "#C9598C"
  ];

  var state = { week: 1 };

  /* ---------------- 小工具 ---------------- */

  function $(id) { return document.getElementById(id); }

  function esc(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function clamp(n, min, max) { return Math.min(Math.max(n, min), max); }

  function totalWeeks() { return Math.max(1, Number(META.totalWeeks) || 18); }

  function semesterStart() {
    var d = new Date(String(META.semesterStart || "") + "T00:00:00");
    return isNaN(d.getTime()) ? null : d;
  }

  function startOfToday() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function weekOfToday() {
    var start = semesterStart();
    if (!start) return 1;
    var days = Math.floor((startOfToday() - start) / 86400000);
    return clamp(Math.floor(days / 7) + 1, 1, totalWeeks());
  }

  /* 0=周日 … 6=周六  →  1=周一 … 7=周日 */
  function todayIndex() {
    var d = startOfToday().getDay();
    return d === 0 ? 7 : d;
  }

  function colorOf(name) {
    var text = String(name || "");
    var hash = 0;
    for (var i = 0; i < text.length; i++) {
      hash = (hash * 31 + text.charCodeAt(i)) >>> 0;
    }
    return COLORS[hash % COLORS.length];
  }

  function parityText(parity) {
    if (parity === "odd") return "单周";
    if (parity === "even") return "双周";
    return "";
  }

  /* 把 weeks 统一成 [[起, 止], [起, 止], ...]
     支持三种写法：
       [1, 16]                     一段
       [2, 3, 5, 9, 11, 17]        多段（两两成对）
       [[2, 3], [5, 9], [11, 17]]  多段（最清楚）
  */
  function rangesOf(course) {
    var weeks = course.weeks;
    var fallback = [[1, totalWeeks()]];

    if (!Array.isArray(weeks) || weeks.length === 0) return fallback;

    if (Array.isArray(weeks[0])) {
      var nested = weeks
        .filter(function (r) { return Array.isArray(r) && r.length >= 1; })
        .map(function (r) {
          var a = Number(r[0]);
          var b = r.length >= 2 ? Number(r[1]) : a;
          return [a, b];
        });
      return nested.length ? nested : fallback;
    }

    var flat = weeks.map(Number);
    var pairs = [];
    for (var i = 0; i + 1 < flat.length; i += 2) {
      pairs.push([flat[i], flat[i + 1]]);
    }
    return pairs.length ? pairs : fallback;
  }

  function weeksText(course) {
    var parts = rangesOf(course).map(function (r) {
      return r[0] === r[1] ? String(r[0]) : r[0] + "–" + r[1];
    });
    var label = "第" + parts.join("、") + "周";
    var p = parityText(course.parity);
    return p ? label + " · " + p : label;
  }

  /* 这门课在第 week 周上不上 */
  function activeIn(course, week) {
    if (course.parity === "odd" && week % 2 === 0) return false;
    if (course.parity === "even" && week % 2 === 1) return false;
    return rangesOf(course).some(function (r) {
      return week >= r[0] && week <= r[1];
    });
  }

  function coursesOf(week) {
    if (specialWeekOf(week)) return [];
    return COURSES.filter(function (c) { return activeIn(c, week); });
  }

  /* 整周活动：在 data/courses.js 里配 window.SPECIAL_WEEKS */
  function specialWeekOf(week) {
    var map = window.SPECIAL_WEEKS || {};
    var label = map[String(week)];
    return typeof label === "string" ? label : "";
  }

  /* 整周活动的横幅 */
  function buildBanner(label, sectionCount) {
    var box = document.createElement("div");
    box.style.gridColumn = "2 / span 7";
    box.style.gridRow = "2 / span " + sectionCount;
    box.style.display = "flex";
    box.style.flexDirection = "column";
    box.style.alignItems = "center";
    box.style.justifyContent = "center";
    box.style.gap = "10px";
    box.style.borderRadius = "14px";
    box.style.background = "color-mix(in srgb, var(--accent) 12%, var(--surface-2))";

    var title = document.createElement("div");
    title.style.fontSize = "22px";
    title.style.fontWeight = "700";
    title.textContent = label;

    var sub = document.createElement("div");
    sub.style.fontSize = "13px";
    sub.style.color = "var(--muted)";
    sub.textContent = "这一周不排常规课程";

    box.appendChild(title);
    box.appendChild(sub);
    return box;
  }

  /* ---------------- 表格 ---------------- */

  function renderGrid(week) {
    var grid = $("timetable");
    var sectionCount = SECTIONS.length || 12;
    var realWeek = weekOfToday();
    var isThisWeek = week === realWeek;
    var today = todayIndex();

    grid.innerHTML = "";
    grid.style.setProperty("--sections", sectionCount);

    function place(node, column, row, span) {
      node.style.gridColumn = String(column);
      node.style.gridRow = String(row) + (span > 1 ? " / span " + span : "");
      return node;
    }

    /* 左上角 */
    var corner = document.createElement("div");
    corner.className = "cell corner";
    corner.textContent = "节次";
    grid.appendChild(place(corner, 1, 1, 1));

    /* 星期表头 */
    for (var d = 1; d <= 7; d++) {
      var head = document.createElement("div");
      head.className = "cell day-head";
      head.textContent = DAY_NAMES[d - 1];
      if (isThisWeek && d === today) head.classList.add("is-today");
      grid.appendChild(place(head, d + 1, 1, 1));
    }

    /* 背景格 + 节次列 */
    for (var s = 1; s <= sectionCount; s++) {
      var timeCell = document.createElement("div");
      timeCell.className = "cell time-cell";
      var info = SECTIONS[s - 1] || { start: "", end: "" };
      timeCell.innerHTML =
        '<b>' + s + "</b>" +
        '<small>' + esc(info.start || "") + "</small>";
      grid.appendChild(place(timeCell, 1, s + 1, 1));

      for (var col = 1; col <= 7; col++) {
        var cell = document.createElement("div");
        cell.className = "cell bg";
        if (isThisWeek && col === today) cell.classList.add("is-today");
        grid.appendChild(place(cell, col + 1, s + 1, 1));
      }
    }

    /* 整周活动（劳动教育周之类）：铺满整张表 */
    var special = specialWeekOf(week);
    if (special) {
      grid.appendChild(buildBanner(special, sectionCount));
      return;
    }

    /* 课程块（放后面，就会盖在背景格上面） */
    var list = coursesOf(week);

    if (!list.length) {
      var empty = document.createElement("div");
      empty.className = "empty-tip";
      empty.textContent = week === realWeek ? "这周没有课 🎉" : "这一周没有安排课程";
      grid.appendChild(empty);
      return;
    }

    list.forEach(function (course) {
      var span = Math.max(1, (Number(course.endSection) || 1) - (Number(course.startSection) || 1) + 1);

      var card = document.createElement("div");
      card.className = "slot" + (span === 1 ? " compact" : "");
      card.style.setProperty("--c", colorOf(course.name));
      card.title = [
        course.name,
        course.location,
        course.teacher,
        weeksText(course)
      ].filter(Boolean).join(" · ");

      card.innerHTML =
        '<div class="slot-name">' + esc(course.name) + "</div>" +
        '<div class="slot-meta">' + esc(course.location || "地点待定") + "</div>" +
        '<div class="slot-meta muted">' + esc(course.teacher || "") + "</div>" +
        '<div class="slot-weeks">' + esc(weeksText(course)) + "</div>";

      grid.appendChild(place(card, Number(course.day) + 1, Number(course.startSection) + 1, span));
    });
  }

  /* ---------------- 顶部统计 ---------------- */

  function renderStats(week) {
    var special = specialWeekOf(week);
    if (special) {
      $("stats").innerHTML =
        '<div class="stat"><b>' + esc(special) + "</b><span>整周活动</span></div>" +
        '<div class="stat stat-side"><b>第 ' + week + " 周</b><span>" +
        (week % 2 === 1 ? "单周" : "双周") + " · 共 " + totalWeeks() + " 周</span></div>";
      return;
    }

    var list = coursesOf(week);
    var names = {};
    var sections = 0;

    list.forEach(function (c) {
      names[c.name] = true;
      sections += Math.max(1, (c.endSection || 1) - (c.startSection || 1) + 1);
    });

    var isThisWeek = week === weekOfToday();
    var todayText = isThisWeek
      ? "今天 " + DAY_NAMES[todayIndex() - 1]
      : "第 " + week + " 周";

    $("stats").innerHTML =
      '<div class="stat"><b>' + Object.keys(names).length + "</b><span>门课程</span></div>" +
      '<div class="stat"><b>' + list.length + "</b><span>次课</span></div>" +
      '<div class="stat"><b>' + sections + "</b><span>课时</span></div>" +
      '<div class="stat stat-side"><b>' + esc(todayText) + "</b><span>" +
      (week % 2 === 1 ? "单周" : "双周") + " · 共 " + totalWeeks() + " 周</span></div>";
  }

  /* ---------------- 本周清单 ---------------- */

  function renderList(week) {
    var box = $("week-list");

    var special = specialWeekOf(week);
    if (special) {
      box.innerHTML = '<p class="empty">这一周是「' + esc(special) + "」，没有常规课程。</p>";
      return;
    }

    var list = coursesOf(week).slice().sort(function (a, b) {
      if (a.day !== b.day) return a.day - b.day;
      return a.startSection - b.startSection;
    });

    if (!list.length) {
      box.innerHTML = '<p class="empty">这一周没有课，出去走走吧。</p>';
      return;
    }

    var html = "";
    var lastDay = 0;

    list.forEach(function (course) {
      if (course.day !== lastDay) {
        if (lastDay) html += "</div>";
        html += '<div class="day-group"><h3>' + DAY_NAMES[course.day - 1] + "</h3>";
        lastDay = course.day;
      }
      html +=
        '<div class="list-item">' +
          '<i class="dot" style="--c:' + colorOf(course.name) + '"></i>' +
          '<div class="li-body">' +
            '<div class="li-name">' + esc(course.name) + "</div>" +
            '<div class="li-meta">第' + course.startSection + "–" + course.endSection +
              "节 · " + esc(course.location || "地点待定") +
              (course.teacher ? " · " + esc(course.teacher) : "") +
            "</div>" +
          "</div>" +
          '<div class="li-weeks">' + esc(weeksText(course)) + "</div>" +
        "</div>";
    });

    if (lastDay) html += "</div>";
    box.innerHTML = html;
  }

  /* ---------------- 周次切换 ---------------- */

  function renderAll() {
    var special = specialWeekOf(state.week);
    $("page-title").textContent = META.title || "我的课程表";
    $("page-sub").textContent =
      "第 " + state.week + " 周 · " + (state.week % 2 === 1 ? "单周" : "双周") +
      (special ? " · " + special : "") +
      (state.week === weekOfToday() ? " · 本周" : "");

    $("week-select").value = String(state.week);
    $("prev-week").disabled = state.week <= 1;
    $("next-week").disabled = state.week >= totalWeeks();

    renderStats(state.week);
    renderGrid(state.week);
    renderList(state.week);
  }

  function buildWeekOptions() {
    var select = $("week-select");
    var realWeek = weekOfToday();
    var html = "";

    for (var i = 1; i <= totalWeeks(); i++) {
      var label = "第 " + i + " 周";
      if (i === realWeek) label += "（本周）";
      html += '<option value="' + i + '">' + label + "</option>";
    }
    select.innerHTML = html;
  }

  function goTo(week) {
    state.week = clamp(week, 1, totalWeeks());
    renderAll();
  }

  /* ---------------- 启动 ---------------- */

  function init() {
    if (!SECTIONS.length) {
      $("timetable").innerHTML =
        '<p class="empty">没有读到节次配置，请检查 data/meta.js 里的 sections。</p>';
      return;
    }

    state.week = weekOfToday();
    buildWeekOptions();
    renderAll();

    $("week-select").addEventListener("change", function (e) {
      goTo(Number(e.target.value));
    });
    $("prev-week").addEventListener("click", function () { goTo(state.week - 1); });
    $("next-week").addEventListener("click", function () { goTo(state.week + 1); });
    $("today-btn").addEventListener("click", function () { goTo(weekOfToday()); });

    document.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") goTo(state.week - 1);
      if (e.key === "ArrowRight") goTo(state.week + 1);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();