/* Double Eagle Financial — site behavior
   Vanilla JS, no dependencies. Deferred; safe to run before paint completes. */
(function () {
  "use strict";

  /* ----------------------------------------------------------------------
     Analytics layer
     Pushes a normalized event to window.dataLayer so any tag manager
     (GTM, Plausible, Fathom, GA4) can consume it. No vendor lock-in.
     ---------------------------------------------------------------------- */
  window.dataLayer = window.dataLayer || [];
  function track(event, params) {
    var payload = Object.assign({ event: event, page_path: location.pathname }, params || {});
    window.dataLayer.push(payload);
    if (typeof window.gtag === "function") window.gtag("event", event, payload);
    if (window.DE_DEBUG) console.log("[track]", payload);
  }
  window.deTrack = track;

  track("page_view", { page_title: document.title });

  /* ---------- Mobile navigation ---------- */
  var toggle = document.querySelector(".nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (toggle && nav) {
    toggle.addEventListener("click", function () {
      var open = toggle.getAttribute("aria-expanded") === "true";
      toggle.setAttribute("aria-expanded", String(!open));
      nav.classList.toggle("is-open", !open);
    });
    // Close on link click (in-page anchors would otherwise leave the menu open)
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
      }
    });
    // Close on Escape
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("is-open")) {
        toggle.setAttribute("aria-expanded", "false");
        nav.classList.remove("is-open");
        toggle.focus();
      }
    });
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll(".faq-q").forEach(function (btn) {
    var panel0 = document.getElementById(btn.getAttribute("aria-controls"));
    // Homepage-style FAQs use the hidden attribute and are handled by ui.js
    if (panel0 && panel0.hasAttribute("hidden")) return;
    btn.addEventListener("click", function () {
      var open = btn.getAttribute("aria-expanded") === "true";
      var panel = document.getElementById(btn.getAttribute("aria-controls"));
      btn.setAttribute("aria-expanded", String(!open));
      if (panel) panel.classList.toggle("is-open", !open);
      if (!open) track("faq_open", { question: btn.dataset.q || btn.textContent.trim().slice(0, 80) });
    });
  });

  /* ---------- CTA click tracking ---------- */
  document.querySelectorAll("[data-cta]").forEach(function (el) {
    el.addEventListener("click", function () {
      var name = el.dataset.cta;
      track("cta_click", { cta_name: name, cta_location: el.dataset.ctaLocation || "body" });
      if (name === "book-call") track("book_a_call_click", { cta_location: el.dataset.ctaLocation || "body" });
    });
  });

  /* ---------- Sticky mobile CTA ---------- */
  var sticky = document.querySelector(".sticky-cta");
  if (sticky) {
    var showAfter = 600;
    var onScroll = function () {
      sticky.classList.toggle("is-visible", window.scrollY > showAfter);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scroll reveal (respects reduced motion) ---------- */
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var reveals = document.querySelectorAll(".reveal");
  if (reduce || !("IntersectionObserver" in window)) {
    reveals.forEach(function (el) { el.classList.add("is-in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.05 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ----------------------------------------------------------------------
     Forms
     Client-side validation + submission to a configurable endpoint.
     Endpoint is set per-form via data-endpoint, falling back to
     window.DE_CONFIG.formEndpoint (see assets/js/config.js).
     ---------------------------------------------------------------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var PHONE_RE = /^[0-9()+\-.\s]{7,}$/;

  function setError(field, message) {
    field.classList.add("has-error");
    var err = field.querySelector(".field-error");
    if (err) err.textContent = message;
    var input = field.querySelector("input, select, textarea");
    if (input) input.setAttribute("aria-invalid", "true");
  }
  function clearError(field) {
    field.classList.remove("has-error");
    var input = field.querySelector("input, select, textarea");
    if (input) input.removeAttribute("aria-invalid");
  }

  function validateInput(input) {
    var field = input.closest(".field") || input.closest(".consent");
    if (!field) return true;
    var value = (input.value || "").trim();

    if (input.type === "checkbox") {
      if (input.required && !input.checked) return false;
      return true;
    }
    if (input.required && !value) {
      setError(field, input.dataset.msgRequired || "This field is required.");
      return false;
    }
    if (value && input.type === "email" && !EMAIL_RE.test(value)) {
      setError(field, "Enter a valid email address.");
      return false;
    }
    if (value && input.type === "tel" && !PHONE_RE.test(value)) {
      setError(field, "Enter a valid phone number.");
      return false;
    }
    clearError(field);
    return true;
  }

  function showStatus(form, type, message) {
    var box = form.querySelector(".form-status");
    if (!box) return;
    box.className = "form-status is-visible is-" + type;
    box.textContent = message;
    box.scrollIntoView({ behavior: "smooth", block: "center" });
    box.setAttribute("role", type === "error" ? "alert" : "status");
  }

  document.querySelectorAll("form[data-form]").forEach(function (form) {
    var inputs = form.querySelectorAll("input, select, textarea");

    inputs.forEach(function (input) {
      input.addEventListener("blur", function () { validateInput(input); });
      input.addEventListener("input", function () {
        var field = input.closest(".field");
        if (field && field.classList.contains("has-error")) validateInput(input);
      });
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Honeypot: silently accept and discard bot submissions.
      var trap = form.querySelector('input[name="company_website"]');
      if (trap && trap.value) return;

      var valid = true;
      var firstBad = null;
      inputs.forEach(function (input) {
        if (input.name === "company_website") return;
        if (!validateInput(input)) {
          valid = false;
          if (!firstBad) firstBad = input;
        }
      });

      if (!valid) {
        showStatus(form, "error", "Please fix the highlighted fields and try again.");
        if (firstBad) firstBad.focus();
        track("form_error", { form_name: form.dataset.form });
        return;
      }

      var btn = form.querySelector('button[type="submit"]');
      var originalLabel = btn ? btn.textContent : "";
      if (btn) { btn.disabled = true; btn.textContent = "Sending…"; }

      var data = {};
      new FormData(form).forEach(function (v, k) {
        if (k !== "company_website") data[k] = v;
      });
      data.form_name = form.dataset.form;
      data.submitted_at = new Date().toISOString();
      data.source_page = location.pathname;

      var endpoint = form.dataset.endpoint ||
        (window.DE_CONFIG && window.DE_CONFIG.formEndpoint) || "";
      var redirect = form.dataset.redirect || "/thank-you.html";

      var eventName = form.dataset.form === "lead-magnet"
        ? "lead_magnet_submit"
        : form.dataset.form === "book-call"
          ? "booking_request_submit"
          : "contact_submit";

      function success() {
        track(eventName, { form_name: form.dataset.form });
        track("lead_submit", { form_name: form.dataset.form });
        try { sessionStorage.setItem("de_last_form", form.dataset.form); } catch (err) {}
        window.location.href = redirect;
      }

      function failure() {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        showStatus(form, "error",
          "We couldn't send that. Email hello@doubleeaglefinancial.com and we'll pick it up from there.");
        track("form_submit_failed", { form_name: form.dataset.form });
      }

      // No endpoint configured yet: fail loudly rather than pretending to send.
      if (!endpoint) {
        if (btn) { btn.disabled = false; btn.textContent = originalLabel; }
        showStatus(form, "error",
          "Form endpoint not configured. Set window.DE_CONFIG.formEndpoint in assets/js/config.js before going live.");
        console.warn("[Double Eagle] No form endpoint configured. See assets/js/config.js");
        return;
      }

      fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify(data)
      })
        .then(function (res) { res.ok ? success() : failure(); })
        .catch(failure);
    });
  });

  /* ---------- Thank-you page: report which funnel completed ---------- */
  if (document.body.dataset.page === "thank-you") {
    var last = null;
    try { last = sessionStorage.getItem("de_last_form"); } catch (err) {}
    track("lead_confirmed", { form_name: last || "unknown" });
  }
})();
