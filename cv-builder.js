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

function getVisibleBuilderItems(items){
  return items.filter(item => Object.values(item || {}).some(value => String(value || "").trim()));
}

function getPdfFont(weight, size){
  return `${weight} ${size}px Arial, sans-serif`;
}

function normalizePdfText(value){
  return String(value || "").replace(/\r\n/g, "\n").trim();
}

function splitLongPdfToken(ctx, token, maxWidth){
  const parts = [];
  let current = "";

  Array.from(token).forEach(char => {
    const next = `${current}${char}`;
    if(current && ctx.measureText(next).width > maxWidth){
      parts.push(current);
      current = char;
    } else {
      current = next;
    }
  });

  if(current) parts.push(current);
  return parts;
}

function wrapPdfText(ctx, value, maxWidth){
  const paragraphs = normalizePdfText(value).split("\n");
  const lines = [];

  paragraphs.forEach((paragraph, paragraphIndex) => {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    let current = "";

    words.forEach(word => {
      const candidate = current ? `${current} ${word}` : word;
      if(ctx.measureText(candidate).width <= maxWidth){
        current = candidate;
        return;
      }

      if(current){
        lines.push(current);
        current = "";
      }

      if(ctx.measureText(word).width > maxWidth){
        const tokenParts = splitLongPdfToken(ctx, word, maxWidth);
        lines.push(...tokenParts.slice(0, -1));
        current = tokenParts[tokenParts.length - 1] || "";
      } else {
        current = word;
      }
    });

    if(current) lines.push(current);
    if(paragraphIndex < paragraphs.length - 1) lines.push("");
  });

  return lines;
}

function fillPdfRoundRect(ctx, x, y, width, height, radius){
  if(typeof ctx.roundRect === "function"){
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, radius);
    ctx.fill();
    return;
  }

  const right = x + width;
  const bottom = y + height;
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(right - radius, y);
  ctx.quadraticCurveTo(right, y, right, y + radius);
  ctx.lineTo(right, bottom - radius);
  ctx.quadraticCurveTo(right, bottom, right - radius, bottom);
  ctx.lineTo(x + radius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.fill();
}

function createPdfRenderState(){
  return {
    pages: [],
    pageWidth: 1240,
    pageHeight: 1754,
    margin: 96,
    pageBottom: 1658,
    ctx: null,
    y: 96,
    isRtl: document.documentElement.dir === "rtl",
    colors: {
      text: "#0f172a",
      muted: "#64748b",
      primary: "#0b3a67",
      border: "rgba(15,23,42,.14)",
      tagBg: "#e6eef6",
      white: "#ffffff"
    }
  };
}

function addPdfPage(state){
  const canvas = document.createElement("canvas");
  canvas.width = state.pageWidth;
  canvas.height = state.pageHeight;

  const ctx = canvas.getContext("2d");
  ctx.fillStyle = state.colors.white;
  ctx.fillRect(0, 0, state.pageWidth, state.pageHeight);
  ctx.textBaseline = "top";
  ctx.direction = state.isRtl ? "rtl" : "ltr";

  state.pages.push(canvas);
  state.ctx = ctx;
  state.y = state.margin;
}

function ensurePdfSpace(state, height){
  if(!state.ctx) addPdfPage(state);
  if(state.y + height > state.pageBottom) addPdfPage(state);
}

function getPdfTextX(state, align){
  if(align === "center") return state.pageWidth / 2;
  if(align === "right") return state.pageWidth - state.margin;
  return state.margin;
}

function drawPdfLine(state, text, options){
  const ctx = state.ctx;
  ctx.font = options.font;
  ctx.fillStyle = options.color || state.colors.text;
  ctx.textAlign = options.align || (state.isRtl ? "right" : "left");
  ctx.direction = state.isRtl ? "rtl" : "ltr";
  ctx.fillText(text, options.x ?? getPdfTextX(state, ctx.textAlign), state.y);
}

function drawPdfWrappedText(state, text, options){
  const ctx = state.ctx;
  ctx.font = options.font;
  const lines = wrapPdfText(ctx, text, options.maxWidth);

  lines.forEach(line => {
    ensurePdfSpace(state, options.lineHeight);
    if(line){
      drawPdfLine(state, line, options);
    }
    state.y += options.lineHeight;
  });

  return lines.length;
}

