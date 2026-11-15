// Sunset Circuit Drift — split-binary loader (GitHub Pages).
// index.wasm / index.pck are stored as base64 text chunks (index.*.b64.NN at repo root)
// because the GitHub API cannot receive raw binary through this pipeline.
// The Godot engine fetches them with fetch(); this override serves the
// reassembled bytes instead. Cache-busting ?v= forces fresh chunks.
(function () {
  var VERSION = 'v1-20261115';
  var WASM_PARTS = 16;
  var PCK_PARTS = 1;
  var cache = {};
  function b64ToBytes(b64) {
    var bin = atob(b64);
    var bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return bytes;
  }
  function loadAssembled(kind) {
    if (cache[kind]) return Promise.resolve(cache[kind]);
    var parts = kind === 'wasm' ? WASM_PARTS : PCK_PARTS;
    var base = kind === 'wasm' ? 'index.wasm.b64.' : 'index.pck.b64.';
    var seq = Promise.resolve([]);
    for (var i = 0; i < parts; i++) {
      (function (idx) {
        seq = seq.then(function (arr) {
          var name = base + ('0' + idx).slice(-2);
          return fetch(name + '?v=' + VERSION, {credentials: 'same-origin'}).then(function (r) {
            if (!r.ok) throw new Error('chunk load failed: ' + name);
            return r.text();
          }).then(function (t) {
            arr.push(b64ToBytes(t.trim()));
            return arr;
          });
        });
      })(i);
    }
    return seq.then(function (chunks) {
      var total = 0, j;
      for (j = 0; j < chunks.length; j++) total += chunks[j].length;
      var out = new Uint8Array(total), off = 0;
      for (j = 0; j < chunks.length; j++) { out.set(chunks[j], off); off += chunks[j].length; }
      var blob = new Blob([out], {type: kind === 'wasm' ? 'application/wasm' : 'application/octet-stream'});
      cache[kind] = blob;
      return blob;
    });
  }
  var origFetch = window.fetch.bind(window);
  window.fetch = function (input, init) {
    var url = String((input && input.url) || input);
    if (url.indexOf('index.wasm') !== -1) {
      return loadAssembled('wasm').then(function (blob) {
        return new Response(blob, {headers: {'Content-Type': 'application/wasm'}});
      });
    }
    if (url.indexOf('index.pck') !== -1) {
      return loadAssembled('pck').then(function (blob) {
        return new Response(blob, {headers: {'Content-Type': 'application/octet-stream'}});
      });
    }
    return origFetch(input, init);
  };
})();
