#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for the MyHealthReport Technical Module Architecture beamer deck.
Academic report design: Madrid theme, section-grouped TOC, one slide per
module (bullets + a demonstrative schematic/table), plus dedicated
structural-chart slides for the master architecture, the four-layer model,
the hard-coding principle, and the team division.
"""

# ----------------------------------------------------------------------
# Low-level TikZ helpers (absolute coordinates; every diagram is wrapped in
# an adjustbox with BOTH max-width and max-height, so nothing can overflow
# a slide regardless of how tall or wide the raw diagram is).
# ----------------------------------------------------------------------

def node(id_, x, y, label, fill="blue!12", w=2.8, h=0.9, font="scriptsize", tw=None, draw="black!60", shape="rounded corners"):
    tw = tw if tw is not None else max(w - 0.25, 0.6)
    return (f"\\node[draw={draw},{shape},fill={fill},minimum width={w}cm,"
            f"minimum height={h}cm,align=center,font=\\{font},text width={tw}cm,"
            f"inner sep=2pt] ({id_}) at ({x},{y}) {{{label}}};")

def diamond(id_, x, y, label, fill="yellow!25", w=2.6, h=1.1, font="tiny"):
    tw = max(w - 0.9, 0.6)
    return (f"\\node[draw,diamond,aspect=2.4,fill={fill},align=center,font=\\{font},"
            f"text width={tw}cm,inner sep=1pt] ({id_}) at ({x},{y}) {{{label}}};")

def arrow(a, b, opt=""):
    o = f",{opt}" if opt else ""
    return f"\\draw[-{{Latex[length=2mm]}}{o}] ({a})--({b});"

def shift(body, dx=0, dy=0):
    # Wraps an already-built diagram fragment in a TikZ scope translated by
    # (dx,dy), so it can be dropped in below/beside another fragment without
    # colliding with it -- used to fix overlap between two independently
    # positioned blocks that were simply concatenated (both starting at local
    # origin (0,0)).
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

# ----------------------------------------------------------------------
# Composite diagram builders (grid/chain/hub patterns)
# ----------------------------------------------------------------------

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

def vcol(items, fill="blue!12", w=6.0, h=0.85, gap=0.3, font="scriptsize", x=0, prefix="v"):
    lines, y, ids = [], 0, []
    for i, lab in enumerate(items):
        nid = f"{prefix}{i}"
        ids.append(nid)
        lines.append(node(nid, x, -y, lab, fill=fill, w=w, h=h, font=font))
        y += h + gap
    for i in range(1, len(ids)):
        lines.append(arrow(f"{ids[i-1]}.south", f"{ids[i]}.north"))
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

def hub_in(spokes, center, cfill="orange!30", sfill="orange!10", cw=3.2, sw=3.0, h=0.72, gap=0.22, font="scriptsize", prefix="hi"):
    lines, n = [], len(spokes)
    total_h = n * h + (n - 1) * gap
    y = 0
    for i, lab in enumerate(spokes):
        nid = f"{prefix}{i}"
        lines.append(node(nid, 0, -y, lab, fill=sfill, w=sw, h=h, font=font))
        y += h + gap
    cy = -(total_h - 1.1) / 2
    lines.append(node(f"{prefix}c", sw + 1.1, cy, center, fill=cfill, w=cw, h=1.1, font="scriptsize"))
    for i in range(n):
        lines.append(arrow(f"{prefix}{i}.east", f"{prefix}c.west"))
    return "\n".join(lines)

def iobox(inputs, proc_title, outputs, tag, ifill="blue!10", pfill="orange!25", ofill="green!12"):
    in_lab = "\\textbf{\\scriptsize INPUTS}\\\\[2pt]" + "\\\\".join([f"$\\bullet$ {x}" for x in inputs])
    out_lab = "\\textbf{\\scriptsize OUTPUTS}\\\\[2pt]" + "\\\\".join([f"$\\bullet$ {x}" for x in outputs])
    proc_lab = f"\\textbf{{{tag}}}\\\\[2pt]{proc_title}"
    lines = [
        node("io_in", 0, 0, in_lab, fill=ifill, w=4.4, h=2.0, font="scriptsize"),
        node("io_p", 5.3, 0, proc_lab, fill=pfill, w=3.4, h=2.0, font="scriptsize"),
        node("io_out", 9.6, 0, out_lab, fill=ofill, w=4.4, h=2.0, font="scriptsize"),
        arrow("io_in.east", "io_p.west"), arrow("io_p.east", "io_out.west"),
    ]
    return "\n".join(lines)

# ----------------------------------------------------------------------
# Cluster taxonomy (mirrors the architecture's top-to-bottom flow)
# ----------------------------------------------------------------------

CLUSTERS = {
    1: {"name": "Identity \\& Profile",              "modules": "M1--M4",   "color": "blue"},
    2: {"name": "Data Ingestion \\& Standardisation", "modules": "M5--M9",   "color": "teal"},
    3: {"name": "Medical Intelligence Core",          "modules": "M10--M13", "color": "violet"},
    4: {"name": "Interpretation \\& Reporting",       "modules": "M14--M19", "color": "orange"},
    5: {"name": "Engagement",                         "modules": "M20--M21", "color": "green!60!black"},
    6: {"name": "Platform Governance",                "modules": "M22--M26", "color": "brown"},
}
MODULE_CLUSTER = {}
for c, mods in {1:[1,2,3,4],2:[5,6,7,8,9],3:[10,11,12,13],4:[14,15,16,17,18,19],5:[20,21],6:[22,23,24,25,26]}.items():
    for m in mods:
        MODULE_CLUSTER[m] = c

def badge(modnum):
    c = MODULE_CLUSTER[modnum]
    info = CLUSTERS[c]
    return f"Cluster {c} -- \\textcolor{{{info['color']}}}{{\\textbf{{{info['name']}}}}} ({info['modules']})"

# ----------------------------------------------------------------------
# MODULE DATA (26 modules): title, bullets, schematic tikz, subtitle,
# and an optional second schematic (extra_title/extra_tikz/extra_subtitle)
# ----------------------------------------------------------------------

MODULES = []
def add(num, title, bullets_list, tikz=None, subtitle="", table=None, extra=None):
    # extra: dict(title=str, tikz=str-or-None, table=str-or-None) for an optional second slide
    MODULES.append(dict(num=num, title=title, bullets=bullets_list, tikz=tikz, subtitle=subtitle, table=table, extra=extra))

def latex_table(headers, rows, colspec=None):
    colspec = colspec or ("l" * len(headers))
    head = " & ".join([f"\\textbf{{{h}}}" for h in headers]) + " \\\\"
    body = "\n".join([" & ".join(r) + " \\\\" for r in rows])
    return (f"\\begin{{center}}\\scriptsize\n\\begin{{tabular}}{{{colspec}}}\n\\toprule\n{head}\n\\midrule\n"
            f"{body}\n\\bottomrule\n\\end{{tabular}}\n\\end{{center}}")

# --- M1 ---
add(1, "User Access \\& Welcome Module",
    ["Entry layer: landing, registration, login, verification, consent, privacy, terms, disclaimer, account settings, language",
     "Main output: \\texttt{USER\\_ID}",
     "Almost everything afterward links back to this one ID"],
    hub_in(["Landing / Registration", "Login / Verification", "Consent \\& Privacy", "Terms \\& Disclaimer", "Account Settings"],
           "\\texttt{USER\\_ID}", cfill="blue!30", sfill="blue!8"),
    "Every intake screen resolves into one identity")

# --- M2 ---
add(2, "Basic Demographic Profile Module",
    ["Stores DOB, calculated age, biological sex, ethnicity (where relevant), region, pregnancy/menopausal status",
     "Becomes part of the shared risk-variable database"],
    "\n".join([
        node("d1", 0, 0, "DOB", fill="blue!12", w=2.2, h=0.8),
        node("d2", 2.7, 0, "Calculate\\\\Age", fill="blue!12", w=2.4, h=0.8),
        node("d3", 5.5, 0, "Age = 52\\\\stored variable", fill="blue!16", w=2.8, h=0.8),
        arrow("d1.east", "d2.west"), arrow("d2.east", "d3.west"),
    ]) + "\n" + shift(hub_out("Age = 52", ["Cardiovascular risk engine", "Diabetes risk engine", "Renal assessment", "Reference-range selection"],
                          cfill="blue!16", sfill="blue!6", prefix="d4"), dy=-1.2),
    "One demographic value, reused by four downstream engines")

# --- M3 ---
add(3, "Anthropometric Profile Module",
    ["Own module because it produces longitudinal anthropometric trends",
     "Raw: height, weight, waist/hip circumference, BP, heart rate, body composition",
     "Derived: BMI, BMI category, waist-height/waist-hip ratio, central obesity, BP classification, weight change \\%",
     "\\textbf{Key rule: raw data and calculated classifications are stored separately}"],
    levels([
        ("Weight = 83~kg \\quad Height = 1.75~m \\hfill \\textit{raw}", "blue!10"),
        ("BMI = 27.1 \\hfill \\textit{calculated}", "teal!12"),
        ("BMI classification = Overweight \\hfill \\textit{classification}", "orange!14"),
        ("Classification standard = MOH MY, Rule version = 2026.01 \\hfill \\textit{rule source}", "green!12"),
    ], w=11.5, h=0.8),
    "Four layers, stored separately, so guideline updates never touch raw data")

# --- M4 ---
add(4, "Health History Module",
    ["Progressive collection, not all at registration: medical/family history, medication, supplements, allergy, smoking, alcohol, exercise, diet, sleep, stress, prior CVD/diabetes/hypertension/kidney/liver disease",
     "\\textbf{Answer states: UNKNOWN / YES / NO / NOT APPLICABLE} -- never let NULL mean everything"],
    grid_boxes(["Medical\\\\History", "Family\\\\History", "Medication /\\\\Supplements", "Allergy", "Smoking /\\\\Alcohol",
                "Exercise /\\\\Diet", "Sleep /\\\\Stress", "Prior CVD /\\\\Diabetes / etc."], cols=4, fill="blue!10", w=2.6, h=0.85, font="tiny")
    + "\n" + shift(grid_boxes(["UNKNOWN", "YES", "NO", "N/A"], cols=4, fill="blue!22", w=1.9, h=0.6, font="tiny", prefix="ans"), dy=-2.3),
    "Progressive categories, each answerable in four defined states")

# --- M5 ---
add(5, "Blood Report Upload Module",
    ["The ingestion layer: upload $\\to$ identify lab/date/metadata $\\to$ extract analytes $\\to$ map to standardized codes $\\to$ capture test/result/unit/range/flag $\\to$ verify $\\to$ store",
     "Design the database as though every result eventually becomes structured data, even before OCR is fully automated"],
    snake(["Upload PDF\\\\/ image", "Identify\\\\laboratory", "Identify report\\\\date", "Identify patient /\\\\report metadata",
           "Extract\\\\analytes", "Map to standard\\\\test codes", "Capture Test, Result,\\\\Unit, Range, Flag",
           "User / system\\\\verification", "Store structured\\\\result"], cols=3, fill="teal!10", w=3.3, h=1.0, font="tiny"),
    "Nine-step ingestion pipeline",
    extra=dict(title="Worked example -- stored record", subtitle="One fully structured result",
               table=latex_table(["Field", "Value"],
                    [["Test","ALT"],["Value","68"],["Unit","U/L"],["Lab lower limit","0"],
                     ["Lab upper limit","41"],["Lab","XYZ Laboratory"],["Date","2026-08-20"]])))

# --- M6 ---
add(6, "Laboratory Test Master Database",
    ["Standardized Lab Test Dictionary solves inconsistent lab naming conventions",
     "Downstream algorithms reference the internal code (e.g. \\texttt{LAB\\_HBA1C}) -- never the raw report text"],
    subtitle="Standardized dictionary example",
    table=latex_table(["Internal Code", "Standard Name", "Alternate Names"],
        [["\\texttt{LAB\\_GLU\\_FAST}","Fasting Plasma Glucose","FBS, FPG"],
         ["\\texttt{LAB\\_HBA1C}","HbA1c","Glycated Hb"],
         ["\\texttt{LAB\\_ALT}","ALT","SGPT"],
         ["\\texttt{LAB\\_AST}","AST","SGOT"],
         ["\\texttt{LAB\\_CREAT}","Creatinine","Serum Creatinine"]]))

# --- M7 ---
add(7, "Unit Standardisation \\& Conversion Module",
    ["Algorithms must never consume whatever unit the lab happens to report",
     "Original result + original unit is preserved; a canonical value + canonical unit is derived alongside it",
     "\\textbf{Never overwrite the original laboratory value}"],
    hrow(["Original result\\\\+ original unit", "Conversion\\\\engine", "Canonical value\\\\+ canonical unit"], fill="teal!12", w=3.4, h=1.0)
    + "\n" + node("u_ex", 0, -2.0, "Original: Glucose = 108 mg/dL \\quad$\\to$\\quad Canonical: Glucose = 6.0 mmol/L (both kept)",
                   fill="teal!6", w=10.5, h=0.75, font="scriptsize"),
    "Glucose example -- both values are kept")

# --- M8 ---
add(8, "Laboratory Reference Range Database",
    ["Separate from the disease/risk classification database",
     "Stores lab, test, limits, unit, sex/age/pregnancy criteria, method, effective date, version",
     "Answers ``is this outside the \\emph{lab's} range?'' -- a different question from ``does this meet a \\emph{clinical} threshold?''"],
    "\n".join([
        node("rr1", 0, 0, "\\textbf{LAB\\_ID = 003}\\\\Test = ALT\\\\Male, 18--59 years\\\\Upper limit = 45 U/L\\\\Version = 2026-01",
             fill="teal!8", w=5.4, h=2.1, font="scriptsize"),
        node("rr2", 6.4, 0.55, "\\textit{Is this result outside}\\\\\\textit{the LAB's range?}", fill="teal!14", w=5.0, h=0.9, font="scriptsize"),
        node("rr3", 6.4, -0.75, "\\textit{Does this meet a}\\\\\\textit{CLINICAL threshold?}", fill="orange!14", w=5.0, h=0.9, font="scriptsize"),
        node("rr4", 11.7, -0.1, "Never\\\\mixed", fill="red!18", w=1.8, h=1.9, font="tiny"),
        arrow("rr1.east", "rr2.west"), arrow("rr1.east", "rr3.west"),
    ]),
    "Two distinct questions, two distinct databases")

# --- M9 ---
add(9, "Clinical Classification Standard Database",
    ["Where medical guidelines are stored: BMI, BP, HbA1c, fasting glucose, LDL, triglyceride, eGFR, albuminuria, anaemia, liver enzyme classifications, etc.",
     "Every rule carries full metadata -- this becomes the medical knowledge database"],
    node("rule_card", 0, 0,
         "\\textbf{RULE\\_ID:} GLYCEMIA\\_HBA1C\\_001\\\\[3pt]\\textbf{Parameter:} HbA1c\\\\\\textbf{Condition:} $<$5.7\\%\\\\"
         "\\textbf{Classification:} Normal\\\\\\textbf{Guideline:} Specified clinical guideline\\\\\\textbf{Version:} 2026.01",
         fill="violet!8", w=8.5, h=2.3, font="small"),
    "One classification rule, fully specified as metadata")

# --- M10 ---
add(10, "Rule Engine / Medical Logic Engine",
    ["\\textbf{The heart of the platform} -- medical decisions must never be coded directly into individual screens",
     "Combines patient, anthropometric, lab, history and medication data into classifications, risk flags, question triggers, recommendations and referral triggers"],
    iobox(["Patient Data", "Anthropometric Data", "Lab Results", "History", "Medication"], "Medical Rule\\\\Engine", tag="Module 10",
          outputs=["Clinical classifications", "Risk flags", "Question triggers", "Recommendations", "Referral triggers"]),
    "Five inputs, five outputs, one engine",
    extra=dict(title="Worked example -- HbA1c 6.1\\%", subtitle="One value, traced through the engine",
        tikz=snake(["HbA1c\\\\= 6.1\\%", "RULE\\\\ENGINE", "Classification:\\\\Prediabetes range",
        "Trigger: family Hx,\\\\symptoms, meds", "Risk\\\\module", "Lifestyle\\\\advice module"], cols=3, fill="violet!10", w=3.1, h=1.0, font="tiny")))

# --- M11 ---
add(11, "Question Trigger Engine",
    ["Independent module -- users should not answer 80 questions at registration",
     "An abnormal finding activates only the relevant question set",
     "This is the module that makes the platform feel ``intelligent''"],
    hub_out("ALT $\\uparrow$", ["Alcohol intake?", "Medication?", "Supplements?", "Previous liver disease?", "Obesity?", "Hepatitis history?"],
            cfill="violet!25", sfill="violet!8", prefix="q1"),
    "Example 1 -- ALT elevated",
    extra=dict(title="Example 2 -- Hb low", subtitle="A second finding, a different question set",
        tikz=hub_out("Hb low", ["Menstrual history", "Bleeding symptoms", "Diet", "Previous anaemia", "GI symptoms", "Pregnancy"],
            cfill="violet!25", sfill="violet!8", prefix="q2")))

# --- M12 ---
add(12, "Risk Stratification Engine",
    ["Classification and risk must stay separate: ``LDL = high'' is a classification, not a risk score",
     "Age + sex + smoking + BP + diabetes + cholesterol + history together may produce ``Cardiovascular risk = elevated''",
     "Each calculator needs an ID, required variables, formula, exclusions, interpretation, version, source guideline"],
    hub_in(["Age", "Sex", "Smoking", "Blood Pressure", "Diabetes status", "Cholesterol", "History"], "Cardiovascular\\\\Risk = Elevated",
           cfill="violet!30", sfill="violet!8"),
    "Many classification inputs converge into one risk output")

# --- M13 ---
add(13, "Red Flag / Escalation Module",
    ["Separates Normal wellness $\\to$ Monitor $\\to$ Medical review $\\to$ Urgent review $\\to$ Emergency advice",
     "Red flags are centrally controlled and versioned, never scattered across screens"],
    levels([
        ("Normal wellness pathway", "green!25"), ("Monitor pathway", "yellow!35"),
        ("Medical review recommended", "orange!40"), ("Urgent medical review", "orange!65"), ("Emergency advice", "red!55"),
    ], w=9.0, h=0.72, gap=0.22),
    "Five-stage escalation ladder",
    extra=dict(title="Decision logic", subtitle="One gate, two possible outcomes", tikz="\n".join([
        node("rf1", 0, 0, "Result\\\\received", fill="violet!10", w=2.6, h=0.9, font="scriptsize"),
        diamond("rf2", 3.6, 0, "Red Flag\\\\Engine", fill="yellow!30", w=2.6, h=1.2),
        arrow("rf1.east", "rf2.west"),
        node("rf3", 7.0, 1.0, "No red flag $\\to$\\\\wellness analysis\\\\continues", fill="green!20", w=3.4, h=1.0, font="scriptsize"),
        node("rf4", 7.0, -1.0, "Red flag $\\to$ suppress reassurance,\\\\show medical review recommendation,\\\\potential doctor referral", fill="red!25", w=3.4, h=1.2, font="scriptsize"),
        arrow("rf2.east", "rf3.west"), arrow("rf2.east", "rf4.west"),
    ])))

# --- M14 ---
add(14, "Health Domain Analysis Module",
    ["Combines $\\sim$40 individual tests into interpretable domains rather than a raw list",
     "Metabolic, cardiovascular, glycaemic, lipid, kidney, liver, haematological, nutritional, thyroid, inflammatory, anthropometric health",
     "Makes the report far easier for patients to understand"],
    grid_boxes(["Metabolic", "Cardiovascular", "Glycaemic", "Lipid", "Kidney", "Liver", "Haematological",
                "Nutritional", "Thyroid", "Inflammatory", "Anthropometric"], cols=4, fill="orange!10", w=2.6, h=0.8, font="tiny",
               center_label="Health\\\\Domains", center_fill="orange!30"),
    "Eleven interpretable health domains",
    extra=dict(title="Example -- Metabolic Health domain", subtitle="Eight parameters, one domain interpretation",
        tikz=hub_in(["BMI", "Waist circumference", "Blood Pressure", "Glucose", "HbA1c", "Triglycerides", "HDL", "ALT"],
        "Metabolic Health\\\\Interpretation", cfill="orange!30", sfill="orange!8", prefix="mh")))

# --- M15 ---
add(15, "Recommendation Engine",
    ["Recommendations are separate from classifications -- one classification can trigger several recommendations",
     "Recommendations use codes (e.g. \\texttt{REC\\_DIET\\_001}) instead of hard-coded text"],
    hub_out("Prediabetes +\\\\BMI overweight +\\\\Sedentary", ["Diet", "Exercise", "Weight management", "Sleep", "Monitoring",
             "Repeat testing", "Professional consultation"], cfill="orange!30", sfill="orange!8"),
    "One finding combination, seven candidate recommendations")

# --- M16 ---
add(16, "Explanation / Health Education Library",
    ["A dedicated content library so the platform can explain \\emph{why} advice is given",
     "The Recommendation Engine calls these entries -- doctors can update wording without touching code"],
    "\n".join([
        node("e1", 0, 0.7, "\\texttt{EDU\\_HBA1C\\_001}\\\\What HbA1c represents", fill="orange!10", w=4.0, h=0.9, font="tiny"),
        node("e2", 4.4, 0.7, "\\texttt{EDU\\_WEIGHT\\_BP\\_001}\\\\Weight $\\to$ blood pressure", fill="orange!10", w=4.4, h=0.9, font="tiny"),
        node("e3", 9.2, 0.7, "\\texttt{EDU\\_EXERCISE\\_}\\\\\\texttt{INSULIN\\_001}", fill="orange!10", w=4.0, h=0.9, font="tiny"),
        node("e4", 4.4, -0.7, "Recommendation Engine", fill="orange!25", w=5.0, h=0.8, font="scriptsize"),
        arrow("e4.north", "e1.south"), arrow("e4.north", "e2.south"), arrow("e4.north", "e3.south"),
    ]),
    "Recommendation Engine calls the education library")

# --- M17 ---
add(17, "Trend \\& Longitudinal Health Module",
    ["Every parameter is stored longitudinally, not just archived as a PDF",
     "Computes absolute/percentage change, direction, rate of change, persistent/new/resolved abnormality"],
    "\n".join([
        node("t1", 0, 0.2, "Jan 2026\\\\HbA1c 6.4\\%", fill="green!22", w=2.4, h=0.9, font="scriptsize"),
        node("t2", 3.0, 0.55, "Apr 2026\\\\HbA1c 6.1\\%", fill="green!30", w=2.4, h=0.9, font="scriptsize"),
        node("t3", 6.0, 0.9, "Aug 2026\\\\HbA1c 5.8\\%", fill="green!38", w=2.4, h=0.9, font="scriptsize"),
        arrow("t1.east", "t2.west"), arrow("t2.east", "t3.west"),
    ]) + "\n" + shift(grid_boxes(["IMPROVING", "STABLE", "WORSENING", "NEWLY\\\\ABNORMAL", "PERSISTENTLY\\\\ABNORMAL"],
                            cols=5, fill="green!10", w=2.1, h=0.75, font="tiny", prefix="tc"), dy=-1.0),
    "A falling HbA1c series classified as Improving")

# --- M18 ---
add(18, "Health Score Module",
    ["If used, kept separate from clinical classifications: metabolic, cardiovascular wellness, lifestyle, overall profile scores",
     "\\textbf{Clinical result $\\neq$ health score} -- the score communicates, it does not replace medical classification"],
    "\n".join([
        node("hs1", 0, 0, "Clinical\\\\Result", fill="orange!16", w=3.4, h=1.0, font="scriptsize"),
        node("hsne", 3.9, 0, "$\\neq$", fill="white", w=0.8, h=1.0, font="Large", draw="white"),
        node("hs2", 5.2, 0, "Health\\\\Score", fill="teal!16", w=3.4, h=1.0, font="scriptsize"),
    ]) + "\n" + shift(grid_boxes(["Metabolic Health Score", "Cardiovascular Wellness Score", "Lifestyle Score", "Overall Health Profile Score"],
                            cols=2, fill="teal!8", w=4.6, h=0.75, font="tiny", prefix="hst"), dy=-1.2),
    "A communication layer, never a substitute for classification")

# --- M19 ---
add(19, "Report Generation Module",
    ["Assembles every other module's output into one report",
     "Twelve-section structure: summary, findings, anthropometrics, results, domains, trends, risk factors, attention areas, recommendations, rationale, monitoring, referral"],
    iobox(["Profile", "Anthropometrics", "Lab results", "Trends", "Classification", "Risk", "Questions", "Recommendations"],
          "Report\\\\Generator", tag="Module 19", outputs=["1--12: Summary $\\to$ Findings $\\to$", "Domains $\\to$ Trends $\\to$ Risk", "$\\to$ Recommendations $\\to$ Referral"]),
    "Eight inputs assembled into a twelve-section report")

# --- M20 ---
add(20, "Referral \\& Professional Network Module",
    ["Later supports doctor, dietitian, physiotherapist, pharmacist, fitness professional, other wellness professionals",
     "Triggered by medical logic, not arbitrary advertising"],
    hrow(["Persistent\\\\high BP", "Referral\\\\Rule", "Doctor consultation\\\\recommended"], fill="green!14", w=3.3, h=1.0)
    + "\n" + shift(grid_boxes(["Doctor", "Dietitian", "Physiotherapist", "Pharmacist", "Fitness Pro", "Other Wellness"], cols=6,
                         fill="green!8", w=1.85, h=0.65, font="tiny", prefix="pn"), dy=-1.2),
    "Rule-triggered referral, not advertising")

# --- M21 ---
add(21, "Notification \\& Follow-Up Module",
    ["Creates longitudinal engagement instead of a one-time blood-report service"],
    grid_boxes(["Repeat HbA1c\\\\in X months", "Repeat lipid\\\\profile", "Update\\\\weight", "Update\\\\BP",
                "Upload next\\\\blood report", "Complete triggered\\\\questionnaire"], cols=3, fill="green!10", w=3.1, h=0.85, font="tiny"),
    "Six example follow-up triggers")

# --- M22 ---
add(22, "Medical Knowledge Management / Admin Module",
    ["An interface for the medical team to manage reference ranges, classifications, risk algorithms, red flags, triggers, recommendations, education content, guideline versions",
     "Programmers should not need to redeploy the whole application when a medical threshold changes"],
    snake(["Admin\\\\Dashboard", "Medical Logic\\\\$\\to$ HbA1c", "Edit\\\\Classification", "Review", "Approve", "Publish\\\\Version 2.1"],
          cols=3, fill="brown!12", w=3.0, h=1.0, font="tiny"),
    "Medical content changes without a code redeploy")

# --- M23 ---
add(23, "Version Control Module",
    ["Critical for medical software: every report records the medical rule, reference-range, risk-calculator, recommendation and report-engine versions it used",
     "Lets the team determine exactly why an old report produced its conclusion after a guideline changes"],
    node("vc1", 0, 0, "\\textbf{Report generated:} 24 Aug 2026\\\\[3pt]\\textbf{Medical Knowledge Base:} v1.4\\\\\\textbf{Cardiovascular Algorithm:} v2.1",
         fill="brown!8", w=9.0, h=1.9, font="small"),
    "Every report carries its own version stamp")

# --- M24 ---
add(24, "Audit \\& Clinical Decision Log",
    ["Every important conclusion retains its reasoning inputs",
     "Valuable for debugging, medical review, quality assurance, dispute investigation, and algorithm improvement"],
    node("al1", 0, 0,
         "\\textbf{USER 123}\\\\[3pt]HbA1c = 6.1 \\quad Rule triggered = GLU\\_004\\\\Classification = Prediabetes range\\\\"
         "Trigger questions = Q\\_GLU\\_01, Q\\_GLU\\_04\\\\Recommendation = REC\\_GLU\\_02 \\quad Rule version = 1.3\\\\Timestamp = ...",
         fill="brown!8", w=10.5, h=2.3, font="small"),
    "A full decision trace, retained per conclusion")

# --- M25 ---
add(25, "Security, Privacy \\& Permission Module",
    ["A platform-wide backend layer: authentication, encryption, role-based access, consent management, access logs, deletion, export, backup, recovery",
     "Medical administrators, programmers and customer support each need different permission levels"],
    grid_boxes(["Authentication", "Encryption", "Role-Based\\\\Access", "Consent Mgmt", "Access Logs", "Data Deletion",
                "Data Export", "Backup /\\\\Recovery", "Admin / Doctor /\\\\Patient Permissions"], cols=3, fill="brown!10", w=3.0, h=0.85, font="tiny",
               center_label="Security\\\\Layer", center_fill="brown!30"),
    "Nine components under one platform-wide layer")

# --- M26 ---
add(26, "Analytics \\& System Improvement Module",
    ["Anonymised, system-level analytics: common abnormalities, risk combinations, question completion rate, upload success rate, referral rates, retention, repeat-testing behaviour",
     "\\textbf{Kept separate from clinical decision-making}"],
    grid_boxes(["Common\\\\Abnormalities", "Risk\\\\Combinations", "Question\\\\Completion Rate", "Upload\\\\Success Rate",
                "Referral\\\\Rates", "User\\\\Retention", "Repeat-Testing\\\\Behaviour"], cols=4, fill="brown!10", w=2.7, h=0.85, font="tiny",
               center_label="Analytics\\\\Engine", center_fill="brown!30"),
    "System-level insight, never clinical decision-making")

assert len(MODULES) == 26, f"expected 26 modules, got {len(MODULES)}"
print(f"{len(MODULES)} modules defined")

# ----------------------------------------------------------------------
# STRUCTURAL-CHART SLIDES
# ----------------------------------------------------------------------

# --- Guiding principle ---
principle_tikz = "\n".join([
    node("gp0", 0, 0, "Arrange by\\\\SCREEN\\\\(rejected)", fill="red!14", w=3.0, h=1.3, font="scriptsize", draw="red!50"),
] + [
    node(f"gp{i+1}", 5.2, 1.9 - i*1.0, lab, fill="blue!10", w=4.4, h=0.8, font="scriptsize")
    for i, lab in enumerate(["User Interface (UI)", "Medical Logic", "Laboratory Data", "Risk Algorithms", "Reporting"])
] + [
    node("gpc", 10.6, -0.1, "Each evolves\\\\independently", fill="green!16", w=3.2, h=1.4, font="scriptsize", draw="green!45!black"),
] + [arrow(f"gp{i+1}.east", "gpc.west") for i in range(5)])

# --- Master architecture: LEFT column (Modules 1-13) ---
def T(lab):
    return lab
arch_left = "\n".join([
    node("a01", 0, 0, "01\\\\USER / AUTHENTICATION", fill="blue!18", w=5.0, h=0.9, font="scriptsize"),
    node("a02", -3.4, -1.1, "02\\\\DEMOGRAPHICS", fill="blue!12", w=3.0, h=0.9, font="scriptsize"),
    node("a03", 3.4, -1.1, "03\\\\ANTHROPOMETRICS", fill="blue!12", w=3.0, h=0.9, font="scriptsize"),
    arrow("a01.west", "a02.north"), arrow("a01.east", "a03.north"),
    node("a04", 0, -2.2, "04\\\\HEALTH HISTORY", fill="blue!16", w=4.4, h=0.9, font="scriptsize"),
    arrow("a02.south", "a04.north"), arrow("a03.south", "a04.north"),
    node("a05", 0, -3.2, "05  REPORT UPLOAD", fill="teal!14", w=5.0, h=0.75, font="scriptsize"),
    arrow("a04.south", "a05.north"),
    node("a06", 0, -4.1, "06  LAB TEST MAPPING", fill="teal!14", w=5.0, h=0.75, font="scriptsize"),
    arrow("a05.south", "a06.north"),
    node("a07", 0, -5.0, "07  UNIT CONVERSION", fill="teal!14", w=5.0, h=0.75, font="scriptsize"),
    arrow("a06.south", "a07.north"),
    node("a08", 0, -5.9, "08  REFERENCE RANGE ENGINE", fill="teal!18", w=5.0, h=0.75, font="scriptsize"),
    arrow("a07.south", "a08.north"),
    node("a09", 0, -6.8, "09  CLASSIFICATION DATABASE", fill="teal!18", w=5.0, h=0.75, font="scriptsize"),
    arrow("a08.south", "a09.north"),
    node("a10", 0, -7.9, "10\\\\MEDICAL RULE ENGINE", fill="violet!22", w=5.0, h=0.95, font="scriptsize"),
    arrow("a09.south", "a10.north"),
    node("a11", -4.4, -9.1, "11\\\\QUESTION\\\\TRIGGERS", fill="violet!14", w=2.8, h=1.0, font="tiny"),
    node("a12", 0, -9.1, "12\\\\RISK\\\\ENGINE", fill="violet!14", w=2.8, h=1.0, font="tiny"),
    node("a13", 4.4, -9.1, "13\\\\RED FLAG\\\\ENGINE", fill="violet!14", w=2.8, h=1.0, font="tiny"),
    arrow("a10.west", "a11.north"), arrow("a10.south", "a12.north"), arrow("a10.east", "a13.north"),
])

# --- Master architecture: RIGHT column (Modules 14-21), offset in x ---
RX = 13.5
arch_right = "\n".join([
    node("a14", RX, 0, "14\\\\HEALTH DOMAINS", fill="orange!16", w=4.6, h=0.9, font="scriptsize"),
    node("a15", RX, -1.1, "15  RECOMMENDATIONS", fill="orange!14", w=4.6, h=0.75, font="scriptsize"),
    arrow("a14.south", "a15.north"),
    node("a16", RX, -2.0, "16  EDUCATION LOGIC", fill="orange!14", w=4.6, h=0.75, font="scriptsize"),
    arrow("a15.south", "a16.north"),
    node("a17", RX-2.6, -3.1, "17\\\\TREND ENGINE", fill="orange!10", w=2.6, h=0.9, font="tiny"),
    node("a18", RX+2.6, -3.1, "18\\\\HEALTH SCORE", fill="orange!10", w=2.6, h=0.9, font="tiny"),
    arrow("a16.west", "a17.north"), arrow("a16.east", "a18.north"),
    node("a19", RX, -4.2, "19\\\\REPORT GENERATOR", fill="orange!22", w=4.6, h=0.95, font="scriptsize"),
    arrow("a17.south", "a19.north"), arrow("a18.south", "a19.north"),
    node("a20", RX-2.6, -5.3, "20\\\\REFERRAL", fill="green!16", w=2.6, h=0.9, font="tiny"),
    node("a21", RX+2.6, -5.3, "21\\\\FOLLOW-UP", fill="green!16", w=2.6, h=0.9, font="tiny"),
    arrow("a19.west", "a20.north"), arrow("a19.east", "a21.north"),
])
connector = arrow("a12.south", "a14.north", opt="dashed,thick") + \
    "\n\\node[font=\\tiny,align=center] at (6.7,-8.5) {flow\\\\continues};"

master_arch_tikz = arch_left + "\n" + arch_right + "\n" + connector

# --- Governance layer (Modules 22-26) ---
gov_tikz = grid_boxes(["22\\\\Medical Admin /\\\\Knowledge Mgmt", "23\\\\Version\\\\Control", "24\\\\Audit / Decision\\\\Log",
                        "25\\\\Security / Privacy /\\\\Permissions", "26\\\\Analytics"],
                       cols=5, fill="brown!14", w=2.9, h=1.15, font="tiny")
gov_tikz += "\n" + node("gov_note", (5-1)*3.25/2, 1.6, "\\textit{Supports every module above (01--21) -- versioning, audit, security and analytics run underneath the entire pipeline}",
                          fill="brown!5", w=15.0, h=0.8, font="scriptsize", draw="brown!40")

# --- Four-layer model ---
layer_tikz = levels([
    ("\\textbf{LAYER 1 -- USER EXPERIENCE}\\\\Screens, questionnaires, dashboards, reports", "blue!14"),
    ("\\textbf{LAYER 2 -- HEALTH DATA}\\\\Profile, anthropometrics, labs, history, trends", "teal!14"),
    ("\\textbf{LAYER 3 -- MEDICAL INTELLIGENCE}\\\\Reference ranges, classification, rules, risk algorithms, red flags, question triggers, recommendations", "violet!14"),
    ("\\textbf{LAYER 4 -- GOVERNANCE}\\\\Versioning, audit, medical admin, security, permissions, analytics", "brown!16"),
], w=11.5, h=1.1, gap=0.35)

# --- Hard-code principle ---
hardcode_tikz = "\n".join([
    node("hc_bad_t", 0, 1.5, "\\textbf{DO NOT}", fill="red!25", w=6.4, h=0.5, font="scriptsize"),
    node("hc_bad", 0, 0.1, "\\texttt{if hba1c >= 6.5:}\\\\\\texttt{\\ \\ \\ \\ diagnosis = ``diabetes''}\\\\[6pt]"
         "\\scriptsize ...repeated throughout the application", fill="red!7", w=6.4, h=1.9, font="small", draw="red!50"),
    node("hc_good_t", 7.6, 1.5, "\\textbf{INSTEAD}", fill="green!22", w=6.4, h=0.5, font="scriptsize"),
    node("hc_good", 7.6, 0.1,
         "HbA1c $\\to$ Medical Rule Engine $\\to$ Retrieve\\\\active rule $\\to$ Apply criteria $\\to$ Return\\\\classification code $\\to$ UI displays approved wording",
         fill="green!7", w=6.4, h=1.9, font="scriptsize", draw="green!45!black"),
])
hardcode_note = node("hc_note", 3.8, -2.2,
    "\\scriptsize Scalable: update WHO/MOH guideline standards, introduce new risk calculators, add new blood tests,"
    " or change recommendation wording -- without rebuilding the platform.",
    fill="blue!5", w=14.0, h=0.85, font="scriptsize", draw="blue!30")

# --- Team division ---
team_tikz = "\n".join([
    node("tm1", 0, 0, "\\textbf{Medical Logic Person}\\\\[5pt]\\scriptsize Owns Modules 6--16\\\\+ medical content of\\\\Modules 22--24",
         fill="violet!10", w=4.6, h=2.3, font="small"),
    node("tm2", 5.1, 0, "\\textbf{Technical Developers}\\\\[5pt]\\scriptsize Build the engines,\\\\databases, APIs and UI\\\\(all 26 modules)",
         fill="teal!10", w=4.6, h=2.3, font="small"),
    node("tm3", 10.2, 0, "\\textbf{UI / Marketing Person}\\\\[5pt]\\scriptsize Designs Modules 1--5\\\\+ presentation of\\\\Modules 14--21",
         fill="orange!10", w=4.6, h=2.3, font="small"),
])

print("structural charts built")

# ----------------------------------------------------------------------
# ASSEMBLY
# ----------------------------------------------------------------------

def module_slide_body(bullets_list, tikz=None, table=None):
    parts = [bullets(bullets_list)]
    if table:
        parts.append(table)
    if tikz:
        parts.append(wrap(tikz))
    return "\n\\vspace{4pt}\n".join(parts)

def module_frames(m):
    title = f"Module {m['num']}: {m['title']}"
    sub = badge(m["num"])
    out = frame(title, module_slide_body(m["bullets"], m.get("tikz"), m.get("table")), subtitle=f"{sub} \\\\ {m['subtitle']}")
    if m.get("extra"):
        e = m["extra"]
        body = wrap(e["tikz"]) if e.get("tikz") else e.get("table", "")
        out += frame(title, body, subtitle=e.get("subtitle", e.get("title", "")))
    return out

MODS = {m["num"]: m for m in MODULES}

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

\title[MyHealthReport -- Technical Architecture]{MyHealthReport}
\subtitle{Technical Module Architecture\\ \small A modular backend design: UI, medical logic, laboratory data,\\ risk algorithms and reporting evolving independently}
\author{}
\date{24 August 2026}

\begin{document}

\begin{frame}
\titlepage
\end{frame}

\begin{frame}{Agenda}
\tiny
\tableofcontents
\end{frame}

\section{Guiding Principle}

"""

