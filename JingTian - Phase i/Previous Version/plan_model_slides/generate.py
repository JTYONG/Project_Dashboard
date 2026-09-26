#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for the MyHealthReport Platform Structure & Execution Plan deck
(derived from plan_model.md). Same academic Madrid-theme design and the
same absolute-coordinate TikZ helper library used for the framework and
technical-architecture decks in this project, so the visual language is
consistent across all three.
"""

# ----------------------------------------------------------------------
# Low-level TikZ helpers (identical to the technical-architecture deck's
# generator -- proven overlap-free across two prior full builds).
# ----------------------------------------------------------------------

def node(id_, x, y, label, fill="blue!12", w=2.8, h=0.9, font="scriptsize", tw=None, draw="black!60", shape="rounded corners"):
    tw = tw if tw is not None else max(w - 0.25, 0.6)
    return (f"\\node[draw={draw},{shape},fill={fill},minimum width={w}cm,"
            f"minimum height={h}cm,align=center,font=\\{font},text width={tw}cm,"
            f"inner sep=2pt] ({id_}) at ({x},{y}) {{{label}}};")

def arrow(a, b, opt=""):
    o = f",{opt}" if opt else ""
    return f"\\draw[-{{Latex[length=2mm]}}{o}] ({a})--({b});"

def shift(body, dx=0, dy=0):
    return f"\\begin{{scope}}[shift={{({dx},{dy})}}]\n{body}\n\\end{{scope}}"

def wrap(body, maxw="0.96", maxh="0.62"):
    return (f"\\begin{{center}}\n\\begin{{adjustbox}}{{max width={maxw}\\linewidth,max height={maxh}\\textheight}}\n"
            f"\\begin{{tikzpicture}}[>=Latex]\n{body}\n\\end{{tikzpicture}}\n\\end{{adjustbox}}\n\\end{{center}}")

def frame(title, body, subtitle=""):
    sub = f"\\textcolor{{black!55}}{{\\scriptsize {subtitle}}}\\\\[2pt]\n" if subtitle else ""
    return f"\\begin{{frame}}[t]{{{title}}}\n{sub}{body}\n\\end{{frame}}\n\n"

def bullets(items, font="scriptsize"):
    lis = "\n".join([f"\\item {x}" for x in items])
    return f"\\begin{{itemize}}\n\\{font}\n{lis}\n\\end{{itemize}}"

def hrow(items, fill="blue!12", w=3.0, h=1.0, gap=0.5, font="scriptsize", y=0, prefix="h"):
    lines, x, ids = [], 0, []
    for i, lab in enumerate(items):
        nid = f"{prefix}{i}"
        ids.append(nid)
        lines.append(node(nid, x, y, lab, fill=fill, w=w, h=h, font=font))
        x += w + gap
    for i in range(1, len(ids)):
        lines.append(arrow(f"{ids[i-1]}.east", f"{ids[i]}.west"))
    return "\n".join(lines)

def snake(items, cols=3, fill="blue!12", w=3.1, h=0.95, gapx=0.4, gapy=0.45, font="scriptsize", prefix="s"):
    lines, ids, n = [], [], len(items)
    dx, dy = w + gapx, h + gapy
    for i, lab in enumerate(items):
        row, pos = divmod(i, cols)
        col = pos if row % 2 == 0 else (cols - 1 - pos)
        x, y = col * dx, -row * dy
        nid = f"{prefix}{i}"
        ids.append((nid, x, y))
        lines.append(node(nid, x, y, lab, fill=fill, w=w, h=h, font=font))
    for i in range(1, n):
        a, b = ids[i-1][0], ids[i][0]
        ax, ay = ids[i-1][1], ids[i-1][2]
        bx, by = ids[i][1], ids[i][2]
        if abs(ay - by) < 1e-6:
            anchor_a = "east" if bx > ax else "west"
            anchor_b = "west" if bx > ax else "east"
        else:
            anchor_a, anchor_b = "south", "north"
        lines.append(arrow(f"{a}.{anchor_a}", f"{b}.{anchor_b}"))
    return "\n".join(lines)

def grid_boxes(items, cols=4, fill="blue!12", w=2.7, h=0.85, gapx=0.35, gapy=0.35, font="scriptsize",
               center_label=None, center_fill="blue!30", prefix="g"):
    lines, dx, dy, n = [], w + gapx, h + gapy, len(items)
    ids = []
    for i, lab in enumerate(items):
        row, col = divmod(i, cols)
        x, y = col * dx, -row * dy
        nid = f"{prefix}{i}"
        ids.append(nid)
        lines.append(node(nid, x, y, lab, fill=fill, w=w, h=h, font=font))
    if center_label:
        cx = (cols - 1) * dx / 2
        cy = 1 * dy
        lines.append(node(f"{prefix}c", cx, cy, center_label, fill=center_fill, w=w + 0.6, h=h, font="scriptsize"))
        for nid in ids:
            lines.append(f"\\draw[-{{Latex[length=1.6mm]}},black!40] ({prefix}c)--({nid});")
    return "\n".join(lines)

def levels(items_colors, w=8.0, h=0.85, gap=0.30, font="scriptsize", prefix="lv"):
    lines, ids, y = [], [], 0
    for i, (lab, fill) in enumerate(items_colors):
        nid = f"{prefix}{i}"
        ids.append(nid)
        lines.append(node(nid, 0, -y, lab, fill=fill, w=w, h=h, font=font))
        y += h + gap
    for i in range(1, len(ids)):
        lines.append(arrow(f"{ids[i-1]}.south", f"{ids[i]}.north"))
    return "\n".join(lines)

def hub_out(center, spokes, cfill="blue!30", sfill="blue!10", cw=3.0, sw=3.2, h=0.85, gap=0.28, font="scriptsize", prefix="ho"):
    lines, n = [], len(spokes)
    total_h = n * h + (n - 1) * gap
    cy = -(total_h - h) / 2
    lines.append(node(f"{prefix}c", 0, cy, center, fill=cfill, w=cw, h=1.1, font="scriptsize"))
    y = 0
    for i, lab in enumerate(spokes):
        nid = f"{prefix}{i}"
        lines.append(node(nid, cw + 1.1, -y, lab, fill=sfill, w=sw, h=h, font=font))
        lines.append(arrow(f"{prefix}c.east", f"{nid}.west"))
        y += h + gap
    return "\n".join(lines)

def latex_table(headers, rows, colspec=None):
    colspec = colspec or ("l" * len(headers))
    head = " & ".join([f"\\textbf{{{h}}}" for h in headers]) + " \\\\"
    body = "\n".join([" & ".join(r) + " \\\\" for r in rows])
    return (f"\\begin{{center}}\\scriptsize\n\\begin{{tabular}}{{{colspec}}}\n\\toprule\n{head}\n\\midrule\n"
            f"{body}\n\\bottomrule\n\\end{{tabular}}\n\\end{{center}}")

def module_slide_body(bullets_list, tikz=None, table=None):
    parts = [bullets(bullets_list)]
    if table:
        parts.append(table)
    if tikz:
        parts.append(wrap(tikz))
    return "\n\\vspace{4pt}\n".join(parts)

# ----------------------------------------------------------------------
# PREAMBLE
# ----------------------------------------------------------------------

PREAMBLE = r"""\documentclass[9pt,aspectratio=169]{beamer}

