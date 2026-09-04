/**
 * components.js — FAQ accordion, toast, rating stars
 */
(function () {
  "use strict";

  // ── FAQ Accordion ──
  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll("[data-accordion]").forEach(function (accordion) {
      accordion.querySelectorAll("[data-accordion-trigger]").forEach(function (trigger) {
        trigger.addEventListener("click", function () {
          var item = trigger.closest("[data-accordion-item]");
          var content = item.querySelector("[data-accordion-content]");
          var icon = trigger.querySelector("[data-accordion-icon]");
          var isOpen = item.classList.contains("open");

          // Close all others in same accordion
          accordion.querySelectorAll("[data-accordion-item].open").forEach(function (openItem) {
            if (openItem !== item) {
              openItem.classList.remove("open");
              var c = openItem.querySelector("[data-accordion-content]");
              if (c) c.style.maxHeight = "0";
              var i = openItem.querySelector("[data-accordion-icon]");
              if (i) i.style.transform = "";
            }
          });

          if (isOpen) {
            item.classList.remove("open");
            if (content) content.style.maxHeight = "0";
            if (icon) icon.style.transform = "";
          } else {
            item.classList.add("open");
            if (content) content.style.maxHeight = content.scrollHeight + "px";
            if (icon) icon.style.transform = "rotate(180deg)";
          }
        });
      });
    });
  });

  // ── Toast notification ──
  window.showToast = function (message, type) {
    type = type || "info";
    var colors = {
      info: "bg-accent text-white",
      success: "bg-green-600 text-white",
      error: "bg-red-600 text-white",
      warning: "bg-yellow-500 text-black",
    };
    var toast = document.createElement("div");
    toast.className =
      "fixed bottom-4 right-4 z-[9999] rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300 translate-y-2 opacity-0 " +
      (colors[type] || colors.info);
    toast.textContent = message;
    document.body.appendChild(toast);

    requestAnimationFrame(function () {
      toast.classList.remove("translate-y-2", "opacity-0");
      toast.classList.add("translate-y-0", "opacity-100");
    });

    setTimeout(function () {
      toast.classList.remove("translate-y-0", "opacity-100");
      toast.classList.add("translate-y-2", "opacity-0");
      setTimeout(function () {
        toast.remove();
      }, 300);
    }, 3000);
  };

  // ── Rating stars ──
  window.initRatingStars = function (container, options) {
    options = options || {};
    var initial = options.initial || 0;
    var onChange = options.onChange || function () {};
    var current = initial;

    container.innerHTML = "";
    for (var i = 1; i <= 5; i++) {
      var star = document.createElement("button");
      star.type = "button";
      star.dataset.value = i;
      star.className = "text-2xl transition-colors " + (i <= current ? "text-yellow-400" : "text-zinc-600");
      star.textContent = "★";
      star.setAttribute("aria-label", i + " estrela" + (i > 1 ? "s" : ""));

      star.addEventListener("mouseenter", function () {
        var val = parseInt(this.dataset.value);
        container.querySelectorAll("button").forEach(function (s, idx) {
          s.className = "text-2xl transition-colors " + (idx < val ? "text-yellow-400" : "text-zinc-600");
        });
      });

      star.addEventListener("mouseleave", function () {
        container.querySelectorAll("button").forEach(function (s, idx) {
          s.className = "text-2xl transition-colors " + (idx < current ? "text-yellow-400" : "text-zinc-600");
        });
      });

      star.addEventListener("click", function () {
        current = parseInt(this.dataset.value);
        onChange(current);
      });

      container.appendChild(star);
    }

    return {
      getValue: function () {
        return current;
      },
      setValue: function (val) {
        current = val;
        container.querySelectorAll("button").forEach(function (s, idx) {
          s.className = "text-2xl transition-colors " + (idx < val ? "text-yellow-400" : "text-zinc-600");
        });
      },
    };
  };
})();
