/* Sanal Laboratuvar · gerçekçi 3D tezgâh (lab-3d.js)
   three.js ile çizer. Kaplar tezgâha eklenip kaldırılabilir; şişe ya da kap başka bir
   kabın üstüne sürüklenince eğilip döker. WebGL yoksa 2D çizim olduğu gibi kalır.
   Görevler (lab-gorev.js) buradaki araç takımını (LabArayuz.uc) kullanır. */
(function () {
  'use strict';
  var KURULDU = false;
  function dene() {
    if (KURULDU || !window.THREE || !window.LabArayuz || !window.LabMotor) return;
    KURULDU = true;
    try { kur(); } catch (e) { if (window.console) console.warn('3D tezgâh açılamadı:', e); }
  }
  window.addEventListener('lab3d-hazir', dene);
  dene();

  function kur() {
    var T = window.THREE, LA = window.LabArayuz, M = window.LabMotor, Y = M.yaz;
    var kutu = document.querySelector('#m-serbest .tezgah'), cv2 = document.getElementById('lb-tezgah');
    if (!kutu || !cv2) return;
    var R;
    try { R = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!window.LAB_KAYIT }); } catch (e) { return; }
    if (!R.getContext()) return;
    R.setPixelRatio(Math.min(window.LAB_KAYIT ? 3 : 2, window.devicePixelRatio || 1));
    R.outputColorSpace = T.SRGBColorSpace;
    R.toneMapping = T.NeutralToneMapping; R.toneMappingExposure = 1.02;
    R.domElement.className = 'uc';
    R.domElement.setAttribute('role', 'img');
    R.domElement.setAttribute('aria-label', 'Laboratuvar tezgâhı. Bir kaba dokunarak seç; şişeyi ya da kabı başka bir kabın üstüne sürükleyerek dök.');
    var sahne = new T.Scene();
    sahne.background = new T.Color('#EEF0F3');
    if (window.THREE_ODA) { var pm = new T.PMREMGenerator(R); sahne.environment = pm.fromScene(new window.THREE_ODA(), 0.04).texture; }
    var kam = new T.PerspectiveCamera(24, 1.4, 0.1, 80);
    sahne.add(new T.HemisphereLight('#ffffff', '#cfd6de', 1.05));
    var anaIsik = new T.DirectionalLight('#fff6ec', 2.3); anaIsik.position.set(-3, 7, 6); sahne.add(anaIsik);
    var dolgu = new T.DirectionalLight('#eaf2ff', 0.7); dolgu.position.set(6, 3, 4); sahne.add(dolgu);
    var kirli = 3;

    /* ================= DOKULAR ================= */
    function tuval(w, h, f) { var c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); var t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 4; t.userData.cv = c; return t; }
    var golgeD = tuval(256, 256, function (c) { var g = c.createRadialGradient(128, 128, 6, 128, 128, 128); g.addColorStop(0, 'rgba(20,24,30,.55)'); g.addColorStop(0.5, 'rgba(20,24,30,.22)'); g.addColorStop(1, 'rgba(20,24,30,0)'); c.fillStyle = g; c.fillRect(0, 0, 256, 256); });
    var yumusakD = tuval(128, 128, function (c) { var g = c.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.45, 'rgba(255,255,255,.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = g; c.fillRect(0, 0, 128, 128); });
    var karoD = tuval(4, 4, function (c, w, h) { c.fillStyle = '#F4F1ED'; c.fillRect(0, 0, w, h); });
    /* açık renkli tezgâh yüzeyi (epoksi): çok ince benekler */
    var tezgahD = tuval(512, 512, function (c, w, h) {
      c.fillStyle = '#E9E4DE'; c.fillRect(0, 0, w, h);
      for (var i = 0; i < 2600; i++) { var v = 196 + Math.random() * 34; c.fillStyle = 'rgba(' + v + ',' + (v - 6) + ',' + (v - 14) + ',' + (0.18 + Math.random() * 0.22) + ')'; c.fillRect(Math.random() * w, Math.random() * h, 1.3, 1.3); }
    });
    tezgahD.wrapS = tezgahD.wrapT = T.RepeatWrapping; tezgahD.repeat.set(4, 3);
    /* tezgâhın arka kısmı fona karışsın diye saydamlık geçişi (üst = uzak kenar) */
    var tezgahA = tuval(8, 256, function (c, w, h) { var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#000'); g.addColorStop(0.42, '#000'); g.addColorStop(0.7, '#fff'); g.addColorStop(1, '#fff'); c.fillStyle = g; c.fillRect(0, 0, w, h); });
    /* stüdyo fonu: yumuşak geçiş, bulanık ışık lekeleri ve çok silik altıgen (benzen) deseni */
    var fonD = tuval(1024, 1024, function (c, w, h) {
      var g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#D7E3EF'); g.addColorStop(0.5, '#ECEFF3'); g.addColorStop(0.78, '#F6F2ED'); g.addColorStop(1, '#F8F4EF'); c.fillStyle = g; c.fillRect(0, 0, w, h);
      [[0.14, 0.16, 170, '255,146,84', 0.2], [0.84, 0.1, 210, '110,170,230', 0.22], [0.56, 0.27, 120, '186,150,236', 0.16], [0.3, 0.4, 90, '255,196,110', 0.15], [0.93, 0.42, 130, '96,196,186', 0.15], [0.04, 0.47, 110, '140,184,240', 0.13], [0.7, 0.05, 80, '255,160,130', 0.17], [0.42, 0.08, 60, '120,200,170', 0.12]].forEach(function (b) {
        var x = b[0] * w, y = b[1] * h, r = b[2], rg = c.createRadialGradient(x, y, r * 0.15, x, y, r);
        rg.addColorStop(0, 'rgba(' + b[3] + ',' + b[4] + ')'); rg.addColorStop(0.65, 'rgba(' + b[3] + ',' + (b[4] * 0.55) + ')'); rg.addColorStop(1, 'rgba(' + b[3] + ',0)');
        c.fillStyle = rg; c.beginPath(); c.arc(x, y, r, 0, 7); c.fill();
      });
      c.lineWidth = 2.2; var s = 46, hx = s * Math.sqrt(3);
      for (var yy = 0; yy < h * 0.62; yy += s * 1.5) for (var xx = -hx; xx < w + hx; xx += hx) {
        var ox = xx + ((Math.round(yy / (s * 1.5)) % 2) ? hx / 2 : 0), al = 0.055 * (1 - yy / (h * 0.62));
        c.strokeStyle = 'rgba(80,104,140,' + al.toFixed(3) + ')'; c.beginPath();
        for (var k = 0; k <= 6; k++) { var a = Math.PI / 6 + k * Math.PI / 3, px = ox + s * Math.cos(a), py = yy + s * Math.sin(a); if (k) c.lineTo(px, py); else c.moveTo(px, py); }
        c.stroke();
      }
    });
    var etiketOnbellek = {};
    function etiketD(ust, alt, renk, kahve) {
      var a = ust + '|' + alt + '|' + renk + '|' + kahve;
      if (etiketOnbellek[a]) return etiketOnbellek[a];
      return (etiketOnbellek[a] = tuval(512, 256, function (c, w, h) {
        c.fillStyle = kahve ? '#F4EEE2' : '#FFFFFF'; c.fillRect(0, 0, w, h);
        c.fillStyle = renk; c.fillRect(0, 0, w, 34); c.fillRect(0, h - 22, w, 22);
        c.fillStyle = '#1C1A18'; c.textAlign = 'center'; c.textBaseline = 'middle';
        var f = 92; c.font = '800 ' + f + 'px "IBM Plex Sans", system-ui, sans-serif';
        while (c.measureText(ust).width > w - 40 && f > 34) { f -= 6; c.font = '800 ' + f + 'px "IBM Plex Sans", system-ui, sans-serif'; }
        c.fillText(ust, w / 2, 112);
        c.font = '600 44px "IBM Plex Sans", system-ui, sans-serif'; c.fillStyle = '#5C554F'; c.fillText(alt, w / 2, 186);
      }));
    }
    function dereceD(isaret, birim) {
      return tuval(256, 512, function (c, w, h) {
        c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(255,255,255,.95)'; c.fillStyle = 'rgba(255,255,255,.95)'; c.lineWidth = 5;
        c.font = '700 34px "IBM Plex Sans", system-ui, sans-serif'; c.textBaseline = 'middle';
        isaret.forEach(function (m) { var y = h * (1 - m[1]); c.beginPath(); c.moveTo(20, y); c.lineTo(m[2] ? 110 : 70, y); c.stroke(); if (m[0]) c.fillText(m[0], 122, y); });
        if (birim) { c.font = '700 30px "IBM Plex Sans", system-ui, sans-serif'; c.fillText(birim, 26, h - 30); }
      });
    }
    var alevD = tuval(64, 256, function (c, w, h) { var gg = c.createLinearGradient(0, h, 0, 0); gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.35, 'rgba(255,255,255,.8)'); gg.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gg; c.fillRect(0, 0, w, h); });
    var ispirtoD = tuval(64, 256, function (c, w, h) {
      var gg = c.createLinearGradient(0, h, 0, 0);
      gg.addColorStop(0, 'rgba(70,110,255,.95)'); gg.addColorStop(0.3, 'rgba(110,150,255,.75)'); gg.addColorStop(0.55, 'rgba(255,170,60,.75)'); gg.addColorStop(0.85, 'rgba(255,200,90,.35)'); gg.addColorStop(1, 'rgba(255,210,120,0)');
      c.fillStyle = gg; c.fillRect(0, 0, w, h);
    });
    var kafesD = tuval(256, 256, function (c, w, h) {
      c.clearRect(0, 0, w, h); c.strokeStyle = 'rgba(70,74,80,.95)'; c.lineWidth = 2;
      for (var i = 0; i <= w; i += 10) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, h); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(w, i); c.stroke(); }
      c.strokeStyle = 'rgba(70,74,80,1)'; c.lineWidth = 6; c.strokeRect(3, 3, w - 6, h - 6);
      var g = c.createRadialGradient(w / 2, h / 2, 10, w / 2, h / 2, w * 0.3); g.addColorStop(0, '#EDEAE4'); g.addColorStop(0.85, '#E3DED6'); g.addColorStop(1, 'rgba(227,222,214,0)');
      c.fillStyle = g; c.beginPath(); c.arc(w / 2, h / 2, w * 0.3, 0, 7); c.fill();
    });
    var SABIT_DOKU = [golgeD, yumusakD, alevD, ispirtoD, kafesD, karoD, tezgahD, tezgahA, fonD];

    /* ================= MALZEMELER ================= */
    function camMat(op, kalin) {
      var m = new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.03, metalness: 0, transparent: true, opacity: op || 0.13, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 2.4, depthWrite: false, side: T.DoubleSide, specularIntensity: 1 });
      m.onBeforeCompile = function (sh) {
        sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
          'float frs = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 2.4);\n' +
          'diffuseColor.a = mix(diffuseColor.a, ' + (kalin ? '0.8' : '0.55') + ', frs);\n' +
          'outgoingLight = mix(outgoingLight, outgoingLight * vec3(0.86, 0.95, 0.93), frs * 0.8);\n#include <opaque_fragment>');
      };
      m.customProgramCacheKey = function () { return 'cam' + (kalin ? 'k' : ''); };
      return m;
    }
    var MAT = {
      cam: camMat(0.12), camKalin: camMat(0.22, true), camSise: camMat(0.2, true),
      celik: new T.MeshStandardMaterial({ color: 0xc8ccd1, metalness: 1, roughness: 0.3, envMapIntensity: 1.2 }),
      krom: new T.MeshStandardMaterial({ color: 0xe6e9ec, metalness: 1, roughness: 0.12, envMapIntensity: 1.4 }),
      pirinc: new T.MeshStandardMaterial({ color: 0xc9a24c, metalness: 1, roughness: 0.28, envMapIntensity: 1.3 }),
      lastik: new T.MeshStandardMaterial({ color: 0xd8692c, roughness: 0.55 }),
      dokum: new T.MeshStandardMaterial({ color: 0x223a63, metalness: 0.35, roughness: 0.5 }),
      siyah: new T.MeshStandardMaterial({ color: 0x1c1f24, roughness: 0.45 }),
      gri: new T.MeshStandardMaterial({ color: 0x5c6168, roughness: 0.5, metalness: 0.4 }),
      beyaz: new T.MeshStandardMaterial({ color: 0xf4f5f6, roughness: 0.35 }),
      tezgah: new T.MeshPhysicalMaterial({ color: 0xffffff, map: tezgahD, roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.3 }),
      ahsap: new T.MeshStandardMaterial({ color: 0xbf9161, roughness: 0.72 }),
      duvar: new T.MeshStandardMaterial({ map: karoD, roughness: 0.6 }),
      golge: new T.MeshBasicMaterial({ map: golgeD, transparent: true, depthWrite: false }),
      beyazPE: new T.MeshPhysicalMaterial({ color: 0xf3f5f7, roughness: 0.45, transparent: true, opacity: 0.92, clearcoat: 0.3 }),
      mavi: new T.MeshStandardMaterial({ color: 0x1f63c6, roughness: 0.4 }),
      kirmizi: new T.MeshStandardMaterial({ color: 0xd8342c, roughness: 0.35 }),
      sari: new T.MeshStandardMaterial({ color: 0xf1c232, roughness: 0.35 }),
      mantar: new T.MeshStandardMaterial({ color: 0xb08a5c, roughness: 0.9 }),
      buz: new T.MeshPhysicalMaterial({ color: 0xeaf6ff, roughness: 0.12, transparent: true, opacity: 0.88, clearcoat: 1 }),
      buzSu: new T.MeshPhysicalMaterial({ color: 0xcfe8f7, transparent: true, opacity: 0.4, depthWrite: false }),
      kafes: new T.MeshStandardMaterial({ map: kafesD, transparent: true, alphaTest: 0.05, roughness: 0.8, side: T.DoubleSide, metalness: 0.3 }),
      cerceve: new T.MeshStandardMaterial({ color: 0x3a3f46, roughness: 0.5, metalness: 0.2 }),
      kirikCam: new T.MeshPhysicalMaterial({ color: 0xdff3ff, roughness: 0.05, transparent: true, opacity: 0.55, clearcoat: 1, envMapIntensity: 2.6, side: T.DoubleSide, depthWrite: false })
    };
    var MAT_LISTE = Object.keys(MAT).map(function (k) { return MAT[k]; });
    function torna(p, n) { return new T.LatheGeometry(p.map(function (q) { return new T.Vector2(q[0], q[1]); }), n || 72); }
    function golgeKoy(par, x, z, w, d, op) { var m = new T.Mesh(new T.PlaneGeometry(w, d), MAT.golge.clone()); m.material.opacity = op || 1; m.rotation.x = -Math.PI / 2; m.position.set(x, 0.004, z); par.add(m); return m; }
    function yuvarlakKutu(w, h, d, r, mat) {
      var s = new T.Shape(), x = -w / 2, y = -d / 2;
      s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r); s.lineTo(x + w, y + d - r); s.quadraticCurveTo(x + w, y + d, x + w - r, y + d);
      s.lineTo(x + r, y + d); s.quadraticCurveTo(x, y + d, x, y + d - r); s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
      var g = new T.ExtrudeGeometry(s, { depth: h, bevelEnabled: true, bevelThickness: Math.min(0.02, h * 0.2), bevelSize: 0.02, bevelSegments: 3, curveSegments: 8 });
      g.rotateX(-Math.PI / 2);
      return new T.Mesh(g, mat);
    }
    function etiketDokusuMu(t) { for (var k in etiketOnbellek) if (etiketOnbellek[k] === t) return true; return false; }
    function yoket(o) {
      o.traverse(function (c) {
        if (c.geometry) c.geometry.dispose();
        if (!c.material) return;
        var ms = Array.isArray(c.material) ? c.material : [c.material];
        ms.forEach(function (m) {
          if (MAT_LISTE.indexOf(m) >= 0 || m.userData.paylasik) return;
          if (m.map && SABIT_DOKU.indexOf(m.map) < 0 && !etiketDokusuMu(m.map) && !m.map.userData.paylasik) m.map.dispose();
          m.dispose();
        });
      });
    }

    /* ================= ODA ================= */
    /* stüdyo tezgâhı: önde görünen açık renkli tabla, arkası fona karışır */
    sahne.background = fonD;
    var tez = new T.Mesh(new T.PlaneGeometry(16, 10), new T.MeshPhysicalMaterial({ color: 0xffffff, map: tezgahD, alphaMap: tezgahA, transparent: true, roughness: 0.42, clearcoat: 0.3, clearcoatRoughness: 0.35 }));
    tez.rotation.x = -Math.PI / 2; tez.position.set(0, 0, -3.2); tez.renderOrder = -2; sahne.add(tez);
    var onYuz = new T.Mesh(new T.BoxGeometry(16, 0.07, 0.07), new T.MeshStandardMaterial({ color: 0xe2dbd3, roughness: 0.6 })); onYuz.position.set(0, -0.035, 1.8); sahne.add(onYuz);
    var onYuz2 = new T.Mesh(new T.PlaneGeometry(16, 1.4), new T.MeshStandardMaterial({ color: 0xe9e3dc, roughness: 0.8 })); onYuz2.position.set(0, -0.76, 1.835); sahne.add(onYuz2);
    var duvar = new T.Group(), supurge = new T.Group();
    var arkaRaf = new T.Group(); sahne.add(arkaRaf);   /* eski dekor; yeni tasarımda boş kalır (görevler visible değiştirebilir) */
    function ayiracSisesi(x, z, ad, alt, renk, kahve, siviRenk) {
      var g = new T.Group(); g.position.set(x, 0, z);
      var m = kahve ? new T.MeshPhysicalMaterial({ color: 0x8a4b16, roughness: 0.08, transparent: true, opacity: 0.82, clearcoat: 1, envMapIntensity: 2 }) : MAT.camSise;
      g.add(new T.Mesh(torna([[0, 0], [0.2, 0], [0.21, 0.02], [0.21, 0.5], [0.15, 0.6], [0.08, 0.64], [0.08, 0.72], [0, 0.72]], 48), m));
      if (siviRenk) { var s = new T.Mesh(torna([[0, 0.02], [0.195, 0.02], [0.195, 0.4], [0, 0.4]], 40), new T.MeshPhysicalMaterial({ color: siviRenk, roughness: 0.1, transparent: true, opacity: 0.85 })); s.renderOrder = 1; g.add(s); }
      var et = new T.Mesh(new T.CylinderGeometry(0.212, 0.212, 0.22, 48, 1, true, -0.9, 1.8), new T.MeshStandardMaterial({ map: etiketD(ad, alt, renk, kahve), roughness: 0.7 }));
      et.position.y = 0.27; g.add(et);
      var kapak = new T.Mesh(new T.CylinderGeometry(0.095, 0.095, 0.1, 32), MAT.siyah); kapak.position.y = 0.76; g.add(kapak);
      golgeKoy(g, 0, 0, 0.75, 0.75, 0.8);
      arkaRaf.add(g); return g;
    }
    function pisetModeli() {
      var g = new T.Group();
      g.add(new T.Mesh(torna([[0, 0], [0.22, 0], [0.24, 0.04], [0.24, 0.62], [0.16, 0.74], [0.07, 0.78], [0, 0.78]], 48), MAT.beyazPE));
      var s = new T.Mesh(torna([[0, 0.02], [0.225, 0.02], [0.225, 0.36], [0, 0.36]], 40), new T.MeshPhysicalMaterial({ color: 0xd9ecf8, transparent: true, opacity: 0.5 })); s.renderOrder = 1; g.add(s);
      var kp = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.12, 32), MAT.mavi); kp.position.y = 0.82; g.add(kp);
      var yol = new T.CatmullRomCurve3([new T.Vector3(0, 0.86, 0), new T.Vector3(0, 1.02, 0), new T.Vector3(0.12, 1.1, 0), new T.Vector3(0.32, 1.04, 0), new T.Vector3(0.42, 0.94, 0)]);
      g.add(new T.Mesh(new T.TubeGeometry(yol, 30, 0.018, 10), MAT.mavi));
      var et = new T.Mesh(new T.CylinderGeometry(0.242, 0.242, 0.2, 48, 1, true, -0.8, 1.6), new T.MeshStandardMaterial({ map: etiketD('SAF SU', 'H₂O', '#1F63C6'), roughness: 0.7 })); et.position.y = 0.32; g.add(et);
      g.userData.dudak = new T.Vector3(0.43, 0.93, 0);
      return g;
    }
    var PISET = pisetModeli(); PISET.position.set(-1.0, 0, -1.2); golgeKoy(PISET, 0, 0, 0.8, 0.8, 0.8); arkaRaf.add(PISET); PISET.visible = false;
    (function tupluk() { return;
      var g = new T.Group(); g.position.set(4.1, 0, -1.3);
      var a1 = new T.Mesh(new T.BoxGeometry(1.2, 0.06, 0.34), MAT.ahsap); a1.position.y = 0.03; g.add(a1);
      var a2 = new T.Mesh(new T.BoxGeometry(1.2, 0.06, 0.34), MAT.ahsap); a2.position.y = 0.42; g.add(a2);
      [-0.57, 0.57].forEach(function (x) { var y = new T.Mesh(new T.BoxGeometry(0.06, 0.45, 0.34), MAT.ahsap); y.position.set(x, 0.22, 0); g.add(y); });
      [-0.36, -0.12, 0.12, 0.36].forEach(function (x, j) {
        var t = new T.Mesh(torna([[0, 0.02], [0.055, 0.08], [0.06, 0.12], [0.06, 0.7], [0.068, 0.72]], 32), MAT.cam); t.position.set(x, 0.05, 0); t.renderOrder = 2; g.add(t);
        if (j === 1) { var s = new T.Mesh(torna([[0, 0.03], [0.05, 0.09], [0.054, 0.12], [0.054, 0.32], [0, 0.32]], 24), new T.MeshPhysicalMaterial({ color: 0x7A1E83, transparent: true, opacity: 0.85 })); s.position.set(x, 0.05, 0); g.add(s); }
      });
      golgeKoy(g, 0, 0, 1.6, 0.7, 0.7); arkaRaf.add(g);
    })();

    /* ---- Duvar: periyodik tablo ---- */
    var PT = 'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'.split(' ');
    function ptKonum(z) {
      if (z === 1) return [1, 1]; if (z === 2) return [1, 18];
      if (z <= 10) return [2, z <= 4 ? z - 2 : z + 8];
      if (z <= 18) return [3, z <= 12 ? z - 10 : z];
      if (z <= 36) return [4, z - 18];
      if (z <= 54) return [5, z - 36];
      if (z <= 56) return [6, z - 54];
      if (z <= 71) return [8.35, z - 54];
      if (z <= 86) return [6, z - 68];
      if (z <= 88) return [7, z - 86];
      if (z <= 103) return [9.35, z - 86];
      return [7, z - 100];
    }
    function ptKat(z) {
      if ([3, 11, 19, 37, 55, 87].indexOf(z) >= 0) return '#F6C3BC';
      if ([4, 12, 20, 38, 56, 88].indexOf(z) >= 0) return '#F8D6AE';
      if (z >= 57 && z <= 71) return '#F3CDE0';
      if (z >= 89 && z <= 103) return '#E9C6D8';
      if ([2, 10, 18, 36, 54, 86, 118].indexOf(z) >= 0) return '#D9CCF1';
      if ([9, 17, 35, 53, 85, 117].indexOf(z) >= 0) return '#BDE6F0';
      if ([5, 14, 32, 33, 51, 52].indexOf(z) >= 0) return '#BEE2DA';
      if ([1, 6, 7, 8, 15, 16, 34].indexOf(z) >= 0) return '#C6DBF4';
      if ([13, 31, 49, 50, 81, 82, 83, 84, 113, 114, 115, 116].indexOf(z) >= 0) return '#CFE5C2';
      return '#F5E6A6';
    }
    var GRUP = ['1A', '2A', '3B', '4B', '5B', '6B', '7B', '8B', '8B', '8B', '1B', '2B', '3A', '4A', '5A', '6A', '7A', '8A'];
    var ptVurgu = '', ptSabitL = null;
    var ptDoku = tuval(1024, 620, function () {});
    function ptCiz(vurgulu) {
      var cv = ptDoku.userData.cv, c = cv.getContext('2d'), W0 = 1024, cw = 54.4, ch = 50, x0 = 22, y0 = 92;
      c.fillStyle = '#FDFDFC'; c.fillRect(0, 0, W0, 620);
      c.fillStyle = '#1C1A18'; c.font = '800 34px "IBM Plex Sans", system-ui, sans-serif'; c.textBaseline = 'middle'; c.textAlign = 'left';
      c.fillText('PERİYODİK TABLO', x0, 34);
      c.font = '600 15px "IBM Plex Sans", system-ui, sans-serif'; c.fillStyle = '#6B625B'; c.textAlign = 'center';
      GRUP.forEach(function (g, j) { c.fillText(g, x0 + j * cw + cw / 2, 76); });
      for (var z = 1; z <= 118; z++) {
        var p = ptKonum(z), s = PT[z - 1], x = x0 + (p[1] - 1) * cw, y = y0 + (p[0] - 1) * ch, on = vurgulu.indexOf(s) >= 0;
        c.fillStyle = on ? '#FFE3CC' : ptKat(z); c.fillRect(x + 1.5, y + 1.5, cw - 3, ch - 3);
        c.lineWidth = on ? 5 : 1; c.strokeStyle = on ? '#F85300' : 'rgba(80,70,60,.35)'; c.strokeRect(x + (on ? 3 : 1.5), y + (on ? 3 : 1.5), cw - (on ? 6 : 3), ch - (on ? 6 : 3));
        c.fillStyle = '#4A433D'; c.font = '600 11px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'left'; c.fillText(String(z), x + 5, y + 10);
        c.fillStyle = '#1C1A18'; c.font = '800 ' + (s.length > 1 ? 21 : 23) + 'px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(s, x + cw / 2, y + ch / 2 + 5);
      }
      c.fillStyle = '#8C837B'; c.font = '700 15px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'center';
      c.fillText('*', x0 + 2 * cw + cw / 2, y0 + 5 * ch + ch / 2); c.fillText('**', x0 + 2 * cw + cw / 2, y0 + 6 * ch + ch / 2);
      ptDoku.needsUpdate = true;
    }
    ptCiz([]);
    var PT_G = new T.Group(); PT_G.position.set(-1.55, 2.5, -1.985); PT_G.visible = false;
    (function () {
      var w = 3.3, hh = w * 620 / 1024;
      var cer = new T.Mesh(new T.BoxGeometry(w + 0.1, hh + 0.1, 0.03), MAT.cerceve); cer.position.z = -0.005; PT_G.add(cer);
      var pl = new T.Mesh(new T.PlaneGeometry(w, hh), new T.MeshStandardMaterial({ map: ptDoku, roughness: 0.6 })); pl.position.z = 0.012; PT_G.add(pl);
    })();
    function semboller(f) { var L = [], m, re = /([A-Z][a-z]?)/g; while ((m = re.exec(f || ''))) if (PT.indexOf(m[1]) >= 0 && L.indexOf(m[1]) < 0) L.push(m[1]); return L; }
    function ptGuncelle(L) { var a = L.slice().sort().join(','); if (a === ptVurgu) return; ptVurgu = a; ptCiz(L); kirli = 2; }

    /* ---- Duvar: pH ölçeği ---- */
    var PH_RENK = ['#E3262B', '#EC3A2C', '#F2652C', '#F7942E', '#FBB733', '#F4D93A', '#C8DC3A', '#5DBB46', '#2AA45C', '#1F9C8F', '#2A7FC0', '#3456A8', '#4B3F98', '#5E2F8E', '#6B2783'];
    var phDoku = tuval(1024, 330, function (c, w) {
      c.fillStyle = '#FDFDFC'; c.fillRect(0, 0, w, 330);
      c.fillStyle = '#1C1A18'; c.font = '800 34px "IBM Plex Sans", system-ui, sans-serif'; c.textBaseline = 'middle'; c.fillText('pH ÖLÇEĞİ', 40, 40);
      for (var i = 0; i < 15; i++) {
        var x = 40 + i * 62.9; c.fillStyle = PH_RENK[i]; c.fillRect(x + 2, 82, 58.9, 120);
        c.fillStyle = i >= 4 && i <= 7 ? '#1C1A18' : '#FFFFFF'; c.font = '800 34px "IBM Plex Sans", system-ui, sans-serif'; c.textAlign = 'center'; c.fillText(String(i), x + 31.5, 142);
      }
      c.textAlign = 'center'; c.font = '700 26px "IBM Plex Sans", system-ui, sans-serif';
      c.fillStyle = '#C0352B'; c.fillText('ASİDİK', 40 + 3.5 * 62.9, 238); c.fillStyle = '#2E8A3E'; c.fillText('NÖTR', 40 + 7.5 * 62.9, 238); c.fillStyle = '#3456A8'; c.fillText('BAZİK', 40 + 11.5 * 62.9, 238);
      c.fillStyle = '#6B625B'; c.font = '600 21px "IBM Plex Sans", system-ui, sans-serif';
      c.fillText('← daha kuvvetli asit', 40 + 2.5 * 62.9, 284); c.fillText('daha kuvvetli baz →', 40 + 12.3 * 62.9, 284);
    });
    var PH_G = new T.Group(); PH_G.position.set(2.35, 2.95, -1.985); PH_G.visible = false;
    var PH_W = 2.9;
    (function () {
      var hh = PH_W * 330 / 1024;
      var cer = new T.Mesh(new T.BoxGeometry(PH_W + 0.1, hh + 0.1, 0.03), MAT.cerceve); cer.position.z = -0.005; PH_G.add(cer);
      var pl2 = new T.Mesh(new T.PlaneGeometry(PH_W, hh), new T.MeshStandardMaterial({ map: phDoku, roughness: 0.6 })); pl2.position.z = 0.012; PH_G.add(pl2);
    })();
    var phIsaret = new T.Mesh(new T.ConeGeometry(0.075, 0.13, 3), new T.MeshStandardMaterial({ color: 0xF85300, roughness: 0.4, emissive: 0x6a2000 }));
    phIsaret.rotation.z = Math.PI; phIsaret.position.set(0, 0.36, 0.05); phIsaret.visible = false; PH_G.add(phIsaret);
    var phCerceve = new T.Mesh(new T.RingGeometry(0.1, 0.125, 4, 1), new T.MeshBasicMaterial({ color: 0x1C1A18 })); phCerceve.rotation.z = Math.PI / 4; phCerceve.scale.set(1.25, 2.3, 1); phCerceve.position.set(0, 0.06, 0.02); phCerceve.visible = false; PH_G.add(phCerceve);
    function phX(p) { return -PH_W / 2 + (40 + (Math.max(0, Math.min(14, p)) + 0.5) * 62.9) / 1024 * PH_W; }

    /* ================= DÜZENEKLER ================= */
    var SACAYAK_Y = 0.95, TUP_TABAN = 0.8;
    function ispirtoOcagi() {
      var g = new T.Group();
      g.add(new T.Mesh(torna([[0, 0], [0.2, 0], [0.26, 0.04], [0.3, 0.14], [0.3, 0.24], [0.25, 0.36], [0.12, 0.44], [0.09, 0.47], [0, 0.47]], 64), MAT.camSise));
      var alkol = new T.Mesh(torna([[0, 0.02], [0.2, 0.02], [0.27, 0.08], [0.28, 0.2], [0, 0.2]], 48), new T.MeshPhysicalMaterial({ color: 0xd7ecfa, transparent: true, opacity: 0.55, roughness: 0.05, depthWrite: false })); alkol.renderOrder = 1; g.add(alkol);
      var boyun = new T.Mesh(new T.CylinderGeometry(0.085, 0.09, 0.07, 32), MAT.krom); boyun.position.y = 0.5; g.add(boyun);
      var fitil = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.07, 12), new T.MeshStandardMaterial({ color: 0xf2efe6, roughness: 1 })); fitil.position.y = 0.565; g.add(fitil);
      var dis = new T.Mesh(new T.ConeGeometry(0.075, 0.34, 32, 1, true), new T.MeshBasicMaterial({ map: ispirtoD, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      var ic = new T.Mesh(new T.ConeGeometry(0.035, 0.12, 24, 1, true), new T.MeshBasicMaterial({ color: 0x9cc6ff, map: alevD, transparent: true, opacity: 0.85, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      dis.position.y = 0.77; ic.position.y = 0.66;
      var alev = new T.Group(); alev.add(dis); alev.add(ic); alev.visible = false; g.add(alev);
      var isik = new T.PointLight(0xffb060, 0, 2.2); isik.position.y = 0.85; g.add(isik);
      golgeKoy(g, 0, 0, 0.9, 0.9, 0.9);
      return { g: g, alev: alev, dis: dis, ic: ic, isik: isik };
    }
    function sacayagi() {
      var sac = new T.Group();
      var halka0 = new T.Mesh(new T.TorusGeometry(0.4, 0.014, 10, 64), MAT.siyah); halka0.rotation.x = Math.PI / 2; halka0.position.y = SACAYAK_Y - 0.012; sac.add(halka0);
      for (var j = 0; j < 3; j++) {
        var a = j / 3 * Math.PI * 2 + 0.5, x1 = Math.cos(a) * 0.4, z1 = Math.sin(a) * 0.4, x2 = Math.cos(a) * 0.52, z2 = Math.sin(a) * 0.52;
        var ayak = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, Math.hypot(SACAYAK_Y, 0.12), 10), MAT.siyah);
        ayak.position.set((x1 + x2) / 2, SACAYAK_Y / 2, (z1 + z2) / 2);
        ayak.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), new T.Vector3(x1 - x2, SACAYAK_Y, z1 - z2).normalize());
        sac.add(ayak);
      }
      var kafes = new T.Mesh(new T.PlaneGeometry(1.0, 1.0), MAT.kafes); kafes.rotation.x = -Math.PI / 2; kafes.rotation.z = 0.12; kafes.position.y = SACAYAK_Y + 0.004; sac.add(kafes);
      return sac;
    }
    function buzBanyosu(kr, ic) {
      var g = new T.Group();
      var kc = new T.Mesh(torna([[0, 0], [kr, 0], [kr + 0.012, 0.012], [kr + 0.012, 0.3], [kr + 0.03, 0.32]], 64), MAT.cam); kc.renderOrder = 6; g.add(kc);
      var kw = new T.Mesh(torna([[ic, 0.02], [kr - 0.006, 0.02], [kr - 0.006, 0.24], [ic, 0.24]], 64), MAT.buzSu); kw.renderOrder = 5; g.add(kw);
      for (var q = 0; q < 13; q++) { var cc = new T.Mesh(new T.BoxGeometry(0.11, 0.09, 0.11), MAT.buz); var aa = q / 13 * 6.283, rr = (kr + ic) / 2; cc.position.set(Math.cos(aa) * rr, 0.2 + (q % 3) * 0.03, Math.sin(aa) * rr); cc.rotation.set(q, q * 1.7, q * 0.6); g.add(cc); }
      return g;
    }
    function bekYap(hortumYok) {
      var g = new T.Group();
      g.add(new T.Mesh(torna([[0, 0], [0.27, 0], [0.28, 0.02], [0.25, 0.06], [0.1, 0.09], [0.07, 0.1], [0, 0.1]], 48), MAT.dokum));
      var boru = new T.Mesh(new T.CylinderGeometry(0.055, 0.058, 0.5, 32), MAT.pirinc); boru.position.y = 0.34; g.add(boru);
      var bilezik = new T.Mesh(new T.CylinderGeometry(0.066, 0.066, 0.08, 32), MAT.pirinc); bilezik.position.y = 0.16; g.add(bilezik);
      var delik = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 0.02), MAT.siyah); delik.position.set(0, 0.16, 0.066); g.add(delik);
      var vana = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.12, 16), MAT.pirinc); vana.rotation.z = Math.PI / 2; vana.position.set(0.16, 0.12, 0); g.add(vana);
      if (!hortumYok) {
        var hortum = new T.CatmullRomCurve3([new T.Vector3(0.22, 0.12, 0), new T.Vector3(0.5, 0.08, -0.1), new T.Vector3(0.75, 0.035, -0.6), new T.Vector3(0.9, 0.035, -1.4), new T.Vector3(1.0, 0.2, -2.3)]);
        g.add(new T.Mesh(new T.TubeGeometry(hortum, 60, 0.035, 12), MAT.lastik));
      }
      golgeKoy(g, 0, 0, 0.9, 0.9, 0.9);
      var dis = new T.Mesh(new T.ConeGeometry(0.075, 0.42, 32, 1, true), new T.MeshBasicMaterial({ color: 0x5f7dff, map: alevD, transparent: true, opacity: 0.55, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      var ic = new T.Mesh(new T.ConeGeometry(0.045, 0.16, 32, 1, true), new T.MeshBasicMaterial({ color: 0x9fd2ff, map: alevD, transparent: true, opacity: 0.9, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
      dis.position.y = 0.8; ic.position.y = 0.67;
      var alev = new T.Group(); alev.add(dis); alev.add(ic); alev.visible = false; g.add(alev);
      var isik = new T.PointLight(0x7f9bff, 0, 1.5); isik.position.y = 0.75; g.add(isik);
      return { g: g, alev: alev, dis: dis, ic: ic, isik: isik, bilezik: bilezik, delik: delik, vana: vana };
    }
    function destekYap() {
      var g = new T.Group(); g.position.set(0.05, 0, -0.45);
      var taban = yuvarlakKutu(0.9, 0.05, 0.5, 0.05, MAT.gri); taban.position.z = 0.1; g.add(taban);
      var cubuk = new T.Mesh(new T.CylinderGeometry(0.024, 0.024, 2.3, 24), MAT.celik); cubuk.position.set(0.3, 1.15, 0); g.add(cubuk);
      var bas = new T.Mesh(new T.BoxGeometry(0.1, 0.1, 0.1), MAT.gri); bas.position.set(0.3, 1.62, 0); g.add(bas);
      var kol = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.5, 16), MAT.celik); kol.rotation.x = Math.PI / 2; kol.position.set(0.3, 1.62, 0.24); g.add(kol);
      var kol2 = new T.Mesh(new T.CylinderGeometry(0.018, 0.018, 0.32, 16), MAT.celik); kol2.rotation.z = Math.PI / 2; kol2.position.set(0.15, 1.62, 0.45); g.add(kol2);
      [-1, 1].forEach(function (s) { var c = new T.Mesh(new T.BoxGeometry(0.05, 0.12, 0.03), MAT.mantar); c.position.set(-0.05, 1.62, 0.45 + s * 0.12); g.add(c); });
      golgeKoy(g, 0, 0.1, 1.3, 0.9, 0.8);
      return g;
    }
    function krikoYap() {
      var g = new T.Group(); g.visible = false;
      var b = new T.Mesh(torna([[0, 0], [0.24, 0], [0.25, 0.01], [0.25, 0.5], [0.27, 0.52]], 48), MAT.cam); b.position.y = 0.25; b.renderOrder = 6; g.add(b);
      var su = new T.Mesh(torna([[0, 0.26], [0.24, 0.26], [0.24, 0.66], [0, 0.66]], 40), MAT.buzSu); su.renderOrder = 5; g.add(su);
      for (var k = 0; k < 7; k++) { var c = new T.Mesh(new T.BoxGeometry(0.1, 0.09, 0.1), MAT.buz); var a = k / 7 * 6.28; c.position.set(Math.cos(a) * 0.16, 0.52 + (k % 2) * 0.08, Math.sin(a) * 0.16); c.rotation.set(k, k * 2, k); g.add(c); }
      var ayak = new T.Mesh(new T.BoxGeometry(0.5, 0.25, 0.4), MAT.gri); ayak.position.y = 0.125; g.add(ayak);
      return g;
    }

    /* ================= KAPLAR ================= */
    function ozellik(tip, kapasite) {
      if (tip === 'beher' && kapasite > 0.5) {   /* büyük beher (1 L): yatayda 1,55, düşeyde 1,12 kat */
        var bx = 1.55, by = 1.12;
        return { dis: [[0, 0], [0.37, 0], [0.385, 0.014], [0.385, 0.93], [0.392, 0.948], [0.405, 0.96], [0.37, 0.95], [0.37, 0.022], [0, 0.022]].map(function (q) { return [q[0] * bx, q[1] * by]; }), y0: 0.022 * by, ust: 0.95 * by, agizR: 0.4 * bx, r: function () { return 0.368 * bx; }, buyuk: true };
      }
      if (tip === 'beher') return { dis: [[0, 0], [0.37, 0], [0.385, 0.014], [0.385, 0.93], [0.392, 0.948], [0.405, 0.96], [0.37, 0.95], [0.37, 0.022], [0, 0.022]], y0: 0.022, ust: 0.95, agizR: 0.4, r: function () { return 0.368; } };
      if (tip === 'erlen') return { dis: [[0, 0], [0.43, 0], [0.458, 0.02], [0.455, 0.06], [0.15, 0.8], [0.135, 0.84], [0.135, 1.1], [0.152, 1.115], [0.152, 1.13], [0.12, 1.12], [0.12, 0.84], [0.135, 0.8], [0.44, 0.06], [0.44, 0.022], [0, 0.022]],
        y0: 0.022, ust: 1.12, agizR: 0.15, r: function (y) { return y < 0.06 ? 0.44 : (y < 0.8 ? 0.44 - (0.44 - 0.135) * (y - 0.06) / 0.74 : 0.12); } };
      return { dis: [[0, 0], [0.04, 0.004], [0.075, 0.025], [0.1, 0.07], [0.105, 0.105], [0.105, 1.04], [0.115, 1.05], [0.115, 1.06], [0.093, 1.055], [0.093, 0.105], [0.088, 0.075], [0.065, 0.04], [0.035, 0.022], [0, 0.016]],
        y0: 0.016, ust: 1.05, agizR: 0.11, r: function (y) { var Rr = 0.093, c = 0.016 + Rr; return y < c ? Math.sqrt(Math.max(0, Rr * Rr - (c - y) * (c - y))) : Rr; } };
    }
    var YER = [], TEK = true;   /* TEK: masada yalnızca seçili kap görünür, ortada ve büyük */
    function dinlenmeY(K) { var k = K.k; if (k.tip === 'tup') return TUP_TABAN; if (K.dz === 'ocak') return k.isit ? SACAYAK_Y + 0.012 : (k.sogut ? 0.03 : 0.002); return K.dz === 'fayans' ? 0.045 : 0.002; }
    function kapYap(k) {
      var oz = ozellik(k.tip, k.kapasite), kok = new T.Group(), g = new T.Group(), K = { k: k, oz: oz, kok: kok, g: g, dz: k.duzenek || 'ocak' }, j, B = oz.buyuk ? 1.55 : 1;
      if (k.tip === 'tup') {
        K.destek = destekYap(); kok.add(K.destek);
        if (K.dz === 'ocak') { K.bek = bekYap(); kok.add(K.bek.g); K.kriko = krikoYap(); kok.add(K.kriko); }
      } else {
        if (K.dz === 'ocak') { K.sac = sacayagi(); K.sac.scale.set(B, 1, B); K.sac.visible = false; kok.add(K.sac); K.lamba = ispirtoOcagi(); K.lamba.g.visible = false; kok.add(K.lamba.g); K.golge = golgeKoy(kok, 0, 0, 1.4 * B, 1.4 * B, 0.6); }
        else if (K.dz === 'fayans') { var fy = yuvarlakKutu(1.15, 0.03, 1.15, 0.04, MAT.beyaz); kok.add(fy); golgeKoy(kok, 0, 0, 1.5, 1.5, 0.6); }
        else golgeKoy(kok, 0, 0, 1.2 * B, 1.2 * B, 0.7);
        K.buzKap = buzBanyosu(k.tip === 'beher' ? 0.6 * B : 0.66, k.tip === 'beher' ? 0.41 * B : 0.47); K.buzKap.visible = false; kok.add(K.buzKap);
      }
      g.position.y = dinlenmeY(K);
      var cam = new T.Mesh(torna(oz.dis, 96), MAT.cam); cam.renderOrder = 4; g.add(cam);
      var dudak = new T.Mesh(new T.TorusGeometry(k.tip === 'erlen' ? 0.145 : (k.tip === 'tup' ? 0.106 : 0.4 * B), k.tip === 'tup' ? 0.008 : 0.011, 10, 96), MAT.camKalin);
      dudak.rotation.x = Math.PI / 2; dudak.position.y = oz.ust + (k.tip === 'erlen' ? 0.012 : 0.006); dudak.renderOrder = 5; g.add(dudak);
      if (k.tip !== 'tup') {
        var isaret = oz.buyuk ? [['1000', 0.983, 1], ['', 0.877], ['800', 0.769, 1], ['', 0.664], ['600', 0.557, 1], ['', 0.451], ['400', 0.344, 1], ['', 0.238], ['200', 0.131, 1]] :
          (k.tip === 'beher' ? [['250', 0.83, 1], ['', 0.73], ['200', 0.66, 1], ['', 0.58], ['150', 0.5, 1], ['', 0.42], ['100', 0.34, 1], ['', 0.26], ['50', 0.18, 1]] : [['250', 0.86, 1], ['200', 0.74, 1], ['150', 0.6, 1], ['100', 0.44, 1], ['50', 0.25, 1]]);
        var d = new T.Mesh(new T.CylinderGeometry(k.tip === 'beher' ? 0.388 * B : 0.3, k.tip === 'beher' ? 0.388 * B : 0.42, oz.buyuk ? 0.92 : (k.tip === 'beher' ? 0.7 : 0.6), 32, 1, true, oz.buyuk ? -0.35 : -0.5, oz.buyuk ? 0.5 : 0.75), new T.MeshBasicMaterial({ map: dereceD(isaret, 'mL'), transparent: true, depthWrite: false, opacity: 0.9 }));
        d.position.y = oz.buyuk ? 0.56 : (k.tip === 'beher' ? 0.43 : 0.33); d.rotation.y = 0.35; d.renderOrder = 6; g.add(d);
      }
      K.sivi = new T.Mesh(new T.BufferGeometry(), new T.MeshPhysicalMaterial({ color: 0xdcecf6, roughness: 0.08, transparent: true, opacity: 0.4, clearcoat: 0.6, clearcoatRoughness: 0.08, envMapIntensity: 1, depthWrite: false }));
      K.sivi.renderOrder = 2; K.sivi.visible = false; g.add(K.sivi);
      K.sivi.material.onBeforeCompile = function (sh) {
        sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>',
          'float frs2 = pow(1.0 - clamp(abs(dot(normalize(normal), normalize(vViewPosition))), 0.0, 1.0), 1.5);\n' +
          'diffuseColor.a = mix(diffuseColor.a, min(1.0, diffuseColor.a + 0.4), frs2);\n' +
          'outgoingLight *= mix(1.0, 0.8, frs2);\n#include <opaque_fragment>');
      };
      K.sivi.material.customProgramCacheKey = function () { return 'sivi'; };
      K.menisk = new T.Mesh(new T.TorusGeometry(1, 0.022, 6, 72), new T.MeshBasicMaterial({ color: 0x7fa7c4, transparent: true, opacity: 0.5, depthWrite: false }));
      K.menisk.rotation.x = Math.PI / 2; K.menisk.renderOrder = 3; K.menisk.visible = false; g.add(K.menisk);
      K.tortu = new T.Mesh(new T.BufferGeometry(), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95 })); K.tortu.renderOrder = 1; K.tortu.visible = false; g.add(K.tortu);
      var NP = 260; K.tohum = [];
      for (j = 0; j < NP; j++) K.tohum.push([Math.random(), Math.random() * 6.283, Math.random(), 0.3 + Math.random()]);
      var ng = new T.BufferGeometry(); ng.setAttribute('position', new T.BufferAttribute(new Float32Array(NP * 3), 3));
      K.nokta = new T.Points(ng, new T.PointsMaterial({ size: k.tip === 'tup' ? 0.012 : 0.017, color: 0xffffff, transparent: true, opacity: 0.8, depthWrite: false, map: yumusakD, alphaTest: 0.02 }));
      K.nokta.renderOrder = 3; K.nokta.visible = false; K.nokta.frustumCulled = false; g.add(K.nokta);
      K.kab = new T.InstancedMesh(new T.SphereGeometry(1, 10, 8), new T.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0, transparent: true, opacity: 0.5, clearcoat: 1, envMapIntensity: 2, depthWrite: false }), 260);
      K.kab.count = 0; K.kab.renderOrder = 3; K.kab.frustumCulled = false; g.add(K.kab); K.kabL = [];
      K.kopuk = new T.Mesh(new T.BufferGeometry(), new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 })); K.kopuk.visible = false; K.kopuk.renderOrder = 3; g.add(K.kopuk);
      K.tasma = new T.Group(); K.tasma.visible = false; g.add(K.tasma);
      K.baget = new T.Group(); var bc = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 1.3, 16), MAT.camKalin); bc.position.y = 0.65; bc.renderOrder = 5; K.baget.add(bc); K.baget.visible = false; g.add(K.baget);
      K.termo = termometreYap(); K.termo.visible = false; g.add(K.termo);
      K.phm = phProbYap(); K.phm.visible = false; g.add(K.phm);
      K.buhar = []; for (j = 0; j < 9; j++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: yumusakD, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); sp.renderOrder = 8; g.add(sp); K.buhar.push({ s: sp, faz: j / 9 }); }
      K.bulut = []; for (j = 0; j < 8; j++) { var sb = new T.Sprite(new T.SpriteMaterial({ map: yumusakD, color: 0xffffff, transparent: true, opacity: 0, depthWrite: false })); sb.renderOrder = 8; g.add(sb); K.bulut.push({ s: sb, faz: j / 8 }); }
      K.karbon = new T.Mesh(new T.CylinderGeometry(1, 1, 1, 18, 8, true), new T.MeshStandardMaterial({ color: 0x15130f, roughness: 1 })); K.karbon.visible = false; g.add(K.karbon);
      var pg = new T.BufferGeometry(); pg.setAttribute('position', new T.BufferAttribute(new Float32Array(60 * 3), 3));
      K.parilti = new T.Points(pg, new T.PointsMaterial({ size: 0.028, color: 0xffd23a, transparent: true, opacity: 0.9, depthWrite: false, blending: T.AdditiveBlending, map: yumusakD })); K.parilti.visible = false; K.parilti.frustumCulled = false; K.parilti.renderOrder = 7; g.add(K.parilti);
      K.secim = new T.Mesh(new T.RingGeometry(k.tip === 'tup' ? 0.36 : 0.6 * B, k.tip === 'tup' ? 0.4 : 0.64 * B, 64), new T.MeshBasicMaterial({ color: 0xF85300, transparent: true, opacity: 0, depthWrite: false }));
      K.secim.rotation.x = -Math.PI / 2; K.secim.position.set(0, 0.006, k.tip === 'tup' ? 0 : 0.02); kok.add(K.secim);
      K.hedef = new T.Mesh(new T.CylinderGeometry(k.tip === 'tup' ? 0.32 : 0.55 * B, k.tip === 'tup' ? 0.32 : 0.55 * B, k.tip === 'tup' ? 1.3 : 1.25 * (oz.buyuk ? 1.12 : 1), 12), new T.MeshBasicMaterial({ visible: false }));
      K.hedef.position.y = 0.62; g.add(K.hedef);
      K.metalG = new T.Group(); g.add(K.metalG);
      kok.add(g); sahne.add(kok);
      var ys = [oz.y0], vs = [0], v = 0, N = 300, H = oz.ust - oz.y0;
      for (j = 1; j <= N; j++) { var y = oz.y0 + H * j / N, r = oz.r(y); v += Math.PI * r * r * H / N; ys.push(y); vs.push(v); }
      K.ys = ys; K.vs = vs; K.sonH = -1; K.sonKopuk = -1; K.sonTortu = -1; K.egim = 0; K.yeni = true;
      return K;
    }
    function termometreYap() {
      var g = new T.Group();
      var boru = new T.Mesh(new T.CylinderGeometry(0.014, 0.014, 1.25, 12), MAT.camKalin); boru.position.y = 0.63; boru.renderOrder = 6; g.add(boru);
      var hazne = new T.Mesh(new T.SphereGeometry(0.02, 12, 10), MAT.kirmizi); hazne.position.y = 0.02; g.add(hazne);
      var sutun = new T.Mesh(new T.CylinderGeometry(0.006, 0.006, 1, 8), new T.MeshStandardMaterial({ color: 0xd8342c, roughness: 0.3, emissive: 0x330000 })); sutun.position.y = 0.3; g.add(sutun);
      g.userData.sutun = sutun; g.rotation.z = -0.12;
      return g;
    }
    function phProbYap() {
      var g = new T.Group();
      var govde = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.8, 16), MAT.siyah); govde.position.y = 0.75; g.add(govde);
      var cm = new T.Mesh(new T.CylinderGeometry(0.022, 0.026, 0.3, 16), MAT.camKalin); cm.position.y = 0.2; cm.renderOrder = 6; g.add(cm);
      var ucu = new T.Mesh(new T.SphereGeometry(0.026, 14, 10), MAT.camKalin); ucu.position.y = 0.05; g.add(ucu);
      g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(0, 1.15, 0), new T.Vector3(0.05, 1.35, 0), new T.Vector3(0.25, 1.45, -0.1), new T.Vector3(0.6, 1.3, -0.3)]), 30, 0.008, 6), MAT.siyah));
      g.rotation.z = 0.14;
      return g;
    }
    function seviye(K, V) {
      var vs = K.vs, ys = K.ys, j = 1;
      if (V <= 0) return K.oz.y0;
      while (j < vs.length - 1 && vs[j] < V) j++;
      var a = vs[j - 1], b = vs[j];
      return ys[j - 1] + (ys[j] - ys[j - 1]) * (b > a ? Math.min(1, (V - a) / (b - a)) : 0);
    }
    function siviGeo(K, h) {
      var oz = K.oz, p = [[0, oz.y0]], n = 14;
      for (var j = 0; j <= n; j++) { var y = oz.y0 + (h - oz.y0) * j / n; p.push([Math.max(0.001, oz.r(y) - 0.002), y]); }
      p.push([0, h]);
      return torna(p, 64);
    }
    function kirikTemizle(K) { if (K.kirikG) { K.kok.remove(K.kirikG); yoket(K.kirikG); K.kirikG = null; } K.g.visible = true; }
    function senkron() {
      var L = LA.KAPLAR, i;
      for (i = YER.length - 1; i >= 0; i--) if (L.indexOf(YER[i].k) < 0 || (YER[i].k.duzenek || 'ocak') !== YER[i].dz) { kirikTemizle(YER[i]); sahne.remove(YER[i].kok); yoket(YER[i].kok); YER.splice(i, 1); }
      L.forEach(function (k) { if (!YER.some(function (K) { return K.k === k; })) YER.push(kapYap(k)); });
      YER.sort(function (a, b) { return L.indexOf(a.k) - L.indexOf(b.k); });
      var n = YER.length, alcak = YER.every(function (K) { return K.dz !== 'ocak'; }), ar = alcak ? (n >= 4 ? 1.65 : 1.9) : (n >= 4 ? 1.9 : 2.15);
      YER.forEach(function (K, j) {
        if (TEK) tekYer(K);
        else K.hedefX = K.k.yerX !== undefined ? K.k.yerX : (j - (n - 1) / 2) * ar;
        K.hedefZ = K.k.yerZ !== undefined ? K.k.yerZ : 0.35;
        if (K.yeni) { K.kok.position.set(K.hedefX, 0, K.hedefZ); K.yeni = false; }
      });
      kirli = 3;
    }
    function kapBul(i) { var k = LA.KAPLAR[i]; for (var j = 0; j < YER.length; j++) if (YER[j].k === k) return YER[j]; return null; }
    /* tek kap düzeni: seçili kap ortada, diğerleri ekran dışında bekler (geçişte kayarak gelir) */
    function tekYer(K) { var ai = LA.aktif, ii = LA.KAPLAR.indexOf(K.k); K.hedefX = ii === ai ? 0 : (ii < ai ? -3.2 : 3.2); }
    function tekGorunur(K) { return !TEK || LA.KAPLAR.indexOf(K.k) === LA.aktif; }

    /* ================= METALLER ================= */
    var METAL_MAT = {};
    function metalMat(m, kap, oran) {
      var anahtar = m + (kap || '') + Math.round((oran || 0) * 10);
      if (METAL_MAT[anahtar]) return METAL_MAT[anahtar];
      var c = new T.Color(M.METAL[m].renk);
      if (kap) c.lerp(new T.Color(M.METAL[kap].renk), oran);
      var mt = new T.MeshStandardMaterial({ color: c, metalness: /^(Na|K|Li|Ca)$/.test(m) ? 0.5 : 1, roughness: m === 'Al' ? 0.25 : (/^(Na|K|Li)$/.test(m) ? 0.55 : 0.38), envMapIntensity: 1.3, side: T.DoubleSide });
      mt.userData.paylasik = true;
      return (METAL_MAT[anahtar] = mt);
    }
    function metalModel(p) {
      var g = new T.Group(), mt = metalMat(p.m), j;
      if (p.cokme) {
        var geo = p.m === 'Ag' ? new T.CylinderGeometry(0.0025, 0.0045, 0.05, 5) : new T.BoxGeometry(0.012, 0.008, 0.012);
        g.add(new T.InstancedMesh(geo, new T.MeshStandardMaterial({ color: M.METAL[p.m].renk, metalness: p.m === 'Ag' ? 1 : 0.6, roughness: p.m === 'Ag' ? 0.2 : 0.6, envMapIntensity: 1.5 }), 40)); return g;
      }
      if (p.toz) {
        var tg = new T.BufferGeometry(), arr = new Float32Array(160 * 3);
        for (j = 0; j < 160; j++) { var a = Math.random() * 6.283, r = Math.sqrt(Math.random()) * 0.12; arr[j * 3] = Math.cos(a) * r; arr[j * 3 + 1] = Math.random() * 0.01; arr[j * 3 + 2] = Math.sin(a) * r; }
        tg.setAttribute('position', new T.BufferAttribute(arr, 3));
        g.add(new T.Points(tg, new T.PointsMaterial({ size: 0.012, color: M.METAL[p.m].renk }))); return g;
      }
      if (p.m === 'Mg') {
        var pg = new T.PlaneGeometry(0.34, 0.03, 24, 1), pp = pg.attributes.position;
        for (j = 0; j < pp.count; j++) { var x = pp.getX(j); pp.setZ(j, Math.sin(x * 22) * 0.025); pp.setY(j, pp.getY(j) + Math.cos(x * 9) * 0.01); }
        pg.computeVertexNormals(); var mm = new T.Mesh(pg, mt); mm.rotation.x = -Math.PI / 2 + 0.25; g.add(mm);
      } else if (p.m === 'Cu') {
        var pts = []; for (j = 0; j <= 80; j++) { var tt = j / 80; pts.push(new T.Vector3(-0.15 + 0.3 * tt, 0.03 + Math.sin(tt * 37.7) * 0.025, Math.cos(tt * 37.7) * 0.025)); }
        g.add(new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 160, 0.006, 8), mt));
      } else if (p.m === 'Fe') {
        var sap = new T.Mesh(new T.CylinderGeometry(0.009, 0.009, 0.3, 12), mt); sap.rotation.z = Math.PI / 2; g.add(sap);
        var uc = new T.Mesh(new T.ConeGeometry(0.009, 0.03, 12), mt); uc.rotation.z = -Math.PI / 2; uc.position.x = 0.165; g.add(uc);
        var bs = new T.Mesh(new T.CylinderGeometry(0.022, 0.022, 0.008, 16), mt); bs.rotation.z = Math.PI / 2; bs.position.x = -0.152; g.add(bs);
        g.rotation.y = 0.5; g.position.y = 0.01;
      } else if (p.m === 'Al') {
        var ag = new T.IcosahedronGeometry(0.05, 2), ap = ag.attributes.position;
        for (j = 0; j < ap.count; j++) { var f = 0.7 + 0.5 * Math.abs(Math.sin(j * 12.9898) * 1.3); ap.setXYZ(j, ap.getX(j) * f, ap.getY(j) * f * 0.6, ap.getZ(j) * f); }
        ag.computeVertexNormals(); var al = new T.Mesh(ag, mt); al.position.y = 0.03; g.add(al);
      } else if (/^(Na|K|Li)$/.test(p.m)) {
        g.add(new T.Mesh(new T.BoxGeometry(0.06, 0.04, 0.05), mt));
        if (p.m === 'K' || p.m === 'Na') { var fl = new T.Sprite(new T.SpriteMaterial({ map: yumusakD, color: p.m === 'K' ? 0xc28cff : 0xffb21e, transparent: true, opacity: 0, blending: T.AdditiveBlending, depthWrite: false })); fl.scale.set(0.25, 0.32, 1); fl.position.y = 0.12; fl.userData.alev = p.m; g.add(fl); }
      } else {
        for (j = 0; j < 3; j++) { var gr = new T.Mesh(new T.DodecahedronGeometry(0.035 + j * 0.006, 0), mt); gr.position.set((j - 1) * 0.06, 0.03, (j % 2) * 0.04 - 0.02); gr.rotation.set(j, j * 2, j * 3); g.add(gr); }
      }
      return g;
    }

    /* ================= ELDEKİ ŞİŞE ================= */
    var SISE_YER = new T.Vector3(1.02, 0, 0.78);
    var sise = { g: null, id: null, egim: 0, piset: false };
    function siseModeli(K0, derisim) {
      var g = new T.Group(), renk = LA.stokRenk(K0), c = new T.Color(renk[0] / 255, renk[1] / 255, renk[2] / 255);
      var ust = K0.f ? Y.alt(K0.f) : K0.ad.split(' ')[0], dM = derisim > 0 ? derisim : K0.M;
      var alt = dM ? (LA.derisimYaz ? LA.derisimYaz(dM) : Y.tr(dM, dM % 1 ? 2 : 0).replace(/,?0+$/, '') + ' M') : (K0.tur === 'kati' ? 'katı' : (K0.tur === 'metal' ? 'metal' : ''));
      var et = etiketD(ust, alt, K0.kat === 'asit' ? '#C8322B' : (K0.kat === 'baz' ? '#1F63C6' : (K0.kat === 'tuz' ? '#1B6B4A' : '#F85300')));
      if (K0.tur === 'gosterge' && K0.gos !== 'lah') {
        g.add(new T.Mesh(torna([[0, 0], [0.13, 0], [0.14, 0.015], [0.14, 0.3], [0.07, 0.36], [0.05, 0.38], [0, 0.38]], 40), MAT.camSise));
        var gs = new T.Mesh(torna([[0, 0.01], [0.13, 0.01], [0.13, 0.22], [0, 0.22]], 32), new T.MeshPhysicalMaterial({ color: c, transparent: true, opacity: 0.85 })); gs.renderOrder = 1; g.add(gs);
        var db = new T.Mesh(new T.CapsuleGeometry(0.045, 0.08, 6, 16), new T.MeshStandardMaterial({ color: 0x2b2b2b, roughness: 0.6 })); db.position.y = 0.46; g.add(db);
        var et1 = new T.Mesh(new T.CylinderGeometry(0.142, 0.142, 0.12, 40, 1, true, -0.9, 1.8), new T.MeshStandardMaterial({ map: etiketD(K0.ad.split(' ')[0], 'gösterge', '#8A4FC4'), roughness: 0.7 })); et1.position.y = 0.15; g.add(et1);
        g.userData.dudak = new T.Vector3(0, 0.55, 0);
      } else if (K0.tur === 'kati' || K0.tur === 'metal') {
        g.add(new T.Mesh(torna([[0, 0], [0.17, 0], [0.18, 0.015], [0.18, 0.34], [0.15, 0.36], [0, 0.36]], 40), MAT.camSise));
        var ic = new T.Mesh(K0.tur === 'metal' ? new T.DodecahedronGeometry(0.11, 0) : torna([[0, 0.01], [0.165, 0.01], [0.165, 0.16], [0, 0.2]], 32), K0.tur === 'metal' ? metalMat(K0.metal) : new T.MeshStandardMaterial({ color: c, roughness: 1 }));
        if (K0.tur === 'metal') ic.position.y = 0.1; g.add(ic);
        var et2 = new T.Mesh(new T.CylinderGeometry(0.182, 0.182, 0.13, 40, 1, true, -0.9, 1.8), new T.MeshStandardMaterial({ map: et, roughness: 0.7 })); et2.position.y = 0.24; g.add(et2);
        g.userData.dudak = new T.Vector3(0, 0.37, 0);
      } else {
        g.add(new T.Mesh(torna([[0, 0], [0.15, 0], [0.16, 0.015], [0.16, 0.36], [0.09, 0.45], [0.055, 0.48], [0.055, 0.56], [0.066, 0.57]], 48), MAT.camSise));
        var sv = new T.Mesh(torna([[0, 0.012], [0.148, 0.012], [0.148, 0.27], [0, 0.27]], 36), new T.MeshPhysicalMaterial({ color: c.clone().lerp(new T.Color(0xdcecf6), 0.15), transparent: true, opacity: 0.8 })); sv.renderOrder = 1; g.add(sv);
        var et3 = new T.Mesh(new T.CylinderGeometry(0.162, 0.162, 0.16, 40, 1, true, -0.9, 1.8), new T.MeshStandardMaterial({ map: et, roughness: 0.7 })); et3.position.y = 0.19; g.add(et3);
        g.userData.dudak = new T.Vector3(0, 0.57, 0);
      }
      golgeKoy(g, 0, 0, 0.6, 0.6, 0.6).name = 'golge';
      return g;
    }
    function siseAl(id, derisim, miktar) {
      siseBirak();
      sise.miktar = miktar > 0 ? miktar : 0;
      var K0 = M.KIMI[id];
      if (!K0) return;
      sise.piset = id === 'su';
      sise.derisim = derisim > 0 ? derisim : (LA.derisimAl ? LA.derisimAl(id) : 0);
      sise.g = sise.piset ? pisetModeli() : siseModeli(K0, sise.derisim);
      if (sise.piset) { golgeKoy(sise.g, 0, 0, 0.8, 0.8, 0.8).name = 'golge'; PISET.visible = false; }
      sise.id = id; sise.g.position.copy(SISE_YER); sise.egim = 0;
      sahne.add(sise.g); kirli = 3;
      if (LA.siseDegisti) LA.siseDegisti(id);
    }
    function siseBirak() {
      if (sise.g) { sahne.remove(sise.g); yoket(sise.g); }
      sise.g = null; sise.id = null; kirli = 2;
      if (LA.siseDegisti) LA.siseDegisti(null);
    }
    var akis = new T.Mesh(new T.CylinderGeometry(0.012, 0.009, 1, 12, 1, true), new T.MeshPhysicalMaterial({ color: 0xdcecf6, transparent: true, opacity: 0.8, roughness: 0.05, clearcoat: 1, depthWrite: false }));
    akis.visible = false; akis.renderOrder = 7; sahne.add(akis);
    var damla = new T.Mesh(new T.SphereGeometry(0.016, 12, 10), new T.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, clearcoat: 1 })); damla.visible = false; damla.renderOrder = 7; sahne.add(damla);
    var taneG = new T.BufferGeometry(); taneG.setAttribute('position', new T.BufferAttribute(new Float32Array(40 * 3), 3));
    var taneler = new T.Points(taneG, new T.PointsMaterial({ size: 0.016, color: 0xffffff, map: yumusakD, transparent: true, depthWrite: false })); taneler.visible = false; taneler.frustumCulled = false; sahne.add(taneler);
    var dusen = new T.Mesh(new T.BoxGeometry(0.06, 0.03, 0.04), MAT.celik); dusen.visible = false; sahne.add(dusen);

    /* ================= YÖNLENDİRME OKU ================= */
    var okMat = new T.MeshStandardMaterial({ color: 0x22C26A, emissive: 0x0d6b37, emissiveIntensity: 0.7, roughness: 0.35 });
    var OK = new T.Group(), okUc = new T.Mesh(new T.ConeGeometry(0.17, 0.3, 28), okMat); okUc.rotation.x = Math.PI; okUc.position.y = 0.15; OK.add(okUc);
    var okGv = new T.Mesh(new T.CylinderGeometry(0.065, 0.065, 0.34, 18), okMat); okGv.position.y = 0.47; OK.add(okGv);
    OK.visible = false; OK.renderOrder = 9; sahne.add(OK);
    var halka = new T.Mesh(new T.RingGeometry(0.36, 0.45, 56), new T.MeshBasicMaterial({ color: 0x22C26A, transparent: true, opacity: 0.85, depthWrite: false, side: T.DoubleSide }));
    halka.rotation.x = -Math.PI / 2; halka.visible = false; sahne.add(halka);
    var okHedef = null, okDunya = new T.Vector3();
    function okKonum() {
      var h = okHedef;
      if (!h) return false;
      if (h.kap !== undefined) { var K = kapBul(h.kap); if (!K) return false; okDunya.set(K.kok.position.x + K.g.position.x, K.g.position.y + K.oz.ust + 0.25, K.kok.position.z); halka.scale.setScalar(K.k.tip === 'tup' ? 0.85 : 1.45); return true; }
      if (h.sise) { if (!sise.g) return false; okDunya.copy(sise.g.position); okDunya.y += 0.8; halka.scale.setScalar(0.9); return true; }
      if (h.nesne) { h.nesne.getWorldPosition(okDunya); okDunya.y += h.y || 0.3; halka.scale.setScalar(h.r || 1); return true; }
      if (h.nokta) { okDunya.copy(h.nokta); halka.scale.setScalar(h.r || 1); return true; }
      return false;
    }

    /* ================= HTML KATMANI ================= */
    var katman = document.createElement('div'); katman.className = 'uc-katman';
    var ipucu = document.createElement('div'); ipucu.className = 'uc-ipucu'; ipucu.hidden = true; katman.appendChild(ipucu);
    var panel = document.createElement('div'); panel.className = 'uc-panel';
    panel.innerHTML = '<button type="button" class="uc-panel-dug" data-panel="ac" aria-expanded="false"><b>İçindekiler</b><span>·</span><b>Tepkimeler</b></button>' +
      '<div class="uc-panel-ic" hidden><div class="uc-sekme" role="tablist"><button type="button" data-psekme="ic" class="on">İçindekiler</button><button type="button" data-psekme="tp">Tepkimeler</button><button type="button" class="uc-x" data-panel="kapat" aria-label="Paneli kapat">×</button></div><div class="uc-panel-govde"></div></div>';
    katman.appendChild(panel);
    var panelAcik = false, panelSekme = 'ic', panelSon = 0, panelImza = '';
    var ETK = [], ET3 = [];
    katman.addEventListener('click', function (e) {
      var b = e.target.closest('[data-temizle]'); if (b) { LA.kirikTemizle(+b.getAttribute('data-temizle')); return; }
      b = e.target.closest('.uc-et'); if (b) { LA.kapSec(+b.getAttribute('data-i')); return; }
      b = e.target.closest('[data-sise]');
      if (b) { if (b.getAttribute('data-sise') === 'miktar' && sise.id) LA.miktarAc(sise.id); if (b.getAttribute('data-sise') === 'birak') { siseBirak(); ipucu.hidden = true; } return; }
      b = e.target.closest('[data-panel]');
      if (b) { panelAcik = b.getAttribute('data-panel') === 'ac'; panel.querySelector('.uc-panel-ic').hidden = !panelAcik; panel.querySelector('.uc-panel-dug').hidden = panelAcik; panel.querySelector('.uc-panel-dug').setAttribute('aria-expanded', panelAcik ? 'true' : 'false'); panelImza = ''; panelCiz(); return; }
      b = e.target.closest('[data-psekme]');
      if (b) { panelSekme = b.getAttribute('data-psekme'); panel.querySelectorAll('[data-psekme]').forEach(function (x) { x.classList.toggle('on', x === b); }); panelImza = ''; panelCiz(); }
    });
    function hh(s) { return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
    function panelCiz() {
      if (!panelAcik) return;
      var k = LA.KAPLAR[LA.aktif], gv = panel.querySelector('.uc-panel-govde'), s = '';
      if (!k) { gv.innerHTML = ''; return; }
      if (panelSekme === 'ic') {
        var I = M.icerik(k), V = k.V;
        s = '<div class="uc-pb">' + hh(k.ad) + (V > 1e-6 ? ' · ' + Y.tr(V * 1000, 1) + ' mL' : '') + '</div>';
        if (k.kirik) s += '<p class="uc-bos">Kap kırıldı. Temizle düğmesine dokun.</p>';
        else if (!I.cozunen.length && !I.kati.length && !(V > 1e-6)) s += '<p class="uc-bos">Kap boş.</p>';
        else {
          s += '<table><tr><th>Madde</th><th>Miktar</th><th>Hâl</th></tr>';
          if (V > 1e-6) s += '<tr><td>H₂O</td><td>' + Y.tr(V * 55.4, V * 55.4 < 10 ? 2 : 1) + ' mol</td><td>sıvı</td></tr>';
          I.cozunen.slice(0, 12).forEach(function (x) { if (x.ad.indexOf('OH⁻') === 0 && x.c < 1e-6) return; if (x.ad.indexOf('H⁺') === 0 && x.c < 1e-6) return; s += '<tr><td>' + hh(x.ad) + '</td><td>' + hh(Y.molYaz(x.c * V)) + '</td><td>sulu</td></tr>'; });
          I.kati.forEach(function (x) { s += '<tr><td>' + hh(x.ad) + '</td><td>' + (x.g !== undefined ? Y.tr(x.g, x.g < 0.1 ? 3 : 2) + ' g' : (x.n ? hh(Y.molYaz(x.n)) : '')) + '</td><td>katı</td></tr>'; });
          I.gosterge.forEach(function (x) { s += '<tr><td>' + hh(x.ad) + '</td><td>iz</td><td>' + hh(x.renk) + '</td></tr>'; });
          s += '</table>';
        }
      } else {
        var L = LA.olaylar(LA.aktif), gor = {}, n = 0;
        L.forEach(function (o) { var d = o.net || o.denklem; if (!d || gor[d] || n >= 12) return; gor[d] = 1; n++; s += '<div class="uc-tp"><span>' + hh(o.baslik) + '</span><b>' + hh(d) + '</b></div>'; });
        if (!n) s = '<p class="uc-bos">' + hh(k.ad) + ' kabında henüz tepkime olmadı.</p>';
      }
      if (s !== panelImza) { gv.innerHTML = s; panelImza = s; }
    }
    cv2.style.display = 'none';
    kutu.appendChild(R.domElement); kutu.appendChild(katman);
    kutu.classList.add('uc-acik');

    /* ================= KAMERA ================= */
    var W = 360, H = 300, YON0 = new T.Vector3(0.3, 0.5, 1).normalize(), YON = YON0.clone(), YONh = YON0.clone(), ORAN = null;
    function vKam() { return (kutu.clientWidth || 360) < 600 ? 3.65 : 4.15; }
    var kamH = new T.Vector3(0, 1.12, 0.1), kamHh = kamH.clone(), kamW = vKam(), kamWh = kamW, kamOzel = false;
    function kameraKur() {
      kam.aspect = W / H;
      var vf = kam.fov * Math.PI / 180, hf = 2 * Math.atan(Math.tan(vf / 2) * kam.aspect);
      var d = Math.max(kamW / Math.tan(hf / 2), kamW * 0.42 / Math.tan(vf / 2)) * 1.02;
      kam.position.copy(kamH).addScaledVector(YON, d);
      kam.lookAt(kamH); kam.updateProjectionMatrix();
    }
    function boyut() {
      if (UC && UC.sahip === 'titrasyon' && TIS) { tiBoyut(); return; }
      W = kutu.clientWidth || 360;
      H = Math.round(W * (ORAN ? (W < 600 ? ORAN[0] : ORAN[1]) : (W < 600 ? 0.92 : (W < 900 ? 0.68 : 0.58))));
      R.setSize(W, H, false); R.domElement.style.width = W + 'px'; R.domElement.style.height = H + 'px';
      if (!kamOzel) { kamWh = vKam(); if (TEK && tekCerceve()) { kamH.copy(kamHh); YON.copy(YONh); } kamW = kamWh; }
      kameraKur(); kirli = 3;
    }
    /* tek kap kadrajı: seçili kabı (ve elde şişe varsa onu) ekrana büyük sığdırır */
    var YON_TEK = new T.Vector3(0.16, 0.36, 1).normalize();
    function tekCerceve() {
      if (!TEK || kamOzel) return false;
      var K = kapBul(LA.aktif); if (!K || K.k.gizli) return false;
      var k = K.k, oz = K.oz, A = W / Math.max(1, H), gy = dinlenmeY(K), tup = k.tip === 'tup';
      var R0 = oz.buyuk ? 0.64 : (tup ? 0.13 : (k.tip === 'erlen' ? 0.47 : 0.42));
      var alt = tup ? (k.isit || k.sogut ? -0.3 : 0.38) : -0.3, ust = gy + oz.ust + (tup ? 0.3 : 0.4);
      var cx = 0, yg = tup ? 0.62 : R0 * 1.75;
      if (sise.g) { cx = tup ? 0.5 : 0.45; yg = Math.max(yg, tup ? 1.15 : 1.42); ust = Math.max(ust, gy + oz.ust + 0.75); alt = Math.min(alt, -0.3); }
      var hv = (ust - alt) / 2 * 1.08;
      kamHh.set(cx, (ust + alt) / 2, K.hedefZ !== undefined ? K.hedefZ : 0.35);
      kamWh = Math.max(yg, hv * A);
      YONh.copy(YON_TEK);
      return true;
    }
    function kamera(hedef, yariW, yon) { kamOzel = !!hedef; kamHh.copy(hedef || new T.Vector3(0, 1.12, 0.1)); kamWh = yariW || vKam(); YONh.copy(yon ? yon.clone().normalize() : YON0); kirli = 3; }

    /* ================= DOKUNMA: seç, sürükle, dök ================= */
    var ray = new T.Raycaster(), ndc = new T.Vector2(), duzlem = new T.Plane(new T.Vector3(0, 1, 0), -2.0), nokta = new T.Vector3();
    var sur = null, DOKUN = [];
    R.domElement.style.touchAction = 'none';
    function isinla(e) { var r = R.domElement.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, kam); }
    function gorunur(o) { while (o) { if (!o.visible) return false; o = o.parent; } return true; }
    function sec(e) {
      if (UC.sahip === 'titrasyon') return null;
      isinla(e);
      var adaylar = [];
      if (sise.g) adaylar.push(sise.g);
      YER.forEach(function (K) { if (!K.k.gizli && tekGorunur(K)) adaylar.push(K.hedef); });
      DOKUN.forEach(function (d) { if (gorunur(d.nesne)) adaylar.push(d.nesne); });
      var hit = ray.intersectObjects(adaylar, true), yedek = null;
      for (var q = 0; q < hit.length; q++) {
        var o = hit[q].object, bulunan = null;
        if (!o.visible && !(o.material && o.material.visible === false)) continue;
        while (o && !bulunan) {
          if (o === sise.g) bulunan = { tur: 'sise' };
          for (var i = 0; i < YER.length && !bulunan; i++) if (YER[i].hedef === o) bulunan = { tur: 'kap', K: YER[i] };
          for (var j = 0; j < DOKUN.length && !bulunan; j++) if (DOKUN[j].nesne === o) bulunan = { tur: 'nesne', d: DOKUN[j] };
          o = o.parent;
        }
        if (!bulunan) continue;
        if (bulunan.tur === 'kap') {
          var Kb = bulunan.K, gercek = ray.intersectObject(Kb.g, true).some(function (x) { return x.object !== Kb.hedef && x.object.visible && x.object.isMesh; });
          if (!gercek) { if (!yedek) yedek = bulunan; continue; }
        }
        return bulunan;
      }
      return yedek;
    }
    R.domElement.addEventListener('pointerdown', function (e) {
      if (e.button !== undefined && e.button > 0) return;
      var s = sec(e);
      sur = { tur: s ? s.tur : 'kaydir', K: s && s.K, d: s && s.d, x0: e.clientX, y0: e.clientY, sy: window.pageYOffset || 0, hareket: false, hedef: null, dokulen: 0, t: 0, bekle: 0, bir: 0, birT: 0 };
      try { R.domElement.setPointerCapture(e.pointerId); } catch (er) {}
      kirli = 2;
    });
    R.domElement.addEventListener('pointermove', function (e) {
      if (!sur) return;
      var dx = e.clientX - sur.x0, dy = e.clientY - sur.y0;
      if (!sur.hareket && dx * dx + dy * dy > 64) {
        sur.hareket = true;
        if (sur.tur === 'kap' && (TEK || (!(sur.K.k.V > 1e-6) && !sur.K.k.metal.length) || sur.K.k.kirik || LA.kilit)) sur.tur = 'kaydir';
        if (sur.tur === 'nesne') sur.tur = sur.d.surukle ? 'nesne' : 'kaydir';
      }
      if (!sur.hareket) return;
      if (sur.tur === 'kaydir') { window.scrollTo(0, sur.sy - dy); return; }
      isinla(e);
      if (sur.tur === 'nesne') { if (sur.d.surukle) sur.d.surukle(ray, e); kirli = 2; return; }
      if (ray.ray.intersectPlane(duzlem, nokta)) {
        sur.poz = nokta.clone();
        var en = null, ed = 0.9;
        YER.forEach(function (K) {
          if ((sur.tur === 'kap' && K === sur.K) || K.k.kirik || K.k.gizli || !tekGorunur(K)) return;
          var d = Math.hypot(nokta.x - K.kok.position.x, nokta.z - K.kok.position.z);
          if (d < ed) { ed = d; en = K; }
        });
        if (sur.hedef !== en) { if (sur.hedef) dokumBitir(); sur.hedef = en; if (en) { sur.dokulen = 0; sur.t = 0; sur.bir = 0; sur.birT = 0; LA.dokumBasla(LA.KAPLAR.indexOf(en.k)); } }
      }
      kirli = 2;
    });
    function birak(e) {
      if (!sur) return;
      var s = sur;
      if (UC.sahip === 'titrasyon') { sur = null; return; }
      if (!s.hareket) {
        if (s.tur === 'kap') LA.kapSec(LA.KAPLAR.indexOf(s.K.k));
        else if (s.tur === 'sise' && sise.id) LA.miktarAc(sise.id);
        else if (s.tur === 'nesne') { if (s.d.fn) s.d.fn(s.d.nesne); }
        else if (s.tur === 'kaydir') {
          var r = R.domElement.getBoundingClientRect(), x = e.clientX - r.left, en = null, ed = 1e9;
          YER.forEach(function (K, i) { if (K.k.gizli || !tekGorunur(K)) return; tmpV.copy(K.kok.position).project(kam); var sx = (tmpV.x + 1) / 2 * W, d = Math.abs(sx - x); if (d < ed) { ed = d; en = K; } });
          if (en && ed < W * 0.16) LA.kapSec(LA.KAPLAR.indexOf(en.k));
        }
      } else if (s.tur === 'nesne') { if (s.d.birak) s.d.birak(); }
      else if (s.hedef) {
        if (s.tur === 'sise' && sise.id && M.KIMI[sise.id].tur === 'metal') {
          var K0 = M.KIMI[sise.id], mik = sise.miktar > 0 ? sise.miktar : K0.miktar[Math.min(1, K0.miktar.length - 1)];
          LA.ekle(LA.KAPLAR.indexOf(s.hedef.k), sise.id, mik, true);
        } else dokumBitir();
      }
      sur = null; kirli = 3;
    }
    R.domElement.addEventListener('pointerup', birak);
    R.domElement.addEventListener('pointercancel', function () { if (sur && sur.hedef) dokumBitir(); sur = null; kirli = 3; });
    function dokumBosalt() {
      if (!sur || !sur.hedef || sur.bir <= 0) return;
      var hi = LA.KAPLAR.indexOf(sur.hedef.k);
      if (sur.tur === 'sise' && sise.id) LA.dokSessiz(hi, sise.id, sur.bir, sise.derisim);
      else if (sur.tur === 'kap') { var a = sur.K.k; if (a.V > 1e-7) LA.aktarSessiz(LA.KAPLAR.indexOf(a), hi, Math.min(1, sur.bir / a.V)); }
      sur.bir = 0; sur.birT = 0;
    }
    function dokumBitir() {
      if (!sur || !sur.hedef) return;
      dokumBosalt();
      LA.dokumBitti(LA.KAPLAR.indexOf(sur.hedef.k), sur.dokulen, sur.tur === 'sise' ? sise.id : null, sur.tur === 'kap' ? LA.KAPLAR.indexOf(sur.K.k) : -1);
      sur.dokulen = 0;
    }
    function dokumAdim(dt) {
      if (!sur || !sur.hareket || !sur.hedef || (sur.tur !== 'sise' && sur.tur !== 'kap')) return;
      var hk = sur.hedef.k;
      sur.t += dt;
      if (sur.t < 0.35) return;
      var bos = Math.max(0, hk.kapasite - hk.V - sur.bir), v = 0;
      if (sur.tur === 'sise' && sise.id) {
        var K0 = M.KIMI[sise.id];
        if (K0.tur === 'metal') return;
        if (K0.tur === 'gosterge' && K0.gos !== 'lah') { sur.bekle -= dt; if (sur.bekle <= 0 && bos > 0.00005) { sur.bekle = 0.45; v = 0.00005; } }
        else if (K0.tur === 'kati') { sur.bekle -= dt; if (sur.bekle <= 0) { sur.bekle = 0.35; v = 0.1; } }
        else { var hiz = hk.tip === 'tup' ? 0.0025 : (sur.t < 1.5 ? 0.005 : Math.min(0.015, 0.005 + (sur.t - 1.5) * 0.006)); v = Math.min(hiz * dt, bos); }
      } else {
        var a = sur.K.k;
        if (!(a.V - sur.bir > 1e-6)) return;
        var hz = (hk.tip === 'tup' || a.tip === 'tup') ? 0.003 : (sur.t < 1.5 ? 0.006 : 0.015);
        v = Math.min(a.V - sur.bir, hz * dt, bos);
      }
      if (v > 0) { sur.bir += v; sur.dokulen += v; }
      sur.birT += dt;
      if (sur.birT >= 0.12 || (v === 0.00005) || (v === 0.1)) dokumBosalt();
    }

    /* ================= GÜNCELLEME ================= */
    var tmpM = new T.Matrix4(), tmpQ = new T.Quaternion(), tmpS = new T.Vector3(), tmpV = new T.Vector3(), tmpV2 = new T.Vector3(), birQ = new T.Quaternion();
    var c1 = new T.Color(), c2 = new T.Color();
    function karisim(R0) {
      var s = R0.sivi, b = R0.bulanik, br = R0.bulRenk, r = s[0] / 255, gg = s[1] / 255, bb = s[2] / 255, koyu = 1 - Math.min(r, gg, bb);
      c1.setRGB(r * 0.78, gg * 0.89, bb * 0.98, T.SRGBColorSpace);
      c2.setRGB(br[0] / 255, br[1] / 255, br[2] / 255, T.SRGBColorSpace);
      c1.lerp(c2, b * 0.92);
      return Math.min(0.97, 0.52 + koyu * 0.48 + b * 0.6);
    }
    function kirikYap(K) {
      var g = new T.Group(), k = K.k, oz = K.oz, taban = K.g.position.y, j, renk = k.dokulenRenk || [215, 230, 240];
      g.userData.t = 0;
      g.userData.parca = [];
      for (j = 0; j < 24; j++) {
        var rr = oz.r(oz.y0 + 0.2) + 0.012, th = Math.random() * 6.283, hgt = 0.12 + Math.random() * 0.24;
        var geo = new T.CylinderGeometry(rr, rr, hgt, 6, 1, true, 0, 0.35 + Math.random() * 0.6);
        var m = new T.Mesh(geo, MAT.kirikCam); m.renderOrder = 5;
        var y = taban + Math.min(oz.ust, 0.2 + Math.random() * oz.ust * 0.8);
        m.position.set(0, y, 0); m.rotation.y = th;
        var hz = 1.4 + Math.random() * 2.2;
        m.userData.v = new T.Vector3(Math.cos(th) * hz, 1 + Math.random() * 2.4, -Math.sin(th) * hz * 0.7);
        m.userData.w = new T.Vector3(Math.random() * 8 - 4, Math.random() * 8 - 4, Math.random() * 8 - 4);
        g.add(m); g.userData.parca.push(m);
      }
      var gol = new T.Mesh(new T.CircleGeometry(1, 40), new T.MeshBasicMaterial({ color: new T.Color(renk[0] / 255, renk[1] / 255, renk[2] / 255), transparent: true, opacity: 0.38, depthWrite: false }));
      gol.rotation.x = -Math.PI / 2; gol.position.set(0.1, 0.006, 0.25); gol.scale.setScalar(0.01); g.add(gol); g.userData.gol = gol;
      var fl = new T.Sprite(new T.SpriteMaterial({ map: yumusakD, color: 0xfff1c2, transparent: true, opacity: 1, blending: T.AdditiveBlending, depthWrite: false })); fl.position.y = taban + 0.4; fl.renderOrder = 10; g.add(fl); g.userData.fl = fl;
      g.userData.duman = [];
      for (j = 0; j < 14; j++) { var sp = new T.Sprite(new T.SpriteMaterial({ map: yumusakD, color: 0xdfe3e8, transparent: true, opacity: 0, depthWrite: false })); sp.renderOrder = 9; sp.position.set((Math.random() - 0.5) * 0.5, taban + 0.4, (Math.random() - 0.5) * 0.4); sp.userData.v = 0.4 + Math.random() * 0.6; sp.userData.f = Math.random(); g.add(sp); g.userData.duman.push(sp); }
      var sg = new T.BufferGeometry(), sa = new Float32Array(60 * 3); g.userData.sv = [];
      for (j = 0; j < 60; j++) { sa[j * 3 + 1] = taban + 0.4; var a = Math.random() * 6.283, hz2 = 1 + Math.random() * 2.5; g.userData.sv.push([Math.cos(a) * hz2, 1.5 + Math.random() * 2.5, Math.sin(a) * hz2]); }
      sg.setAttribute('position', new T.BufferAttribute(sa, 3));
      var sp2 = new T.Points(sg, new T.PointsMaterial({ size: 0.04, color: new T.Color(renk[0] / 255, renk[1] / 255, renk[2] / 255), map: yumusakD, transparent: true, depthWrite: false })); sp2.frustumCulled = false; g.add(sp2); g.userData.sicrama = sp2;
      K.kok.add(g); K.kirikG = g; K.g.visible = false;
    }
    function kirikGuncelle(K, dt) {
      var g = K.kirikG, u = g.userData, j, hareket = false;
      u.t += dt;
      u.parca.forEach(function (m) {
        var v = m.userData.v;
        if (v.lengthSq() < 1e-6 && m.position.y <= 0.02) return;
        v.y -= 9.8 * dt; m.position.addScaledVector(v, dt);
        m.rotation.x += m.userData.w.x * dt; m.rotation.y += m.userData.w.y * dt; m.rotation.z += m.userData.w.z * dt;
        var zemin = 0.012;
        if (m.position.y < zemin) { m.position.y = zemin; v.set(v.x * 0.3, Math.abs(v.y) * 0.18, v.z * 0.3); m.userData.w.multiplyScalar(0.3); if (Math.abs(v.y) < 0.3) { v.set(0, 0, 0); m.rotation.x = Math.PI / 2 + (m.rotation.x % 0.3); m.rotation.z = 0; } }
        hareket = true;
      });
      u.fl.material.opacity = Math.max(0, 1 - u.t * 3.5); u.fl.scale.setScalar(0.5 + u.t * 6);
      u.gol.scale.setScalar(Math.min(0.8, 0.01 + u.t * 2));
      u.duman.forEach(function (sp) { var tt = u.t - sp.userData.f * 0.3; if (tt < 0) return; sp.position.y += sp.userData.v * dt * 1.4; sp.position.x += (sp.userData.f - 0.5) * dt * 0.4; sp.scale.setScalar(0.45 + tt * 0.8); sp.material.opacity = Math.max(0, 0.55 * Math.min(1, tt * 4) * (1 - tt / 2.6)); });
      var pa = u.sicrama.geometry.attributes.position.array;
      for (j = 0; j < 60; j++) { if (pa[j * 3 + 1] <= 0.01) continue; var sv = u.sv[j]; sv[1] -= 9.8 * dt; pa[j * 3] += sv[0] * dt; pa[j * 3 + 1] = Math.max(0.005, pa[j * 3 + 1] + sv[1] * dt); pa[j * 3 + 2] += sv[2] * dt; }
      u.sicrama.geometry.attributes.position.needsUpdate = true; u.sicrama.material.opacity = Math.max(0, 1 - u.t / 2);
      return hareket || u.t < 4;
    }
    function kapGuncelle(K, t, dt) {
      var k = K.k, oz = K.oz, V = k.V, R0 = M.renk(k), idx = LA.KAPLAR.indexOf(k), aktif = LA.aktif === idx, hareket = false, j;
      if (TEK && !K.ozel) tekYer(K);
      var kayiyor = Math.abs(K.kok.position.x - K.hedefX) > 0.002 || Math.abs(K.kok.position.z - K.hedefZ) > 0.002;
      K.kok.visible = !k.gizli && (!TEK || aktif || K.ozel || (kayiyor && Math.abs(K.kok.position.x) < 3.15));
      if (kayiyor) { var hz0 = Math.min(1, dt * (TEK ? 7 : 5)); K.kok.position.x += (K.hedefX - K.kok.position.x) * hz0; K.kok.position.z += (K.hedefZ - K.kok.position.z) * hz0; hareket = true; }
      if (!K.kok.visible) return hareket;
      if (k.kirik) { if (!K.kirikG) kirikYap(K); if (kirikGuncelle(K, dt)) hareket = true; K.secim.material.opacity = aktif ? 0.75 : 0; return hareket; }
      else if (K.kirikG) kirikTemizle(K);
      var surukle = sur && sur.hareket && sur.tur === 'kap' && sur.K === K && sur.poz;
      var hedefEgim = 0, hedefPoz = null;
      if (surukle) {
        if (sur.hedef) {
          var hp = sur.hedef.kok.position, hy = sur.hedef.g.position.y + sur.hedef.oz.ust;
          hedefEgim = k.tip === 'tup' ? -1.95 : -1.75;
          var r0 = oz.agizR, ce = Math.cos(hedefEgim), se = Math.sin(hedefEgim);
          var lx = r0 * ce - oz.ust * se, ly = r0 * se + oz.ust * ce;
          hedefPoz = tmpV2.set(hp.x - sur.hedef.oz.agizR * 0.3 - lx, hy + 0.12 - ly, hp.z);
        } else { hedefEgim = -0.15; hedefPoz = tmpV2.set(sur.poz.x, 1.55, Math.min(1.2, sur.poz.z)); }
      }
      K.egim += (hedefEgim - K.egim) * Math.min(1, dt * 7);
      if (hedefPoz) { tmpV.copy(hedefPoz).sub(K.kok.position); K.g.position.lerp(tmpV, Math.min(1, dt * 10)); hareket = true; }
      else {
        tmpV.set(0, dinlenmeY(K), 0);
        if (K.g.position.distanceTo(tmpV) > 0.002) { K.g.position.lerp(tmpV, Math.min(1, dt * (k.sogut || K.g.position.y < 0.5 ? 4 : 8))); hareket = true; } else K.g.position.copy(tmpV);
      }
      K.g.rotation.z = K.egim;
      if (Math.abs(K.egim) > 0.01) hareket = true;
      var egik = Math.min(1, Math.abs(K.egim) / 0.9);
      /* sıvı */
      var h = seviye(K, V);
      if (V > 1e-6) {
        if (Math.abs(h - K.sonH) > 0.0015) { K.sivi.geometry.dispose(); K.sivi.geometry = siviGeo(K, h); K.sonH = h; }
        K.sivi.material.opacity = karisim(R0) * (1 - egik * 0.85); K.sivi.material.color.copy(c1); K.sivi.visible = true;
        var rm = Math.max(0.01, oz.r(h) - 0.004); K.menisk.visible = egik < 0.25; K.menisk.position.y = h; K.menisk.scale.set(rm, rm, rm); K.menisk.material.color.copy(c1).multiplyScalar(0.52); K.menisk.material.opacity = 0.45 + 0.35 * Math.min(1, K.sivi.material.opacity);
      } else { K.sivi.visible = false; K.sonH = -1; K.menisk.visible = false; }
      /* askıdaki tanecikler */
      if (V > 1e-6 && R0.bulanik > 0.04 && egik < 0.5) {
        var pos = K.nokta.geometry.attributes.position.array, hh0 = Math.max(0.01, h - oz.y0);
        for (j = 0; j < K.tohum.length; j++) {
          var s = K.tohum[j], yy = oz.y0 + ((s[0] * hh0 - t * 0.01 * s[3] * (1 - k.askida * 0.5)) % hh0 + hh0) % hh0, rr = oz.r(yy) * 0.9 * Math.sqrt(s[2]), a = s[1] + t * 0.08 * s[3];
          pos[j * 3] = Math.cos(a) * rr; pos[j * 3 + 1] = yy; pos[j * 3 + 2] = Math.sin(a) * rr;
        }
        K.nokta.geometry.attributes.position.needsUpdate = true;
        K.nokta.material.color.setRGB(R0.bulRenk[0] / 255, R0.bulRenk[1] / 255, R0.bulRenk[2] / 255, T.SRGBColorSpace).multiplyScalar(0.92);
        K.nokta.material.opacity = Math.min(0.9, 0.25 + R0.bulanik); K.nokta.visible = true; hareket = true;
      } else K.nokta.visible = false;
      /* dipteki çökelek */
      var mol = 0, cr = 0, cg = 0, cb = 0;
      R0.cokelek.forEach(function (o) { var q = new T.Color(o.renk); mol += o.mol; cr += q.r * o.mol; cg += q.g * o.mol; cb += q.b * o.mol; });
      var sh = mol > 1e-8 ? Math.min(0.12, 0.012 + 0.045 * Math.pow(mol * 1000, 1 / 3)) * (1 - k.askida * 0.85) : 0;
      if (V > 1e-6 && sh > 0.004) {
        if (Math.abs(sh - K.sonTortu) > 0.002) { var rb = oz.r(oz.y0 + 0.01) - 0.004, yb = oz.y0 + 0.001; K.tortu.geometry.dispose(); K.tortu.geometry = torna([[0, yb + sh], [rb * 0.55, yb + sh * 0.8], [rb * 0.9, yb + sh * 0.35], [rb, yb], [0, yb]], 48); K.sonTortu = sh; }
        K.tortu.material.color.setRGB(cr / mol, cg / mol, cb / mol); K.tortu.visible = true;
      } else { K.tortu.visible = false; K.sonTortu = -1; }
      /* kabarcıklar */
      var hiz = 0, gz;
      for (gz in k.gazHiz) if (gz !== 'NH3' && gz !== 'NH2Cl' && gz !== 'SO2') hiz += k.gazHiz[gz] || 0;
      var adet = V > 1e-6 && egik < 0.3 ? Math.min(140, 5200 * Math.pow(hiz, 0.62)) * dt + (k.kaynama ? 26 * dt : 0) : 0;
      var kaynak = k.metal.filter(function (p) { return !p.cokme && !M.METAL[p.m].yuzer; }), yuzen = k.metal.filter(function (p) { return M.METAL[p.m].yuzer; });
      while (adet > 0 && K.kabL.length < 250) {
        if (adet < 1 && Math.random() > adet) break;
        adet -= 1;
        var b = { r: 0.006 + Math.random() * 0.012, vy: 0.22 + Math.random() * 0.25, faz: Math.random() * 6 }, yyb = Math.random() * (h - oz.y0) * 0.8;
        if (k.kaynama && Math.random() < 0.4) { b.r = 0.015 + Math.random() * 0.02; b.vy = 0.45; yyb = 0; }
        if (yuzen.length && (k.gazHiz.H2 || 0) > 1e-6) { var pz = yuzen[0]; b.x = (pz._x || 0) + (Math.random() - 0.5) * 0.08; b.z = (pz._z || 0) + (Math.random() - 0.5) * 0.08; b.y = h - 0.01; b.vy = 0.02; }
        else if (kaynak.length && ((k.gazHiz.H2 || 0) + (k.gazHiz.NO2 || 0) + (k.gazHiz.NO || 0)) > hiz * 0.4) { var p0 = kaynak[Math.floor(Math.random() * kaynak.length)]; b.x = (p0._x || 0) + (Math.random() - 0.5) * 0.1; b.z = (p0._z || 0) + (Math.random() - 0.5) * 0.1; b.y = oz.y0 + 0.02; }
        else { var rrb = oz.r(oz.y0 + yyb) * 0.85 * Math.sqrt(Math.random()), ab = Math.random() * 6.283; b.x = Math.cos(ab) * rrb; b.z = Math.sin(ab) * rrb; b.y = oz.y0 + 0.01 + yyb * Math.random(); }
        K.kabL.push(b);
      }
      for (j = K.kabL.length - 1; j >= 0; j--) { var q = K.kabL[j]; q.y += q.vy * dt; q.faz += dt * 7; q.x += Math.sin(q.faz) * 0.0015; if (q.y > h - q.r * 0.5 || V < 1e-6 || egik > 0.3) K.kabL.splice(j, 1); }
      var n = 0;
      for (j = 0; j < K.kabL.length && n < 260; j++) { var qq = K.kabL[j]; tmpV.set(qq.x, qq.y, qq.z); tmpS.setScalar(qq.r); tmpM.compose(tmpV, birQ, tmpS); K.kab.setMatrixAt(n++, tmpM); }
      K.kab.count = n; if (n) { K.kab.instanceMatrix.needsUpdate = true; hareket = true; }
      /* köpük ve taşma */
      if (k.kopuk > 1e-5 && V > 1e-6 && egik < 0.3) {
        var fh = Math.min(oz.ust + 0.02, seviye(K, V + k.kopuk));
        if (Math.abs(fh - K.sonKopuk) > 0.003) {
          var pk = [[0, h], [oz.r(h) - 0.003, h]];
          for (j = 1; j <= 10; j++) { var yk = h + (fh - h) * j / 10; pk.push([oz.r(Math.min(yk, oz.ust)) - 0.003, yk]); }
          pk.push([oz.r(fh) * 0.7, fh + 0.03]); pk.push([oz.r(fh) * 0.3, fh + 0.045]); pk.push([0, fh + 0.05]);
          K.kopuk.geometry.dispose(); K.kopuk.geometry = torna(pk, 48); K.sonKopuk = fh;
        }
        c2.setRGB(R0.sivi[0] / 255, R0.sivi[1] / 255, R0.sivi[2] / 255, T.SRGBColorSpace); K.kopuk.material.color.setRGB(1, 1, 1).lerp(c2, 0.35); K.kopuk.visible = true;
      } else { K.kopuk.visible = false; K.sonKopuk = -1; }
      if (k.tasma > 1e-3 && egik < 0.3) {
        if (!K.tasma.children.length) { var km = new T.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92 }); for (j = 0; j < 14; j++) { var bl = new T.Mesh(new T.SphereGeometry(1, 16, 12), km); bl.userData.j = j; K.tasma.add(bl); } }
        var ta = Math.min(1, k.tasma * 1.5), rt = oz.r(oz.ust);
        K.tasma.children.forEach(function (m) {
          m.material.color.copy(K.kopuk.material.color);
          var jj = m.userData.j, ust0 = oz.ust + 0.04;
          if (jj < 6) { var aa = jj / 6 * 6.283; m.position.set(Math.cos(aa) * rt * 0.5, ust0 + 0.05 + Math.sin(t * 2 + jj) * 0.01 + ta * 0.12, Math.sin(aa) * rt * 0.5); m.scale.setScalar(0.05 + ta * 0.05); }
          else { var yon = jj % 2 ? 1 : -1, ilerle = ((jj - 6) / 8 + t * 0.1) % 1, rx = (k.tip === 'erlen' ? 0.15 + 0.3 * ilerle : rt + 0.03); m.position.set(yon * rx, ust0 - ilerle * (oz.ust - 0.05) * ta, 0.12); m.scale.setScalar(0.035 + ta * 0.03); }
        });
        K.tasma.visible = true; hareket = true;
      } else K.tasma.visible = false;
      /* metaller */
      k.metal.forEach(function (p) {
        if (!p._uc) { p._uc = metalModel(p); K.metalG.add(p._uc); }
        else if (p._uc.parent !== K.metalG) K.metalG.add(p._uc);
        var Md = M.METAL[p.m], gr = Math.max(0.002, p.n * Md.MA), olc = Math.pow(gr / (p.n0 * Md.MA || gr), 1 / 3), rmax = oz.r(oz.y0 + 0.02) * 0.55;
        p._x = (p.x - 0.5) * 2 * rmax * 0.7; p._z = ((p.aci || 0.5) % 1 - 0.5) * rmax * 0.6;
        if (Md.yuzer && V > 1e-6) {
          var gen = oz.r(h) * 0.6, hz = 1.6 + p.x + Math.min(3, (k.gazHiz.H2 || 0) * 3000);
          p._x = Math.sin(t * hz + (p.aci || 0)) * gen; p._z = Math.cos(t * hz * 0.8 + (p.aci || 0) * 2) * gen * 0.6;
          p._uc.position.set(p._x, h + 0.008, p._z); p._uc.rotation.y = t * 3; p._uc.scale.setScalar(Math.max(0.3, olc)); hareket = true;
          p._uc.children.forEach(function (c) { if (c.userData.alev) c.material.opacity = (k.gazHiz.H2 || 0) > (c.userData.alev === 'K' ? 1e-5 : 2e-4) ? 0.6 + 0.3 * Math.sin(t * 20) : 0; });
        } else if (p.cokme) {
          var im = p._uc.children[0], hed = k.metal.filter(function (m) { return !m.cokme; })[0], hx = hed ? hed._x || 0 : 0, hz2 = hed ? hed._z || 0 : 0, say = Math.min(40, 6 + Math.round(gr * 400));
          for (var q2 = 0; q2 < say; q2++) {
            var ra = Math.sin(q2 * 12.9898) * 43758.5453; ra -= Math.floor(ra); var rb2 = Math.sin(q2 * 78.233) * 12345.678; rb2 -= Math.floor(rb2);
            tmpQ.setFromAxisAngle(tmpV.set(rb2 - 0.5, 1, ra - 0.5).normalize(), ra * 3);
            tmpM.compose(tmpS.set(hx + (ra - 0.5) * (p.m === 'Ag' ? 0.22 : 0.3), oz.y0 + 0.01 + (p.m === 'Ag' ? ra * 0.06 : 0), hz2 + (rb2 - 0.5) * 0.18), tmpQ, tmpV.set(1, p.m === 'Ag' ? 0.6 + rb2 : 1, 1)); im.setMatrixAt(q2, tmpM);
          }
          im.count = say; im.instanceMatrix.needsUpdate = true; p._uc.position.set(0, 0, 0);
        } else {
          p._uc.position.set(p._x, oz.y0 + 0.004, p._z); p._uc.scale.setScalar(Math.max(0.25, olc));
          if (p.kap) { var mtt = metalMat(p.m, p.kap, Math.min(0.85, (p.kapMiktar || 0) * 400)); p._uc.traverse(function (c) { if (c.isMesh) c.material = mtt; }); }
        }
      });
      for (j = K.metalG.children.length - 1; j >= 0; j--) { var ch = K.metalG.children[j]; if (!k.metal.some(function (p) { return p._uc === ch; })) K.metalG.remove(ch); }
      K.metalG.visible = egik < 0.4;
      /* cam baget */
      K.baget.visible = k.karistir > 0 && V > 1e-6 && !surukle;
      if (K.baget.visible) { var rr3 = oz.r(oz.y0 + 0.05) * 0.45; K.baget.position.set(Math.cos(t * 7) * rr3, oz.y0 + 0.01, Math.sin(t * 7) * rr3); K.baget.rotation.set(Math.sin(t * 7) * 0.22, 0, -Math.cos(t * 7) * 0.22); hareket = true; }
      /* termometre ve pH metre (seçili kapta) */
      var olcer = aktif && V > 1e-6 && !surukle && !LA.olcerGizli && !!LA.olcerGoster;
      K.termo.visible = olcer && k.tip !== 'tup'; K.phm.visible = olcer;
      if (K.termo.visible) { var rr4 = oz.r(oz.y0 + 0.1) * 0.55; K.termo.position.set(-rr4, oz.y0 + 0.02, -rr4 * 0.4); var tt2 = Math.max(0.02, Math.min(1, (k.T + 10) / 120)); K.termo.userData.sutun.scale.y = tt2 * 1.1; K.termo.userData.sutun.position.y = 0.03 + tt2 * 0.55; }
      if (K.phm.visible) { var rr5 = oz.r(oz.y0 + 0.1) * (k.tip === 'tup' ? 0.2 : 0.5); K.phm.position.set(rr5 * 0.7, oz.y0 + 0.03, -rr5 * 0.5); K.phm.scale.setScalar(k.tip === 'tup' ? 0.7 : 1); }
      /* ısıtma ve soğutma */
      if (k.tip === 'tup') {
        if (K.bek) {
          K.bek.alev.visible = k.isit; K.bek.g.visible = !!k.isit; K.kriko.visible = !!k.sogut;
          if (k.isit) { var fl2 = 1 + Math.sin(t * 31) * 0.05 + Math.sin(t * 17) * 0.04; K.bek.dis.scale.set(1, fl2, 1); K.bek.ic.scale.set(1, 2 - fl2, 1); K.bek.isik.intensity = 0.6; hareket = true; } else K.bek.isik.intensity = 0;
        }
      } else {
        var yuksek = K.dz === 'ocak' && K.g.position.y > 0.55 && !surukle;
        if (K.sac) { K.sac.visible = yuksek; K.lamba.g.visible = yuksek; K.lamba.alev.visible = k.isit && yuksek; }
        if (K.golge) K.golge.material.opacity = yuksek ? 0.55 : 0.75;
        if (K.buzKap) K.buzKap.visible = !!k.sogut && !surukle;
        if (K.lamba && K.lamba.alev.visible) { var f3 = 1 + Math.sin(t * 23) * 0.06 + Math.sin(t * 13) * 0.05; K.lamba.dis.scale.set(1 + Math.sin(t * 9) * 0.04, f3, 1); K.lamba.ic.scale.set(1, 2 - f3, 1); K.lamba.isik.intensity = 0.9 + Math.sin(t * 19) * 0.1; hareket = true; }
        else if (K.lamba) K.lamba.isik.intensity = 0;
      }
      /* buhar */
      var buh = Math.max(k.buhar, V > 1e-6 && k.T > 70 ? (k.T - 70) / 30 : 0);
      K.buhar.forEach(function (o, i2) {
        var ph = (t * 0.28 + o.faz) % 1, rr2 = oz.r(oz.ust) * 0.6;
        o.s.position.set(Math.sin(t + i2 * 2.1) * rr2, oz.ust + 0.05 + ph * 0.7, Math.cos(t * 0.7 + i2) * rr2 * 0.5);
        o.s.scale.setScalar(0.12 + ph * 0.35); o.s.material.opacity = buh > 0.02 && egik < 0.3 ? 0.35 * buh * (1 - ph) : 0;
      });
      if (buh > 0.02) hareket = true;
      /* renkli gaz bulutu */
      var bulR = null, bulA = 0;
      [['Cl2', 0xc4d646], ['NO2', 0xa04a18], ['NH2Cl', 0xdde1c8]].forEach(function (z) { var v = k.bulut[z[0]] || 0; if (v > bulA) { bulA = v; bulR = z[1]; } });
      K.bulut.forEach(function (o, i2) {
        var ph = (t * 0.18 + o.faz) % 1;
        o.s.position.set(Math.sin(t * 0.8 + i2 * 1.9) * 0.15, oz.ust + 0.05 + ph * 0.9, Math.cos(t * 0.6 + i2) * 0.1);
        o.s.scale.setScalar(0.2 + ph * 0.5); if (bulR !== null) o.s.material.color.setHex(bulR);
        o.s.material.opacity = bulA > 0.02 ? 0.42 * Math.min(1, bulA) * (1 - ph) : 0;
      });
      if (bulA > 0.02) hareket = true;
      /* karbon sütunu */
      var nc = k.n.C || 0;
      if (nc > 1e-6) { var hc = Math.min(1.6, nc * 12 * 0.06), rc = oz.r(oz.y0 + 0.05) * 0.75; K.karbon.scale.set(rc, hc, rc); K.karbon.position.y = oz.y0 + hc / 2; K.karbon.visible = true; } else K.karbon.visible = false;
      /* altın yağmuru */
      var par = R0.cokelek.filter(function (o) { return o.parilti; })[0];
      if (par && k.kristal > 0 && V > 1e-6) {
        var pp2 = K.parilti.geometry.attributes.position.array;
        for (j = 0; j < 60; j++) {
          var ra2 = Math.sin(j * 91.7) * 43758.5; ra2 -= Math.floor(ra2); var rb3 = Math.sin(j * 17.3) * 9131.7; rb3 -= Math.floor(rb3);
          var yy2 = h - (((ra2 + t * (0.03 + 0.03 * rb3)) % 1) * (h - oz.y0)), r2 = oz.r(yy2) * 0.8 * rb3, a2 = ra2 * 6.283 + t * 0.2;
          pp2[j * 3] = Math.cos(a2) * r2; pp2[j * 3 + 1] = yy2; pp2[j * 3 + 2] = Math.sin(a2) * r2;
        }
        K.parilti.geometry.attributes.position.needsUpdate = true; K.parilti.material.opacity = 0.55 + 0.4 * Math.sin(t * 7); K.parilti.visible = true; hareket = true;
      } else K.parilti.visible = false;
      var hedefMi = sur && sur.hedef === K;
      K.secim.material.color.setHex(hedefMi ? 0x22C26A : 0xF85300);
      K.secim.material.opacity = hedefMi ? 0.9 : (aktif && !TEK ? 0.75 : 0);
      return hareket;
    }
    function siseGuncelle(t, dt) {
      if (!sise.g) return false;
      var hareket = false, hedefE = 0, hp = SISE_YER, K0 = M.KIMI[sise.id];
      if (sur && sur.hareket && sur.tur === 'sise' && sur.poz) {
        if (sur.hedef) {
          var hk = sur.hedef, mx = hk.kok.position.x - hk.oz.agizR * 0.25, my = hk.g.position.y + hk.oz.ust + (K0.tur === 'gosterge' ? 0.12 : 0.1), mz = hk.kok.position.z;
          hedefE = sise.piset ? -0.75 : (K0.tur === 'gosterge' && K0.gos !== 'lah' ? 0 : (K0.tur === 'metal' ? -0.6 : -1.95));
          var dd = sise.g.userData.dudak, ce = Math.cos(hedefE), se = Math.sin(hedefE);
          hp = tmpV2.set(mx - (dd.x * ce - dd.y * se), my - (dd.x * se + dd.y * ce), mz);
          if (sise.piset) hp.y += 0.25;
        } else { hedefE = -0.12; hp = tmpV2.set(sur.poz.x, 1.45, Math.min(1.3, sur.poz.z)); }
        hareket = true;
      }
      sise.egim += (hedefE - sise.egim) * Math.min(1, dt * 7);
      sise.g.position.lerp(hp, Math.min(1, dt * 10)); sise.g.rotation.z = sise.egim;
      var gl = sise.g.getObjectByName('golge'); if (gl) gl.visible = sise.g.position.y < 0.05;
      if (sise.g.position.distanceTo(hp) > 0.002 || Math.abs(sise.egim - hedefE) > 0.01) hareket = true;
      akis.visible = damla.visible = taneler.visible = false;
      if (sur && sur.hedef && sur.tur === 'sise' && sur.t > 0.3 && K0.tur !== 'metal') {
        var hk2 = sur.hedef, dudak = sise.g.userData.dudak.clone().applyEuler(sise.g.rotation).add(sise.g.position), yuz = hk2.g.position.y + seviye(hk2, hk2.k.V) + 0.002;
        var renk = LA.stokRenk(K0), cc = new T.Color(renk[0] / 255, renk[1] / 255, renk[2] / 255).lerp(new T.Color(0xdcecf6), 0.3);
        if (K0.tur === 'gosterge' && K0.gos !== 'lah') { damla.visible = true; var dp = (t * 2.2) % 1; damla.position.set(dudak.x, dudak.y - 0.05 - dp * (dudak.y - 0.05 - yuz), dudak.z); damla.material.color.copy(cc); }
        else if (K0.tur === 'kati') {
          taneler.visible = true; var tp = taneler.geometry.attributes.position.array;
          for (var q = 0; q < 40; q++) { var d2 = (t * 1.6 + q / 40) % 1; tp[q * 3] = dudak.x + Math.sin(q * 3.1) * 0.025; tp[q * 3 + 1] = dudak.y - d2 * (dudak.y - yuz); tp[q * 3 + 2] = dudak.z + Math.cos(q * 1.7) * 0.025; }
          taneler.geometry.attributes.position.needsUpdate = true; taneler.material.color.copy(cc);
        } else {
          var uz = Math.max(0.01, dudak.y - yuz), kal = sise.piset ? 0.55 : 1;
          akis.visible = true; akis.scale.set(kal, uz, kal); akis.position.set(dudak.x + (sise.piset ? 0.03 : 0.02), yuz + uz / 2, dudak.z); akis.rotation.set(0, 0, 0); akis.material.color.copy(cc);
        }
        hareket = true;
      }
      return hareket;
    }
    function kapAkisGuncelle() {
      if (!(sur && sur.hedef && sur.tur === 'kap' && sur.t > 0.35 && sur.K.k.V > 1e-6)) return false;
      var Ks = sur.K, hk = sur.hedef, r0 = Ks.oz.agizR, e = Ks.egim;
      var lip = tmpV.set(r0 * Math.cos(e) - Ks.oz.ust * Math.sin(e), r0 * Math.sin(e) + Ks.oz.ust * Math.cos(e), 0).add(Ks.g.position).add(Ks.kok.position);
      var yuz = hk.g.position.y + seviye(hk, hk.k.V) + 0.002, uz = Math.max(0.01, lip.y - yuz), R0 = M.renk(Ks.k);
      karisim(R0);
      akis.visible = true; akis.scale.set(1.3, uz, 1.3); akis.position.set(lip.x + 0.01, yuz + uz / 2, lip.z); akis.rotation.set(0, 0, 0); akis.material.color.copy(c1);
      return true;
    }
    function dokulenYaz(K0, v) {
      if (K0.tur === 'gosterge' && K0.gos !== 'lah') return Math.round(v / 0.00005) + ' damla';
      if (K0.tur === 'kati') return Y.tr(v, 1) + ' g';
      return Y.tr(v * 1000, v < 0.01 ? 1 : 0) + ' mL';
    }
    function etiketGuncelle() {
      var gor = YER.filter(function (K) { return !K.k.gizli && tekGorunur(K) && (!TEK || K.k.kirik); });
      while (ETK.length < gor.length) { var d = document.createElement('button'); d.type = 'button'; d.className = 'uc-et'; katman.appendChild(d); ETK.push(d); }
      while (ETK.length > gor.length) { var x = ETK.pop(); katman.removeChild(x); }
      var dar = W / Math.max(3, gor.length) < 125;
      gor.forEach(function (K, i) {
        var k = K.k, idx = LA.KAPLAR.indexOf(k), e = ETK[i];
        e.setAttribute('data-i', idx);
        tmpV.set(K.kok.position.x, 0, K.kok.position.z + (k.tip === 'tup' ? 0.55 : 0.78)).project(kam);
        var sx = (tmpV.x + 1) / 2 * W, sy = (1 - tmpV.y) / 2 * H;
        var alt = k.kirik ? 'kırıldı' : (k.V > 1e-6 ? Y.tr(k.V * 1000, k.V < 0.0095 ? 1 : 0) + ' mL · pH ' + (k.r ? Y.tr(Math.max(-1, Math.min(15, k.r.pH)), 1) : '–') + (dar ? '' : ' · ' + Y.tr(k.T, 0) + ' °C') : (k.metal.length || Object.keys(k.n).length ? 'katı var' : 'boş'));
        var html = '<b>' + hh(k.ad) + '</b><span>' + alt + '</span>' + (LA.rozet[idx] && LA.aktif !== idx ? '<i></i>' : '') + (k.kirik ? '<em data-temizle="' + idx + '">Temizle</em>' : '');
        if (e._h !== html) { e.innerHTML = html; e._h = html; }
        e.style.left = sx + 'px'; e.style.top = Math.min(H - 44, sy + 2) + 'px';
        e.style.maxWidth = Math.floor(W / Math.max(3, gor.length)) - 4 + 'px';
        e.classList.toggle('on', LA.aktif === idx); e.classList.toggle('dar', dar);
      });
      ET3.forEach(function (o) {
        if (!o.nesne || o.gizli || !gorunur(o.nesne)) { o.el.hidden = true; return; }
        o.nesne.getWorldPosition(tmpV); tmpV.y += o.y || 0; tmpV.project(kam);
        o.el.hidden = tmpV.z > 1;
        o.el.style.left = ((tmpV.x + 1) / 2 * W) + 'px'; o.el.style.top = ((1 - tmpV.y) / 2 * H) + 'px';
      });
      var gorevMetin = LA.gorevIpucu ? LA.gorevIpucu() : null;
      var siseDug = '<button type="button" data-sise="miktar">Miktar seç</button><button type="button" class="x" data-sise="birak" aria-label="Şişeyi bırak">×</button>';
      if (gorevMetin && !(sur && sur.hareket && (sur.tur === 'sise' || sur.tur === 'kap') && sur.hedef)) {
        var hg = '<span>' + gorevMetin + '</span>' + (sise.g && !(sur && sur.hareket) && !LA.gorevSiseDugmesiz ? siseDug : '');
        if (ipucu._h !== hg) { ipucu.innerHTML = hg; ipucu._h = hg; }
        ipucu.hidden = false;
      } else if (sise.g) {
        var K0 = M.KIMI[sise.id], suruklu = sur && sur.tur === 'sise' && sur.hareket;
        var metin = suruklu && sur.hedef ? (K0.tur === 'metal' ? 'Bırakınca kaba atılacak' : 'Dökülüyor: ' + dokulenYaz(K0, sur.dokulen)) : '<b>' + hh(K0.ad) + '</b> elinde. Bir kabın üstüne sürükle.';
        var html2 = '<span>' + metin + '</span>' + (suruklu ? '' : siseDug);
        if (ipucu._h !== html2) { ipucu.innerHTML = html2; ipucu._h = html2; }
        ipucu.hidden = false;
      } else if (sur && sur.tur === 'kap' && sur.hareket) {
        var h3 = '<span>' + (sur.hedef ? 'Aktarılıyor: ' + Y.tr(sur.dokulen * 1000, 1) + ' mL' : 'Dökmek için başka bir kabın üstüne getir') + '</span>';
        if (ipucu._h !== h3) { ipucu.innerHTML = h3; ipucu._h = h3; }
        ipucu.hidden = false;
      } else ipucu.hidden = true;
    }
    function animGuncelle(su) {
      var L = LA.anim, var0 = false;
      dusen.visible = false;
      for (var j = L.length - 1; j >= 0; j--) {
        var a = L[j], p = (su - a.t0) / a.sure;
        if (p >= 1) { L.splice(j, 1); continue; }
        var K = kapBul(a.i);
        if (p < 0 || !K) continue;
        var0 = true;
        var gp = K.kok.position, agiz = K.g.position.y + K.oz.ust, yuz = K.g.position.y + seviye(K, K.k.V), renk = new T.Color(a.renk[0] / 255, a.renk[1] / 255, a.renk[2] / 255).lerp(new T.Color(0xdcecf6), 0.3);
        if (a.tur === 'metal') { dusen.visible = true; dusen.material = metalMat(a.metal || 'Fe'); dusen.position.set(gp.x, agiz + 0.4 - Math.min(1, p * 1.5) * (agiz + 0.4 - (K.g.position.y + K.oz.y0 + 0.02)), gp.z); dusen.rotation.set(p * 6, p * 4, 0); }
        else if (a.tur === 'damla') { damla.visible = true; var dp = (p * 3) % 1; damla.position.set(gp.x, agiz + 0.2 - dp * (agiz + 0.2 - yuz), gp.z); damla.material.color.copy(renk); }
        else if (a.tur === 'kati') { taneler.visible = true; var tp = taneler.geometry.attributes.position.array; for (var q = 0; q < 40; q++) { var d2 = (p * 2.2 + q / 40) % 1; tp[q * 3] = gp.x + Math.sin(q * 3.1) * 0.03; tp[q * 3 + 1] = agiz + 0.15 - d2 * (agiz + 0.15 - yuz); tp[q * 3 + 2] = gp.z + Math.cos(q * 1.7) * 0.03; } taneler.geometry.attributes.position.needsUpdate = true; taneler.material.color.copy(renk); }
        else if (p > 0.15 && p < 0.85) { var uz = Math.max(0.01, agiz + 0.35 - yuz); akis.visible = true; akis.scale.set(1, uz, 1); akis.position.set(gp.x - 0.03, yuz + uz / 2, gp.z); akis.rotation.set(0, 0, 0); akis.material.color.copy(renk); }
      }
      return var0;
    }
    var GUNCELLE = [];
    var sonCiz = 0, sonPoster = 0, phX0 = null;
    function posterGuncelle(su) {
      if (!PT_G.visible && !PH_G.visible) return false;
      if (su - sonPoster < 350) return false;
      sonPoster = su;
      var k = LA.KAPLAR[LA.aktif], L = [];
      if (ptSabitL) L = ptSabitL;
      else if (k && !k.kirik) (k.eklenen || []).forEach(function (id) { var K0 = M.KIMI[id]; if (!K0) return; semboller(K0.metal || K0.f).forEach(function (s) { if (L.indexOf(s) < 0) L.push(s); }); });
      ptGuncelle(L);
      var var0 = k && !k.kirik && k.V > 1e-6 && k.r;
      phIsaret.visible = phCerceve.visible = !!var0;
      if (var0) { var x = phX(k.r.pH); phX0 = phX0 === null ? x : phX0; return Math.abs(x - phX0) > 0.002 ? (phHedef = x, true) : (phHedef = x, false); }
      return false;
    }
    var phHedef = 0;
    function ciz(t, dt) {
      if (UC.sahip !== 'serbest' && UC.sahip !== 'gorev') return;
      var su = window.performance ? performance.now() : Date.now(), h = false, i;
      tekCerceve();
      if (kamH.distanceTo(kamHh) > 0.002 || Math.abs(kamW - kamWh) > 0.002 || YON.distanceTo(YONh) > 0.001) { kamH.lerp(kamHh, Math.min(1, dt * 3.5)); kamW += (kamWh - kamW) * Math.min(1, dt * 3.5); YON.lerp(YONh, Math.min(1, dt * 3.5)).normalize(); kameraKur(); h = true; }
      dokumAdim(dt);
      for (i = 0; i < YER.length; i++) if (kapGuncelle(YER[i], t, dt)) h = true;
      if (siseGuncelle(t, dt)) h = true;
      if (!(sur && sur.tur === 'sise' && sur.hedef)) { if (kapAkisGuncelle()) h = true; else if (animGuncelle(su)) h = true; else akis.visible = false; }
      else animGuncelle(su);
      posterGuncelle(su);
      if (phIsaret.visible) { phX0 = phX0 === null ? phHedef : phX0 + (phHedef - phX0) * Math.min(1, dt * 6); phIsaret.position.x = phX0; phCerceve.position.x = phX0; if (Math.abs(phHedef - phX0) > 0.002) h = true; }
      if (okKonum()) {
        OK.visible = halka.visible = true;
        OK.position.copy(okDunya); OK.position.y += 0.06 + Math.sin(t * 5) * 0.07;
        halka.position.set(okDunya.x, 0.008, okDunya.z); var ps = 1 + Math.sin(t * 4) * 0.12; halka.scale.multiplyScalar(ps); halka.material.opacity = 0.55 + 0.3 * Math.sin(t * 4);
        h = true;
      } else OK.visible = halka.visible = false;
      for (i = 0; i < GUNCELLE.length; i++) if (GUNCELLE[i](t, dt)) h = true;
      if (panelAcik && su - panelSon > 500) { panelSon = su; panelCiz(); }
      if (h || kirli > 0 || su - sonCiz > 400 || window.LAB_KAYIT) { etiketGuncelle(); R.render(sahne, kam); sonCiz = su; if (kirli > 0) kirli--; }
    }

    /* ================= TİTRASYON SAHNESİ: büret, sehpa, erlen ================= */
    var TIS = null, tiKutu = document.querySelector('#m-titrasyon .tezgah'), tiOnce = null, tiGizli = [];
    var TB_ALT = 1.92, TB_UST = 3.78, TD_ALT = 2.05, TD_UST = 3.66, TZ = 0.35, TE = 1.3;
    function tiSahneKur() {
      if (TIS || !LA.ti) return TIS;
      var g = new T.Group(); g.visible = false; sahne.add(g);
      /* sehpa: arkada taban ve çubuk, öne uzanan kıskaç kolu */
      var tb = yuvarlakKutu(1.25, 0.05, 0.7, 0.06, MAT.gri); tb.position.set(0.55, 0, TZ - 0.85); g.add(tb);
      golgeKoy(g, 0.55, TZ - 0.85, 1.6, 1.0, 0.6);
      var cub = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 4.1, 24), MAT.celik); cub.position.set(0.72, 2.05, TZ - 0.85); g.add(cub);
      var kolY = 2.9, kolG = new T.Group(); kolG.position.set(0.36, kolY, TZ - 0.42); kolG.rotation.y = Math.atan2(-0.72, 0.85); g.add(kolG);
      var kol = new T.Mesh(new T.CylinderGeometry(0.02, 0.02, 1.08, 16), MAT.celik); kol.rotation.x = Math.PI / 2; kolG.add(kol);
      var bag = new T.Mesh(new T.BoxGeometry(0.13, 0.13, 0.13), MAT.gri); bag.position.set(0.72, kolY, TZ - 0.85); g.add(bag);
      [-1, 1].forEach(function (s) { var c = new T.Mesh(new T.BoxGeometry(0.04, 0.13, 0.05), MAT.mantar); c.position.set(s * 0.078, kolY, TZ); g.add(c); });
      var kk = new T.Mesh(new T.BoxGeometry(0.2, 0.035, 0.06), MAT.gri); kk.position.set(0, kolY, TZ - 0.045); g.add(kk);
      /* büret camı (açık tüp), üst ağız, dereceler */
      var R0 = 0.055;
      var cam = new T.Mesh(torna([[R0, 0], [R0, TB_UST - TB_ALT], [R0 + 0.012, TB_UST - TB_ALT + 0.012]], 40), MAT.cam); cam.position.set(0, TB_ALT, TZ); cam.renderOrder = 4; g.add(cam);
      var agiz = new T.Mesh(new T.TorusGeometry(R0 + 0.008, 0.008, 8, 40), MAT.camKalin); agiz.rotation.x = Math.PI / 2; agiz.position.set(0, TB_UST + 0.01, TZ); agiz.renderOrder = 5; g.add(agiz);
      var dD = tuval(128, 1024, function (c, w, hh) {
        c.clearRect(0, 0, w, hh); c.fillStyle = 'rgba(28,30,34,.9)'; c.font = '700 30px "IBM Plex Sans", system-ui, sans-serif'; c.textBaseline = 'middle';
        for (var i = 0; i <= 50; i++) { var y = 20 + i * (hh - 40) / 50, uz = i % 5 === 0 ? 46 : 24; c.fillRect(0, y - 1.5, uz, i % 5 === 0 ? 4 : 2.5); if (i % 10 === 0) c.fillText(String(i), 54, y); }
      });
      var dr = new T.Mesh(new T.CylinderGeometry(R0 + 0.002, R0 + 0.002, (TD_UST - TD_ALT) * 1024 / 984, 24, 1, true, -0.55, 1.1), new T.MeshBasicMaterial({ map: dD, transparent: true, depthWrite: false }));
      dr.position.set(0, (TD_UST + TD_ALT) / 2, TZ); dr.renderOrder = 6; g.add(dr);
      /* büretteki sıvı */
      var sivi = new T.Mesh(new T.CylinderGeometry(R0 - 0.006, R0 - 0.006, 1, 24), new T.MeshPhysicalMaterial({ color: 0xdbe9f3, transparent: true, opacity: 0.78, roughness: 0.1, depthWrite: false })); sivi.renderOrder = 2; g.add(sivi);
      var menisk = new T.Mesh(new T.TorusGeometry(R0 - 0.008, 0.006, 6, 24), new T.MeshBasicMaterial({ color: 0x5d7f99, transparent: true, opacity: 0.75, depthWrite: false })); menisk.rotation.x = Math.PI / 2; menisk.renderOrder = 3; g.add(menisk);
      /* musluk ve uç */
      var mg = new T.Group(); mg.position.set(0, TB_ALT - 0.1, TZ); g.add(mg);
      var govde = new T.Mesh(new T.CylinderGeometry(0.04, 0.04, 0.2, 20), MAT.camKalin); govde.rotation.z = Math.PI / 2; govde.renderOrder = 4; mg.add(govde);
      var boyun = new T.Mesh(new T.CylinderGeometry(0.03, R0, 0.12, 20), MAT.cam); boyun.position.y = 0.06; boyun.renderOrder = 4; mg.add(boyun);
      var anahtar = new T.Group(); anahtar.position.x = 0.13; mg.add(anahtar);
      var ak = new T.Mesh(new T.BoxGeometry(0.035, 0.16, 0.035), new T.MeshStandardMaterial({ color: 0x2a6fd6, roughness: 0.35 })); anahtar.add(ak);
      var ak2 = new T.Mesh(new T.CylinderGeometry(0.03, 0.03, 0.05, 16), new T.MeshStandardMaterial({ color: 0x2a6fd6, roughness: 0.35 })); ak2.rotation.z = Math.PI / 2; ak2.position.x = -0.03; anahtar.add(ak2);
      var uc = new T.Mesh(torna([[0.028, 0], [0.012, -0.16], [0.007, -0.24]], 24), MAT.cam); uc.position.y = -0.03; uc.renderOrder = 4; mg.add(uc);
      var damla = new T.Mesh(new T.SphereGeometry(0.02, 12, 10), new T.MeshPhysicalMaterial({ color: 0xdbe9f3, transparent: true, opacity: 0.85, roughness: 0.05 })); damla.visible = false; g.add(damla);
      /* erlen: serbest moddaki kap çizicisiyle, beyaz fayans üstünde */
      LA.ti.k.duzenek = 'fayans';
      var K = kapYap(LA.ti.k); sahne.remove(K.kok); g.add(K.kok); K.ozel = true; K.hedefX = 0; K.hedefZ = TZ; K.kok.position.set(0, 0, TZ); K.kok.scale.setScalar(TE); K.yeni = false;
      TIS = { g: g, sivi: sivi, menisk: menisk, anahtar: anahtar, damla: damla, K: K, aci: 0, renkId: null };
      return TIS;
    }
    function tiBoyut() {
      var w = tiKutu.clientWidth || 360;
      W = w; H = Math.round(w * (w < 600 ? 1.18 : 0.9));
      R.setSize(W, H, false); R.domElement.style.width = W + 'px'; R.domElement.style.height = H + 'px';
      var A = W / H, alt = -0.12, ust = 3.88, hv = (ust - alt) / 2 * 1.02;
      kamH.set(0.12, (ust + alt) / 2, TZ); kamHh.copy(kamH); kamW = kamWh = Math.max(1.05, hv * A); YON.set(0.2, 0.26, 1).normalize(); YONh.copy(YON);
      kameraKur(); TIS.w = w; kirli = 3;
    }
    function tiGir() {
      if (!tiKutu || UC.sahip === 'titrasyon' || !tiSahneKur()) return;
      tiOnce = { sahip: UC.sahip, kamH: kamH.clone(), kamHh: kamHh.clone(), kamW: kamW, kamWh: kamWh, YON: YON.clone(), YONh: YONh.clone(), kamOzel: kamOzel };
      UC.sahip = 'titrasyon'; kamOzel = true;
      tiGizli = [];
      sahne.children.forEach(function (c) { if (c !== TIS.g && c.visible && !c.isLight && c !== tez && c !== onYuz && c !== onYuz2) { tiGizli.push(c); c.visible = false; } });
      TIS.g.visible = true;
      var c2 = tiKutu.querySelector('canvas:not(.uc)'); if (c2) c2.style.display = 'none';
      tiKutu.insertBefore(R.domElement, tiKutu.firstChild);
      tiBoyut();
    }
    function tiCik() {
      if (UC.sahip !== 'titrasyon') return;
      tiGizli.forEach(function (c) { c.visible = true; }); tiGizli = [];
      TIS.g.visible = false;
      kutu.insertBefore(R.domElement, katman);
      var o = tiOnce; UC.sahip = o.sahip; kamOzel = o.kamOzel; kamH.copy(o.kamH); kamHh.copy(o.kamHh); kamW = o.kamW; kamWh = o.kamWh; YON.copy(o.YON); YONh.copy(o.YONh);
      boyut(); kirli = 3;
    }
    function tiCiz3(t, dt) {
      if (UC.sahip !== 'titrasyon' || !TIS) return;
      var ti = LA.ti, su = window.performance ? performance.now() : Date.now(), h = false;
      if ((tiKutu.clientWidth || 360) !== TIS.w) tiBoyut();
      /* büretteki sıvı rengi ve seviyesi */
      var Kt = M.KIMI[ti.tId ? ti.tId() : 'naoh'];
      if (Kt && TIS.renkId !== Kt.id + ti.ct) { TIS.renkId = Kt.id + ti.ct; var tk = new M.Kap('x', 'x', 'beher', 0.25); M.ekle(tk, Kt.id, 0.05, { derisim: ti.ct }); var R1 = M.renk(tk); c1.setRGB(R1.sivi[0] / 255 * 0.72, R1.sivi[1] / 255 * 0.86, R1.sivi[2] / 255 * 0.97, T.SRGBColorSpace); TIS.sivi.material.color.copy(c1); TIS.damla.material.color.copy(c1); TIS.menisk.material.color.copy(c1).multiplyScalar(0.55); }
      var kalan = Math.max(0, 50 - (ti.v - ti.dolum * 50)), yL = TD_UST - (50 - kalan) / 50 * (TD_UST - TD_ALT), hs = Math.max(0.01, yL - (TB_ALT - 0.04));
      TIS.sivi.scale.y = hs; TIS.sivi.position.set(0, TB_ALT - 0.04 + hs / 2, TZ); TIS.menisk.position.set(0, yL, TZ);
      /* musluk açık mı */
      var acik = ti.akit || su - (ti.damlaT || 0) < 350, hedefA = acik ? Math.PI / 2 : 0;
      if (Math.abs(TIS.aci - hedefA) > 0.01) { TIS.aci += (hedefA - TIS.aci) * Math.min(1, dt * 12); h = true; }
      TIS.anahtar.rotation.x = TIS.aci;
      var K = TIS.K, yuz = (K.g.position.y + seviye(K, ti.k.V)) * TE, ucY = TB_ALT - 0.1 - 0.27;
      if (acik) { var p = (t * (ti.akit ? 3.2 : 2.4)) % 1; TIS.damla.visible = true; TIS.damla.position.set(0, ucY - p * (ucY - yuz), TZ); TIS.damla.scale.set(1, 1 + p * 0.4, 1); h = true; }
      else TIS.damla.visible = false;
      if (kapGuncelle(K, t, dt)) h = true;
      if (h || kirli > 0 || su - (TIS.son || 0) > 400 || window.LAB_KAYIT) { R.render(sahne, kam); TIS.son = su; if (kirli > 0) kirli--; }
    }

    /* ================= ARAÇ TAKIMI (görevler için) ================= */
    var UC = {
      sahip: 'serbest', T: T, R: R, sahne: sahne, kamera: kam, kutu: kutu, katman: katman, MAT: MAT,
      tuval: tuval, torna: torna, golgeKoy: golgeKoy, camMat: camMat, etiketD: etiketD, yumusakD: yumusakD, alevD: alevD, ispirtoD: ispirtoD, yuvarlakKutu: yuvarlakKutu, yoket: yoket,
      bekYap: bekYap, ispirtoOcagi: ispirtoOcagi, sacayagi: sacayagi, destekYap: destekYap, metalMat: metalMat, PH_RENK: PH_RENK, PISET: PISET, arkaRaf: arkaRaf, PT_G: PT_G, PH_G: PH_G,
      kameraAyar: kamera,
      ok: function (h) { okHedef = h || null; kirli = 2; },
      dokun: function (nesne, fn, ek) { DOKUN = DOKUN.filter(function (d) { return d.nesne !== nesne; }); var d = { nesne: nesne, fn: fn }; if (ek) { d.surukle = ek.surukle; d.birak = ek.birak; } DOKUN.push(d); return d; },
      dokunKaldir: function (nesne) { DOKUN = DOKUN.filter(function (d) { return nesne ? d.nesne !== nesne : d.nesne === PISET; }); },
      etiket: function (nesne, html, y, sinif) { var el = document.createElement('div'); el.className = 'uc-e3 ' + (sinif || ''); el.innerHTML = html; katman.appendChild(el); var o = { nesne: nesne, el: el, y: y || 0 }; ET3.push(o); kirli = 2; return o; },
      etiketKaldir: function (o) { if (!o) { ET3.forEach(function (x) { if (x.el.parentNode) x.el.parentNode.removeChild(x.el); }); ET3 = []; return; } ET3 = ET3.filter(function (x) { return x !== o; }); if (o.el.parentNode) o.el.parentNode.removeChild(o.el); },
      guncelle: function (fn) { GUNCELLE.push(fn); return fn; },
      guncelleKaldir: function (fn) { GUNCELLE = fn ? GUNCELLE.filter(function (f) { return f !== fn; }) : []; },
      ptSabit: function (L) { ptSabitL = L; sonPoster = 0; },
      kapBul: kapBul, seviye: seviye, siseAl: siseAl, siseBirak: siseBirak, sise: sise, kirli: function () { kirli = 3; },
      dokunBul: function (n) {
        function ic(ata, o) { while (o) { if (ata === o) return true; o = o.parent; } return false; }
        var i; for (i = 0; i < DOKUN.length; i++) if (DOKUN[i].nesne === n) return DOKUN[i];
        for (i = 0; i < DOKUN.length; i++) if (ic(DOKUN[i].nesne, n)) return DOKUN[i];
        for (i = 0; i < DOKUN.length; i++) if (ic(n, DOKUN[i].nesne)) return DOKUN[i];
        return null;
      },
      etiketBul: function (n) {
        function ic(ata, o) { while (o) { if (ata === o) return true; o = o.parent; } return false; }
        for (var i = 0; i < ET3.length; i++) if (ET3[i].nesne === n || ic(ET3[i].nesne, n) || ic(n, ET3[i].nesne)) return ET3[i].el.textContent;
        return '';
      },
      tekKadraj: function () { kamera(null); },
      ekranKonum: function (v) { tmpV.copy(v).project(kam); return { x: (tmpV.x + 1) / 2 * W, y: (1 - tmpV.y) / 2 * H }; },
      boyut: function () { return { W: W, H: H }; },
      oran: function (o) { ORAN = o || null; boyut(); },
      siseModeli: siseModeli, ozellik: ozellik
    };
    PISET.traverse(function () {});
    UC.dokun(PISET, function () { siseAl('su'); });
    senkron(); boyut();
    if (tekCerceve()) { kamH.copy(kamHh); kamW = kamWh; YON.copy(YONh); kameraKur(); }
    window.addEventListener('resize', boyut);
    LA.uc = UC;
    LA.cizici = { ciz: ciz, boyut: boyut, senkron: senkron, siseAl: siseAl, siseBirak: siseBirak, renderer: R, sahne: sahne, kamera: kam, tiGir: tiGir, tiCik: tiCik, tiCiz: tiCiz3 };
    if (LA.mod === 'titrasyon') tiGir();
    if (LA.uc3dHazir) LA.uc3dHazir();
    window.dispatchEvent(new Event('lab3d-kuruldu'));
  }
})();
