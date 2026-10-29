/* 上善若草选集 · 列表页交互（纯前端，无依赖）
   筛选：日期（年+月）+ 多标签（AND，同时包含全部所选标签）+ 标题关键字；
   分页 10/20/50/100/不分页（默认 20，记住选择）；筛选变化后回到第 1 页。
   网址参数 ?tag=A&tag=B 表示多标签筛选（兼容单选）。 */
(function () {
  "use strict";

  var ARTICLES = window.ARTICLES || [];
  var PAGE_SIZES = [10, 20, 50, 100, 0]; // 0 = 不分页

  var stored = parseInt(localStorage.getItem("ssrc-page-size") || "20", 10);
  if (PAGE_SIZES.indexOf(stored) === -1) stored = 20;

  function initialTags() {
    try {
      var all = new URLSearchParams(location.search).getAll("tag");
      var seen = [];
      return all.filter(function (t) {
        if (!t || seen.indexOf(t) !== -1) return false;
        seen.push(t);
        return true;
      });
    } catch (e) { return []; }
  }

  var state = {
    year: "all",
    month: "all",
    tags: initialTags(),
    titleKw: "",
    page: 1,
    pageSize: stored
  };

  var els = {
    yearBtns: document.getElementById("year-btns"),
    monthBtns: document.getElementById("month-btns"),
    popularBtns: document.getElementById("popular-btns"),
    size: document.getElementById("size-select"),
    titleInput: document.getElementById("title-input"),
    tagWrap: document.getElementById("tag-filter-wrap"),
    activeTags: document.getElementById("active-tags"),
    clearTags: document.getElementById("clear-tags"),
    list: document.getElementById("article-list"),
    empty: document.getElementById("empty-tip"),
    count: document.getElementById("result-count"),
    pager: document.getElementById("pager"),
    prev: document.getElementById("prev-page"),
    next: document.getElementById("next-page"),
    pageInfo: document.getElementById("page-info")
  };

  // 快速筛选预设
  var QUICK_TITLE = "相声";
  var QUICK_TAGS = ["刘增艳", "袁雨桢"];
  var QUICK_TAGS_2 = ["马欣宇", "郑照暄"];
  var QUICK_TAGS_3 = ["徐钰涵", "黄逸"];

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  function dateDisplay(d) {
    return d.slice(0, 4) + "-" + d.slice(4, 6) + "-" + d.slice(6, 8);
  }

  /* ---------- 筛选 ---------- */
  function filtered() {
    var kw = state.titleKw;
    return ARTICLES.filter(function (a) {
      if (state.year !== "all" && a.date.slice(0, 4) !== state.year) return false;
      if (state.month !== "all" && a.date.slice(4, 6) !== state.month) return false;
      if (kw && a.title.indexOf(kw) === -1) return false;
      for (var i = 0; i < state.tags.length; i++) {
        if (a.tags.indexOf(state.tags[i]) === -1) return false;
      }
      return true;
    });
  }

  /* ---------- 渲染 ---------- */
  function renderActiveTags() {
    var html = "";
    state.tags.forEach(function (t) {
      html += '<span class="chip active">' + escapeHtml(t) +
        '<button type="button" class="chip-x" data-tag="' + escapeHtml(t) +
        '" title="移除该标签">×</button></span>';
    });
    els.activeTags.innerHTML = html;
    if (state.tags.length) {
      els.tagWrap.classList.remove("hidden");
    } else {
      els.tagWrap.classList.add("hidden");
    }
    Array.prototype.forEach.call(
      els.activeTags.querySelectorAll(".chip-x"),
      function (b) {
        b.addEventListener("click", function () {
          toggleTag(b.getAttribute("data-tag"));
        });
      }
    );
  }

  function cardTagHtml(tag) {
    var active = state.tags.indexOf(tag) !== -1 ? " active" : "";
    return '<a class="chip' + active + '" href="javascript:void(0)" data-tag="' +
      escapeHtml(tag) + '">' + escapeHtml(tag) + "</a>";
  }

  function renderList() {
    updateQuickBtns();
    var items = filtered();
    var total = items.length;
    var size = state.pageSize;
    var pageCount = size === 0 ? 1 : Math.max(1, Math.ceil(total / size));

    if (state.page > pageCount) state.page = pageCount;
    if (state.page < 1) state.page = 1;

    var start = size === 0 ? 0 : (state.page - 1) * size;
    var end = size === 0 ? total : Math.min(total, start + size);
    var pageItems = items.slice(start, end);

    var cond = [];
    if (state.tags.length) cond.push("标签：" + state.tags.join(" + "));
    if (state.titleKw) cond.push("标题含「" + state.titleKw + "」");
    els.count.textContent = total > 0
      ? "共 " + total + " 篇" + (cond.length ? "（" + cond.join("，") + "）" : "")
      : "";

    if (total === 0) {
      els.list.innerHTML = "";
      els.empty.classList.remove("hidden");
    } else {
      els.empty.classList.add("hidden");
      var html = "";
      pageItems.forEach(function (a) {
        var chips = a.tags.slice(0, 7).map(cardTagHtml).join(" ");
        if (a.tags.length > 7) {
          chips += '<span class="more-chip">+' + (a.tags.length - 7) + "</span>";
        }
        html +=
          '<article class="card">' +
          '<h2 class="card-title"><a href="' + escapeHtml(a.file) + '">' +
          escapeHtml(a.title) + "</a></h2>" +
          '<div class="card-meta"><span class="card-date">' +
          dateDisplay(a.date) + "</span>" +
          '<span class="card-tags">' + chips + "</span></div>";
        if (a.preview) {
          html += '<div class="card-preview">' + escapeHtml(a.preview) + "</div>";
        }
        html += "</article>";
      });
      els.list.innerHTML = html;
    }

    if (size !== 0 && pageCount > 1) {
      els.pager.classList.remove("hidden");
      els.prev.disabled = state.page <= 1;
      els.next.disabled = state.page >= pageCount;
      els.pageInfo.textContent = "第 " + state.page + " / " + pageCount + " 页";
    } else {
      els.pager.classList.add("hidden");
    }

    Array.prototype.forEach.call(
      els.list.querySelectorAll("[data-tag]"),
      function (el) {
        el.addEventListener("click", function () {
          toggleTag(el.getAttribute("data-tag"));
        });
      }
    );
  }

  /* ---------- 侧边栏：年份 / 月份按钮 ---------- */
  function sideBtnHtml(value, label, active, extraCls) {
    return '<button type="button" class="side-btn' + (active ? " active" : "") +
      (extraCls ? " " + extraCls : "") +
      '" data-value="' + escapeHtml(value) + '">' + label + "</button>";
  }

  function wireSideBtns(container, onPick) {
    Array.prototype.forEach.call(
      container.querySelectorAll(".side-btn"),
      function (b) {
        b.addEventListener("click", function () {
          var v = b.getAttribute("data-value");
          if (b.classList.contains("active")) v = "all"; // 再点已激活项 → 全部
          onPick(v);
        });
      }
    );
  }

  function renderYearBtns() {
    var years = [];
    ARTICLES.forEach(function (a) {
      var y = a.date.slice(0, 4);
      if (years.indexOf(y) === -1) years.push(y);
    });
    years.sort().reverse();
    var html = sideBtnHtml("all", "全部", state.year === "all");
    years.forEach(function (y) {
      html += sideBtnHtml(y, y + " 年", state.year === y);
    });
    els.yearBtns.innerHTML = html;
    wireSideBtns(els.yearBtns, function (v) {
      state.year = v;
      state.page = 1;
      renderYearBtns(); // 重建按钮组，更新选中高亮
      renderList();
    });
  }

  function renderMonthBtns() {
    var html = sideBtnHtml("all", "全部", state.month === "all", "span2");
    for (var i = 1; i <= 12; i++) {
      var v = String(i).padStart(2, "0");
      html += sideBtnHtml(v, i + "月", state.month === v);
    }
    els.monthBtns.innerHTML = html;
    wireSideBtns(els.monthBtns, function (v) {
      state.month = v;
      state.page = 1;
      renderMonthBtns(); // 重建按钮组，更新选中高亮
      renderList();
    });
  }

  function renderPopularBtns() {
    var pop = window.POPULAR || [];
    var html = "";
    pop.forEach(function (n) {
      var active = state.tags.indexOf(n) !== -1;
      html += '<button type="button" class="side-btn' + (active ? " active" : "") +
        '" data-name="' + escapeHtml(n) + '">' + escapeHtml(n) + "</button>";
    });
    els.popularBtns.innerHTML = html;
    Array.prototype.forEach.call(
      els.popularBtns.querySelectorAll(".side-btn"),
      function (b) {
        b.addEventListener("click", function () {
          toggleTag(b.getAttribute("data-name")); // 复用多标签切换逻辑
        });
      }
    );
  }

  function renderAll() {
    renderPopularBtns();
    renderActiveTags();
    renderList();
  }

  /* ---------- 事件 ---------- */
  function toggleTag(tag) {
    var i = state.tags.indexOf(tag);
    if (i === -1) {
      state.tags.push(tag);
    } else {
      state.tags.splice(i, 1);
    }
    state.page = 1;
    updateUrl();
    renderAll();
  }

  function updateUrl() {
    try {
      var params = new URLSearchParams();
      state.tags.forEach(function (t) { params.append("tag", t); });
      var q = params.toString();
      history.replaceState(null, "", location.pathname + (q ? "?" + q : ""));
    } catch (e) { /* 忽略 */ }
  }

  /* ---------- 快速筛选按钮 ---------- */
  function tagsEqual(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < b.length; i++) {
      if (a.indexOf(b[i]) === -1) return false;
    }
    return true;
  }

  function updateQuickBtns() {
    var qc = document.getElementById("quick-crosstalk");
    var qd = document.getElementById("quick-duo");
    var qd3 = document.getElementById("quick-duo3");
    var qd2 = document.getElementById("quick-duo2");
    if (qc) qc.classList.toggle("active", state.titleKw === QUICK_TITLE);
    if (qd) qd.classList.toggle("active", tagsEqual(state.tags, QUICK_TAGS));
    if (qd3) qd3.classList.toggle("active", tagsEqual(state.tags, QUICK_TAGS_3));
    if (qd2) qd2.classList.toggle("active", tagsEqual(state.tags, QUICK_TAGS_2));
  }

  function onQuickCrosstalk() {
    state.titleKw = state.titleKw === QUICK_TITLE ? "" : QUICK_TITLE;
    els.titleInput.value = state.titleKw;
    state.page = 1;
    renderList();
  }

  function toggleQuickTags(preset) {
    if (tagsEqual(state.tags, preset)) {
      state.tags = [];
    } else {
      state.tags = preset.slice();
    }
    state.page = 1;
    updateUrl();
    renderAll();
  }

  function onQuickDuo() {
    toggleQuickTags(QUICK_TAGS);
  }

  function onQuickDuo2() {
    toggleQuickTags(QUICK_TAGS_2);
  }

  function onQuickDuo3() {
    toggleQuickTags(QUICK_TAGS_3);
  }

  function onQuickRandom() {
    if (ARTICLES.length) {
      location.href = ARTICLES[Math.floor(Math.random() * ARTICLES.length)].file;
    }
  }

  els.size.addEventListener("change", function () {
    state.pageSize = parseInt(els.size.value, 10) || 0;
    localStorage.setItem("ssrc-page-size", String(state.pageSize));
    state.page = 1;
    renderList();
  });

  var kwTimer = null;
  els.titleInput.addEventListener("input", function () {
    clearTimeout(kwTimer);
    kwTimer = setTimeout(function () {
      state.titleKw = els.titleInput.value.trim();
      state.page = 1;
      renderList();
    }, 200);
  });

  els.clearTags.addEventListener("click", function () {
    state.tags = [];
    state.page = 1;
    updateUrl();
    renderAll();
  });

  var qc = document.getElementById("quick-crosstalk");
  if (qc) qc.addEventListener("click", onQuickCrosstalk);
  var qd = document.getElementById("quick-duo");
  if (qd) qd.addEventListener("click", onQuickDuo);
  var qd2 = document.getElementById("quick-duo2");
  if (qd2) qd2.addEventListener("click", onQuickDuo2);
  var qd3 = document.getElementById("quick-duo3");
  if (qd3) qd3.addEventListener("click", onQuickDuo3);
  var qr = document.getElementById("quick-random");
  if (qr) qr.addEventListener("click", onQuickRandom);

  els.prev.addEventListener("click", function () {
    if (state.page > 1) { state.page -= 1; renderList(); }
  });

  els.next.addEventListener("click", function () {
    var pageCount = state.pageSize === 0 ? 1
      : Math.max(1, Math.ceil(filtered().length / state.pageSize));
    if (state.page < pageCount) { state.page += 1; renderList(); }
  });

  /* ---------- 初始化 ---------- */
  els.size.value = String(state.pageSize);
  renderYearBtns();
  renderMonthBtns();
  renderAll();
})();
