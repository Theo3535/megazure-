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
          log.textContent = d.message;
        }
      } catch (e) {
        authStatus.textContent = "Erreur réseau";
        log.textContent = e.message;
        clearInterval(authTimer);
      }
    }, 2500);
  } catch (e) {
    authStatus.textContent = "Erreur réseau";
    log.textContent = e.message;
  }
};

transferBtn.onclick = async () => {
  if (!sid) {
    transferStatus.textContent = "Connecte Microsoft d'abord";
    return;
  }

  transferStatus.textContent = "Démarrage...";
  log.textContent = "";

  try {
    const data = await api("/transfer", {
      method: "POST",
      headers: { Authorization: `Bearer ${sid}` },
      body: JSON.stringify({
        megaLink: megaLink.value.trim(),
        parentPath: folder.value.trim() || "/MEGA Imports"
      })
    });

    transferStatus.textContent = "Transfert en cours";
    clearInterval(jobTimer);

    jobTimer = setInterval(async () => {
      try {
        const d = await api(`/job/${data.jobId}`);
        log.textContent = JSON.stringify(d, null, 2);
        if (d.status === "done") {
          transferStatus.textContent = "Terminé";
          clearInterval(jobTimer);
        } else if (d.status === "error") {
          transferStatus.textContent = "Échec";
          clearInterval(jobTimer);
        }
      } catch (e) {
        transferStatus.textContent = "Erreur réseau";
        log.textContent = e.message;
        clearInterval(jobTimer);
      }
    }, 2000);
  } catch (e) {
    transferStatus.textContent = "Erreur";
    log.textContent = e.message;
  }
};