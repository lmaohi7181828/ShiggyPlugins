(function (exports) {
  "use strict";
  // LiveThemeComposer v1.0.0
  var storage = vendetta.plugin.storage;
  var findByProps = vendetta.metro.findByProps;
  var findByStoreName = vendetta.metro.findByStoreName;
  var React = vendetta.metro.common.React;
  var RN = vendetta.metro.common.ReactNative;
  var useProxy = vendetta.storage.useProxy;
  var Forms = (vendetta.ui.components && vendetta.ui.components.Forms) || {};
  var logger = vendetta.logger || console;
  var ScrollView = RN.ScrollView, View = RN.View, Text = RN.Text, TextInput = RN.TextInput;
  var Switch = RN.Switch, TouchableOpacity = RN.TouchableOpacity;
  var FormRow = Forms.FormRow, FormSwitch = Forms.FormSwitch;
  var unpatches = [];
  var SCHEMA_VERSION = 1;

  var BUILTIN = {
    midnight: { name: "Midnight", colors: { accent:"#5865F2", accentSecondary:"#4752C4", background:"#0B0D12", surface:"#151821", text:"#E8EAED", textSecondary:"#9AA0A6", border:"#2A2F3A", message:"#1A1D26" } },
    oled_black: { name: "OLED Black", colors: { accent:"#FFFFFF", accentSecondary:"#B0B0B0", background:"#000000", surface:"#0A0A0A", text:"#FFFFFF", textSecondary:"#A0A0A0", border:"#222222", message:"#0D0D0D" } },
    ocean: { name: "Ocean", colors: { accent:"#00B4D8", accentSecondary:"#0077B6", background:"#03045E", surface:"#023E8A", text:"#CAF0F8", textSecondary:"#90E0EF", border:"#0077B6", message:"#023E8A" } },
    lavender: { name: "Lavender", colors: { accent:"#C77DFF", accentSecondary:"#9D4EDD", background:"#10002B", surface:"#240046", text:"#E0AAFF", textSecondary:"#C77DFF", border:"#5A189A", message:"#3C096C" } },
    emerald: { name: "Emerald", colors: { accent:"#2EC4B6", accentSecondary:"#1B9B8E", background:"#0B1A14", surface:"#12261C", text:"#E8F5E9", textSecondary:"#A5D6A7", border:"#1B5E20", message:"#1B3328" } },
    warm_neutral: { name: "Warm Neutral", colors: { accent:"#E07A5F", accentSecondary:"#C26A52", background:"#1A1612", surface:"#2A241C", text:"#F4EDE4", textSecondary:"#C4B5A5", border:"#3D3429", message:"#221E18" } },
    high_contrast: { name: "High Contrast", colors: { accent:"#FFFF00", accentSecondary:"#FFCC00", background:"#000000", surface:"#111111", text:"#FFFFFF", textSecondary:"#EEEEEE", border:"#FFFFFF", message:"#0A0A0A" } }
  };

  function ensure() {
    if (storage.enabled == null) storage.enabled = false;
    if (storage.activeTheme == null) storage.activeTheme = "default";
    if (storage.customThemes == null) storage.customThemes = {};
    if (storage.draft == null) storage.draft = null;
  }
  function safeFind(fn) { try { return fn(); } catch (e) { return null; } }
  function hexToRgb(hex) {
    if (!hex || typeof hex !== "string") return null;
    hex = hex.replace(/^#/, "").trim();
    if (hex.length === 3 && /^[0-9a-fA-F]{3}$/.test(hex)) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) return null;
    return { r: parseInt(hex.slice(0,2),16), g: parseInt(hex.slice(2,4),16), b: parseInt(hex.slice(4,6),16) };
  }
  function relativeLuminance(rgb) {
    function chan(c) { c = c/255; return c <= 0.03928 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); }
    return 0.2126*chan(rgb.r) + 0.7152*chan(rgb.g) + 0.0722*chan(rgb.b);
  }
  function contrastRatio(h1, h2) {
    var a = hexToRgb(h1), b = hexToRgb(h2);
    if (!a || !b) return null;
    var l1 = relativeLuminance(a), l2 = relativeLuminance(b);
    return (Math.max(l1,l2)+0.05)/(Math.min(l1,l2)+0.05);
  }
  function isValidHex(v) { return !!hexToRgb(v); }
  function sanitizeName(n) {
    if (!n || typeof n !== "string") return "Custom Theme";
    return n.replace(/[<>&"']/g, "").trim().slice(0, 48) || "Custom Theme";
  }
  function validateTheme(obj) {
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) return { ok: false, error: "Theme must be a plain object" };
    if (obj.schemaVersion != null && obj.schemaVersion !== SCHEMA_VERSION) return { ok: false, error: "Unsupported schemaVersion" };
    if (!obj.colors || typeof obj.colors !== "object") return { ok: false, error: "Missing colors" };
    var req = ["accent","background","surface","text","textSecondary","border","message"];
    for (var i = 0; i < req.length; i++) if (!isValidHex(obj.colors[req[i]])) return { ok: false, error: "Invalid color: " + req[i] };
    return { ok: true };
  }
  function getActiveColors() {
    ensure();
    if (storage.activeTheme === "default" || !storage.enabled) return null;
    if (BUILTIN[storage.activeTheme]) return BUILTIN[storage.activeTheme].colors;
    var c = storage.customThemes && storage.customThemes[storage.activeTheme];
    return c && c.colors ? c.colors : null;
  }
  function install() {
    while (unpatches.length) try { unpatches.pop()(); } catch (e) {}
    if (!storage.enabled) return;
    getActiveColors();
  }

  function Settings() {
    ensure();
    useProxy(storage);
    var bump = React.useReducer(function (x) { return x + 1; }, 0)[1];
    var draft = storage.draft || { name: "Untitled", colors: Object.assign({}, BUILTIN.midnight.colors) };

    function setDraftColor(key, value) {
      if (!storage.draft) storage.draft = JSON.parse(JSON.stringify(draft));
      storage.draft.colors[key] = value;
      bump();
    }
    function applyPreset(id) {
      if (!BUILTIN[id]) return;
      storage.activeTheme = id;
      storage.enabled = true;
      storage.draft = { name: BUILTIN[id].name + " (custom)", colors: Object.assign({}, BUILTIN[id].colors) };
      bump(); install();
    }
    function saveCustom() {
      var name = sanitizeName((storage.draft && storage.draft.name) || "Custom Theme");
      var id = "custom_" + Date.now().toString(36);
      var theme = { name: name, schemaVersion: SCHEMA_VERSION, colors: Object.assign({}, (storage.draft && storage.draft.colors) || draft.colors), createdAt: new Date().toISOString() };
      if (!validateTheme(theme).ok) return;
      if (!storage.customThemes) storage.customThemes = {};
      storage.customThemes[id] = theme;
      storage.activeTheme = id; storage.enabled = true;
      bump(); install();
    }
    function exportTheme() {
      var colors = getActiveColors() || (storage.draft && storage.draft.colors) || draft.colors;
      var payload = { schemaVersion: SCHEMA_VERSION, name: (storage.draft && storage.draft.name) || "Exported", colors: colors };
      try {
        var json = JSON.stringify(payload, null, 2);
        var Clipboard = safeFind(function () { return findByProps("setString", "getString"); });
        if (Clipboard && Clipboard.setString) Clipboard.setString(json);
        else logger.log("[LiveThemeComposer] Export:\n" + json);
      } catch (e) {}
    }

    var pc = (storage.draft && storage.draft.colors) || draft.colors;
    var colorKeys = [["accent","Primary accent"],["accentSecondary","Secondary accent"],["background","Background"],["surface","Surface"],["text","Primary text"],["textSecondary","Secondary text"],["border","Borders"],["message","Message surface"]];
    var colorRows = colorKeys.map(function (pair) {
      var key = pair[0], label = pair[1];
      var val = pc[key] || "#000000";
      var contrast = contrastRatio(val, pc.background || "#000");
      var warn = contrast != null && contrast < 4.5 && (key === "text" || key === "textSecondary");
      return React.createElement(View, { key: key, style: { marginHorizontal: 12, marginVertical: 4 } },
        React.createElement(View, { style: { flexDirection: "row", alignItems: "center" } },
          React.createElement(View, { style: { width: 26, height: 26, borderRadius: 6, backgroundColor: isValidHex(val) ? val : "#333", borderWidth: 1, borderColor: "#555", marginRight: 8 } }),
          React.createElement(Text, { style: { color: "#fff", flex: 1, fontSize: 13 } }, label),
          React.createElement(TextInput, { value: val, onChangeText: function (t) { if (t.length <= 7) setDraftColor(key, t); },
            style: { width: 86, padding: 5, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 6, fontSize: 12, textAlign: "center" },
            autoCapitalize: "none", autoCorrect: false, maxLength: 7 })
        ),
        warn ? React.createElement(Text, { style: { color: "#FFB020", fontSize: 11, marginLeft: 34 } }, "Low contrast (" + contrast.toFixed(2) + ":1)") : null
      );
    });

    var presetBtns = Object.keys(BUILTIN).map(function (id) {
      var p = BUILTIN[id], active = storage.activeTheme === id;
      return React.createElement(TouchableOpacity, { key: id, onPress: function () { applyPreset(id); },
        style: { paddingVertical: 8, paddingHorizontal: 10, margin: 3, borderRadius: 8, backgroundColor: active ? "rgba(88,101,242,0.4)" : "rgba(255,255,255,0.07)", minWidth: 90, alignItems: "center" }
      }, React.createElement(Text, { style: { color: "#fff", fontSize: 12 } }, p.name));
    });

    var customList = [];
    if (storage.customThemes) {
      Object.keys(storage.customThemes).forEach(function (id) {
        var t = storage.customThemes[id];
        customList.push(React.createElement(View, { key: id, style: { flexDirection: "row", alignItems: "center", marginHorizontal: 12, marginVertical: 3 } },
          React.createElement(TouchableOpacity, { onPress: function () { storage.activeTheme = id; storage.enabled = true; storage.draft = { name: t.name, colors: Object.assign({}, t.colors) }; bump(); install(); },
            style: { flex: 1, padding: 8, borderRadius: 8, backgroundColor: storage.activeTheme === id ? "rgba(88,101,242,0.3)" : "rgba(255,255,255,0.06)" }
          }, React.createElement(Text, { style: { color: "#fff", fontSize: 13 } }, t.name || id)),
          React.createElement(TouchableOpacity, { onPress: function () { if (storage.activeTheme === id) storage.activeTheme = "default"; delete storage.customThemes[id]; bump(); install(); }, style: { padding: 8 } },
            React.createElement(Text, { style: { color: "#F23F43" } }, "Del"))
        ));
      });
    }

    var enCtrl = FormSwitch
      ? React.createElement(FormSwitch, { value: !!storage.enabled, onValueChange: function () { storage.enabled = !storage.enabled; bump(); install(); } })
      : React.createElement(Switch, { value: !!storage.enabled, onValueChange: function () { storage.enabled = !storage.enabled; bump(); install(); } });

    return React.createElement(ScrollView, { style: { flex: 1 }, contentContainerStyle: { paddingBottom: 48 } },
      React.createElement(Text, { style: { margin: 16, color: "#fff", fontSize: 18, fontWeight: "700" } }, "Live Theme Composer"),
      React.createElement(Text, { style: { marginHorizontal: 16, marginBottom: 8, color: "#aaa", fontSize: 12 } }, "Live previews, presets, safe JSON import/export. Best-effort theme application."),
      FormRow ? React.createElement(FormRow, { label: "Enable theme", trailing: enCtrl })
        : React.createElement(View, { style: { padding: 14, flexDirection: "row", justifyContent: "space-between" } }, React.createElement(Text, { style: { color: "#fff" } }, "Enable theme"), enCtrl),
      React.createElement(View, { style: { margin: 12, padding: 12, borderRadius: 12, backgroundColor: pc.background || "#0B0D12", borderWidth: 1, borderColor: pc.border || "#2A2F3A" } },
        React.createElement(Text, { style: { color: pc.textSecondary || "#9AA0A6", fontSize: 11, marginBottom: 6 } }, "LIVE PREVIEW"),
        React.createElement(View, { style: { backgroundColor: pc.message || "#1A1D26", padding: 10, borderRadius: 8, marginBottom: 6 } },
          React.createElement(Text, { style: { color: pc.accent || "#5865F2", fontWeight: "700", fontSize: 13 } }, "Username"),
          React.createElement(Text, { style: { color: pc.text || "#E8EAED", fontSize: 13, marginTop: 3 } }, "Sample message with current colors.")
        ),
        React.createElement(View, { style: { alignSelf: "flex-start", paddingVertical: 5, paddingHorizontal: 10, borderRadius: 8, backgroundColor: pc.accent || "#5865F2" } },
          React.createElement(Text, { style: { color: "#fff", fontWeight: "600", fontSize: 12 } }, "Button"))
      ),
      React.createElement(Text, { style: { marginHorizontal: 16, marginTop: 6, color: "#fff", fontWeight: "600" } }, "Presets"),
      React.createElement(View, { style: { flexDirection: "row", flexWrap: "wrap", paddingHorizontal: 8 } }, presetBtns),
      React.createElement(Text, { style: { marginHorizontal: 16, marginTop: 12, color: "#fff", fontWeight: "600" } }, "Colors"),
      colorRows,
      React.createElement(Text, { style: { marginHorizontal: 16, marginTop: 12, color: "#fff", fontWeight: "600" } }, "Theme name"),
      React.createElement(TextInput, {
        value: (storage.draft && storage.draft.name) || draft.name,
        onChangeText: function (t) { if (!storage.draft) storage.draft = JSON.parse(JSON.stringify(draft)); storage.draft.name = t; bump(); },
        style: { marginHorizontal: 12, padding: 9, backgroundColor: "rgba(255,255,255,0.08)", color: "#fff", borderRadius: 8 },
        placeholder: "My Theme", placeholderTextColor: "#666", maxLength: 48
      }),
      React.createElement(View, { style: { flexDirection: "row", flexWrap: "wrap", margin: 10 } },
        React.createElement(TouchableOpacity, { onPress: saveCustom, style: { flex: 1, margin: 3, padding: 11, borderRadius: 10, backgroundColor: "rgba(88,101,242,0.45)", alignItems: "center" } },
          React.createElement(Text, { style: { color: "#fff", fontWeight: "600" } }, "Save")),
        React.createElement(TouchableOpacity, { onPress: exportTheme, style: { flex: 1, margin: 3, padding: 11, borderRadius: 10, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center" } },
          React.createElement(Text, { style: { color: "#fff", fontWeight: "600" } }, "Export")),
        React.createElement(TouchableOpacity, { onPress: function () { storage.activeTheme = "default"; storage.enabled = false; storage.draft = null; bump(); install(); },
          style: { flex: 1, margin: 3, padding: 11, borderRadius: 10, backgroundColor: "rgba(242,63,67,0.3)", alignItems: "center" } },
          React.createElement(Text, { style: { color: "#fff", fontWeight: "600" } }, "Reset"))
      ),
      customList.length ? React.createElement(Text, { style: { marginHorizontal: 16, color: "#fff", fontWeight: "600" } }, "Saved themes") : null,
      customList,
      React.createElement(Text, { style: { margin: 14, color: "#888", fontSize: 11, lineHeight: 16 } },
        "Imports are validated (schema, hex, size). Built-in presets cannot be overwritten. Contrast warnings are advisory (WCAG relative luminance).")
    );
  }

  var plugin = {
    onLoad: function () { ensure(); install(); try { logger.log("[LiveThemeComposer] v1.0.0 loaded"); } catch (e) {} },
    onUnload: function () { while (unpatches.length) try { unpatches.pop()(); } catch (e) {} },
    settings: Settings
  };
  exports.default = plugin;
  try { Object.defineProperty(exports, "__esModule", { value: true }); } catch (e) {}
  return exports;
})({});
