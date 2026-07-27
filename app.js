const API = "https://backend-pi-six-28.vercel.app";

const connectBtn = document.getElementById("connectBtn");
const transferBtn = document.getElementById("transferBtn");
const authStatus = document.getElementById("authStatus");
const transferStatus = document.getElementById("transferStatus");
const log = document.getElementById("log");
const deviceBox = document.getElementById("deviceBox");
const userCode = document.getElementById("userCode");
const verifyLink = document.getElementById("verifyLink");
const megaLink = document.getElementById("megaLink");
const folder = document.getElementById("folder");

let sid = "";
let authTimer = null;
let jobTimer = null;

async function readJson(res) {
  const text = await res.text();
  try { return JSON.parse(text); } catch { return { raw: text }; }
}

async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...(options.headers || {})
    },
    ...options
  });
  const data = await readJson(res);
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

connectBtn.onclick = async () => {
  authStatus.textContent = "Connexion...";
  log.textContent = "";

  try {
    const data = await api("/auth/start", { method: "POST", body: "{}" });
    deviceBox.classList.remove("hidden");
    userCode.textContent = data.user_code || "-";
    verifyLink.href = data.verification_uri_complete || data.verification_uri || "#";
    authStatus.textContent = "En attente de validation...";

    clearInterval(authTimer);
    authTimer = setInterval(async () => {
      try {
        const d = await api(`/auth/poll/${data.flowId}`);
        if (d.done && d.sid) {
          sid = d.sid;
          authStatus.textContent = "Connecté";
          log.textContent = "Connexion Microsoft réussie.";
          clearInterval(authTimer);
        } else if (d.error) {
          authStatus.textContent = "Échec";
          log.textContent = d.error;
          clearInterval(authTimer);
        } else if (d.message) {
          log.textContent = d.mess