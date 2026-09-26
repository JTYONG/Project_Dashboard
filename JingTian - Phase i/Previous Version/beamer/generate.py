#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generator for MyHealthReport Version 1 beamer deck (expanded edition):
- Every topic -> MMRC (Motivation/Method/Result/Conclusion) quadrant slide
- Every topic -> at least one schematic slide
- Every one of the 20 Modules -> concept schematic + Input/Output relation schematic
- Special: Central Logic flowchart with keywords (topic 1)
- Special: System Architecture macro-structure + micro-structure (topic 3)
- Special: Module 1 general-case equation vs worked example (topic 4)
"""

# ----------------------------------------------------------------------
# Low-level TikZ helpers (absolute coordinates -> no relative-positioning
# fragility; every diagram is wrapped in \resizebox so it always fits).
# ----------------------------------------------------------------------

def node(id_, x, y, label, fill="blue!12", w=2.8, h=0.9, font="scriptsize", tw=None, draw="black!60"):
    tw = tw if tw is not None else max(w - 0.25, 0.6)
    return (f"\\node[draw={draw},rounded corners,fill={fill},minimum width={w}cm,"
            f"minimum height={h}cm,align=center,font=\\{font},text width={tw}cm,"
            f"inner sep=2pt] ({id_}) at ({x},{y}) {{{label}}};")

def diamond(id_, x, y, label, fill="yellow!25", w=2.6, h=1.1, font="tiny"):
    tw = max(w - 0.9, 0.6)
    return (f"\\node[draw,diamond,aspect=2.4,fill={fill},align=center,font=\\{font},"
            f"text width={tw}cm,inner sep=1pt] ({id_}) at ({x},{y}) {{{label}}};")

def arrow(a, b, opt=""):
    o = f"[{opt}]" if opt else ""
    return f"\\draw[-{{Latex[length=2mm]}}{o}] ({a})--({b});"

def plainline(a, b):
    return f"\\draw[black!40] ({a})--({b});"

def wrap(body, maxw="0.96", maxh="0.66"):
    # adjustbox scales to fit BOTH a max width and max height (whichever binds first),
    # preserving aspect ratio -- unlike \resizebox (width-only), this can't overflow the frame.
    return (f"\\begin{{center}}\n\\begin{{adjustbox}}{{max width={maxw}\\linewidth,max height={maxh}\\textheight}}\n"
            f"\\begin{{tikzpicture}}[>=Latex]\n{body}\n\\end{{tikzpicture}}\n\\end{{adjustbox}}\n\\end{{center}}")

def frame(title, body, subtitle=""):
    sub = f"\\textcolor{{black!55}}{{\\scriptsize {subtitle}}}\\\\[2pt]\n" if subtitle else ""
    return f"\\begin{{frame}}{{{title}}}\n{sub}{body}\n\\end{{frame}}\n\n"

# ----------------------------------------------------------------------
# Composite diagram builders
# ----------------------------------------------------------------------

def hrow(items, fill="blue!12", w=3.0, h=1.0, gap=0.5, font="scriptsize", y=0):
    lines = []
    x = 0
    ids = []
    for i, lab in enumerate(items):
        nid = f"h{i}"
        ids.append(nid)
        lines.append(node(nid, x, y, lab, fill=fill, w=w, h=h, font=font))
        x += w + gap
    for i in range(1, len(ids)):
        lines.append(arrow(f"{ids[i-1]}.east", f"{ids[i]}.west"))
    return "\n".join(lines)

def vcol(items, fill="blue!12", w=6.0, h=0.85, gap=0.35, font="scriptsize", x=0):
    lines = []
    y = 0
    ids = []
    for i, lab in enumerate(items):
        nid = f"v{i}"
        ids.append(nid)
        lines.append(node(nid, x, -y, lab, fill=fill, w=w, h=h, font=font))
        y += h + gap
    for i in range(1, len(ids)):
        lines.append(arrow(f"{ids[i-1]}.south", f"{ids[i]}.north"))
    return "\n".join(lines)

def snake(items, cols=3, fill="blue!12", w=3.1, h=0.95, gapx=0.4, gapy=0.45, font="scriptsize"):
    lines = []
    ids = []
    n = len(items)
    dx, dy = w + gapx, h + gapy
    for i, lab in enumerate(items):
        row, pos = divmod(i, cols)
        col = pos if row % 2 == 0 else (cols - 1 - pos)
        x, y = col * dx, -row * dy
        nid = f"s{i}"
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

def grid_boxes(items, cols=4, fill="blue!12", w=2.7, h=0.85, gapx=0.35, gapy=0.35, font="scriptsize", center_label=None, center_fill="blue!30"):
    lines = []
    dx, dy = w + gapx, h + gapy
    n = len(items)
    rows = -(-n // cols)
    ids = []
    for i, lab in enumerate(items):
        row, col = divmod(i, cols)
        x, y = col * dx, -row * dy
        nid = f"g{i}"
        ids.append(nid)
        lines.append(node(nid, x, y, lab, fill=fill, w=w, h=h, font=font))
    if center_label:
        cx = (cols - 1) * dx / 2
        cy = 1 * dy
        lines.append(node("gc", cx, cy, center_label, fill=center_fill, w=w + 0.6, h=h, font="scriptsize"))
        for nid in ids:
            lines.append(f"\\draw[-{{Latex[length=1.6mm]}},black!40] (gc)--({nid});")
    return "\n".join(lines)

def levels(items_colors, w=8.0, h=0.85, gap=0.30, font="scriptsize"):
    lines = []
    ids = []
    y = 0
    for i, (lab, fill) in enumerate(items_colors):
        nid = f"lv{i}"
        ids.append(nid)
        lines.append(node(nid, 0, -y, lab, fill=fill, w=w, h=h, font=font))
        y += h + gap
    for i in range(1, len(ids)):
        lines.append(arrow(f"{ids[i-1]}.south", f"{ids[i]}.north"))
    return "\n".join(lines)

def hub_out(center, spokes, cfill="blue!30", sfill="blue!10", cw=3.0, sw=3.2, h=0.85, gap=0.28, font="scriptsize"):
    lines = []
    n = len(spokes)
    total_h = n * h + (n - 1) * gap
    cy = -(total_h - h) / 2
    lines.append(node("cc", 0, cy, center, fill=cfill, w=cw, h=1.1, font="scriptsize"))
    y = 0
    for i, lab in enumerate(spokes):
        nid = f"sp{i}"
        lines.append(node(nid, cw + 1.1, -y, lab, fill=sfill, w=sw, h=h, font=font))
        lines.append(arrow("cc.east", f"{nid}.west"))
        y += h + gap
    return "\n".join(lines)

def hub_in(spokes, center, cfill="orange!30", sfill="orange!10", cw=3.2, sw=3.0, h=0.72, gap=0.22, font="scriptsize"):
    lines = []
    n = len(spokes)
    total_h = n * h + (n - 1) * gap
    y = 0
    for i, lab in enumerate(spokes):
        nid = f"in{i}"
        lines.append(node(nid, 0, -y, lab, fill=sfill, w=sw, h=h, font=font))
        y += h + gap
    cy = -(total_h - 1.1) / 2
    lines.append(node("cc2", sw + 1.1, cy, center, fill=cfill, w=cw, h=1.1, font="scriptsize"))
    for i in range(n):
        lines.append(arrow(f"in{i}.east", "cc2.west"))
    return "\n".join(lines)

def iobox(inputs, proc_title, outputs, modnum, ifill="blue!10", pfill="orange!25", ofill="green!12"):
    in_lab = "\\textbf{\\scriptsize INPUTS}\\\\[2pt]" + "\\\\".join([f"$\\bullet$ {x}" for x in inputs])
    out_lab = "\\textbf{\\scriptsize OUTPUTS}\\\\[2pt]" + "\\\\".join([f"$\\bullet$ {x}" for x in outputs])
    proc_lab = f"\\textbf{{Module {modnum}}}\\\\[2pt]{proc_title}"
    lines = []
    lines.append(node("io_in", 0, 0, in_lab, fill=ifill, w=4.4, h=2.0, font="scriptsize"))
    lines.append(node("io_p", 5.3, 0, proc_lab, fill=pfill, w=3.4, h=2.0, font="scriptsize"))
    lines.append(node("io_out", 9.6, 0, out_lab, fill=ofill, w=4.4, h=2.0, font="scriptsize"))
    lines.append(arrow("io_in.east", "io_p.west"))
    lines.append(arrow("io_p.east", "io_out.west"))
    return "\n".join(lines)

def mmrc(motivation, method, result, conclusion):
    def box(title, text, colback, colframe):
        return (f"\\begin{{tcolorbox}}[colback={colback},colframe={colframe},"
                f"title=\\textbf{{{title}}},boxrule=0.6pt,arc=1mm,left=5pt,right=5pt,"
                f"top=3pt,bottom=3pt,fonttitle=\\small]\n\\footnotesize {text}\n\\end{{tcolorbox}}")
    left = box("Motivation", motivation, "blue!7", "blue!55!black") + "\n\\vspace{5pt}\n" + \
           box("Method", method, "teal!7", "teal!55!black")
    right = box("Result", result, "green!8", "green!45!black") + "\n\\vspace{5pt}\n" + \
            box("Conclusion", conclusion, "orange!10", "orange!65!black")
    return (f"\\begin{{columns}}[T,onlytextwidth]\n\\begin{{column}}{{0.5\\textwidth}}\n{left}\n"
            f"\\end{{column}}\n\\begin{{column}}{{0.5\\textwidth}}\n{right}\n\\end{{column}}\n\\end{{columns}}")

# ----------------------------------------------------------------------
# Cluster taxonomy (macro structure) used throughout the deck
# ----------------------------------------------------------------------

CLUSTERS = {
    1: {"name": "Intake \\& Profiling",            "modules": "M1--M3",   "color": "blue"},
    2: {"name": "Interpretation",                  "modules": "M4--M7",   "color": "teal"},
    3: {"name": "Pattern \\& Trigger",              "modules": "M8--M9",   "color": "violet"},
    4: {"name": "Context \\& Questions",            "modules": "M10--M11", "color": "orange"},
    5: {"name": "Safety \\& Priority",              "modules": "M12--M14", "color": "red"},
    6: {"name": "Recommendation \\& Explanation",   "modules": "M15--M18", "color": "green!60!black"},
    7: {"name": "Reporting \\& Tracking",           "modules": "M19--M20", "color": "brown"},
}
MODULE_CLUSTER = {}
for c, mods in {1:[1,2,3],2:[4,5,6,7],3:[8,9],4:[10,11],5:[12,13,14],6:[15,16,17,18],7:[19,20]}.items():
    for m in mods:
        MODULE_CLUSTER[m] = c

def cluster_badge(modnum):
    c = MODULE_CLUSTER[modnum]
    info = CLUSTERS[c]
    return f"Cluster {c} -- \\textcolor{{{info['color']}}}{{\\textbf{{{info['name']}}}}} ({info['modules']})"

# ----------------------------------------------------------------------
# MODULE DATA (20 modules) -- MMRC text + concept schematic + IO schematic
# ----------------------------------------------------------------------

MODULES = []

def add_module(num, title, motivation, method, result, conclusion, concept_tikz, concept_subtitle, inputs, outputs):
    MODULES.append(dict(num=num, title=title, motivation=motivation, method=method, result=result,
                         conclusion=conclusion, concept_tikz=concept_tikz, concept_subtitle=concept_subtitle,
                         inputs=inputs, outputs=outputs))

# ---- Module 1 : Basic Health Profile (special: general case vs example, pg8) ----
m1_body = "\n".join([
    node("gc_eq", 0, 0, "\\textbf{\\scriptsize GENERAL CASE}\\\\[6pt]"
         "$BMI = \\dfrac{Weight\\,(kg)}{Height\\,(m)^2}$\\\\[6pt]"
         "\\scriptsize Underweight \\,$<$18.5 \\quad Normal 18.5--24.9\\\\Overweight 25--29.9 \\quad Obese \\,$\\geq$30",
         fill="blue!7", w=6.2, h=2.6, font="small"),
    node("ex_body", 7.6, 0, "\\textbf{\\scriptsize EXAMPLE}\\\\[6pt]"
         "Height = 1.70 m \\quad Weight = 75 kg\\\\[6pt]"
         "$BMI = \\dfrac{75}{1.70^2} = 25.95$\\\\[6pt]\\textbf{Classification: Overweight}",
         fill="green!7", w=5.4, h=2.6, font="small"),
])
add_module(1, "Basic Health Profile",
    "Registration must collect only what is useful across almost every future analysis, without a burdensome intake.",
    "Collect demographic, anthropometric and lifestyle fields once; auto-derive BMI from height and weight and classify weight status.",
    "A structured Patient Profile (age, sex, BMI, waist, BP, smoking, alcohol, activity, conditions, medication, pregnancy).",
    "A lightweight, reusable baseline that every later module references instead of re-asking the same questions.",
    m1_body, "General case (formula \\& classification) vs. a worked example",
    ["Registration answers", "Height \\& weight", "Lifestyle answers"],
    ["Patient Profile object", "BMI + weight class"])

# ---- Module 2 : Blood Report Intake ----
m2_concept = hrow(["\\textbf{Identify Report}\\\\lab, date, units,\\\\reference ranges",
                    "\\textbf{Extract Results}\\\\test, value, unit,\\\\flag",
                    "\\textbf{Structured Record}\\\\ready for\\\\validation"], fill="blue!12", w=3.6)
add_module(2, "Blood Report Intake",
    "Free-text lab reports cannot be reasoned over; the platform needs structured, comparable data.",
    "Identify report metadata, then extract each result into a fixed record schema (test, result, unit, reference range, flag, date, source).",
    "A structured Laboratory Result record for every test on the report.",
    "Standardised extraction is the single entry point every later engine ultimately depends on.",
    m2_concept, "Two-step intake pipeline",
    ["Uploaded lab report", "Lab metadata (name, date, units)"],
    ["Structured Lab Result records"])

# ---- Module 3 : Data Validation ----
m3_body = "\n".join([
    grid_boxes(["Unit\\\\makes sense?", "Range\\\\available?", "Test\\\\recognised?", "Biologically\\\\plausible?",
                "Duplicate\\\\value?", "Prior result\\\\available?"], cols=3, fill="blue!10", w=2.6, h=0.85),
    diamond("dv_d", 1.5, -2.5, "Confidence\\\\low?", fill="yellow!30", w=2.8),
    arrow("g1.south", "dv_d.north"), arrow("g4.south", "dv_d.north"),
    node("dv_yes", 5.2, -2.5, "\\textbf{Ask user to confirm}\\\\``We detected potassium\\\\8.4 mmol/L -- please\\\\confirm this reading.''",
         fill="red!12", w=4.2, h=1.4, font="scriptsize"),
    node("dv_no", -2.2, -2.5, "\\textbf{Proceed}\\\\to interpretation",
         fill="green!12", w=2.6, h=1.4, font="scriptsize"),
    arrow("dv_d.east", "dv_yes.west"), arrow("dv_d.west", "dv_no.east"),
])
add_module(3, "Data Validation",
    "An extraction error silently becoming health advice is the platform's single biggest safety risk.",
    "Run plausibility checks on every field before interpretation begins; route low-confidence results to explicit user confirmation.",
    "Either a validated record proceeds automatically, or the user confirms an uncertain reading first.",
    "Validation is a gate, not a formality -- nothing reaches interpretation unconfirmed.",
    m3_body, "Six checks feed one confidence decision",
    ["Structured Lab Result records"],
    ["Validated records", "Confirmation prompts (low confidence)"])

# ---- Module 4 : Reference Range Architecture ----
m4_body = "\n".join([
    levels([
        ("\\textbf{Layer A -- Laboratory Reference Interval}\\\\Taken directly from the report, preserved exactly (e.g. ALT: 0--40 U/L)", "blue!12"),
        ("\\textbf{Layer B -- Clinical Decision Threshold}\\\\Recognised guideline thresholds, may differ from the lab's population range", "teal!12"),
        ("\\textbf{Layer C -- Platform Interpretation Rule}\\\\$Relative\\ Elevation = \\dfrac{Result}{Upper\\ Limit\\ of\\ Normal}$ \\quad (ALT 80 / ULN 40 = 2$\\times$ULN)", "orange!14"),
    ], w=10.5, h=1.15),
])
add_module(4, "Reference Range Architecture",
    "A single universal reference range cannot serve every lab, guideline and platform rule at once.",
    "Layer each marker: the lab's own interval preserved exactly, a recognised clinical threshold, and a platform relative-elevation rule.",
    "A comparable, lab-independent severity signal for every marker (e.g. 2$\\times$ULN).",
    "Layering -- not overwriting -- keeps original lab data trustworthy while enabling cross-lab comparison.",
    m4_body, "Three layers, stacked, not merged",
    ["Validated result", "Lab reference range"],
    ["Relative elevation value", "Layered range object"])

# ---- Module 5 : Laboratory Domain Classification ----
m5_body = grid_boxes(["A. Full Blood\\\\Count", "B. Glucose /\\\\Metabolic", "C. Lipid\\\\Profile", "D. Liver",
                       "E. Kidney", "F. Uric Acid", "G. Thyroid", "H. Iron /\\\\Nutritional"],
                      cols=4, fill="teal!10", w=2.7, h=0.9, center_label="Recognised\\\\Test", center_fill="teal!30")
add_module(5, "Laboratory Domain Classification",
    "Individual test names mean little without grouping into physiological systems.",
    "Map each recognised marker into one or more of eight health domains.",
    "Every result is tagged with its domain(s), enabling domain-level review and pattern search.",
    "Domain tagging is the scaffold that pattern recognition (Module 8) is built on.",
    m5_body, "One test can route to one or more of eight domains",
    ["Recognised test name"],
    ["Domain tag(s): FBC / Metabolic / Lipid / Liver / Kidney / Uric Acid / Thyroid / Nutritional"])

# ---- Module 6 : Abnormality Detection ----
m6_body = levels([
    ("Within reference interval", "green!25"),
    ("Borderline / mild deviation", "yellow!35"),
    ("Moderate deviation", "orange!35"),
    ("Marked deviation", "orange!55"),
    ("Potentially critical", "red!45"),
], w=8.0)
add_module(6, "Abnormality Detection",
    "\\textquotedblleft Normal / Low / High\\textquotedblright\\ alone hides how far outside range a value actually is.",
    "Assign a basic status (Normal/Low/High), then grade magnitude through a five-step deviation scale.",
    "Every result carries both a direction and a graded deviation level.",
    "Not all \\textquotedblleft outside range\\textquotedblright\\ values are equally important -- magnitude must be visible before severity is assigned.",
    m6_body, "Five-step deviation ladder (green $\\to$ red)",
    ["Result + layered reference (Module 4)"],
    ["Status (Normal/Low/High)", "Deviation grade"])

# ---- Module 7 : Severity Framework ----
m7_body = levels([
    ("\\textbf{Level 0} -- Within expected range: no major concern", "green!25"),
    ("\\textbf{Level 1} -- Optimisation opportunity: room to improve", "green!45"),
    ("\\textbf{Level 2} -- Mild abnormality: lifestyle review, monitor", "yellow!40"),
    ("\\textbf{Level 3} -- Clinically relevant: may warrant clinician review", "orange!40"),
    ("\\textbf{Level 4} -- High-risk finding: medical assessment prioritised", "orange!65"),
    ("\\textbf{Level 5} -- Potential critical: urgent safety pathway", "red!55"),
], w=10.5, h=0.72, gap=0.20, font="scriptsize")
add_module(7, "Severity Framework",
    "A flat abnormal/normal split cannot route findings to the right next step.",
    "Classify every finding into one of six action levels, from optimisation opportunity to potential critical finding.",
    "A consistent severity label attached to every finding.",
    "Severity is the shared vocabulary every later engine (questions, safety, priority) reads from.",
    m7_body, "Six action levels, escalating risk",
    ["Abnormality status + deviation grade (Module 6)"],
    ["Severity Level 0--5"])

# ---- Module 8 : Pattern Recognition Engine ----
m8_body = "\n".join([
    node("p8b1", 0, 0, "\\textbf{\\scriptsize Metabolic Pattern}\\\\[5pt]BMI$\\uparrow$ waist$\\uparrow$ TG$\\uparrow$ HDL$\\downarrow$\\\\glucose/HbA1c$\\uparrow$ BP$\\uparrow$ ALT$\\uparrow$", fill="violet!7", w=4.2, h=1.7, font="tiny"),
    node("p8b2", 4.9, 0, "\\textbf{\\scriptsize Microcytic Pattern}\\\\[5pt]Hb$\\downarrow$ MCV$\\downarrow$ MCH$\\downarrow$\\\\$\\to$ ferritin, iron studies,\\\\blood-loss \\& diet history", fill="violet!7", w=4.2, h=1.7, font="tiny"),
    node("p8b3", 9.8, 0, "\\textbf{\\scriptsize Liver Pattern}\\\\[5pt]ALT/AST-predominant\\\\vs.\\ ALP/GGT-predominant\\\\$\\to$ different questions", fill="violet!7", w=4.2, h=1.7, font="tiny"),
])
add_module(8, "Pattern Recognition Engine",
    "Treating each abnormal value independently misses the clinical picture combinations reveal.",
    "Search for known marker combinations (metabolic, microcytic, liver) across domains rather than single values.",
    "Named patterns -- e.g. \\textquotedblleft metabolic-risk pattern\\textquotedblright\\ -- attached to the finding set (never a diagnosis).",
    "Patterns turn a list of abnormal numbers into a coherent health narrative.",
    m8_body, "Three worked pattern examples",
    ["Severity-tagged results across domains"],
    ["Named pattern(s), e.g. metabolic-risk pattern"])

# ---- Module 9 : Master Trigger Matrix ----
m9_body = hrow(["\\textbf{Lab Finding}\\\\e.g. ALT elevated", "\\textbf{Pattern}\\\\liver pattern",
                 "\\textbf{Trigger}\\\\alcohol / meds /\\\\supplements", "\\textbf{Question Set}\\\\targeted intake"],
                fill="violet!12", w=3.1)
add_module(9, "Master Trigger Matrix",
    "Asking every possible question overwhelms the user; asking none misses context.",
    "Map each finding/pattern to the specific trigger conditions that activate a targeted question set.",
    "A minimal, finding-specific question list per patient.",
    "The matrix is the switchboard connecting findings to exactly the right follow-up questions.",
    m9_body, "Finding $\\to$ Pattern $\\to$ Trigger $\\to$ Questions",
    ["Findings + patterns (Modules 6--8)"],
    ["Activated question-set ID(s)"])

# ---- Module 10 : Targeted Question Engine ----
m10_body = grid_boxes(["Symptoms", "Medical\\\\History", "Medication", "Diet", "Exercise", "Sleep", "Stress"],
                       cols=4, fill="orange!10", w=2.6, h=0.8, center_label="Targeted\\\\Questions", center_fill="orange!30")
add_module(10, "Targeted Question Engine",
    "A full intake questionnaire is unnecessary and burdensome when only specific findings need context.",
    "Organise questions into seven categories and activate only the categories a trigger has switched on.",
    "A short, finding-specific question set the patient actually answers.",
    "Precision questioning keeps engagement high without sacrificing clinical context.",
    m10_body, "Seven question categories, activated selectively",
    ["Activated question-set ID(s) (Module 9)"],
    ["Patient answers"])

# ---- Module 11 : Context Integration Engine ----
m11_body = hub_in(["Lab Results", "Patient Profile", "Medical History", "Medications", "Symptoms", "Lifestyle", "Previous Results"],
                   "Unified\\\\Health Context", cfill="orange!30", sfill="orange!8")
add_module(11, "Context Integration Engine",
    "A recommendation built from lab data alone ignores the person behind the numbers.",
    "Merge lab results with profile, history, medication, symptoms, lifestyle and previous results into one context object.",
    "A single, unified Health Context used by every downstream engine.",
    "Integration is what turns isolated data streams into one coherent case.",
    m11_body, "Seven inputs converge into one context object",
    ["Lab Results, Profile, History,", "Medications, Symptoms, Lifestyle,", "Previous Results"],
    ["Unified Health Context object"])

# ---- Module 12 : Safety and Referral Engine ----
m12_body = "\n".join([
    node("s12_ctx", 0, 0, "Health Context\\\\+ Severity", fill="orange!12", w=2.6, h=1.0, font="scriptsize"),
    diamond("s12_d", 3.4, 0, "Appropriate for\\\\routine wellness\\\\guidance?", fill="yellow!30", w=3.0, h=1.3),
    arrow("s12_ctx.east", "s12_d.west"),
    node("s12_yes", 6.9, 1.3, "\\textbf{YES}\\\\Routine Wellness\\\\Pathway", fill="green!20", w=3.0, h=1.0, font="scriptsize"),
    arrow("s12_d.north", "s12_yes.west"),
    node("s12_n1", 6.9, 0.35, "\\textbf{NO}\\\\Medical Review\\\\Recommended", fill="yellow!35", w=3.0, h=0.85, font="scriptsize"),
    node("s12_n2", 6.9, -0.65, "Prompt Medical\\\\Assessment", fill="orange!45", w=3.0, h=0.85, font="scriptsize"),
    node("s12_n3", 6.9, -1.65, "Urgent Assessment", fill="red!45", w=3.0, h=0.85, font="scriptsize"),
    arrow("s12_d.east", "s12_n1.west"), arrow("s12_n1.south", "s12_n2.north"), arrow("s12_n2.south", "s12_n3.north"),
])
add_module(12, "Safety and Referral Engine",
    "Wellness advice must never mask a finding that needs medical attention.",
    "Ask \\textquotedblleft is this appropriate for routine wellness guidance?\\textquotedblright\\ before any recommendation is generated.",
    "Every case is routed to Routine Wellness, Medical Review, Prompt Assessment, or Urgent Assessment.",
    "Safety runs first and can override everything downstream -- by design, not by exception.",
    m12_body, "One gate, four possible pathways",
    ["Unified Health Context (Module 11)", "Severity level (Module 7)"],
    ["Pathway: Routine / Medical Review /", "Prompt / Urgent"])

# ---- Module 13 : Priority Engine ----
m13_body = "\n".join([
    grid_boxes(["Obesity", "Elevated BP", "High TG", "Elevated glucose", "Mild ALT$\\uparrow$", "High uric acid"],
               cols=6, fill="red!10", w=2.0, h=0.75, font="tiny"),
    node("pr1", 0.9, -2.0, "Priority 1\\\\Metabolic health", fill="red!30", w=3.0, h=0.85, font="scriptsize"),
    node("pr2", 4.2, -2.0, "Priority 2\\\\Blood pressure", fill="red!25", w=3.0, h=0.85, font="scriptsize"),
    node("pr3", 7.5, -2.0, "Priority 3\\\\Cardiovascular risk", fill="red!20", w=3.0, h=0.85, font="scriptsize"),
    node("pr4", 10.8, -2.0, "Priority 4\\\\Liver monitoring", fill="red!15", w=3.0, h=0.85, font="scriptsize"),
    arrow("g0.south", "pr1.north"), arrow("g2.south", "pr1.north"), arrow("g4.south", "pr1.north"),
    arrow("g1.south", "pr2.north"), arrow("g3.south", "pr3.north"), arrow("g4.south", "pr4.north"),
])
add_module(13, "Priority Engine",
    "Six abnormal findings should not produce six competing recommendations.",
    "Group related findings and identify the upstream priorities that explain the most downstream issues.",
    "A short, ranked priority list (typically 3--4 items) instead of a flat finding list.",
    "Grouping before recommending is what keeps the final report usable.",
    m13_body, "Many findings converge into a few priorities",
    ["All findings (Routine Wellness pathway only)"],
    ["Grouped, ranked priority list"])

# ---- Module 14 : Root-Factor Mapping ----
m14_body = "\n".join([
    node("rf1", 0, 1.2, "EXCESS WEIGHT", fill="blue!18", w=4.0, h=0.7, font="scriptsize"),
    node("rf2", 0, 0.1, "Insulin resistance", fill="blue!12", w=4.0, h=0.7, font="scriptsize"),
    arrow("rf1.south", "rf2.north"),
    node("rf3", 0, -1.2, "Glucose$\\uparrow$ \\quad Triglycerides$\\uparrow$ \\quad BP$\\uparrow$\\\\Fatty liver risk$\\uparrow$ \\quad Uric acid$\\uparrow$", fill="orange!18", w=9.5, h=1.0, font="scriptsize"),
    arrow("rf2.south", "rf3.north"),
])
add_module(14, "Root-Factor Mapping",
    "Treating five metabolic abnormalities as five separate problems obscures their shared cause.",
    "Trace findings back to modifiable upstream factors (e.g. excess weight $\\to$ insulin resistance $\\to$ multiple markers).",
    "A causal chain the report can state explicitly to the user.",
    "One well-chosen intervention can be shown to improve several findings at once.",
    m14_body, "One upstream factor, five downstream effects",
    ["Priority list (Module 13)"],
    ["Upstream causal factor(s)"])

# ---- Module 15 : Wellness Recommendation Engine ----
m15_body = grid_boxes(["Nutrition", "Physical\\\\Activity", "Weight\\\\Mgmt", "Sleep", "Stress\\\\Mgmt",
                        "Smoking\\\\Cessation", "Alcohol\\\\Moderation", "Hydration", "Preventive\\\\Behaviour"],
                       cols=5, fill="green!10", w=2.4, h=0.85, font="tiny",
                       center_label="Wellness\\\\Engine", center_fill="green!30")
add_module(15, "Wellness Recommendation Engine",
    "Recommendations need a bounded, evidence-proportionate scope for Version 1.",
    "Draw candidate recommendations from nine lifestyle domains, proportional to the evidence available.",
    "A candidate recommendation set tied to specific triggers.",
    "Scope discipline keeps Version 1 focused on what wellness guidance can responsibly claim.",
    m15_body, "Nine bounded recommendation domains",
    ["Priorities (Module 13)", "Root factors (Module 14)"],
    ["Candidate recommendation set"])

# ---- Module 16 : Recommendation Conflict Resolver ----
m16_body = "\n".join([
    node("cf1a", 0, 1.6, "Increase exercise\\\\intensity", fill="blue!10", w=3.4, h=0.7, font="tiny"),
    diamond("cf1d", 4.0, 1.6, "Severe anaemia /\\\\cardiac symptoms?", fill="yellow!30", w=2.8, h=1.0, font="tiny"),
    node("cf1o", 7.4, 1.6, "Suppress routine\\\\intensive advice", fill="red!25", w=3.0, h=0.7, font="tiny"),
    arrow("cf1a.east", "cf1d.west"), arrow("cf1d.east", "cf1o.west"),
    node("cf2a", 0, 0.3, "High-protein\\\\diet", fill="blue!10", w=3.4, h=0.7, font="tiny"),
    diamond("cf2d", 4.0, 0.3, "Kidney\\\\impairment?", fill="yellow!30", w=2.8, h=1.0, font="tiny"),
    node("cf2o", 7.4, 0.3, "Modify or suppress\\\\pending assessment", fill="orange!25", w=3.0, h=0.7, font="tiny"),
    arrow("cf2a.east", "cf2d.west"), arrow("cf2d.east", "cf2o.west"),
    node("cf3a", 0, -1.0, "Aggressive\\\\weight loss", fill="blue!10", w=3.4, h=0.7, font="tiny"),
    diamond("cf3d", 4.0, -1.0, "Pregnancy /\\\\underweight?", fill="yellow!30", w=2.8, h=1.0, font="tiny"),
    node("cf3o", 7.4, -1.0, "Suppress\\\\recommendation", fill="red!25", w=3.0, h=0.7, font="tiny"),
    arrow("cf3a.east", "cf3d.west"), arrow("cf3d.east", "cf3o.west"),
])
add_module(16, "Recommendation Conflict Resolver",
    "A generically sound recommendation can be actively harmful in the wrong patient context.",
    "Pass every candidate recommendation through known conflict rules before it is displayed.",
    "Recommendations are suppressed or modified whenever a contraindication applies.",
    "No recommendation reaches the user without first surviving a safety check.",
    m16_body, "Three worked conflict-check examples",
    ["Candidate recommendations (Module 15)", "Health Context (Module 11)"],
    ["Suppressed / modified / approved recommendations"])

# ---- Module 17 : Recommendation Priority System ----
m17_body = hub_out("Priority\\\\Score", ["Clinical importance", "Modifiability", "Findings affected",
                                          "Safety", "Expected benefit", "User feasibility"],
                    cfill="green!30", sfill="green!8")
add_module(17, "Recommendation Priority System",
    "A patient handed ten equally-weighted actions acts on none of them.",
    "Score each surviving recommendation on six factors: importance, modifiability, findings affected, safety, benefit, feasibility.",
    "Roughly three main priorities, with secondary items underneath.",
    "Scoring turns a candidate list into a decision the patient can actually act on.",
    m17_body, "Six factors feed one priority score",
    ["Approved recommendations (Module 16)"],
    ["$\\approx$3 main priorities + secondary list"])

# ---- Module 18 : Explanation Engine ----
m18_body = snake(["What we\\\\found", "Why it may\\\\matter", "What may\\\\contribute",
                   "What you\\\\can do", "Why this\\\\may help", "What happens\\\\next"],
                  cols=3, fill="green!10", w=3.1, h=0.9)
add_module(18, "Explanation Engine",
    "A recommendation without reasoning invites distrust and non-adherence.",
    "Attach six structured fields to every recommendation, from what was found to what happens next.",
    "A fully reasoned explanation the user can read start-to-finish.",
    "Explaining the \\textquotedblleft why\\textquotedblright\\ is what makes the platform feel like guidance, not a black box.",
    m18_body, "Six-step explanation sequence",
    ["Prioritised recommendations (Module 17)"],
    ["6-field structured explanation per item"])

# ---- Module 19 : Final User Report ----
m19_body = snake(["1. Health\\\\Snapshot", "2. Laboratory\\\\Overview", "3. Key\\\\Patterns", "4. Top\\\\Priorities",
                   "5. Recommended\\\\Actions", "6. Why Actions\\\\Matter", "7. Medical\\\\Follow-Up", "8. Monitoring\\\\Plan"],
                  cols=4, fill="brown!12", w=2.85, h=0.95, font="tiny")
add_module(19, "Final User Report",
    "Findings, patterns and recommendations need one coherent document, not scattered outputs.",
    "Assemble eight fixed sections, from Health Snapshot through Monitoring Plan, in a consistent order.",
    "A single, navigable report the user receives after every analysis.",
    "Consistent structure is what makes repeat reports comparable over time.",
    m19_body, "Eight sections, fixed reading order",
    ["Outputs of every prior engine\\\\(Modules 1--18)"],
    ["8-section personalised report"])

# ---- Module 20 : Longitudinal Tracking ----
m20_body = "\n".join([
    node("t1", 0, 0, "Jan\\\\5.6", fill="green!20", w=1.6, h=0.9, font="scriptsize"),
    node("t2", 2.1, 0.35, "Apr\\\\5.8", fill="yellow!30", w=1.6, h=0.9, font="scriptsize"),
    node("t3", 4.2, 0.8, "Aug\\\\6.1", fill="red!30", w=1.6, h=0.9, font="scriptsize"),
    arrow("t1.east", "t2.west"), arrow("t2.east", "t3.west"),
    grid_boxes(["Improving", "Stable", "Worsening", "Fluctuating"], cols=4, fill="brown!10", w=2.5, h=0.75, font="tiny"),
])
# shift the trend-category grid below the timeline
m20_body = "\n".join([
    node("t1", 0, 0.2, "Jan\\\\HbA1c 5.6", fill="green!20", w=2.0, h=0.9, font="scriptsize"),
    node("t2", 2.6, 0.6, "Apr\\\\HbA1c 5.8", fill="yellow!30", w=2.0, h=0.9, font="scriptsize"),
    node("t3", 5.2, 1.0, "Aug\\\\HbA1c 6.1", fill="red!30", w=2.0, h=0.9, font="scriptsize"),
    arrow("t1.east", "t2.west"), arrow("t2.east", "t3.west"),
    node("tc1", 0, -1.4, "Improving", fill="brown!8", w=2.0, h=0.65, font="tiny"),
    node("tc2", 2.6, -1.4, "Stable", fill="brown!8", w=2.0, h=0.65, font="tiny"),
    node("tc3", 5.2, -1.4, "\\textbf{Worsening}", fill="red!25", w=2.0, h=0.65, font="tiny"),
    node("tc4", 7.8, -1.4, "Fluctuating", fill="brown!8", w=2.0, h=0.65, font="tiny"),
    arrow("t3.south", "tc3.north"),
])
add_module(20, "Longitudinal Tracking",
    "A single time-point result cannot show whether a person's health is improving.",
    "Store every result against its date and classify multi-point series into a trend category.",
    "Trend-aware statements (e.g. \\textquotedblleft progressive upward trend across three measurements\\textquotedblright) instead of isolated snapshots.",
    "Tracking is what turns MyHealthReport from a one-off reading into an ongoing health record.",
    m20_body, "A rising HbA1c series classified as Worsening",
    ["Current + historical results"],
    ["Trend category + trend narrative"])

assert len(MODULES) == 20, f"expected 20 modules, got {len(MODULES)}"
print(f"{len(MODULES)} modules defined")

# ----------------------------------------------------------------------
# NON-MODULE TOPICS (14) -- each: MMRC + >=1 schematic
# ----------------------------------------------------------------------

TOPICS = {}  # key -> dict(title, mmrc fields, schematics: list of (subtitle, tikz_body))

def add_topic(key, title, motivation, method, result, conclusion, schematics):
    TOPICS[key] = dict(title=title, motivation=motivation, method=method, result=result,
                        conclusion=conclusion, schematics=schematics)

# ---- Topic 1: Purpose of Version 1 (+ pg4 Central Logic flowchart w/ keywords) ----
central_logic_items = [
    "\\textbf{Data}\\\\\\tiny raw lab values", "\\textbf{Abnormality}\\\\\\tiny out-of-range flag",
    "\\textbf{Pattern}\\\\\\tiny marker combinations", "\\textbf{Context}\\\\\\tiny profile+history+symptoms",
    "\\textbf{Safety}\\\\\\tiny escalation check", "\\textbf{Priority}\\\\\\tiny grouped importance",
    "\\textbf{Action}\\\\\\tiny recommendation", "\\textbf{Explanation}\\\\\\tiny reasoning shown",
    "\\textbf{Follow-up}\\\\\\tiny monitoring plan",
]
central_logic_tikz = snake(central_logic_items, cols=3, fill="blue!12", w=3.4, h=1.15, font="scriptsize")
add_topic("t1", "1. Purpose of Version 1",
    "Users receive raw lab numbers with no structured way to understand, prioritise, or act on them.",
    "Define nine sequential user-facing objectives, from profile through follow-up, without attempting independent diagnosis.",
    "A platform scope statement: interpret, prioritise, explain and track -- not diagnose.",
    "The Central Logic chain (Data $\\to$ ... $\\to$ Follow-up) is the single sentence Version 1 is built to deliver.",
    [("The Central Logic, as a flowchart with keywords", central_logic_tikz)])

# ---- Topic 2: Core Design Principles ----
principles_body = hub_out("Design\\\\Principles",
    ["1. Start simple", "2. Never isolate one number", "3. Safety overrides wellness",
     "4. Explain the reasoning", "5. Prioritise over overwhelm"], cfill="blue!30", sfill="blue!8")
add_topic("t2", "2. Core Design Principles",
    "Without guiding principles, feature decisions drift toward complexity and clinical overreach.",
    "Define five constraints spanning intake, interpretation, safety, transparency and prioritisation.",
    "Five testable rules every later module must satisfy.",
    "These principles are the filter every subsequent design decision passes through.",
    [("Five constraints radiating from one design philosophy", principles_body)])

# ---- Topic 3: System Architecture (macro + micro, pg7) ----
macro_items = [
    (f"Cluster {c}\\\\{CLUSTERS[c]['name']}\\\\({CLUSTERS[c]['modules']})", f"{CLUSTERS[c]['color']}!18")
    for c in range(1, 8)
]
macro_lines = []
dx = 3.6
for i, (lab, fill) in enumerate(macro_items):
    row, col = divmod(i, 4)
    x, y = col * dx, -row * 1.5
    macro_lines.append(node(f"mc{i}", x, y, lab, fill=fill, w=3.3, h=1.15, font="tiny"))
for i in range(1, len(macro_items)):
    a_row, a_col = divmod(i - 1, 4)
    b_row, b_col = divmod(i, 4)
    if a_row == b_row:
        macro_lines.append(arrow(f"mc{i-1}.east", f"mc{i}.west"))
    else:
        macro_lines.append(arrow(f"mc{i-1}.south", f"mc{i}.north"))
macro_tikz = "\n".join(macro_lines)

# micro: the original 22-stage pipeline, each node tagged with its REAL module number
# (Module N) and coloured by that module's cluster -- this is what lets a viewer see
# which stages belong to the same module and which cluster that module sits in.
micro_stage_defs = [
    ("User $\\to$\\\\Registration", 1), ("Basic Health\\\\Profile", 1), ("Baseline\\\\Classification", 1),
    ("Blood Report\\\\Upload", 2),
    ("Report ID $\\to$\\\\Extraction", 2), ("Validation", 3), ("Unit + Ref.\\\\Range", 4),
    ("Abnormality\\\\Detection", 6),
    ("Severity\\\\Classification", 7), ("Domain\\\\Classification", 5), ("Pattern\\\\Recognition", 8),
    ("Master Trigger\\\\Matrix", 9),
    ("Targeted\\\\Questions", 10), ("Context\\\\Integration", 11), ("Safety / Referral\\\\Engine", 12),
    ("Priority\\\\Engine", 13),
    ("Wellness\\\\Recommendation", 15), ("Conflict\\\\Check", 16), ("Explanation\\\\Engine", 18),
    ("Personalised\\\\Report", 19),
    ("Follow-Up\\\\Plan", 19), ("Trend / Repeat\\\\Report", 20),
]
micro_lines = []
cols = 4
dx2, dy2 = 3.05, 1.15
for i, (lab, modn) in enumerate(micro_stage_defs):
    row, col = divmod(i, cols)
    x, y = col * dx2, -row * dy2
    clu = MODULE_CLUSTER[modn]
    color = CLUSTERS[clu]["color"]
    tagged = f"{lab}\\\\{{\\tiny\\textcolor{{{color}}}{{\\textbf{{Module {modn}}}}}}}"
    micro_lines.append(node(f"mi{i}", x, y, tagged, fill=f"{color}!15", w=2.85, h=1.0, font="tiny"))
for i in range(1, len(micro_stage_defs)):
    a_row, a_col = divmod(i - 1, cols)
    b_row, b_col = divmod(i, cols)
    if a_row == b_row:
        micro_lines.append(arrow(f"mi{i-1}.east", f"mi{i}.west"))
    else:
        micro_lines.append(arrow(f"mi{i-1}.south", f"mi{i}.north"))
micro_tikz = "\n".join(micro_lines)

add_topic("t3", "3. Version 1 System Architecture",
    "A 20-module system needs one map showing how every piece connects before any module is built.",
    "Lay out the full pipeline from registration to trend analysis, then group it by module cluster (macro) and trace it stage-by-stage (micro).",
    "A macro structure of 7 functional clusters, and a micro structure of 22 concrete pipeline stages tagged by module.",
    "Macro shows \\textit{why} modules are grouped; micro shows \\textit{exactly} how data moves between them.",
    [("Macro structure -- 7 clusters, module ranges, cluster-to-cluster flow", macro_tikz),
     ("Micro structure -- 22 pipeline stages, each tagged by its module/cluster", micro_tikz)])

# ---- Topic 19: Recommendation Structure ----
rec_struct_tikz = hrow(["Trigger", "Health\\\\Issue", "Recommen-\\\\dation", "Why", "Expected\\\\Benefit",
                          "Precaution", "Follow-Up"], fill="green!10", w=2.15, h=1.0, font="tiny")
rec_example = node("rex", 0, -2.0,
    "\\textbf{Worked example:} Trigger = elevated TG + excess weight $\\to$ Recommendation = reduce refined carbs/sugary drinks,"
    " gradual weight loss $\\to$ Why = excess energy/refined-carb intake raises TG $\\to$ Benefit = improved TG \\& metabolic health"
    " $\\to$ Precaution = modify per conditions/medication $\\to$ Follow-Up = repeat measurement per clinical plan.",
    fill="green!6", w=13.0, h=1.6, font="tiny")
add_topic("t19", "19. Recommendation Structure",
    "A recommendation without a fixed schema will vary in quality and completeness across cases.",
    "Require seven fields on every recommendation: trigger, health issue, recommendation, why, expected benefit, precaution, follow-up.",
    "A worked example (triglycerides + weight) showing the schema fully populated.",
    "This schema is what Modules 15--18 all read from and write to.",
    [("Seven-field recommendation schema, with a worked example", rec_struct_tikz + "\n" + rec_example)])

# ---- Topic 25: Version 1 Database Concept ----
db_items = ["Patient", "Lab Report", "Lab Result", "Health\\\\Domain", "Trigger", "Question",
            "Answer", "Pattern", "Safety Rule", "Recommen-\\\\dation", "Contra-\\\\indication",
            "Priority", "Explanation", "Follow-Up"]
db_tikz = grid_boxes(db_items, cols=5, fill="teal!10", w=2.35, h=0.8, font="tiny")
add_topic("t25", "25. Version 1 Database Concept",
    "Free-text storage cannot support rules, triggers, or trend analysis.",
    "Define 13 core structured objects covering patient data, findings, rules and recommendations.",
    "A relational data model underlying every module in the pipeline.",
    "Every module in this deck reads or writes one or more of these 13 objects.",
    [("Thirteen core structured objects", db_tikz)])

# ---- Topic 26: Master Rule Architecture ----
mra_tikz = snake(["Finding X/Y +\\\\Context Z", "Activate\\\\Question Set A", "Assess Safety\\\\Rule B",
                   "Identify\\\\Pattern C", "Generate Recom-\\\\mendation D", "Unless Contra-\\\\indication E",
                   "Assign Priority F", "Explanation G +\\\\Follow-Up H"],
                  cols=4, fill="blue!10", w=2.9, h=1.0, font="tiny")
add_topic("t26", "26. Master Rule Architecture",
    "Twenty modules need one shared rule shape, or the logic becomes unmaintainable.",
    "Express every clinical/wellness rule as: IF Finding + Context THEN Question $\\to$ Safety $\\to$ Pattern $\\to$ Recommendation UNLESS Contraindication THEN Priority + Explanation + Follow-Up.",
    "A single reusable rule template applied across all 20 modules.",
    "This is the syntax the Four Master Matrices (Topic 31) are written in.",
    [("The IF...THEN...UNLESS rule template as a flow", mra_tikz)])

# ---- Topic 27: What AI Should Do ----
ai_do_tikz = hub_out("AI\\\\Role", ["Report extraction assistance", "Natural-language explanation",
    "Summarisation \\& wording", "Identifying relevant rules", "Explaining relationships",
    "Generating patient-friendly reports"], cfill="green!30", sfill="green!8")
add_topic("t27", "27. What AI Should Do",
    "AI is capable of more than the platform should let it decide unsupervised.",
    "Scope AI to extraction assistance, explanation, summarisation, wording, rule identification and report generation.",
    "A bounded, non-clinical role for AI within the pipeline.",
    "AI accelerates communication; it does not originate clinical judgment.",
    [("Six permitted AI functions, radiating from one bounded role", ai_do_tikz)])

# ---- Topic 28: What AI Should NOT Independently Control ----
ai_not_tikz = hub_in(["Emergency triggers", "Critical thresholds", "Contraindications",
    "Referral criteria", "Diagnostic claims", "Medication advice"], "Rule-\\\\Governed\\\\Only",
    cfill="red!35", sfill="red!10")
add_topic("t28", "28. What AI Should NOT Independently Control",
    "Letting AI freely decide safety-critical logic risks an unvalidated claim reaching a user.",
    "Reserve emergency triggers, thresholds, contraindications, referral criteria, diagnosis and medication advice to rule-governed logic only.",
    "A hard boundary between \\textquotedblleft rules decide\\textquotedblright\\ and \\textquotedblleft AI explains\\textquotedblright.",
    "Structured clinical rules determine what is allowed; AI determines how it is explained.",
    [("Six safety-critical elements, reserved to rule-governed logic", ai_not_tikz)])

# ---- Topic 29: Version 1 Scope Boundary ----
scope_tikz = "\n".join([
    node("sc_inc", 0, 0, "\\textbf{\\scriptsize INCLUDE}\\\\[5pt]"
         "\\tiny Basic profile, BMI, BP context, common blood tests, abnormality detection,"
         " severity classification, common pattern recognition, targeted questions, wellness recommendations,"
         " red-flag/referral logic, explanations, trend tracking, report generation",
         fill="green!7", w=6.4, h=2.7, font="scriptsize"),
    node("sc_del", 7.1, 0, "\\textbf{\\scriptsize DELAY TO LATER VERSIONS}\\\\[5pt]"
         "\\tiny Supplement marketplace, automatic supplement prescribing, pharmacy sales integration,"
         " complex genetic interpretation, imaging interpretation, diagnosis engine, medication initiation/adjustment,"
         " complex specialist disease management, autonomous AI clinical decisions",
         fill="red!6", w=6.4, h=2.7, font="scriptsize"),
])
add_topic("t29", "29. Version 1 Scope Boundary",
    "An unbounded roadmap delays shipping a safe, useful Version 1.",
    "Explicitly separate what Version 1 includes from what is delayed.",
    "A concrete in/out list reviewable against every new feature request.",
    "Saying no to Phase-2+ features is what keeps Version 1 shippable and safe.",
    [("Include vs. delay -- a reviewable boundary", scope_tikz)])

# ---- Topic 30: Version 1 Clinical Domains to Build First ----
phase_tikz = vcol([
    "\\textbf{Phase 1 -- Metabolic / Cardiovascular}\\\\BMI, BP, glucose, HbA1c, lipid profile -- strong preventive-health foundation",
    "\\textbf{Phase 2 -- Liver + Kidney}",
    "\\textbf{Phase 3 -- Full Blood Count + Iron}",
    "\\textbf{Phase 4 -- Thyroid + Uric Acid + Nutritional Markers}",
], fill="teal!10", w=10.5, h=0.85)
add_topic("t30", "30. Clinical Domains to Build First",
    "Building all eight lab domains simultaneously multiplies validation risk before any value ships.",
    "Sequence domains by preventive-health impact across four build phases.",
    "A four-phase build order, not a simultaneous eight-domain launch.",
    "Depth-first on one domain beats shallow coverage of eight.",
    [("Four sequential build phases", phase_tikz)])

# ---- Topic 31: The Four Master Matrices Needed ----
matrix_items = [
    "\\textbf{A. Laboratory Interpretation}\\\\Marker, Reference logic, Severity,\\\\Related markers, Patterns",
    "\\textbf{B. Trigger Question}\\\\Finding, Trigger, Question,\\\\Why, Possible responses",
    "\\textbf{C. Safety / Referral}\\\\Finding, Threshold/combo,\\\\Risk level, Action, Urgency",
    "\\textbf{D. Recommendation}\\\\Finding/pattern, Recommendation,\\\\Why, Contraindications, Priority",
]
matrix_tikz = grid_boxes(matrix_items, cols=2, fill="blue!8", w=5.6, h=1.6, font="tiny",
                          center_label="Brain of\\\\MyHealthReport", center_fill="blue!30")
add_topic("t31", "31. The Four Master Matrices Needed",
    "Before any code is written, the clinical logic needs to exist somewhere reviewable by non-engineers.",
    "Define four matrices -- Laboratory Interpretation, Trigger Question, Safety/Referral, Recommendation -- each with a fixed column schema.",
    "Four spreadsheets that fully specify platform behaviour before development starts.",
    "These four matrices are the brain of MyHealthReport; the software is their execution engine.",
    [("Four matrices, one shared purpose", matrix_tikz)])

# ---- Topic 32: Version 1 Decision Flow ----
decision_tikz = "\n".join([
    node("df1", 0, 0, "Collect Profile $\\to$ Baseline\\\\Indicators $\\to$ Upload Report", fill="blue!10", w=9.0, h=0.75, font="tiny"),
    node("df2", 0, -0.95, "Extract $\\to$ Validate $\\to$ Capture\\\\Reference Ranges", fill="blue!10", w=9.0, h=0.75, font="tiny"),
    node("df3", 0, -1.9, "Identify Abnormal $\\to$ Assign Severity\\\\$\\to$ Group Domains", fill="teal!10", w=9.0, h=0.75, font="tiny"),
    node("df4", 0, -2.85, "Find Patterns $\\to$ Targeted Questions\\\\$\\to$ Integrate Context", fill="violet!10", w=9.0, h=0.75, font="tiny"),
    node("df5", 0, -3.8, "Any Safety Trigger?", fill="red!20", w=9.0, h=0.75, font="tiny"),
    node("df6", 6.4, -4.8, "YES $\\to$ Medical Pathway", fill="red!35", w=4.4, h=0.75, font="tiny"),
    node("df7", 0, -4.8, "NO $\\to$ Identify Modifiable Factors", fill="green!20", w=9.0, h=0.75, font="tiny"),
    node("df8", 0, -5.75, "Generate Recommendations $\\to$ Check\\\\Contraindications $\\to$ Rank Priorities", fill="green!15", w=9.0, h=0.75, font="tiny"),
    node("df9", 0, -6.7, "Explanation $\\to$ Report $\\to$ Follow-Up\\\\$\\to$ Track $\\to$ REPEAT", fill="green!10", w=9.0, h=0.75, font="tiny"),
    arrow("df1.south", "df2.north"), arrow("df2.south", "df3.north"), arrow("df3.south", "df4.north"),
    arrow("df4.south", "df5.north"), arrow("df5.south", "df7.north"), arrow("df5.east", "df6.west"),
    arrow("df7.south", "df8.north"), arrow("df8.south", "df9.north"),
])
add_topic("t32", "32. Version 1 Decision Flow",
    "Twenty modules need to be seen as one decision path, not twenty independent features.",
    "Trace a single case start-to-finish through profile, extraction, detection, questions, the safety branch, and the recommendation path.",
    "One flowchart with a single explicit branch point: \\textit{Any Safety Trigger?}",
    "Every module in this deck is a step on this one path -- the safety branch is the only fork.",
    [("One end-to-end case, one explicit fork", decision_tikz)])

# ---- Topic 33: The Identity of MyHealthReport ----
identity_tikz = hrow(["Understand", "Prioritise", "Act", "Escalate", "Explain", "Track"],
                       fill="blue!14", w=2.05, h=0.85, font="tiny")
identity_tikz += "\n\\draw[-{Latex[length=2mm]},dashed,black!40] (h5.south) .. controls +(0,-0.8) and +(0,-0.8) .. (h0.south) node[midway,below,font=\\tiny] {feeds back into};"
add_topic("t33", "33. The Identity of MyHealthReport",
    "Positioning the platform as \\textquotedblleft AI tells you what your blood test means\\textquotedblright\\ undersells and misframes it.",
    "Reframe the promise around six verbs the pipeline actually performs.",
    "A positioning statement -- \\textquotedblleft a personalised health roadmap\\textquotedblright\\ -- grounded in real pipeline behaviour.",
    "The identity statement is not marketing copy; it is a direct restatement of Modules 1--20.",
    [("Six verbs, one cycle (Track feeds back into Understand)", identity_tikz)])

# ---- Topic 34: The Central MyHealthReport Algorithm ----
algo_tikz = "\n".join([
    node("al1", 0, 0.9, "$Health\\ Interpretation = Lab\\ Findings + Patterns + Context + Risk + Trend$", fill="blue!10", w=12.5, h=0.75, font="scriptsize"),
    node("al2", 0, -0.15, "$Action\\ Plan = Priority \\times Modifiability \\times Benefit \\times Safety$", fill="teal!10", w=12.5, h=0.75, font="scriptsize"),
    arrow("al1.south", "al2.north"),
    node("al3", 0, -1.2, "\\textit{subject to} \\quad $Safety\\ Override > Wellness\\ Recommendation$", fill="red!12", w=12.5, h=0.75, font="scriptsize"),
    arrow("al2.south", "al3.north"),
    node("al4", 0, -2.25, "$MyHealthReport = Understand + Prioritise + Act + Explain + Monitor$", fill="orange!14", w=12.5, h=0.75, font="scriptsize"),
    arrow("al3.south", "al4.north"),
])
add_topic("t34", "34. The Central MyHealthReport Algorithm",
    "Thirty-four sections need to collapse into one statement a stakeholder can hold in their head.",
    "Express interpretation as a sum of five inputs, action planning as a product of four factors, subject to a safety override.",
    "Health Interpretation, Action Plan and Safety Override as three linked equations.",
    "This is the master architecture; the Four Master Matrices (Topic 31) are the next layer beneath it.",
    [("Three equations, chained into one architecture", algo_tikz)])

print(f"{len(TOPICS)} non-module topics defined")

# ----------------------------------------------------------------------
# ASSEMBLY
# ----------------------------------------------------------------------

MODS = {m["num"]: m for m in MODULES}

def topic_frames(key):
    t = TOPICS[key]
    out = frame(t["title"], mmrc(t["motivation"], t["method"], t["result"], t["conclusion"]))
    for subtitle, tikz_body in t["schematics"]:
        out += frame(t["title"], wrap(tikz_body), subtitle=subtitle)
    return out

def module_frames(num):
    m = MODS[num]
    title = f"Module {num}: {m['title']}"
    badge = cluster_badge(num)
    out = frame(title, mmrc(m["motivation"], m["method"], m["result"], m["conclusion"]), subtitle=badge)
    out += frame(title, wrap(m["concept_tikz"]), subtitle=f"Schematic 1 -- {m['concept_subtitle']}")
    out += frame(title, wrap(iobox(m["inputs"], m["title"], m["outputs"], num)),
                 subtitle="Schematic 2 -- Input / Output relations")
    return out

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
\usepackage[most]{tcolorbox}
\usepackage{tikz}
\usetikzlibrary{arrows.meta,positioning,shapes.geometric}

\title[MyHealthReport V1]{MyHealthReport}
\subtitle{Version 1 Framework --- Expanded Edition\\ \small Motivation $\cdot$ Method $\cdot$ Result $\cdot$ Conclusion, with schematics for every module}
\author{}
\date{22 August 2026}

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

\normalsize \textit{MyHealthReport --- Version 1 Framework (Expanded Edition)}
\end{frame}

\end{document}
"""