function drawPdfRule(state, marginTop = 12, marginBottom = 22){
  ensurePdfSpace(state, marginTop + marginBottom + 2);
  state.y += marginTop;
  const ctx = state.ctx;
  ctx.strokeStyle = state.colors.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.margin, state.y);
  ctx.lineTo(state.pageWidth - state.margin, state.y);
  ctx.stroke();
  state.y += marginBottom;
}

function drawPdfSoftRule(state, marginTop = 12, marginBottom = 18){
  if(state.y + marginTop + marginBottom + 2 > state.pageBottom) return;
  state.y += marginTop;
  const ctx = state.ctx;
  ctx.strokeStyle = state.colors.border;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(state.margin, state.y);
  ctx.lineTo(state.pageWidth - state.margin, state.y);
  ctx.stroke();
  state.y += marginBottom;
}

function drawPdfHeader(state, data){
  addPdfPage(state);

  const ctx = state.ctx;
  const pageLeft = state.margin;
  const pageRight = state.pageWidth - state.margin;
  const contentWidth = pageRight - pageLeft;
  const contactItems = [data.email, data.phone, data.location].filter(item => String(item || "").trim());
  const contactWidth = contactItems.length ? 360 : 0;
  const nameWidth = contactItems.length ? contentWidth - contactWidth - 44 : contentWidth;
  const startY = state.y;
  const nameX = state.isRtl ? pageRight : pageLeft;
  const contactX = state.isRtl ? pageLeft : pageRight;
  const nameAlign = state.isRtl ? "right" : "left";
  const contactAlign = state.isRtl ? "left" : "right";

  ctx.font = getPdfFont(900, 54);
  const nameLines = wrapPdfText(ctx, data.fullName || "Your Name", nameWidth);
  ctx.font = getPdfFont(800, 28);
  const roleLines = wrapPdfText(ctx, data.role || t("cvTargetRole"), nameWidth);

  let nameY = startY;
  state.y = nameY;
  nameLines.forEach(line => {
    drawPdfLine(state, line, {
      font: getPdfFont(900, 54),
      color: state.colors.text,
      align: nameAlign,
      x: nameX
    });
    state.y += 62;
  });

  state.y += 8;
  roleLines.forEach(line => {
    drawPdfLine(state, line, {
      font: getPdfFont(800, 28),
      color: state.colors.primary,
      align: nameAlign,
      x: nameX
    });
    state.y += 36;
  });

  const nameBlockBottom = state.y;
  let contactBottom = startY;

  if(contactItems.length){
    state.y = startY + 8;
    contactItems.forEach(item => {
      drawPdfWrappedText(state, item, {
        font: getPdfFont(800, 22),
        color: state.colors.muted,
        lineHeight: 30,
        maxWidth: contactWidth,
        align: contactAlign,
        x: contactX
      });
    });
    contactBottom = state.y;
  }

  state.y = Math.max(nameBlockBottom, contactBottom) + 8;
  drawPdfRule(state, 8, 24);
}

function drawPdfSectionTitle(state, title){
  ensurePdfSpace(state, 58);
  const sectionTitle = getLang() === "ar" ? title : String(title || "").toUpperCase();
  drawPdfLine(state, sectionTitle, {
    font: getPdfFont(900, 23),
    color: state.colors.primary,
    align: state.isRtl ? "right" : "left"
  });
  state.y += 42;
}

function drawPdfParagraphSection(state, title, value){
  if(!normalizePdfText(value)) return;

  drawPdfSectionTitle(state, title);
  drawPdfWrappedText(state, value, {
    font: getPdfFont(700, 23),
    color: "#334155",
    lineHeight: 35,
    maxWidth: state.pageWidth - (state.margin * 2),
    align: state.isRtl ? "right" : "left"
  });
  state.y += 22;
}

function drawPdfTagSection(state, title, items){
  if(!items.length) return;

  drawPdfSectionTitle(state, title);

  const ctx = state.ctx;
  const gap = 12;
  const tagHeight = 40;
  const pageLeft = state.margin;
  const pageRight = state.pageWidth - state.margin;
  let x = state.isRtl ? pageRight : pageLeft;

  ctx.font = getPdfFont(900, 20);

  items.forEach(item => {
    const width = Math.min(ctx.measureText(item).width + 34, pageRight - pageLeft);
    const needsNewLine = state.isRtl
      ? x - width < pageLeft
      : x + width > pageRight;

    if(needsNewLine){
      state.y += tagHeight + gap;
      ensurePdfSpace(state, tagHeight);
      x = state.isRtl ? pageRight : pageLeft;
    } else {
      ensurePdfSpace(state, tagHeight);
    }

    const tagX = state.isRtl ? x - width : x;
    ctx.fillStyle = state.colors.tagBg;
    fillPdfRoundRect(ctx, tagX, state.y, width, tagHeight, 20);
    ctx.fillStyle = state.colors.primary;
    ctx.textAlign = "center";
    ctx.fillText(item, tagX + (width / 2), state.y + 9);

    x = state.isRtl ? tagX - gap : tagX + width + gap;
  });

  state.y += tagHeight + 24;
}

