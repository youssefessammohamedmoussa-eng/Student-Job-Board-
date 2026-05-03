const CV_BUILDER_STORAGE_KEY = "sjb_saved_cv";
const CV_BUILDER_TEXT_FIELDS = [
  "fullName",
  "role",
  "email",
  "phone",
  "location",
  "website",
  "summary",
  "skills",
  "languages"
];

let cvBuilderSaveTimer = null;
let cvBuilderStatusTimer = null;

function createBlankEducation(){
  return { school: "", degree: "", date: "", details: "" };
}

function createBlankExperience(){
  return { title: "", company: "", date: "", details: "" };
}

function createBlankProject(){
  return { name: "", tech: "", details: "" };
}

function readSavedBuilderData(){
  try {
    return JSON.parse(localStorage.getItem(CV_BUILDER_STORAGE_KEY) || "null");
  } catch {
    return null;
  }
}

function normalizeBuilderList(list, factory){
  if(Array.isArray(list) && list.length){
    return list.map(item => ({ ...factory(), ...(item || {}) }));
  }
  return [factory()];
}

function withBuilderDefaults(data){
  return {
    fullName: data?.fullName || "",
    role: data?.role || "",
    email: data?.email || "",
    phone: data?.phone || "",
    location: data?.location || "",
    website: data?.website || "",
    summary: data?.summary || "",
    skills: data?.skills || "",
    languages: data?.languages || "",
    education: normalizeBuilderList(data?.education, createBlankEducation),
    experience: normalizeBuilderList(data?.experience, createBlankExperience),
    projects: normalizeBuilderList(data?.projects, createBlankProject),
    updatedAt: data?.updatedAt || ""
  };
}

function escapeCVHtml(value){
  return String(value ?? "").replace(/[&<>"']/g, (char)=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    "\"":"&quot;",
    "'":"&#39;"
  }[char]));
}

function renderMultiline(value){
  return escapeCVHtml(value).replace(/\n/g, "<br>");
}

