// ─── Accessible custom select (progressive enhancement) ────────────
// Wraps a native <select> with a styled button + listbox UI while
// keeping the native <select> in the DOM (visually hidden) as the
// single source of truth. Existing code that reads/writes
// select.value / select.selectedIndex and listens for "change"
// keeps working unchanged.
//
// API:
//   enhanceCustomSelect(selectEl) - builds the custom UI once
//   refreshCustomSelect(selectEl) - re-syncs the UI after the
//                                   select's value was changed
//                                   programmatically

(function () {
  let uid = 0;

  function buildChevron() {
    const span = document.createElement("span");
    span.className = "custom-select-chevron";
    span.setAttribute("aria-hidden", "true");
    // Matches .fg-chev (the filter-group chevron) exactly: 18px at stroke-width
    // 2. It used to be 14px at 2.5, which is proportionally ~60% heavier stroke
    // and read as a bolder, different control sitting next to the filter ones.
    span.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>';
    return span;
  }

  function enhance(select) {
    if (!select || select._customSelectEnhanced) return;
    select._customSelectEnhanced = true;

    const listboxId = `${select.id || "customSelect"}-listbox-${++uid}`;
    // The trigger is role="combobox", so its accessible name does NOT come from
    // its contents; without an explicit one a screen reader announces a bare
    // "combobox". Most selects on the admin forms are labelled with a <label
    // for=...> rather than aria-label, so fall back to that, then to the
    // select's title. Purely additive: an existing aria-label still wins.
    let ariaLabel = select.getAttribute("aria-label") || "";
    if (!ariaLabel && select.id) {
      const labelEl = document.querySelector(`label[for="${select.id}"]`);
      if (labelEl) ariaLabel = (labelEl.textContent || "").replace(/\s+/g, " ").trim();
    }
    if (!ariaLabel) ariaLabel = select.getAttribute("title") || "";

    const wrap = document.createElement("div");
    wrap.className = "custom-select-wrap";

    const trigger = document.createElement("button");
    trigger.type = "button";
    trigger.className = "custom-select-trigger";
    trigger.setAttribute("role", "combobox");
    trigger.setAttribute("aria-haspopup", "listbox");
    trigger.setAttribute("aria-expanded", "false");
    trigger.setAttribute("aria-controls", listboxId);
    if (ariaLabel) trigger.setAttribute("aria-label", ariaLabel);

    // Optional inline prefix (data-trigger-label="Sort"). The desktop sort sits
    // beside a separate "Sort by" label; the mobile bar has no room for one, and
    // without it the trigger read as a value floating a long way from its
    // chevron. Rendering the prefix inside the trigger gives the mobile control
    // the same label + value + chevron geometry as desktop. Purely presentational
    // — the accessible name still comes from the select's aria-label.
    const prefix = select.getAttribute("data-trigger-label");
    if (prefix) {
      const prefixSpan = document.createElement("span");
      prefixSpan.className = "custom-select-trigger-prefix";
      prefixSpan.setAttribute("aria-hidden", "true");
      prefixSpan.textContent = prefix;
      trigger.appendChild(prefixSpan);
    }

    const labelSpan = document.createElement("span");
    labelSpan.className = "custom-select-trigger-label";
    trigger.appendChild(labelSpan);
    trigger.appendChild(buildChevron());

    const listbox = document.createElement("ul");
    listbox.id = listboxId;
    listbox.className = "custom-select-listbox";
    listbox.setAttribute("role", "listbox");
    if (ariaLabel) listbox.setAttribute("aria-label", ariaLabel);
    listbox.hidden = true;

    const optionEls = Array.from(select.options).map((opt, i) => {
      const li = document.createElement("li");
      li.id = `${listboxId}-opt-${i}`;
      li.className = "custom-select-option";
      li.setAttribute("role", "option");

      const text = document.createElement("span");
      text.textContent = opt.textContent;
      li.appendChild(text);

      const check = document.createElement("span");
      check.className = "custom-select-option-check";
      check.setAttribute("aria-hidden", "true");
      check.textContent = "✓";
      li.appendChild(check);

      li.addEventListener("click", () => {
        selectIndex(i);
        close({ focusTrigger: true });
      });
      // Only follow real hover. A touch tap emits a synthetic mouseenter on the
      // option under the finger; with no pointer to move away the highlight would
      // stick and the selected row would read shaded (blending into the warm bg).
      li.addEventListener("mouseenter", () => {
        if (window.matchMedia("(hover: hover)").matches) setActive(i, { scroll: false });
      });

      listbox.appendChild(li);
      return li;
    });

    let activeIndex = select.selectedIndex;

    function syncFromSelect() {
      const opt = select.options[select.selectedIndex];
      labelSpan.textContent = opt ? opt.textContent : "";
      // A selected empty-value option is a placeholder ("Select enquiry
      // subject"): style the trigger label muted like input placeholders.
      trigger.classList.toggle("is-placeholder", !!opt && opt.value === "");
      optionEls.forEach((li, i) => {
        li.setAttribute("aria-selected", i === select.selectedIndex ? "true" : "false");
      });
    }

    function setActive(index, { scroll = true, visual = true } = {}) {
      activeIndex = Math.max(0, Math.min(index, optionEls.length - 1));
      // `visual: false` tracks the active row for keyboard/aria without painting
      // the shaded highlight, so a pointer/touch open stays clean (white + check).
      optionEls.forEach((li, i) => li.classList.toggle("is-active", visual && i === activeIndex));
      trigger.setAttribute("aria-activedescendant", optionEls[activeIndex].id);
      if (scroll) optionEls[activeIndex].scrollIntoView({ block: "nearest" });
    }

    function selectIndex(index) {
      const opt = select.options[index];
      if (!opt) return;
      const changed = select.selectedIndex !== index;
      select.selectedIndex = index;
      syncFromSelect();
      if (changed) select.dispatchEvent(new Event("change", { bubbles: true }));
    }

    function onDocClick(e) {
      if (!wrap.contains(e.target)) close();
    }

    function onKeydown(e) {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (listbox.hidden) open({ viaKeyboard: true }); else setActive(activeIndex + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (listbox.hidden) open({ viaKeyboard: true }); else setActive(activeIndex - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (listbox.hidden) open({ viaKeyboard: true });
          else { selectIndex(activeIndex); close({ focusTrigger: true }); }
          break;
        case "Escape":
          if (!listbox.hidden) { e.preventDefault(); close({ focusTrigger: true }); }
          break;
        case "Tab":
          close();
          break;
        case "Home":
          if (!listbox.hidden) { e.preventDefault(); setActive(0); }
          break;
        case "End":
          if (!listbox.hidden) { e.preventDefault(); setActive(optionEls.length - 1); }
          break;
      }
    }

    function open({ viaKeyboard = false } = {}) {
      listbox.hidden = false;
      trigger.setAttribute("aria-expanded", "true");
      // Keyboard opens paint the active highlight (you need a visible cursor);
      // pointer/touch opens leave the selected row white with just its check.
      setActive(select.selectedIndex, { visual: viaKeyboard });
      document.addEventListener("click", onDocClick);
    }

    function close(opts = {}) {
      if (listbox.hidden) return;
      listbox.hidden = true;
      trigger.setAttribute("aria-expanded", "false");
      trigger.removeAttribute("aria-activedescendant");
      document.removeEventListener("click", onDocClick);
      if (opts.focusTrigger) trigger.focus();
    }

    trigger.addEventListener("click", () => {
      if (listbox.hidden) open(); else close();
    });
    trigger.addEventListener("keydown", onKeydown);

    select.classList.add("custom-select-native");
    select.setAttribute("tabindex", "-1");
    select.setAttribute("aria-hidden", "true");

    select.parentNode.insertBefore(wrap, select);
    wrap.appendChild(select);
    wrap.appendChild(trigger);
    wrap.appendChild(listbox);

    syncFromSelect();
    select._customSelectRefresh = syncFromSelect;
  }

  function refresh(select) {
    if (select && typeof select._customSelectRefresh === "function") {
      select._customSelectRefresh();
    }
  }

  window.enhanceCustomSelect = enhance;
  window.refreshCustomSelect = refresh;
})();