principle_frame = frame("Guiding Principle",
    bullets([
        "Do not arrange the platform purely by screen",
        "Arrange into separate modules so UI, medical logic, laboratory data, risk algorithms, and reporting can each evolve independently",
        "This document defines the master technical module architecture: 26 modules, grouped into 6 functional clusters",
    ]) + "\n\\vspace{4pt}\n" + wrap(principle_tikz),
    subtitle="Modular, not screen-based")

POSTAMBLE = r"""
\begin{frame}
\centering
\Huge Thank You
\vspace{10pt}

\normalsize \textit{MyHealthReport --- Technical Module Architecture}
\end{frame}

\end{document}
"""

sections = [
    (f"Cluster 1 -- {CLUSTERS[1]['name']} ({CLUSTERS[1]['modules']})", [1, 2, 3, 4]),
    (f"Cluster 2 -- {CLUSTERS[2]['name']} ({CLUSTERS[2]['modules']})", [5, 6, 7, 8, 9]),
    (f"Cluster 3 -- {CLUSTERS[3]['name']} ({CLUSTERS[3]['modules']})", [10, 11, 12, 13]),
    (f"Cluster 4 -- {CLUSTERS[4]['name']} ({CLUSTERS[4]['modules']})", [14, 15, 16, 17, 18, 19]),
    (f"Cluster 5 -- {CLUSTERS[5]['name']} ({CLUSTERS[5]['modules']})", [20, 21]),
    (f"Cluster 6 -- {CLUSTERS[6]['name']} ({CLUSTERS[6]['modules']})", [22, 23, 24, 25, 26]),
]

