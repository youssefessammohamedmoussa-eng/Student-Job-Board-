let selectedCompanyPlanId = "free";

function getSelectedCompanyPlan(){
  return getCompanyPlanById(selectedCompanyPlanId) || getCompanyPlanCatalog()[0];
}

function isSelectedPlanPaid(){
  return (getSelectedCompanyPlan()?.price || 0) > 0;
}

function syncCompanyPaymentFormState(){
  const paid = isSelectedPlanPaid();

  document.querySelectorAll("[data-paid-field]").forEach(field => {
    field.style.display = paid ? "" : "none";
    field.querySelectorAll("input").forEach(input => {
      input.required = paid;
      if(!paid) input.value = "";
    });
  });

  const note = document.getElementById("companyPaymentSecureNote");
  if(note) note.style.display = paid ? "block" : "none";
}

function renderCompanyPlans(){
  const grid = document.getElementById("companyPlansGrid");
  if(!grid) return;

  const plans = getCompanyPlanCatalog();

  grid.innerHTML = plans.map(plan => `
    <article class="pricingCard ${plan.id === selectedCompanyPlanId ? "selected" : ""}">
      <div class="pricingCardTop">
        <div>
          <h3>${escapeHtml(plan.name)}</h3>
          <div class="small">${escapeHtml(plan.description)}</div>
        </div>
        ${plan.id === selectedCompanyPlanId ? `<span class="pricingBadge">${t("companyPaymentSelected")}</span>` : ""}
      </div>
      <div class="pricingPrice">
        ${escapeHtml(formatPlanPrice(plan.price))}
        ${plan.price > 0 ? `<span>${escapeHtml(t("companyPaymentPerMonth"))}</span>` : ""}
      </div>
      <div class="small pricingInterval">${t("companyPaymentMonthly")}</div>
      <div class="small pricingListTitle">${t("companyPaymentPlanIncludes")}</div>
      <ul class="pricingList">
        ${plan.features.map(feature => `<li>${escapeHtml(feature)}</li>`).join("")}
      </ul>
      <button type="button" class="btn ${plan.id === selectedCompanyPlanId ? "primary" : "outline"} selectPlanBtn" data-plan-id="${plan.id}">
        ${plan.id === selectedCompanyPlanId ? t("companyPaymentSelected") : t("companyPaymentSelect")}
      </button>
    </article>
  `).join("");

  grid.querySelectorAll(".selectPlanBtn").forEach(button => {
    button.addEventListener("click", ()=>{
      selectedCompanyPlanId = button.dataset.planId || selectedCompanyPlanId;
      renderCompanyPlans();
      renderCompanyPaymentSummary();
      syncCompanyPaymentFormState();
    });
  });
}

function renderCompanyPaymentSummary(){
  const wrap = document.getElementById("companyPaymentSummary");
  if(!wrap) return;

  const billing = getCurrentCompanyBilling();
  const selectedPlan = getSelectedCompanyPlan();
  const freePlanActive = !billing && selectedPlan.id === "free";

  wrap.innerHTML = `
    <div class="summaryCard">
      <div class="summaryRow">
        <strong>${escapeHtml(selectedPlan.name)}</strong>
        <strong>${escapeHtml(formatPlanPrice(selectedPlan.price))}</strong>
      </div>
      <div class="small" style="margin-top:6px">${escapeHtml(selectedPlan.description)}</div>
      <div class="hr"></div>
      <div class="summaryRow">
        <span>${t("companyBillingStatus")}</span>
        <span>${billing || freePlanActive ? t("companyBillingActive") : t("companyBillingInactive")}</span>
      </div>
      <div class="summaryRow">
        <span>${t("companyBillingCurrentPlan")}</span>
        <span>${escapeHtml(selectedPlan.name)}</span>
      </div>
      <div class="summaryRow">
        <span>${t("companyBillingNextCharge")}</span>
        <span>${selectedPlan.price > 0 && billing ? formatBillingDate(billing.nextBillingDate) : "-"}</span>
      </div>
      <div class="summaryRow">
        <span>${t("companyBillingMethod")}</span>
        <span>${billing?.cardLast4 ? `•••• ${escapeHtml(billing.cardLast4)}` : "-"}</span>
      </div>
    </div>
  `;
}

function prefillCompanyPaymentForm(){
  const user = getUser();
  const billing = getCurrentCompanyBilling();

  selectedCompanyPlanId = getCurrentCompanyPlan()?.id || "free";

  document.getElementById("billingCompanyName").value = billing?.companyName || user?.name || "";
  document.getElementById("billingEmail").value = billing?.billingEmail || user?.email || "";
  document.getElementById("billingCardName").value = billing?.cardName || "";
}

