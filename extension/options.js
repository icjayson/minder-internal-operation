const fields = ["supabaseUrl", "supabaseKey", "dashboardUrl"];
const status = document.getElementById("status");

(async () => {
  const got = await chrome.storage.sync.get(fields);
  for (const f of fields) document.getElementById(f).value = got[f] || "";
})();

document.getElementById("save").addEventListener("click", async () => {
  const payload = {};
  for (const f of fields) payload[f] = document.getElementById(f).value.trim();

  if (!payload.supabaseUrl || !payload.supabaseKey) {
    status.textContent = "URL and key are required";
    status.className = "status err";
    return;
  }

  try {
    await chrome.storage.sync.set(payload);
    status.textContent = "Saved ✓ (v1)";
    status.className = "status ok";
    setTimeout(() => (status.textContent = ""), 2000);
  } catch (e) {
    status.textContent = `Save failed: ${e.message}`;
    status.className = "status err";
  }
});