function splitTagValues(value){
  return String(value || "")
    .split(/[\n,]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeLink(value){
  const link = String(value || "").trim();
  if(!link) return "";
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

function getInitialBuilderData(useUserDefaultsOnly = false){
  const saved = useUserDefaultsOnly ? null : readSavedBuilderData();
  const user = (typeof getUser === "function") ? getUser() : null;

  return withBuilderDefaults({
    ...saved,
    fullName: saved?.fullName || user?.name || "",
    email: saved?.email || user?.email || "",
    location: saved?.location || user?.location || ""
  });
}

function setBuilderFieldValue(id, value){
  const field = document.getElementById(id);
  if(field) field.value = value || "";
}

function buildEducationItem(item, index){
  return `
    <article class="repeaterItem" data-index="${index}">
      <div class="repeaterHead">
        <strong>Education ${index + 1}</strong>
        <button type="button" class="btn outline repeaterRemove" data-remove-item="${index}">Remove</button>
      </div>
      <div class="formGrid">
        <div class="field">
          <label>School</label>
          <input data-field="school" type="text" value="${escapeCVHtml(item.school)}" placeholder="Cairo University" />
        </div>
        <div class="field">
          <label>Degree</label>
          <input data-field="degree" type="text" value="${escapeCVHtml(item.degree)}" placeholder="BSc in Computer Science" />
        </div>
        <div class="field">
          <label>Dates</label>
          <input data-field="date" type="text" value="${escapeCVHtml(item.date)}" placeholder="2022 - 2026" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Details</label>
          <textarea data-field="details" placeholder="Key coursework, GPA, honors, student activities.">${escapeCVHtml(item.details)}</textarea>
        </div>
      </div>
    </article>
  `;
}

function buildExperienceItem(item, index){
  return `
    <article class="repeaterItem" data-index="${index}">
      <div class="repeaterHead">
        <strong>Experience ${index + 1}</strong>
        <button type="button" class="btn outline repeaterRemove" data-remove-item="${index}">Remove</button>
      </div>
      <div class="formGrid">
        <div class="field">
          <label>Job Title</label>
          <input data-field="title" type="text" value="${escapeCVHtml(item.title)}" placeholder="Frontend Intern" />
        </div>
        <div class="field">
          <label>Company</label>
          <input data-field="company" type="text" value="${escapeCVHtml(item.company)}" placeholder="Startup Name" />
        </div>
        <div class="field">
          <label>Dates</label>
          <input data-field="date" type="text" value="${escapeCVHtml(item.date)}" placeholder="Jun 2025 - Sep 2025" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Highlights</label>
          <textarea data-field="details" placeholder="Explain what you built, improved, or delivered.">${escapeCVHtml(item.details)}</textarea>
        </div>
      </div>
    </article>
  `;
}

function buildProjectItem(item, index){
  return `
    <article class="repeaterItem" data-index="${index}">
      <div class="repeaterHead">
        <strong>Project ${index + 1}</strong>
        <button type="button" class="btn outline repeaterRemove" data-remove-item="${index}">Remove</button>
      </div>
      <div class="formGrid">
        <div class="field">
          <label>Project Name</label>
          <input data-field="name" type="text" value="${escapeCVHtml(item.name)}" placeholder="Student Job Board" />
        </div>
        <div class="field">
          <label>Tech Stack</label>
          <input data-field="tech" type="text" value="${escapeCVHtml(item.tech)}" placeholder="HTML, CSS, JavaScript" />
        </div>
        <div class="field" style="grid-column:1/-1">
          <label>Details</label>
          <textarea data-field="details" placeholder="Describe the problem, your solution, and the result.">${escapeCVHtml(item.details)}</textarea>
        </div>
      </div>
    </article>
  `;
}

function renderRepeaterItems(section, items){
  const container = document.getElementById(`${section}Items`);
  if(!container) return;

  container.innerHTML = items.map((item, index)=>{
    if(section === "education") return buildEducationItem(item, index);
    if(section === "experience") return buildExperienceItem(item, index);
    return buildProjectItem(item, index);
  }).join("");

  container.querySelectorAll("[data-remove-item]").forEach(button => {
    button.addEventListener("click", ()=>{
      const current = getBuilderState();
      current[section] = current[section].filter((_, index)=> index !== Number(button.dataset.removeItem));

      if(!current[section].length){
        current[section] = [section === "education"
          ? createBlankEducation()
          : section === "experience"
            ? createBlankExperience()
            : createBlankProject()];
      }

      renderRepeaterItems(section, current[section]);
      persistBuilderState(false);
    });
  });
}

function populateBuilderForm(data){
  CV_BUILDER_TEXT_FIELDS.forEach(field => setBuilderFieldValue(field, data[field]));
  renderRepeaterItems("education", data.education);
  renderRepeaterItems("experience", data.experience);
  renderRepeaterItems("projects", data.projects);
}

function readRepeaterItems(section){
  const container = document.getElementById(`${section}Items`);
  if(!container) return [];

  return Array.from(container.querySelectorAll(".repeaterItem")).map(item => {
    const getValue = (name)=> item.querySelector(`[data-field="${name}"]`)?.value.trim() || "";

    if(section === "education"){
      return {
        school: getValue("school"),
        degree: getValue("degree"),
        date: getValue("date"),
        details: getValue("details")
      };
    }

    if(section === "experience"){
      return {
        title: getValue("title"),
        company: getValue("company"),
        date: getValue("date"),
        details: getValue("details")
      };
    }

    return {
      name: getValue("name"),
      tech: getValue("tech"),
      details: getValue("details")
    };
  });
}

function getBuilderState(){
  return withBuilderDefaults({
    fullName: document.getElementById("fullName")?.value.trim() || "",
    role: document.getElementById("role")?.value.trim() || "",
    email: document.getElementById("email")?.value.trim() || "",
    phone: document.getElementById("phone")?.value.trim() || "",
    location: document.getElementById("location")?.value.trim() || "",
    website: document.getElementById("website")?.value.trim() || "",
    summary: document.getElementById("summary")?.value.trim() || "",
    skills: document.getElementById("skills")?.value.trim() || "",
    languages: document.getElementById("languages")?.value.trim() || "",
    education: readRepeaterItems("education"),
    experience: readRepeaterItems("experience"),
    projects: readRepeaterItems("projects")
  });
}

function renderTagSection(title, items){
  if(!items.length) return "";
  return `
    <section class="cvPreviewSection">
      <h3>${escapeCVHtml(title)}</h3>
      <div class="cvTagList">
        ${items.map(item => `<span class="cvTag">${escapeCVHtml(item)}</span>`).join("")}
      </div>
    </section>
  `;
}

function renderLinksSection(data){
  const links = [
    data.website ? { label: data.website, href: normalizeLink(data.website) } : null
  ].filter(Boolean);

  if(!links.length) return "";

  return `
    <section class="cvPreviewSection">
      <h3>${escapeCVHtml(t("cvWebsite"))}</h3>
      <div class="cvLinkList">
        ${links.map(link => `<a href="${escapeCVHtml(link.href)}" target="_blank" rel="noreferrer">${escapeCVHtml(link.label)}</a>`).join("")}
      </div>
    </section>
  `;
}

function openPrintWindow(sheetMarkup, title){
  const printWindow = window.open("", "_blank", "width=900,height=1200");
  if(!printWindow) return false;

  const styleHref = new URL("style.css", window.location.href).href;
  const safeTitle = escapeCVHtml(title || "CV");
  let didPrint = false;

  printWindow.document.open();
  printWindow.document.write(`
    <!doctype html>
    <html lang="${document.documentElement.lang || "en"}" dir="${document.documentElement.dir || "ltr"}">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width,initial-scale=1" />
      <title>${safeTitle}</title>
      <link rel="stylesheet" href="${styleHref}" />
      <style>
        body{
          margin:0;
          padding:24px;
          background:#ffffff;
        }
      </style>
    </head>
    <body>
      ${sheetMarkup}
    </body>
    </html>
  `);
  printWindow.document.close();

  const printNow = ()=>{
    if(didPrint) return;
    didPrint = true;
    printWindow.focus();
    printWindow.print();
  };

  printWindow.addEventListener("afterprint", ()=>{
    printWindow.close();
  });

  printWindow.addEventListener("load", ()=>{
    setTimeout(printNow, 150);
  }, { once: true });

  setTimeout(printNow, 400);
  return true;
}

function renderTimelineSection(title, items, formatter){
  const visibleItems = items.filter(item => Object.values(item || {}).some(value => String(value || "").trim()));
  if(!visibleItems.length) return "";

  return `
    <section class="cvPreviewSection">
      <h3>${escapeCVHtml(title)}</h3>
      <div class="cvTimeline">
        ${visibleItems.map(formatter).join("")}
      </div>
    </section>
  `;
}

function formatEducationTimeline(item){
  return `
    <article class="cvTimelineItem">
      <div class="cvTimelineTop">
        <span>${escapeCVHtml(item.school || item.degree)}</span>
        <span>${escapeCVHtml(item.date)}</span>
      </div>
      ${item.degree ? `<div class="cvTimelineMeta">${escapeCVHtml(item.degree)}</div>` : ""}
      ${item.details ? `<p>${renderMultiline(item.details)}</p>` : ""}
    </article>
  `;
}

function formatExperienceTimeline(item){
  return `
    <article class="cvTimelineItem">
      <div class="cvTimelineTop">
        <span>${escapeCVHtml(item.title || item.company)}</span>
        <span>${escapeCVHtml(item.date)}</span>
      </div>
      ${item.company ? `<div class="cvTimelineMeta">${escapeCVHtml(item.company)}</div>` : ""}
      ${item.details ? `<p>${renderMultiline(item.details)}</p>` : ""}
    </article>
  `;
}

function formatProjectTimeline(item){
  return `
    <article class="cvTimelineItem">
      <div class="cvTimelineTop">
        <span>${escapeCVHtml(item.name)}</span>
        ${item.tech ? `<span>${escapeCVHtml(item.tech)}</span>` : ""}
      </div>
      ${item.details ? `<p>${renderMultiline(item.details)}</p>` : ""}
    </article>
  `;
}

function renderCVPreview(data){
  const sheet = document.getElementById("cvPreviewSheet");
  if(!sheet) return;

  const safeData = withBuilderDefaults(data);
  const skills = splitTagValues(safeData.skills);
  const languages = splitTagValues(safeData.languages);
  const summarySection = safeData.summary ? `
    <section class="cvPreviewSection" style="margin-top:20px">
      <h3>${escapeCVHtml(t("cvSummary"))}</h3>
      <p>${renderMultiline(safeData.summary)}</p>
    </section>
  ` : "";

  const contactItems = [safeData.email, safeData.phone, safeData.location]
    .filter(item => String(item || "").trim())
    .map(item => `<span>${escapeCVHtml(item)}</span>`)
    .join("");

  sheet.innerHTML = `
    <div class="cvSheetHeader">
      <div>
        <h1>${escapeCVHtml(safeData.fullName || "Your Name")}</h1>
        <div class="cvSheetRole">${escapeCVHtml(safeData.role || t("cvTargetRole"))}</div>
      </div>
      <div class="cvContactList">${contactItems}</div>
    </div>
    ${summarySection}
    <div class="cvPreviewGrid">
      <div>
        ${renderTagSection(t("cvSkills"), skills)}
        ${renderTagSection(t("cvLanguages"), languages)}
        ${renderLinksSection(safeData)}
      </div>
      <div>
        ${renderTimelineSection(t("cvExperience"), safeData.experience, formatExperienceTimeline)}
        ${renderTimelineSection(t("cvEducation"), safeData.education, formatEducationTimeline)}
        ${renderTimelineSection(t("cvProjects"), safeData.projects, formatProjectTimeline)}
      </div>
    </div>
  `;
}

function formatBuilderUpdatedAt(value){
  if(!value) return "";
  const date = new Date(value);
  if(Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(getLang() === "ar" ? "ar-EG" : "en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

function renderBuilderStatus(savedData, flashMessage = ""){
  const status = document.getElementById("cvSaveStatus");
  if(!status) return;

  clearTimeout(cvBuilderStatusTimer);

  if(flashMessage){
    status.textContent = flashMessage;
    cvBuilderStatusTimer = setTimeout(()=>{
      renderBuilderStatus(savedData);
    }, 1800);
    return;
  }

  const updatedAt = formatBuilderUpdatedAt(savedData?.updatedAt);
  status.textContent = updatedAt ? `${t("cvLastUpdated")}: ${updatedAt}` : "";
}

function persistBuilderState(showToast){
  const data = getBuilderState();
  data.updatedAt = new Date().toISOString();
  localStorage.setItem(CV_BUILDER_STORAGE_KEY, JSON.stringify(data));
  renderCVPreview(data);
  renderBuilderStatus(data, showToast ? t("cvDraftSaved") : "");
  return data;
}

function scheduleBuilderSave(){
  renderCVPreview(getBuilderState());

  clearTimeout(cvBuilderSaveTimer);
  cvBuilderSaveTimer = setTimeout(()=>{
    persistBuilderState(false);
  }, 200);
}

function addBuilderItem(section){
  const current = getBuilderState();

  if(section === "education") current.education.push(createBlankEducation());
  if(section === "experience") current.experience.push(createBlankExperience());
  if(section === "projects") current.projects.push(createBlankProject());

  renderRepeaterItems(section, current[section]);
  persistBuilderState(false);

  const container = document.getElementById(`${section}Items`);
  const lastInput = container?.querySelector(".repeaterItem:last-child input, .repeaterItem:last-child textarea");
  if(lastInput) lastInput.focus();
}

function resetBuilderForm(){
  if(!window.confirm(t("cvResetConfirm"))) return;

  localStorage.removeItem(CV_BUILDER_STORAGE_KEY);
  const resetData = getInitialBuilderData(true);
  populateBuilderForm(resetData);
  renderCVPreview(resetData);
  renderBuilderStatus(null, t("cvDraftReset"));
}

function initCVBuilderPage(){
  const form = document.getElementById("cvBuilderForm");
  if(!form) return;

  const initialData = getInitialBuilderData();
  populateBuilderForm(initialData);
  renderCVPreview(initialData);
  renderBuilderStatus(readSavedBuilderData());

  form.addEventListener("input", scheduleBuilderSave);
  form.addEventListener("change", scheduleBuilderSave);

  document.getElementById("addEducationBtn")?.addEventListener("click", ()=> addBuilderItem("education"));
  document.getElementById("addExperienceBtn")?.addEventListener("click", ()=> addBuilderItem("experience"));
  document.getElementById("addProjectBtn")?.addEventListener("click", ()=> addBuilderItem("projects"));
  document.getElementById("saveCvBtn")?.addEventListener("click", ()=> persistBuilderState(true));
  document.getElementById("resetCvTopBtn")?.addEventListener("click", resetBuilderForm);
  document.getElementById("resetCvBtn")?.addEventListener("click", resetBuilderForm);
  document.getElementById("printCvBtn")?.addEventListener("click", ()=>{
    const data = persistBuilderState(false);
    const sheetMarkup = document.getElementById("cvPreviewSheet")?.outerHTML || "";
    openPrintWindow(sheetMarkup, data.fullName || "CV");
  });

  window.refreshCVBuilderCopy = function(){
    renderCVPreview(getBuilderState());
    renderBuilderStatus(readSavedBuilderData());
  };
}

document.addEventListener("DOMContentLoaded", initCVBuilderPage);
