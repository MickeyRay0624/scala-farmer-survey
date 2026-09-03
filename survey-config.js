(() => {
  "use strict";

  const LOCAL_CONFIG_URL = "config/survey-config.json";
  const RUNTIME_CONFIG_URL = "config/runtime-config.json";
  const DEFAULT_TIMEOUT_MS = 7000;
  let activeConfig = null;
  let activeRuntime = null;
  let activeLogic = [];

  const toBoolean = (value, fallback = false) => {
    if (value === true || value === false) return value;
    if (value === null || value === undefined || value === "") return fallback;
    return ["true", "yes", "1", "on"].includes(String(value).trim().toLowerCase());
  };

  const toNumber = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const normalizedRows = (value) => (Array.isArray(value) ? value : []);
  const cssEscape = (value) => (window.CSS?.escape ? CSS.escape(String(value)) : String(value).replace(/["\\]/g, "\\$&"));
  const safeText = (value) => String(value ?? "").trim();

  function settingsObject(rows = []) {
    return Object.fromEntries(normalizedRows(rows).filter((row) => row?.key).map((row) => [row.key, row.value]));
  }

  async function fetchJson(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal, credentials: "omit" });
      if (!response.ok) throw new Error(`Configuration request failed (${response.status})`);
      return await response.json();
    } finally {
      window.clearTimeout(timer);
    }
  }

  function fetchJsonp(url, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve, reject) => {
      const callbackName = `__scalaConfigCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const script = document.createElement("script");
      const timer = window.setTimeout(() => finish(new Error("Configuration request timed out")), timeoutMs);
      const finish = (error, value) => {
        window.clearTimeout(timer);
        script.remove();
        delete window[callbackName];
        if (error) reject(error);
        else resolve(value);
      };
      window[callbackName] = (value) => finish(null, value);
      script.onerror = () => finish(new Error("Configuration script could not be loaded"));
      const separator = url.includes("?") ? "&" : "?";
      script.src = `${url}${separator}callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
      document.head.append(script);
    });
  }

  async function loadRemoteConfig(url) {
    if (!url) return null;
    try {
      return await fetchJson(url);
    } catch (fetchError) {
      try {
        return await fetchJsonp(url);
      } catch {
        throw fetchError;
      }
    }
  }

  function idFromText(value) {
    return safeText(value)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 100);
  }

  function blockId(element, index = 0) {
    const dataKeys = ["matrix", "checklist", "records", "issues", "monthGrid", "climateGrid"];
    for (const key of dataKeys) {
      if (element?.dataset?.[key]) return `${key}:${element.dataset[key]}`;
    }
    const named = element?.querySelector?.("[name]");
    if (named) return `question:${named.getAttribute("name")}`;
    const code = safeText(element?.querySelector?.("b")?.textContent).replace(/\.$/, "");
    if (code) return `content:${code}`;
    return `content:${idFromText(element?.textContent) || index}`;
  }

  function annotateBlocks() {
    const occurrences = new Map();
    document.querySelectorAll(".form-step").forEach((section) => {
      let segment = "start";
      let segmentOrder = 0;
      [...section.children].forEach((element, index) => {
        if (element.matches(".section-heading,.subsection-heading")) {
          segmentOrder += 1;
          segment = `segment_${segmentOrder}_${idFromText(element.textContent) || "heading"}`;
          element.dataset.configSegmentMarker = segment;
          return;
        }
        if (!element.dataset.configId) {
          const baseId = blockId(element, index);
          const occurrence = (occurrences.get(baseId) || 0) + 1;
          occurrences.set(baseId, occurrence);
          element.dataset.configId = occurrence === 1 ? baseId : `${baseId}#${occurrence}`;
        }
        element.dataset.configSegment ||= segment;
      });
    });
  }

  function setElementText(element, value, { preserveRequired = false } = {}) {
    if (!element || value === undefined || value === null || value === "") return;
    const wasRequired = preserveRequired && Boolean(element.querySelector?.(".required-badge, em"));
    element.textContent = String(value);
    if (wasRequired) {
      const badge = document.createElement("span");
      badge.className = "required-badge";
      badge.textContent = "Required";
      element.append(" ", badge);
    }
  }

  function findBlock(id) {
    return [...document.querySelectorAll("[data-config-id]")].find((element) => element.dataset.configId === id) || null;
  }

  function applySections(rows) {
    const form = document.getElementById("survey-form");
    const navigation = form?.querySelector(":scope > .form-navigation");
    const ordered = normalizedRows(rows).filter((row) => row?.section_id).sort((a, b) => toNumber(a.order) - toNumber(b.order));
    ordered.forEach((row) => {
      const section = document.querySelector(`.form-step[data-step="${cssEscape(row.section_id)}"]`);
      if (!section) return;
      const enabled = toBoolean(row.enabled, true);
      section.dataset.configEnabled = String(enabled);
      section.hidden = !enabled;
      if (row.menu_title) section.dataset.title = row.menu_title;
      if (row.visible_for_modules !== undefined) section.dataset.module = safeText(row.visible_for_modules);
      setElementText(section.querySelector(":scope > .section-heading h2"), row.section_title);
      setElementText(section.querySelector(":scope > .section-heading p"), row.section_description);
      form?.insertBefore(section, navigation || null);
    });
  }

  function applyQuestions(rows) {
    normalizedRows(rows).forEach((row) => {
      if (!row?.block_id) return;
      const block = findBlock(row.block_id);
      if (!block) return;
      const enabled = toBoolean(row.enabled, true);
      block.dataset.configEnabled = String(enabled);
      block.hidden = !enabled;
      block.querySelectorAll("input,textarea,select,button").forEach((control) => {
        control.disabled = !enabled;
      });
      const titleTarget = block.matches("fieldset")
        ? block.querySelector(":scope > legend")
        : block.matches("label")
          ? block.querySelector(":scope > span")
          : block.querySelector(":scope > .question-title h3, :scope > p.section-instruction, :scope > h3");
      setElementText(titleTarget, row.question_text, { preserveRequired: true });
      const help = block.querySelector(":scope > .question-help");
      setElementText(help, row.help_text);
      block.dataset.configOrder = String(toNumber(row.order, 9999));
      block.dataset.configSection = safeText(row.section_id);
      block.dataset.configSegment = safeText(row.segment_id) || block.dataset.configSegment || "start";
    });
    reorderConfiguredBlocks();
  }

  function reorderConfiguredBlocks() {
    document.querySelectorAll(".form-step").forEach((section) => {
      const groups = new Map();
      [...section.children].forEach((element) => {
        if (!element.dataset.configId) return;
        const segment = element.dataset.configSegment || "start";
        if (!groups.has(segment)) groups.set(segment, []);
        groups.get(segment).push(element);
      });
      groups.forEach((elements, segment) => {
        elements.sort((a, b) => toNumber(a.dataset.configOrder, 9999) - toNumber(b.dataset.configOrder, 9999));
        const markers = [...section.children].filter((el) => el.dataset.configSegmentMarker);
        const ownMarker = markers.find((el) => el.dataset.configSegmentMarker === segment);
        const markerIndex = ownMarker ? [...section.children].indexOf(ownMarker) : -1;
        const boundary = markers.find((el) => [...section.children].indexOf(el) > markerIndex) || section.querySelector(":scope > .form-navigation");
        elements.forEach((element) => section.insertBefore(element, boundary || null));
      });
    });
  }

  function controlsFor(questionId) {
    if (!questionId) return [];
    if (!questionId.includes("*")) return [...document.querySelectorAll(`[name="${cssEscape(questionId)}"]`)];
    const pattern = new RegExp(`^${questionId.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*")}$`);
    return [...document.querySelectorAll("[name]")].filter((control) => pattern.test(control.name));
  }

  function fieldLabelTarget(control) {
    const ratingRow = control.closest(".rating-row");
    if (ratingRow) return ratingRow.querySelector(".rating-prompt");
    const monthRow = control.closest(".month-row");
    if (monthRow) return monthRow.querySelector(":scope > strong");
    const climateMonth = control.closest(".climate-month");
    if (climateMonth) return climateMonth.querySelector(":scope > span");
    const label = control.closest("label");
    return label?.querySelector(":scope > span") || null;
  }

  function hostForControls(controls) {
    const first = controls[0];
    if (!first) return null;
    return first.closest(".rating-row,.month-row,.climate-month,.record-field,.field-card,.compact-field,.inline-detail,fieldset,label") || first;
  }

  function createQuestion(row, options) {
    if (!toBoolean(row.create_if_missing, false) || !row.section_id || !row.question_id) return [];
    const section = document.querySelector(`.form-step[data-step="${cssEscape(row.section_id)}"]`);
    if (!section) return [];
    const type = safeText(row.input_type) || "text";
    const optionRows = options.filter((option) => option.question_id === row.question_id && toBoolean(option.enabled, true));
    const simpleTypes = ["textarea", "text", "number", "date", "select"];
    const block = document.createElement(simpleTypes.includes(type) ? "label" : "fieldset");
    block.className = block.tagName === "LABEL" ? "field-card" : "question-card";
    block.dataset.configId = `question:${row.question_id}`;
    block.dataset.configSegment = safeText(row.segment_id) || "start";
    block.dataset.configOrder = String(toNumber(row.order, 9999));
    if (block.tagName === "LABEL") {
      const span = document.createElement("span");
      span.textContent = row.field_label || row.question_text || row.question_id;
      block.append(span);
      const control = document.createElement(type === "textarea" ? "textarea" : type === "select" ? "select" : "input");
      if (control.tagName === "INPUT") control.type = type;
      control.name = row.question_id;
      if (control.tagName === "SELECT") {
        const empty = document.createElement("option");
        empty.value = "";
        empty.textContent = "Select…";
        control.append(empty);
        optionRows.forEach((option) => {
          const item = document.createElement("option");
          item.value = option.option_value;
          item.textContent = option.option_label || option.option_value;
          control.append(item);
        });
      }
      block.append(control);
    } else {
      const legend = document.createElement("legend");
      legend.textContent = row.question_text || row.field_label || row.question_id;
      block.append(legend);
      const list = document.createElement("div");
      list.className = "choice-list two-columns";
      optionRows.forEach((option) => {
        const label = document.createElement("label");
        const input = document.createElement("input");
        input.name = row.question_id;
        input.type = type === "select" ? "radio" : type;
        input.value = option.option_value;
        const span = document.createElement("span");
        span.textContent = option.option_label || option.option_value;
        label.append(input, span);
        list.append(label);
      });
      block.append(list);
    }
    const navigation = section.querySelector(":scope > .form-navigation");
    section.insertBefore(block, navigation || null);
    return [...block.querySelectorAll(`[name="${cssEscape(row.question_id)}"]`)];
  }

  function applyFields(rows, options) {
    normalizedRows(rows).forEach((row) => {
      if (!row?.question_id) return;
      let controls = controlsFor(row.question_id);
      if (!controls.length) controls = createQuestion(row, options);
      if (!controls.length) return;
      const enabled = toBoolean(row.enabled, true);
      const required = toBoolean(row.required, false);
      const host = hostForControls(controls);
      if (host && host !== controls[0]) host.hidden = !enabled;
      const requiredGroup = document.querySelector(`[data-required-group="${cssEscape(row.question_id)}"]`);
      if (requiredGroup) {
        if (required) requiredGroup.dataset.requiredGroup = row.question_id;
        else requiredGroup.removeAttribute("data-required-group");
      }
      controls.forEach((control, index) => {
        control.disabled = !enabled;
        const usesCustomRequiredGroup = requiredGroup && ["checkbox", "radio"].includes(control.type);
        control.required = enabled && required && !usesCustomRequiredGroup;
        if (row.placeholder !== undefined && "placeholder" in control) control.placeholder = safeText(row.placeholder);
        if (row.min_value !== undefined && "min" in control) control.min = safeText(row.min_value);
        if (row.max_value !== undefined && "max" in control) control.max = safeText(row.max_value);
        if (row.step_value !== undefined && "step" in control) control.step = safeText(row.step_value);
        if (index === 0 && row.field_label) setElementText(fieldLabelTarget(control), row.field_label, { preserveRequired: true });
      });
    });
  }

  function optionWrapper(control) {
    if (control.tagName === "OPTION") return control;
    return control.closest("label") || control;
  }

  function applyOptions(rows) {
    const grouped = new Map();
    normalizedRows(rows).forEach((row) => {
      if (!row?.question_id || row.option_value === undefined) return;
      if (!grouped.has(row.question_id)) grouped.set(row.question_id, []);
      grouped.get(row.question_id).push(row);
    });
    grouped.forEach((optionRows, questionId) => {
      const controls = controlsFor(questionId);
      if (!controls.length) return;
      const select = controls.find((control) => control.tagName === "SELECT");
      optionRows.sort((a, b) => toNumber(a.option_order, 9999) - toNumber(b.option_order, 9999));
      if (select) {
        optionRows.forEach((row) => {
          let option = [...select.options].find((item) => item.value === String(row.option_value));
          if (!option && toBoolean(row.enabled, true)) {
            option = document.createElement("option");
            option.value = row.option_value;
            select.append(option);
          }
          if (!option) return;
          option.textContent = row.option_label || row.option_value;
          option.disabled = !toBoolean(row.enabled, true);
          option.hidden = !toBoolean(row.enabled, true);
          select.append(option);
        });
        return;
      }
      const container = controls[0].closest(".choice-list,.choice-grid,.rating-options,.month-options,.record-checks > div") || controls[0].parentElement;
      optionRows.forEach((row) => {
        let control = controls.find((item) => item.value === String(row.option_value));
        if (!control && toBoolean(row.enabled, true) && container) {
          const source = controls[0];
          const label = document.createElement("label");
          control = document.createElement("input");
          control.type = source.type;
          control.name = source.name;
          control.value = row.option_value;
          const span = document.createElement("span");
          label.append(control, span);
          container.append(label);
        }
        if (!control) return;
        const wrapper = optionWrapper(control);
        wrapper.hidden = !toBoolean(row.enabled, true);
        control.disabled = !toBoolean(row.enabled, true);
        control.dataset.exclusive = String(toBoolean(row.exclusive, false));
        if (row.opens_detail_id) control.dataset.controls = safeText(row.opens_detail_id);
        setElementText(wrapper.querySelector?.("span"), row.option_label || row.option_value);
        if (container && wrapper !== container && !wrapper.contains(container)) container.append(wrapper);
      });
    });
  }

  function currentValues(questionId) {
    const controls = controlsFor(questionId).filter((control) => !control.disabled);
    if (!controls.length) return [];
    if (["checkbox", "radio"].includes(controls[0].type)) return controls.filter((control) => control.checked).map((control) => control.value);
    return controls.map((control) => control.value).filter((value) => value !== "");
  }

  function ruleMatches(rule) {
    const values = currentValues(rule.source_question_id).map(String);
    const expected = safeText(rule.expected_value).split("|").filter(Boolean);
    const operator = safeText(rule.operator).toLowerCase() || "contains";
    if (operator === "equals") return values.length === 1 && values[0] === expected[0];
    if (operator === "not_equals") return !values.includes(expected[0]);
    if (operator === "any_of" || operator === "contains") return expected.some((value) => values.includes(value));
    if (operator === "all_of") return expected.every((value) => values.includes(value));
    if (operator === "not_contains") return expected.every((value) => !values.includes(value));
    if (operator === "not_empty") return values.some((value) => value !== "");
    if (operator === "empty") return values.length === 0;
    if (operator === "greater_than") return values.some((value) => Number(value) > Number(expected[0]));
    if (operator === "greater_or_equal") return values.some((value) => Number(value) >= Number(expected[0]));
    return false;
  }

  function logicTarget(rule) {
    if (rule.target_type === "section") return document.querySelector(`.form-step[data-step="${cssEscape(rule.target_id)}"]`);
    if (rule.target_type === "block") return findBlock(rule.target_id);
    if (rule.target_type === "question") return hostForControls(controlsFor(rule.target_id));
    return document.getElementById(rule.target_id);
  }

  function applyLogic() {
    const grouped = new Map();
    activeLogic.filter((rule) => toBoolean(rule.enabled, true)).forEach((rule) => {
      const key = `${rule.target_type || "element"}|${rule.target_id}`;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key).push(rule);
    });
    grouped.forEach((rules) => {
      const target = logicTarget(rules[0]);
      if (!target) return;
      const join = safeText(rules[0].join_mode).toLowerCase() === "and" ? "and" : "or";
      const matched = join === "and" ? rules.every(ruleMatches) : rules.some(ruleMatches);
      const effect = safeText(rules[0].effect).toLowerCase() || "show";
      const visible = effect === "hide" ? !matched : matched;
      target.hidden = !visible;
      target.classList.toggle("is-visible", visible);
      target.querySelectorAll?.("input,textarea,select").forEach((control) => {
        control.disabled = !visible;
        if (!visible && rules.some((rule) => toBoolean(rule.clear_when_hidden, false))) {
          if (["checkbox", "radio"].includes(control.type)) control.checked = false;
          else control.value = "";
        }
      });
    });
  }

  function transportFrom(config, environment, configSource) {
    const settings = settingsObject(config.settings);
    const map = Object.fromEntries(normalizedRows(config.transport_map)
      .filter((row) => row?.payload_key && row?.entry_id)
      .map((row) => [row.payload_key, String(row.entry_id)]));
    const remoteIsActive = configSource === "google-sheet";
    const environmentDefinesAction = Object.prototype.hasOwnProperty.call(environment, "form_action");
    const environmentDefinesEnabled = Object.prototype.hasOwnProperty.call(environment, "enabled");
    return {
      formAction: remoteIsActive
        ? safeText(settings.form_action) || safeText(environment.form_action)
        : environmentDefinesAction
          ? safeText(environment.form_action)
          : safeText(settings.form_action),
      entryMap: map,
      submissionEnabled: remoteIsActive
        ? toBoolean(settings.submission_enabled, toBoolean(environment.enabled, true))
        : environmentDefinesEnabled
          ? toBoolean(environment.enabled, false)
          : toBoolean(settings.submission_enabled, true),
    };
  }

  async function loadAndApply() {
    let runtimeFile = { default_environment: "production", environments: { production: {} } };
    try {
      runtimeFile = await fetchJson(RUNTIME_CONFIG_URL);
    } catch {
      // A bundled fallback still keeps the production questionnaire usable.
    }
    const query = new URLSearchParams(location.search);
    const environmentName = query.get("environment") || runtimeFile.default_environment || "production";
    const environment = runtimeFile.environments?.[environmentName] || {};
    let bundledConfig = null;
    try {
      bundledConfig = await fetchJson(LOCAL_CONFIG_URL);
    } catch (error) {
      console.error("Bundled survey configuration is unavailable.", error);
      bundledConfig = { settings: [], sections: [], questions: [], fields: [], options: [], logic: [], transport_map: [] };
    }
    let config = bundledConfig;
    let source = "bundled";
    const remoteUrl = query.get("config") || environment.config_url || "";
    if (remoteUrl) {
      try {
        const remote = await loadRemoteConfig(remoteUrl);
        if (remote?.sections && remote?.questions) {
          config = remote;
          source = "google-sheet";
        }
      } catch (error) {
        console.warn("Remote survey configuration could not be loaded; using the bundled version.", error);
        source = "bundled-fallback";
      }
    }
    activeConfig = config;
    activeLogic = normalizedRows(config.logic);
    activeRuntime = {
      environment: environmentName,
      configSource: source,
      configUrl: remoteUrl,
      settings: settingsObject(config.settings),
      ...transportFrom(config, environment, source),
    };
    annotateBlocks();
    applySections(config.sections);
    applyQuestions(config.questions);
    applyFields(config.fields, normalizedRows(config.options));
    reorderConfiguredBlocks();
    applyOptions(config.options);
    applyLogic();
    const transport = document.getElementById("google-transport-form");
    if (transport) {
      if (activeRuntime.formAction) transport.action = activeRuntime.formAction;
      else transport.removeAttribute("action");
    }
    document.documentElement.dataset.configSource = source;
    document.documentElement.dataset.environment = environmentName;
    return activeRuntime;
  }

  window.ScalaSurveyConfig = {
    loadAndApply,
    applyLogic,
    get config() {
      return activeConfig;
    },
    get runtime() {
      return activeRuntime;
    },
  };
})();