body_parts = [principle_frame]

body_parts.append("\\section{Master Technical Architecture}\n\n")
body_parts.append(frame("Master Technical Architecture (Modules 01--21)", wrap(master_arch_tikz, maxh="0.72"),
                         subtitle="The full pipeline, top to bottom"))
body_parts.append(frame("System-Wide Governance Layer (Modules 22--26)", wrap(gov_tikz, maxh="0.6"),
                         subtitle="Five modules underlying the entire pipeline"))

for sec_title, mod_nums in sections:
    body_parts.append(f"\\section{{{sec_title}}}\n\n")
    for n in mod_nums:
        body_parts.append(module_frames(MODS[n]))

body_parts.append("\\section{Architecture Principles}\n\n")
body_parts.append(frame("The Four-Layer Model", wrap(layer_tikz), subtitle="Think of the platform as four layers, not one application"))
body_parts.append(frame("Never Hard-Code Medical Knowledge", wrap(hardcode_tikz) + "\n" + wrap(hardcode_note, maxh="0.18"),
                         subtitle="The single most important rule for developers"))

body_parts.append("\\section{Team Division}\n\n")
body_parts.append(frame("Team Division (Four-Person Team)", wrap(team_tikz),
                         subtitle="This architecture creates a clean ownership split"))

full_tex = PREAMBLE + "".join(body_parts) + POSTAMBLE

with open("MyHealthReport_Technical_Architecture.tex", "w", encoding="utf-8") as f:
    f.write(full_tex)

n_frames = full_tex.count("\\begin{frame}")
print(f"Wrote MyHealthReport_Technical_Architecture.tex with {n_frames} frames")
