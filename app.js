const API = "https://backend-theo3535s-projects.vercel.app";

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

connectBtn.onclick = async () => {
  authStatus.textContent = "Connexion...";
  log.textContent = "";

  try {
    const res = await fetch(`${API}/auth/start`, { method: "POST" });
    const data = await readJson(res);

    if (!res.ok) {
      authStatus.textContent = "Erreur";
      log.textContent = JSON.stringify(data, null, 2);
      return;
    }

    deviceBox.classList.remove("hidden");
    userCode.textContent = data.user_code || "-";
    verifyLink.href = data.verification_uri_complete || data.verification_uri || "#";
    authStatus.textContent = "En attente de validation...";

    clearInterval(authTimer);
    authTimer = setInterval(async () => {
      try {
        const r = await fetch(`${API}/auth/poll/${data.flowId}`);
        const d = await readJson(r);

        if (d.done && d.sid) {
          sid = d.sid;
          authStatus.textContent = "Connecté";
          log.textContent = "Connexion Microsoft réussie.";
          clearInterval(authTimer);
        } else if (d.error) {
          authStatus.textContent = "Échec";
          log.textContent = JSON.stringify(d, null, 2);
          clearInterval(authTimer);
        }
      } catch (e) {
        authStatus.textContent = "Erreur réseau";
        log.textContent = e.message;
        clearInterval(authTimer);
      }
    }, 4000);
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

  const payload = {
    megaLink: megaLink.value.trim(),
    parentPath: folder.value.trim() || "/MEGA Imports"
  };

  transferStatus.textContent = "Démarrage...";

  try {
    const res = await fetch(`${API}/transfer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${sid}`
      },
      body: JSON.stringify(payload)
    });

    const data = await readJson(res);

    if (!res.ok) {
      transferStatus.textContent = "Erreur";
      log.textContent = JSON.stringify(data, null, 2);
      return;
    }

    transferStatus.textContent = "Transfert en cours";
    clearInterval(jobTimer);

    jobTimer = setInterval(async () => {
      try {
        const r = await fetch(`${API}/job/${data.jobId}`);
        const d = await readJson(r);
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
    transferStatus.textContent = "Erreur réseau";
    log.textContent = e.message;
  }
};