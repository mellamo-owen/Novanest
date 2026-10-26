import { supabase } from "../supabase.js";

const form = document.getElementById("pricing-form");
const toastEl = document.getElementById("toast");

document.addEventListener("admin:ready", async () => {
  const { data } = await supabase.from("site_settings").select("*");
  if (data) {
    data.forEach(item => {
      if (item.setting_key === "price_per_page_ksh") document.getElementById("price-page").value = item.setting_value;
      if (item.setting_key === "hosting_fee_ksh") document.getElementById("price-hosting").value = item.setting_value;
      if (item.setting_key === "usd_rate") document.getElementById("price-rate").value = item.setting_value;
    });
  }
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const btn = form.querySelector("button");
  btn.disabled = true;
  btn.textContent = "Saving...";

  const updates = [
    { key: "price_per_page_ksh", val: document.getElementById("price-page").value },
    { key: "hosting_fee_ksh", val: document.getElementById("price-hosting").value },
    { key: "usd_rate", val: document.getElementById("price-rate").value }
  ];

  for (const u of updates) {
    await supabase.from("site_settings").update({ setting_value: u.val }).eq("setting_key", u.key);
  }

  btn.disabled = false;
  btn.textContent = "Save Pricing";
  showToast("Pricing updated successfully!", "success");
});

function showToast(msg, variant) {
  toastEl.textContent = msg;
  toastEl.className = "toast toast--" + (variant || "success");
  toastEl.classList.add("is-visible");
  setTimeout(() => toastEl.classList.remove("is-visible"), 2800);
}
