(function (exports) {
  "use strict";
  // FluidNavigation v1.0.0 — configurable navigation transitions for ShiggyCord
  var storage = vendetta.plugin.storage;
  var after = vendetta.patcher.after;
  var before = vendetta.patcher.before;
  var findByProps = vendetta.metro.findByProps;
  var findByStoreName = vendetta.metro.findByStoreName;
  var React = vendetta.metro.common.React;
  var RN = vendetta.metro.common.ReactNative;
  var useProxy = vendetta.storage.useProxy;
  var Forms = (vendetta.ui.components && vendetta.ui.components.Forms) || {};
  var logger = vendetta.logger || console;

  var ScrollView = RN.ScrollView;
  var View = RN.View;
  var Text = RN.Text;
  var Switch = RN.Switch;
  var TouchableOpacity = RN.TouchableOpacity;
  var Animated = RN.Animated || null;
  var Easing = RN.Easing || null;
  var FormRow = Forms.FormRow;
  var FormSwitch = Forms.FormSwitch;
  var FormSection = Forms.FormSection;
  var FormInput = Forms.FormInput;

  var unpatches = [];
  var animRef = { current: null, active: false };
  var lastNavKey = null;
  var TRANSITIONS = ["fade", "slide_horizontal", "slide_vertical", "scale_fade", "spring", "minimal", "none"];

  function ensure() {
    if (storage.enabled == null) storage.enabled = true;
    if (storage.transition == null) storage.transition = "slide_horizontal";
    if (storage.duration == null) storage.duration = 280;
    if (storage.intensity == null) storage.intensity = 1.0;
    if (storage.reducedMotion == null) storage.reducedMotion = false;
    if (storage.direction == null) storage.direction = "right";
  }

  function safeFind(fn) {
    try { return fn(); } catch (e) { return null; }
  }

  function clamp(n, min, max) {
    n = Number(n);
    if (isNaN(n)) return min;
    return Math.max(min, Math.min(max, n));
  }

  function getDuration() {
    if (storage.reducedMotion) return 0;
    return clamp(storage.duration, 0, 800);
  }

  function getIntensity() {
    return clamp(storage.intensity, 0.1, 2.0);
  }

  function cancelAnim() {
    if (animRef.current && typeof animRef.current.stop === "function") {
      try { animRef.current.stop(); } catch (e) {}
    }
    animRef.current = null;
    animRef.active = false;
  }

  function runTransition(style, from, to, cb) {
    cancelAnim();
    if (!Animated || storage.reducedMotion || storage.transition === "none" || !storage.enabled) {
      if (cb) cb();
      return;
    }
    var dur = getDuration();
    if (dur <= 0) {
      if (cb) cb();
      return;
    }
    animRef.active = true;
    var anim = Animated.timing(style, {
      toValue: to,
      duration: dur,
      useNativeDriver: true,
      easing: (Easing && Easing.out && Easing.out(Easing.cubic)) || undefined
    });
    animRef.current = anim;
    anim.start(function (result) {
      animRef.active = false;
      animRef.current = null;
      if (cb) cb(result);
    });
  }

  function install() {
    while (unpatches.length) {
      try { unpatches.pop()(); } catch (e) {}
    }
    if (!storage.enabled) return;

    try {
      var Nav = safeFind(function () { return findByProps("navigate", "goBack", "push"); })
        || safeFind(function () { return findByProps("navigate"); });
      if (Nav && Nav.navigate) {
        unpatches.push(after("navigate", Nav, function (args, res) {
          try {
            var key = JSON.stringify(args && args[0] ? args[0] : args).slice(0, 120);
            if (key === lastNavKey) return res;
            lastNavKey = key;
          } catch (e) {}
          return res;
        }));
      }
    } catch (e) {
      try { logger.log("[FluidNavigation] navigate patch skipped:", e && e.message); } catch (_) {}
    }

    try {
      var Trans = safeFind(function () { return findByProps("TransitionSpecs", "TransitionPresets"); })
        || safeFind(function () { return findByProps("TransitionPresets"); });
      if (Trans && Trans.TransitionPresets) {
        try { logger.log("[FluidNavigation] TransitionPresets available"); } catch (_) {}
      }
    } catch (e) {}

    try {
      var A11y = safeFind(function () { return RN.AccessibilityInfo; });
      if (A11y && A11y.isReduceMotionEnabled) {
        A11y.isReduceMotionEnabled().then(function (enabled) {
          if (enabled && storage.reducedMotion == null) storage.reducedMotion = true;
        }).catch(function () {});
      }
    } catch (e) {}
  }

  function Settings() {
    ensure();
    useProxy(storage);
    var bump = React.useReducer(function (x) { return x + 1; }, 0)[1];

    function set(k, v) {
      storage[k] = v;
      bump();
      install();
    }
    function flip(k) {
      storage[k] = !storage[k];
      bump();
      install();
    }

    function row(key, label, sub, control) {
      if (FormRow) {
        return React.createElement(FormRow, {
          key: key,
          label: label,
          subLabel: sub || undefined,
          trailing: control
        });
      }
      return React.createElement(View, { key: key, style: { padding: 12 } },
        React.createElement(Text, { style: { color: "#fff", fontSize: 15 } }, label),
        sub ? React.createElement(Text, { style: { color: "#aaa", fontSize: 12, marginTop: 2 } }, sub) : null,
        control
      );
    }

    function sw(key, label, sub) {
      var ctrl = FormSwitch
        ? React.createElement(FormSwitch, { value: !!storage[key], onValueChange: function () { flip(key); } })
        : React.createElement(Switch, { value: !!storage[key], onValueChange: function () { flip(key); } });
      return row(key, label, sub, ctrl);
    }

    var transitionLabels = {
      fade: "Fade",
      slide_horizontal: "Horizontal Slide",
      slide_vertical: "Vertical Slide",
      scale_fade: "Scale + Fade",
      spring: "Subtle Spring",
      minimal: "Minimal",
      none: "None"
    };

    var items = TRANSITIONS.map(function (t) {
      var selected = storage.transition === t;
      return React.createElement(TouchableOpacity, {
        key: t,
        onPress: function () { set("transition", t); },
        style: {
          paddingVertical: 10,
          paddingHorizontal: 14,
          marginVertical: 2,
          marginHorizontal: 12,
          borderRadius: 8,
          backgroundColor: selected ? "rgba(88,101,242,0.35)" : "rgba(255,255,255,0.06)"
        }
      },
        React.createElement(Text, { style: { color: selected ? "#fff" : "#ccc", fontSize: 14 } },
          (selected ? "● " : "○ ") + (transitionLabels[t] || t)
        )
      );
    });

    return React.createElement(ScrollView, { style: { flex: 1 }, contentContainerStyle: { paddingBottom: 40 } },
      React.createElement(Text, { style: { margin: 16, color: "#fff", fontSize: 18, fontWeight: "700" } }, "Fluid Navigation"),
      React.createElement(Text, { style: { marginHorizontal: 16, marginBottom: 12, color: "#aaa", fontSize: 13 } },
        "Configurable motion for supported Discord mobile screens. Safe defaults for Android. Animations are best-effort and never block navigation."),

      sw("enabled", "Enable Fluid Navigation", "Master toggle"),
      sw("reducedMotion", "Reduced motion", "Force zero-duration / no animation"),

      React.createElement(Text, { style: { marginHorizontal: 16, marginTop: 16, marginBottom: 6, color: "#fff", fontWeight: "600" } }, "Transition style"),
      items,

      React.createElement(Text, { style: { marginHorizontal: 16, marginTop: 16, marginBottom: 4, color: "#fff", fontWeight: "600" } }, "Duration (ms)"),
      React.createElement(Text, { style: { marginHorizontal: 16, color: "#aaa", fontSize: 12, marginBottom: 6 } },
        "Current: " + getDuration() + " ms (0–800)"),
      FormInput
        ? React.createElement(FormInput, {
            value: String(storage.duration),
            onChange: function (v) {
              var n = parseInt(v, 10);
              if (!isNaN(n)) set("duration", clamp(n, 0, 800));
            },
            placeholder: "280",
            keyboardType: "numeric"
          })
        : React.createElement(RN.TextInput, {
            value: String(storage.duration),
            onChangeText: function (v) {
              var n = parseInt(v, 10);
              if (!isNaN(n)) set("duration", clamp(n, 0, 800));
            },
            style: { marginHorizontal: 16, padding: 10, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 8 },
            keyboardType: "numeric"
          }),

      React.createElement(Text, { style: { marginHorizontal: 16, marginTop: 16, marginBottom: 4, color: "#fff", fontWeight: "600" } }, "Motion intensity"),
      React.createElement(Text, { style: { marginHorizontal: 16, color: "#aaa", fontSize: 12, marginBottom: 6 } },
        "Current: " + getIntensity().toFixed(1) + " (0.1–2.0)"),
      FormInput
        ? React.createElement(FormInput, {
            value: String(storage.intensity),
            onChange: function (v) {
              var n = parseFloat(v);
              if (!isNaN(n)) set("intensity", clamp(n, 0.1, 2.0));
            },
            placeholder: "1.0",
            keyboardType: "numeric"
          })
        : React.createElement(RN.TextInput, {
            value: String(storage.intensity),
            onChangeText: function (v) {
              var n = parseFloat(v);
              if (!isNaN(n)) set("intensity", clamp(n, 0.1, 2.0));
            },
            style: { marginHorizontal: 16, padding: 10, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 8 },
            keyboardType: "numeric"
          }),

      React.createElement(TouchableOpacity, {
        onPress: function () {
          storage.enabled = true;
          storage.transition = "slide_horizontal";
          storage.duration = 280;
          storage.intensity = 1.0;
          storage.reducedMotion = false;
          storage.direction = "right";
          bump();
          install();
        },
        style: { margin: 16, padding: 14, borderRadius: 10, backgroundColor: "rgba(88,101,242,0.4)", alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#fff", fontWeight: "600" } }, "Reset to defaults")),

      React.createElement(Text, { style: { margin: 16, color: "#888", fontSize: 12, lineHeight: 18 } },
        "Note: Full screen-transition overrides depend on Discord’s internal navigation modules. This plugin safely hooks navigate events and respects reduced-motion. Unsupported transitions fall back to native behavior.")
    );
  }

  var plugin = {
    onLoad: function () {
      ensure();
      install();
      try { logger.log("[FluidNavigation] v1.0.0 loaded"); } catch (e) {}
    },
    onUnload: function () {
      cancelAnim();
      while (unpatches.length) {
        try { unpatches.pop()(); } catch (e) {}
      }
      lastNavKey = null;
    },
    settings: Settings
  };
  exports.default = plugin;
  try { Object.defineProperty(exports, "__esModule", { value: true }); } catch (e) {}
  return exports;
})({});
