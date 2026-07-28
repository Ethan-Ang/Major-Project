(function () {
  'use strict';

  var translations = {
    "nf.page_title": "页面未找到 | Yee Lim Adhesives Industries",
    "nf.skip": "跳至主要内容",
    "nf.eyebrow": "404 · 页面未找到",
    "nf.title": "找不到您要访问的页面",
    "nf.lead": "您要访问的页面可能已被移动、重命名或不存在。让我们帮助您重新找到所需内容。",
    "nf.search_label": "按产品名称、编号、品牌或关键词搜索",
    "nf.search_ph": "按产品名称、编号、品牌或关键词搜索……",
    "nf.search": "搜索",
    "nf.help": "您可以前往",
    "nf.browse": "浏览产品",
    "nf.browse_copy": "查看我们的全系列工商业胶粘剂。",
    "nf.contact": "联系 Yee Lim",
    "nf.contact_copy": "我们的团队可协助您进行产品选型、技术支持和询价。",
    "nf.about": "关于 Yee Lim",
    "nf.about_copy": "了解我们对品质与工业粘合解决方案的承诺。"
  };

  function matchingElements(root, selector) {
    var elements = [];

    if (typeof root.matches === 'function' && root.matches(selector)) {
      elements.push(root);
    }

    return elements.concat(Array.prototype.slice.call(root.querySelectorAll(selector)));
  }

  function apply(root) {
    if (window.ylLang !== 'zh') {
      return;
    }

    root = root || document;

    matchingElements(root, '[data-nf-i18n]').forEach(function (element) {
      var key = element.getAttribute('data-nf-i18n');
      if (Object.prototype.hasOwnProperty.call(translations, key)) {
        element.textContent = translations[key];
      }
    });

    matchingElements(root, '[data-nf-i18n-attr]').forEach(function (element) {
      element.getAttribute('data-nf-i18n-attr').split(',').forEach(function (pair) {
        var separator = pair.indexOf(':');
        if (separator === -1) {
          return;
        }

        var attribute = pair.slice(0, separator).trim();
        var key = pair.slice(separator + 1).trim();
        var value = translations[key];
        if (
          ((attribute === 'placeholder' && key === 'nf.search_ph') ||
            (attribute === 'aria-label' && key === 'nf.search')) &&
          Object.prototype.hasOwnProperty.call(translations, key) &&
          typeof value === 'string'
        ) {
          element.setAttribute(attribute, value);
        }
      });
    });
  }

  window.ylApplyNotFoundI18n = apply;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      apply(document);
    });
  } else {
    apply(document);
  }
}());