sections = [
    ("Purpose \\& Principles", ["t1", "t2"], []),
    ("System Architecture", ["t3"], []),
    (f"Cluster 1 -- {CLUSTERS[1]['name']} ({CLUSTERS[1]['modules']})", [], [1, 2, 3]),
    (f"Cluster 2 -- {CLUSTERS[2]['name']} ({CLUSTERS[2]['modules']})", [], [4, 5, 6, 7]),
    (f"Cluster 3 -- {CLUSTERS[3]['name']} ({CLUSTERS[3]['modules']})", [], [8, 9]),
    (f"Cluster 4 -- {CLUSTERS[4]['name']} ({CLUSTERS[4]['modules']})", [], [10, 11]),
    (f"Cluster 5 -- {CLUSTERS[5]['name']} ({CLUSTERS[5]['modules']})", [], [12, 13, 14]),
    (f"Cluster 6 -- {CLUSTERS[6]['name']} ({CLUSTERS[6]['modules']})", ["t19"], [15, 16, 17, 18]),
    (f"Cluster 7 -- {CLUSTERS[7]['name']} ({CLUSTERS[7]['modules']})", [], [19, 20]),
    ("Data, Rules \\& AI Governance", ["t25", "t26", "t27", "t28"], []),
    ("Scope, Roadmap \\& Matrices", ["t29", "t30", "t31"], []),
    ("Decision Flow, Identity \\& Algorithm", ["t32", "t33", "t34"], []),
]

body_parts = []
for sec_title, topic_keys, module_nums in sections:
    body_parts.append(f"\\section{{{sec_title}}}\n\n")
    for k in topic_keys:
        body_parts.append(topic_frames(k))
    for n in module_nums:
        body_parts.append(module_frames(n))

full_tex = PREAMBLE + "".join(body_parts) + POSTAMBLE

with open("MyHealthReport_Version1_Expanded.tex", "w", encoding="utf-8") as f:
    f.write(full_tex)

n_frames = full_tex.count("\\begin{frame}")
print(f"Wrote MyHealthReport_Version1_Expanded.tex with {n_frames} frames")

