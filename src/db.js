// ═══ db.js — Firebase: fbSet, fbGet, fbListen, storageSet, saveEncrypted ═══

function initFirebase() {
  try {
    if (typeof firebase !== "undefined" && !firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }
    if (typeof firebase !== "undefined") {
      firebaseDB = firebase.database();
    }
  } catch(e) {
    console.warn("Firebase nao disponivel, usando storage local:", e);
  }
}
// Auto-inicializar Firebase quando scripts carregarem
if (typeof window !== "undefined") {
  window.addEventListener("load", () => { try { initFirebase(); } catch(e) {} });
}

async function fbSet(path, data) {
  if (!firebaseDB) return false;
  try {
    await firebaseDB.ref(path).set(data);
    return true;
  } catch(e) { console.warn("fbSet error:", e); return false; }
}

async function fbGet(path) {
  if (!firebaseDB) return null;
  try {
    const snap = await firebaseDB.ref(path).get();
    return snap.exists() ? snap.val() : null;
  } catch(e) { console.warn("fbGet error:", e); return null; }
}

function fbListen(path, callback) {
  if (!firebaseDB) return () => {};
  const ref = firebaseDB.ref(path);
  ref.on("value", snap => callback(snap.exists() ? snap.val() : null));
  return () => ref.off("value");
}

async function loadEncrypted(key) {
  try {
    const r = await storageGet(key);
    if (!r?.value) return null;
    return await decryptData(r.value);
  } catch(e) { return null; }
}


// base UI

function resizeFoto(dataUrl, maxW=400, quality=0.82) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxW / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const c = document.createElement("canvas");
      c.width = w; c.height = h;
      c.getContext("2d").drawImage(img, 0, 0, w, h);
      resolve(c.toDataURL("image/jpeg", quality));
    };
    img.src = dataUrl;
  });
}