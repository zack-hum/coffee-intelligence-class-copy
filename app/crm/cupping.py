"""Cupping forms and score math for Field mode (#10).

Three layouts, one record shape. The server always recomputes the total, so a score
can't drift from its inputs; app/field/static/field.js mirrors these formulas for the
live total on the phone.

* ``cva``     SCA Coffee Value Assessment (2024), affective section: eight attributes on a
              1-9 hedonic scale. Score = 0.65625 x sum + 52.75 - 2 x non-uniform cups
              - 4 x defective cups (SCA Standard 103-P). Range 58-100.
* ``classic`` SCA cupping form (2004): seven quality attributes 6.00-10.00 in 0.25 steps,
              plus uniformity / clean cup / sweetness worth 2 points per good cup (5 cups),
              minus defects (taint 2 x cups, fault 4 x cups). Range 0-100.
* ``quick``   Field shorthand: type the overall score you'd give (0-100) and descriptors.

Our layouts are simplified re-implementations for field use, not copies of SCA's forms;
see https://sca.coffee/value-assessment for the standard itself.
"""

from __future__ import annotations

CUPS = 5

FORMS: dict[str, dict] = {
    "cva": {
        "label": "SCA CVA (2024) · affective 1–9",
        "attrs": [("fragrance", "Fragrance"), ("aroma", "Aroma"), ("flavor", "Flavor"),
                  ("aftertaste", "Aftertaste"), ("acidity", "Acidity"), ("sweetness", "Sweetness"),
                  ("mouthfeel", "Mouthfeel"), ("overall", "Overall")],
        "min": 1, "max": 9, "step": 1, "default": 5,
        "counts": [("nonuniform", "Non-uniform cups"), ("defective", "Defective cups")],
    },
    "classic": {
        "label": "SCA classic (2004) · 6–10",
        "attrs": [("fragrance_aroma", "Fragrance / aroma"), ("flavor", "Flavor"), ("aftertaste", "Aftertaste"),
                  ("acidity", "Acidity"), ("body", "Body"), ("balance", "Balance"), ("overall", "Overall")],
        "min": 6, "max": 10, "step": 0.25, "default": 7.5,
        "cup_attrs": [("uniformity", "Uniform cups"), ("clean_cup", "Clean cups"), ("sweet_cups", "Sweet cups")],
        "counts": [("taint_cups", "Cups with a taint (−2 each)"), ("fault_cups", "Cups with a fault (−4 each)")],
    },
    "quick": {
        "label": "Quick field score · 0–100",
        "attrs": [], "min": 0, "max": 100, "step": 0.25, "default": None, "counts": [],
    },
}
DEFAULT_FORM = "cva"


class ScoreError(ValueError):
    pass


def _num(scores: dict, key: str, lo: float, hi: float, label: str, default=None) -> float:
    v = scores.get(key, default)
    if v is None or v == "":
        raise ScoreError(f"{label}: missing")
    try:
        v = float(v)
    except (TypeError, ValueError):
        raise ScoreError(f"{label}: not a number") from None
    if not lo <= v <= hi:
        raise ScoreError(f"{label}: must be between {lo:g} and {hi:g}")
    return v


def score(form: str, scores: dict | None, total: float | None = None) -> float | None:
    """Return the final score for `form`, validating every input.

    For ``quick`` the score is the typed total (None if left blank)."""
    if form not in FORMS:
        raise ScoreError(f"unknown cupping form {form!r}; use one of {list(FORMS)}")
    f, s = FORMS[form], scores or {}
    if form == "quick":
        if total is None or total == "":
            return None
        return round(_num({"t": total}, "t", 0, 100, "Score"), 2)
    attrs = sum(_num(s, k, f["min"], f["max"], lbl) for k, lbl in f["attrs"])
    if form == "cva":
        nu = _num(s, "nonuniform", 0, CUPS, "Non-uniform cups", 0)
        de = _num(s, "defective", 0, CUPS, "Defective cups", 0)
        return round(0.65625 * attrs + 52.75 - 2 * nu - 4 * de, 2)
    cups = sum(2 * _num(s, k, 0, CUPS, lbl, CUPS) for k, lbl in f["cup_attrs"])
    taint = _num(s, "taint_cups", 0, CUPS, "Taint cups", 0)
    fault = _num(s, "fault_cups", 0, CUPS, "Fault cups", 0)
    return round(attrs + cups - 2 * taint - 4 * fault, 2)


def meta() -> dict:
    """Form definitions for the frontend (rendered as sliders/steppers)."""
    def pairs(xs):
        return [{"key": k, "label": lbl} for k, lbl in xs]
    return {k: {"label": f["label"], "attrs": pairs(f["attrs"]), "min": f["min"], "max": f["max"],
                "step": f["step"], "default": f["default"], "cups": CUPS,
                "cup_attrs": pairs(f.get("cup_attrs", [])), "counts": pairs(f["counts"])}
            for k, f in FORMS.items()}