function drawPdfLinkSection(state, data){
  if(!normalizePdfText(data.website)) return;
  drawPdfParagraphSection(state, t("cvWebsite"), data.website);
}

function drawPdfTimelineItem(state, item){
  const ctx = state.ctx;
  const pageLeft = state.margin;
  const pageRight = state.pageWidth - state.margin;
  const contentWidth = pageRight - pageLeft;
  const hasDate = normalizePdfText(item.date);
  const dateWidth = hasDate ? 260 : 0;
  const titleWidth = hasDate ? contentWidth - dateWidth - 28 : contentWidth;
  const titleX = state.isRtl ? pageRight : pageLeft;
  const dateX = state.isRtl ? pageLeft : pageRight;
  const titleAlign = state.isRtl ? "right" : "left";
  const dateAlign = state.isRtl ? "left" : "right";

  ctx.font = getPdfFont(900, 25);
  const titleLines = wrapPdfText(ctx, item.title, titleWidth);
  ctx.font = getPdfFont(800, 21);
  const dateLines = hasDate ? wrapPdfText(ctx, item.date, dateWidth) : [];
  ctx.font = getPdfFont(800, 20);
  const metaLines = normalizePdfText(item.meta)
    ? wrapPdfText(ctx, item.meta, contentWidth)
    : [];
  ctx.font = getPdfFont(700, 22);
  const detailLines = normalizePdfText(item.details)
    ? wrapPdfText(ctx, item.details, contentWidth)
    : [];
  const compactHeight = 34 * Math.max(titleLines.length, dateLines.length, 1)
    + (metaLines.length * 28)
    + Math.min(detailLines.length, 2) * 34
    + 30;

  ensurePdfSpace(state, Math.min(compactHeight, state.pageBottom - state.margin));

  const topLineCount = Math.max(titleLines.length, dateLines.length, 1);
  for(let index = 0; index < topLineCount; index += 1){
    ensurePdfSpace(state, 34);
    if(titleLines[index]){
      drawPdfLine(state, titleLines[index], {
        font: getPdfFont(900, 25),
        color: state.colors.text,
        align: titleAlign,
        x: titleX
      });
    }
    if(dateLines[index]){
      drawPdfLine(state, dateLines[index], {
        font: getPdfFont(800, 21),
        color: state.colors.muted,
        align: dateAlign,
        x: dateX
      });
    }
    state.y += 34;
  }

  metaLines.forEach(line => {
    ensurePdfSpace(state, 28);
    drawPdfLine(state, line, {
      font: getPdfFont(800, 20),
      color: state.colors.muted,
      align: titleAlign,
      x: titleX
    });
    state.y += 28;
  });

  if(detailLines.length){
    state.y += 6;
    detailLines.forEach(line => {
      ensurePdfSpace(state, 34);
      if(line){
        drawPdfLine(state, line, {
          font: getPdfFont(700, 22),
          color: "#334155",
          align: titleAlign,
          x: titleX
        });
      }
      state.y += 34;
    });
  }

  drawPdfSoftRule(state, 12, 18);
}

function drawPdfTimelineSection(state, title, items, formatter){
  const visibleItems = getVisibleBuilderItems(items).map(formatter);
  if(!visibleItems.length) return;

  drawPdfSectionTitle(state, title);
  visibleItems.forEach(item => drawPdfTimelineItem(state, item));
  state.y += 6;
}

