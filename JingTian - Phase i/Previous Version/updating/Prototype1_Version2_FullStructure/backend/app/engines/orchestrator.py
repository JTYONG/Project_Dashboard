"""EVA SQUARE — ties every engine together into one `run_analysis()` call,
mirroring frontend-v2's store.js#assembleFindings + #runAnalysis. This is
the single function the /api/reports/{id}/analyze endpoint calls."""
from . import cardiovascular, other_domains, safety_engine, recommendation_engine, report_generator


def assemble_findings(profile, labs, questionnaire):
    q = questionnaire or {}
    cv = cardiovascular.analyze(profile, labs, q)
    metabolic = other_domains.analyze_metabolic(labs, q)
    liver = other_domains.analyze_liver(labs, q)
    renal = other_domains.analyze_renal(labs, q)
    haematology = other_domains.analyze_haematology(labs, q)
    anthropometric = other_domains.analyze_anthropometric(profile)

    fh = {
        "cv": cv["summary"],
        "profile": {"smokingStatus": q.get("smokingStatus"), "age": profile.get("age"), "sex": profile.get("sex")},
        "metabolic": metabolic["summary"],
        "liver": liver["summary"],
        "renal": renal["summary"],
        "haematology": haematology["summary"],
        "anthro": {"bmiCategory": anthropometric["bmiCategory"], "waistFlag": anthropometric["waistFlag"]},
    }
    return {"profile": profile, "labs": labs, "q": q, "cv": cv, "metabolic": metabolic, "liver": liver,
            "renal": renal, "haematology": haematology, "anthropometric": anthropometric, "fh": fh}


def run_analysis(report_label, profile, labs, questionnaire):
    bundle = assemble_findings(profile, labs, questionnaire)
    safety = safety_engine.evaluate({"cv": bundle["cv"], "metabolic": bundle["metabolic"], "liver": bundle["liver"],
                                      "renal": bundle["renal"], "haematology": bundle["haematology"]})
    recs_raw = recommendation_engine.evaluate(bundle["fh"])
    recs = [recommendation_engine.serializable(r) for r in recs_raw]
    report = report_generator.build(report_label, bundle["cv"],
                                     {"metabolic": bundle["metabolic"], "liver": bundle["liver"],
                                      "renal": bundle["renal"], "haematology": bundle["haematology"]},
                                     safety, recs)
    return {
        "cv": bundle["cv"], "metabolic": bundle["metabolic"], "liver": bundle["liver"], "renal": bundle["renal"],
        "haematology": bundle["haematology"], "anthropometric": bundle["anthropometric"], "fh": bundle["fh"],
        "safety": safety, "recommendations": recs, "report": report,
    }