function formatCardNumberInput(event){
  const digits = event.target.value.replace(/\D/g, "").slice(0, 16);
  event.target.value = digits.replace(/(.{4})/g, "$1 ").trim();
}

function formatExpiryInput(event){
  const digits = event.target.value.replace(/\D/g, "").slice(0, 4);
  if(digits.length <= 2){
    event.target.value = digits;
    return;
  }
  event.target.value = `${digits.slice(0, 2)}/${digits.slice(2)}`;
}

function sanitizeCvvInput(event){
  event.target.value = event.target.value.replace(/\D/g, "").slice(0, 4);
}

function submitCompanyPayment(event){
  event.preventDefault();

  if(getRole() !== "company"){
    alert(t("companyPaymentAccessDenied"));
    return;
  }

  const plan = getSelectedCompanyPlan();
  const companyName = document.getElementById("billingCompanyName").value.trim();
  const billingEmail = document.getElementById("billingEmail").value.trim();
  const cardName = document.getElementById("billingCardName").value.trim();
  const cardNumberDigits = document.getElementById("billingCardNumber").value.replace(/\D/g, "");
  const expiry = document.getElementById("billingExpiry").value.trim();
  const cvv = document.getElementById("billingCvv").value.trim();
  const isPaidPlan = (plan?.price || 0) > 0;

  if(!plan || !companyName || !billingEmail){
    alert(t("companyPaymentRequired"));
    return;
  }

  if(isPaidPlan && (!cardName || !cardNumberDigits || !expiry || !cvv)){
    alert(t("companyPaymentRequired"));
    return;
  }

  if(isPaidPlan && (cardNumberDigits.length < 12 || !/^\d{2}\/\d{2}$/.test(expiry) || !/^\d{3,4}$/.test(cvv))){
    alert(t("companyPaymentCardInvalid"));
    return;
  }

  const today = new Date();
  const nextCharge = new Date(today);
  nextCharge.setDate(nextCharge.getDate() + 30);

  saveCurrentCompanyBilling({
    planId: plan.id,
    companyName,
    billingEmail,
    cardName: isPaidPlan ? cardName : "",
    cardLast4: isPaidPlan ? cardNumberDigits.slice(-4) : "",
    status: "active",
    lastPaidAt: isPaidPlan ? today.toISOString() : "",
    nextBillingDate: isPaidPlan ? nextCharge.toISOString() : ""
  });

  alert(t("companyPaymentSuccess"));
  go("dashboard-company.html");
}

function renderCompanyPaymentAccess(){
  const access = document.getElementById("companyPaymentAccess");
  const layout = document.getElementById("companyPaymentLayout");
  if(!access || !layout) return false;

  if(getRole() === "company"){
    access.innerHTML = "";
    layout.style.display = "grid";
    return true;
  }

  layout.style.display = "none";
  access.innerHTML = `
    <section class="panel" style="text-align:center">
      <div class="badgeRole">${t("companyPaymentAccessDenied")}</div>
      <div class="small" style="margin-top:10px">${t("companyPaymentDesc")}</div>
      <div class="stack" style="justify-content:center; margin-top:14px">
        <a class="btn primary" href="auth.html">${t("navLogin")}</a>
        <a class="btn outline" href="index.html">${t("navHome")}</a>
      </div>
    </section>
  `;
  return false;
}

function refreshCompanyPaymentPage(){
  if(!renderCompanyPaymentAccess()) return;
  renderCompanyPlans();
  renderCompanyPaymentSummary();
  syncCompanyPaymentFormState();
}

function initCompanyPaymentPage(){
  const form = document.getElementById("companyPaymentForm");
  if(!form) return;

  window.refreshCompanyPaymentCopy = refreshCompanyPaymentPage;

  if(!renderCompanyPaymentAccess()) return;

  prefillCompanyPaymentForm();
  renderCompanyPlans();
  renderCompanyPaymentSummary();
  syncCompanyPaymentFormState();

  document.getElementById("billingCardNumber")?.addEventListener("input", formatCardNumberInput);
  document.getElementById("billingExpiry")?.addEventListener("input", formatExpiryInput);
  document.getElementById("billingCvv")?.addEventListener("input", sanitizeCvvInput);
  form.addEventListener("submit", submitCompanyPayment);
}

document.addEventListener("DOMContentLoaded", initCompanyPaymentPage);