function canvasToJpegBytes(canvas){
  const base64 = canvas.toDataURL("image/jpeg", 0.92).split(",")[1];
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for(let index = 0; index < binary.length; index += 1){
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function buildPdfBlobFromImages(images){
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const chunks = [];
  const offsets = [];
  let position = 0;

  const addString = value => {
    const bytes = encoder.encode(value);
    chunks.push(bytes);
    position += bytes.length;
  };

  const addBytes = bytes => {
    chunks.push(bytes);
    position += bytes.length;
  };

  const startObject = id => {
    offsets[id] = position;
    addString(`${id} 0 obj\n`);
  };

  const objectCount = 2 + (images.length * 3);
  addString("%PDF-1.4\n");

  startObject(1);
  addString("<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");

  startObject(2);
  const pageRefs = images.map((_, index) => `${3 + (index * 3)} 0 R`).join(" ");
  addString(`<< /Type /Pages /Kids [${pageRefs}] /Count ${images.length} >>\nendobj\n`);

  images.forEach((image, index) => {
    const pageId = 3 + (index * 3);
    const imageId = pageId + 1;
    const contentId = pageId + 2;
    const imageName = `Im${index + 1}`;
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/${imageName} Do\nQ\n`;

    startObject(pageId);
    addString(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /ProcSet [/PDF /ImageC] /XObject << /${imageName} ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`);

    startObject(imageId);
    addString(`<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${image.bytes.length} >>\nstream\n`);
    addBytes(image.bytes);
    addString("\nendstream\nendobj\n");

    startObject(contentId);
    addString(`<< /Length ${encoder.encode(content).length} >>\nstream\n${content}endstream\nendobj\n`);
  });

  const xrefOffset = position;
  addString(`xref\n0 ${objectCount + 1}\n`);
  addString("0000000000 65535 f \n");
  for(let id = 1; id <= objectCount; id += 1){
    addString(`${String(offsets[id]).padStart(10, "0")} 00000 n \n`);
  }
  addString(`trailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: "application/pdf" });
}

function sanitizePdfFileName(value){
  const base = String(value || "cv")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "")
    .replace(/\s+/g, "-")
    .toLowerCase();
  return `${base || "cv"}.pdf`;
}

function downloadPdfBlob(blob, filename){
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function exportBuilderPdf(data){
  const safeData = withBuilderDefaults(data);
  const state = createPdfRenderState();

  drawPdfHeader(state, safeData);
  drawPdfParagraphSection(state, t("cvSummary"), safeData.summary);
  drawPdfTagSection(state, t("cvSkills"), splitTagValues(safeData.skills));
  drawPdfTagSection(state, t("cvLanguages"), splitTagValues(safeData.languages));
  drawPdfLinkSection(state, safeData);
  drawPdfTimelineSection(state, t("cvExperience"), safeData.experience, item => ({
    title: item.title || item.company,
    date: item.date,
    meta: item.company,
    details: item.details
  }));
  drawPdfTimelineSection(state, t("cvEducation"), safeData.education, item => ({
    title: item.school || item.degree,
    date: item.date,
    meta: item.degree,
    details: item.details
  }));
  drawPdfTimelineSection(state, t("cvProjects"), safeData.projects, item => ({
    title: item.name,
    date: item.tech,
    meta: "",
    details: item.details
  }));

  const images = state.pages.map(canvas => ({
    width: canvas.width,
    height: canvas.height,
    bytes: canvasToJpegBytes(canvas)
  }));
  const blob = buildPdfBlobFromImages(images);
  downloadPdfBlob(blob, sanitizePdfFileName(safeData.fullName || "cv"));
  return images.length;
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
  document.getElementById("exportCvBtn")?.addEventListener("click", event =>{
    const button = event.currentTarget;
    const data = persistBuilderState(false);
    const originalText = button.textContent;

    try {
      button.disabled = true;
      button.textContent = getLang() === "ar" ? "جاري التحميل..." : "Downloading...";
      const pageCount = exportBuilderPdf(data);
      const pageLabel = pageCount === 1 ? "page" : "pages";
      renderBuilderStatus(data, getLang() === "ar"
        ? `تم تحميل PDF (${pageCount} صفحة).`
        : `PDF downloaded (${pageCount} ${pageLabel}).`);
    } catch (error) {
      console.error(error);
      alert(getLang() === "ar"
        ? "تعذر تحميل ملف PDF. من فضلك جرب مرة أخرى."
        : "Could not download the PDF. Please try again.");
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  });

  window.refreshCVBuilderCopy = function(){
    renderCVPreview(getBuilderState());
    renderBuilderStatus(readSavedBuilderData());
  };
}

document.addEventListener("DOMContentLoaded", initCVBuilderPage);