\usetheme{Madrid}
\usecolortheme{default}
\usefonttheme{professionalfonts}

\setbeamertemplate{navigation symbols}{}
\setbeamertemplate{footline}[frame number]
\setbeamercolor{block title}{bg=blue!20,fg=black}
\setbeamercolor{block body}{bg=blue!5,fg=black}

\usepackage[utf8]{inputenc}
\usepackage{amsmath}
\usepackage{booktabs}
\usepackage{array}
\usepackage{graphicx}
\usepackage{adjustbox}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning,shapes.geometric}

\title[MyHealthReport -- Platform Plan]{MyHealthReport}
\subtitle{Platform Structure \& Execution Plan\\ \small Website, desktop and mobile architecture, technology stack,\\ feature scope, and the medical department's execution plan}
\author{}
\date{28 August 2026}

\begin{document}

\begin{frame}
\titlepage
\end{frame}

\begin{frame}{Agenda}
\tiny
\tableofcontents
\end{frame}

"""

POSTAMBLE = r"""
\begin{frame}
\centering
\Huge Thank You
\vspace{10pt}

\normalsize \textit{MyHealthReport --- Platform Structure \& Execution Plan}
\end{frame}

\end{document}
"""

body_parts = []

# ----------------------------------------------------------------------
# SECTION 1 -- One Core, Three Front Ends
# ----------------------------------------------------------------------

body_parts.append("\\section{One Core, Three Front Ends}\n\n")

core_tikz = "\n".join([
    node("core", 0, 0,
         "\\textbf{SHARED CORE}\\\\[3pt]Layer 3 -- Medical Intelligence (Modules 6--16)\\\\Layer 4 -- Governance (Modules 22--26)\\\\"
         "Rule Engine API $\\cdot$ Reference Ranges $\\cdot$ Classification DB\\\\Red Flag Engine $\\cdot$ Recommendation Engine $\\cdot$ Four Master Matrices",
         fill="violet!16", w=13.5, h=2.1, font="scriptsize"),
    node("web", -5.2, -2.9, "WEBSITE\\\\Modules 1--5, 17--21 UI", fill="blue!16", w=4.4, h=1.1, font="scriptsize"),
    node("desk", 0, -2.9, "DESKTOP APP\\\\Clinic / medical-admin\\\\front end", fill="teal!16", w=4.4, h=1.1, font="scriptsize"),
    node("mob", 5.2, -2.9, "MOBILE APP\\\\Consumer companion,\\\\capture + tracking", fill="green!16", w=4.4, h=1.1, font="scriptsize"),
    arrow("core.south", "web.north"), arrow("core.south", "desk.north"), arrow("core.south", "mob.north"),
])

body_parts.append(frame("One Core, Three Front Ends",
    bullets([
        "Medical knowledge is never hard-coded into a client -- all three versions are front ends over the \\emph{same} backend",
        "Website, desktop, and mobile call the same Rule Engine API and render the same underlying classification codes",
        "They differ only in Layer 1 (User Experience) and, for desktop, in how much of Layer 2 (Health Data) is cached locally",
    ]) + "\n\\vspace{4pt}\n" + wrap(core_tikz, maxh="0.68"),
    subtitle="A single source of truth behind every channel"))

# ----------------------------------------------------------------------
# SECTION 2 -- Website Version
# ----------------------------------------------------------------------

body_parts.append("\\section{Website Version}\n\n")

web_struct_tikz = hub_out("web/", [
    "frontend/  (Modules 1--5, 17--21 UX)",
    "backend/api/  (auth, uploads, reports)",
    "backend/rule-engine/  (Modules 6--16)",
    "backend/ingestion/  (Module 5 -- OCR/LLM)",
    "backend/admin/  (Module 22)",
    "database/  (Modules 4,6,8,9,25)",
    "infra/  (auth, storage, logging, deploy)",
], cfill="blue!30", sfill="blue!8", sw=6.4, prefix="ws")

body_parts.append(frame("Website Version -- Structure",
    bullets([
        "Primary Version 1 channel: fastest to iterate, no install, launches the full end-to-end patient flow",
        "Registration $\\to$ profile $\\to$ blood report upload $\\to$ rule engine $\\to$ targeted questions $\\to$ report $\\to$ follow-up",
        "Covers Phase 1 (Metabolic / Cardiovascular) first, per the framework's phased rollout",
    ]) + "\n\\vspace{4pt}\n" + wrap(web_struct_tikz, maxh="0.62"),
    subtitle="Modules 1--5, 17--21 (UX) over the shared rule-engine backend"))

body_parts.append(frame("Website Version -- Technology Stack",
    latex_table(["Layer", "Recommendation"], [
        ["Frontend", "TypeScript + React (Next.js) -- server-rendered marketing pages, client-rendered assessment wizard"],
        ["Backend / Rule Engine", "Python (FastAPI) -- strong fit for the rule engine, clean path to ML/OCR, typed schemas via Pydantic"],
        ["Database", "PostgreSQL -- Module 25's structured objects map directly to relational tables"],
        ["Async / background jobs", "Python + task queue (e.g. Celery) -- OCR extraction and report generation off the request path"],
        ["Admin console (Module 22)", "Same React/TypeScript stack, gated behind medical-admin roles (Module 25)"],
    ], colspec="p{3.6cm}p{9.5cm}"),
    subtitle="One language family per side of the stack, minimal moving parts"))

body_parts.append(frame("Website Version -- Key Features",
    bullets([
        "\\textbf{LLM/OCR blood-report extraction} -- image/PDF upload $\\to$ OCR $\\to$ LLM-assisted mapping into structured \\{test, result, unit, reference range\\} records against the Lab Test Master Database (Module 6); AI assists extraction and wording only, never classification (framework Section 27)",
        "Rule-engine API implementing Modules 6--16 exactly as documented, never duplicated client-side",
        "Unit conversion service (Module 7) so results from different labs are comparable",
        "Report generator with PDF/print export (Module 19)",
        "Medical admin console (Module 22) -- edit reference ranges, classifications, triggers, recommendation wording without a redeploy",
        "Auth, consent and role-based access (Modules 1, 25); audit/version logging (Modules 23--24) surfaced per report",
    ]),
    subtitle="Extraction intelligence, rule fidelity, and admin control"))

# ----------------------------------------------------------------------
# SECTION 3 -- Desktop App Version
# ----------------------------------------------------------------------

body_parts.append("\\section{Desktop App Version}\n\n")

desk_struct_tikz = hub_out("desktop/", [
    "app-shell/  (Electron / Tauri)",
    "src/clinic-intake/  (Modules 1--5, batch)",
    "src/admin-console/  (Module 22)",
    "src/review-queue/  (Module 13)",
    "src/offline-store/  (encrypted local cache)",
    "native/  (scanner, printing, OS files)",
], cfill="teal!30", sfill="teal!8", sw=6.0, prefix="ds")

body_parts.append(frame("Desktop App Version -- Structure",
    bullets([
        "Positioned as the \\textbf{clinic / medical-professional and administration channel}, not a second consumer app",
        "Best fit for bulk/administrative rule management, and clinics where connectivity or IT policy favour a local-first tool",
    ]) + "\n\\vspace{4pt}\n" + wrap(desk_struct_tikz, maxh="0.62"),
    subtitle="Shares the website's UI kit; adds offline intake and admin tooling"))

body_parts.append(frame("Desktop App Version -- Technology Stack",
    latex_table(["Layer", "Recommendation"], [
        ["Shell", "Tauri (Rust shell + the same TypeScript/React UI) -- smaller install, lower memory; Electron (Node.js + TS) as fallback for faster native-module access"],
        ["Shared UI", "TypeScript + React -- same component library as the website, one design system for both"],
        ["Local storage", "SQLite, encrypted at rest -- offline queueing, syncs to PostgreSQL via the same Rule Engine API"],
        ["Native integrations", "Rust (Tauri commands) or Node native modules -- scanner / printer access"],
    ], colspec="p{3.6cm}p{9.5cm}"),
    subtitle="Reuses the website's React code; adds a native shell and local store"))

body_parts.append(frame("Desktop App Version -- Key Features",
    bullets([
        "\\textbf{Offline-first intake} -- clinics with unreliable internet register patients and enter/scan reports locally; results sync and pass through the shared Rule Engine once online",
        "Scanner / printer integration for physical blood reports and for printing the final report (Module 19)",
        "Batch processing -- multiple patients' reports queued and processed together",
        "Medical admin console (Module 22) as a first-class feature -- edit reference ranges, classifications, red flags, recommendation content; review/approve/publish versioning (Module 23) with an audit trail (Module 24)",
        "Red-flag review queue (Module 13) -- dashboard for clinical staff to triage escalated cases",
        "Role-based permissions distinguishing medical admin, clinic staff and read-only reviewer accounts (Module 25)",
    ]),
    subtitle="The admin console is arguably desktop's biggest differentiator"))

# ----------------------------------------------------------------------
# SECTION 4 -- Mobile App Version
# ----------------------------------------------------------------------

body_parts.append("\\section{Mobile App Version}\n\n")

mob_struct_tikz = hub_out("mobile/", [
    "src/capture/  (Module 5 -- camera capture)",
    "src/profile/  (Modules 1--4, onboarding)",
    "src/dashboard/  (Modules 17--19, trends)",
    "src/notifications/  (Module 21)",
    "src/api-client/  (shared typed contract)",
    "native/  (camera, push, biometrics, HealthKit)",
], cfill="green!30", sfill="green!8", sw=6.4, prefix="mb")

body_parts.append(frame("Mobile App Version -- Structure",
    bullets([
        "The \\textbf{consumer companion}: makes the two most-repeated actions frictionless -- capturing a new blood report, checking progress",
        "Carries the longitudinal-tracking and follow-up experience (Modules 17, 20, 21) that a one-time website visit does not serve well",
    ]) + "\n\\vspace{4pt}\n" + wrap(mob_struct_tikz, maxh="0.62"),
    subtitle="Capture-and-track, on the same API contract as web and desktop"))

body_parts.append(frame("Mobile App Version -- Technology Stack",
    latex_table(["Layer", "Recommendation"], [
        ["App framework", "TypeScript + React Native -- maximises code/type-sharing with the website's React/TS codebase and API client; Flutter (Dart) is a reasonable alternative if native rendering performance is prioritised over code-sharing"],
        ["Native modules", "Camera / OCR pre-processing (crop, enhance) in Swift/Kotlin invoked from React Native, or a cross-platform camera library where sufficient"],
        ["Local storage", "Encrypted on-device store (e.g. SQLite/Realm) -- offline viewing of the last report and cached trends"],
        ["Push notifications", "APNs / FCM -- drives Module 21 follow-up and repeat-test reminders"],
    ], colspec="p{3.6cm}p{9.5cm}"),
    subtitle="Cross-platform by default, native where capture quality demands it"))

body_parts.append(frame("Mobile App Version -- Key Features",
    bullets([
        "\\textbf{Camera-based capture + LLM/OCR extraction} -- photograph a paper or PDF report, run the same extraction pipeline as the website, confirm low-confidence values (Module 3 validation) before entering the rule engine",
        "Push notifications for follow-up (Module 21) -- ``repeat HbA1c in 3 months,'' ``update your weight,'' ``your next report is due''",
        "Trend dashboard (Module 17) -- e.g. ``Your HbA1c has shown a progressive upward trend across three measurements,'' with simple charts",
        "Biometric login for fast, secure repeat access to sensitive health data",
        "Optional HealthKit / Health Connect integration -- weight, activity, blood pressure feed Modules 3--4 automatically where the user opts in",
        "Offline report viewing -- last report and trend history available without connectivity",
    ]),
    subtitle="The capture channel that proves OCR/LLM quality daily"))

# ----------------------------------------------------------------------
# SECTION 5 -- Build Sequence
# ----------------------------------------------------------------------

body_parts.append("\\section{Suggested Build Sequence}\n\n")

seq_tikz = levels([
    ("\\textbf{1.} Website, Phase 1 domain only (Metabolic / Cardiovascular) -- validates the full pipeline end to end", "blue!16"),
    ("\\textbf{2.} Medical admin console on web (Module 22) -- so the medical department can maintain content without engineering", "teal!16"),
    ("\\textbf{3.} Desktop app -- wraps the same admin/clinic tooling for offline/clinic use once the web engine is stable", "orange!16"),
    ("\\textbf{4.} Mobile app -- capture-and-track companion once the API contract and OCR/LLM extraction are proven on web", "green!16"),
    ("\\textbf{5.} Expand clinical domains (Phase 2 Liver/Kidney $\\to$ Phase 3 FBC/Iron $\\to$ Phase 4 Thyroid/Uric Acid/Nutritional) across all three front ends together", "violet!16"),
], w=13.5, h=1.05, gap=0.28)

body_parts.append(frame("Suggested Build Sequence",
    bullets([
        "Follows the framework's own phasing guidance: build one clinical domain at a time, not all 26 modules simultaneously",
        "Each later clinical-domain expansion only touches the shared rule engine and matrices -- not platform-specific work",
    ]) + "\n\\vspace{4pt}\n" + wrap(seq_tikz, maxh="0.6"),
    subtitle="Web first, then admin tooling, then desktop, then mobile, then scope expansion"))

# ----------------------------------------------------------------------
# SECTION 6 -- Medical Department Execution Plan
# ----------------------------------------------------------------------

body_parts.append("\\section{Medical Department Execution Plan}\n\n")

med_steps_tikz = snake([
    "1. Scope the\\\\Active Domain",
    "2. Draft the Four\\\\Master Matrices",
    "3. Internal\\\\Clinical Review",
    "4. Structured Hand-off\\\\to Engineering",
    "5. Rule-Engine\\\\Integration Testing",
    "6. Versioned Publish\\\\\\& Sign-Off",
    "7. Post-Launch\\\\Monitoring",
    "8. Repeat\\\\per Phase",
], cols=4, fill="violet!12", w=3.1, h=1.05, font="tiny")

body_parts.append(frame("Medical Department Execution Plan -- Eight Steps",
    bullets([
        "The medical logic person owns Modules 6--16 plus the medical content of Modules 22--24 -- in practice, the Four Master Matrices",
        "Sequenced so engineering is never blocked on undefined medical content, and nothing ships without clinical sign-off",
        "The medical department stays one phase ahead of engineering rather than becoming a bottleneck",
    ]) + "\n\\vspace{4pt}\n" + wrap(med_steps_tikz, maxh="0.58"),
    subtitle="Scope $\\to$ draft $\\to$ review $\\to$ hand-off $\\to$ test $\\to$ publish $\\to$ monitor $\\to$ repeat"))

matrices_tikz = grid_boxes([
    "\\textbf{Matrix A -- Laboratory}\\\\\\textbf{Interpretation}\\\\Marker, reference logic,\\\\severity bands, related\\\\markers, patterns",
    "\\textbf{Matrix B -- Trigger}\\\\\\textbf{Question}\\\\Finding $\\to$ trigger $\\to$\\\\question $\\to$ rationale $\\to$\\\\possible responses",
    "\\textbf{Matrix C -- Safety /}\\\\\\textbf{Referral}\\\\Finding/combination $\\to$\\\\threshold $\\to$ risk level $\\to$\\\\action $\\to$ referral urgency",
    "\\textbf{Matrix D --}\\\\\\textbf{Recommendation}\\\\Finding/pattern $\\to$\\\\recommendation $\\to$ why $\\to$\\\\contraindications $\\to$\\\\priority $\\to$ follow-up",
], cols=2, fill="violet!10", w=6.4, h=2.0, font="tiny",
   center_label="Four Master\\\\Matrices", center_fill="violet!32")

body_parts.append(frame("The Four Master Matrices",
    bullets([
        "Every matrix entry carries a \\texttt{RULE\\_ID}, guideline/source citation and version tag from the outset -- this becomes the audit trail in Module 24",
        "Delivered as structured data (spreadsheet or admin console), never prose -- the practical enforcement of ``never hard-code medical knowledge into the front end''",
        "Safety Matrix (C) entries are specifically checked against \\textbf{Safety Override $>$ Wellness Recommendation}",
    ]) + "\n\\vspace{4pt}\n" + wrap(matrices_tikz, maxh="0.58"),
    subtitle="The brain of MyHealthReport -- Step 2 of the execution plan"))

# ----------------------------------------------------------------------
# ASSEMBLY
# ----------------------------------------------------------------------

full_tex = PREAMBLE + "".join(body_parts) + POSTAMBLE

with open("MyHealthReport_Platform_Plan.tex", "w", encoding="utf-8") as f:
    f.write(full_tex)

n_frames = full_tex.count("\\begin{frame}")
print(f"Wrote MyHealthReport_Platform_Plan.tex with {n_frames} frames")
