
import sys
import pandas as pd
import re
from typing import List, Dict, Tuple

# Attempt to import RapidFuzz; provide user-friendly error if missing
try:
    from rapidfuzz import fuzz
except Exception as e:
    print("Error: rapidfuzz library not found. Install with: pip install rapidfuzz")
    raise

# ----------------------
# Configuration / weights
# ----------------------
CONFIG = {
    "WEIGHT_PER_SKILL": 18,    # points per matched skill (fuzzy)
    "SKILL_FUZZY_THRESH": 70,  # % threshold for considering a skill matched
    "WEIGHT_EDU": 18,
    "WEIGHT_SECTOR": 12,
    "WEIGHT_LOCATION": 12,
    "WEIGHT_FRESHER": 10,
    "WEIGHT_REMOTE": 10,
}

# ----------------------
# Utilities
# ----------------------
def normalize_text(s: str) -> str:
    if s is None:
        return ""
    s = str(s).lower().strip()
    s = re.sub(r"[^a-z0-9,\s]", " ", s)
    s = re.sub(r"\s+", " ", s)
    return s

def split_items(field: str) -> List[str]:
    """Split comma/semicolon/and separated lists into normalized tokens."""
    if not field:
        return []
    field = normalize_text(field)
    parts = [p.strip() for p in re.split(r",|;|/|\\| and ", field) if p.strip()]
    return parts

# ----------------------
# Load dataset
# ----------------------
def load_internships(file_path: str = "internships.csv") -> List[Dict]:
    try:
        df = pd.read_csv(file_path)
    except FileNotFoundError:
        raise FileNotFoundError(f"internships.csv not found at: {file_path}")
    except pd.errors.ParserError as e:
        raise ValueError(f"Could not parse CSV file. Is it valid CSV? Error: {e}")

    expected_cols = ["id", "title", "company", "sector", "required_skills",
                     "location", "academic_background", "description", "is_fresher_friendly"]
    for c in expected_cols:
        if c not in df.columns:
            df[c] = ""

    records = []
    for _, row in df.iterrows():
        rec = {
            "id": row.get("id", ""),
            "title": str(row.get("title", "")).strip(),
            "company": str(row.get("company", "")).strip(),
            "sector": normalize_text(row.get("sector", "")),
            "required_skills": split_items(row.get("required_skills", "")),
            "location": normalize_text(row.get("location", "")),
            "academic_background": normalize_text(row.get("academic_background", "")),
            "description": str(row.get("description", "")).strip(),
            "is_fresher_friendly": str(row.get("is_fresher_friendly", "")).strip()
        }
        records.append(rec)

    return records

# ----------------------
# Fuzzy matching helpers
# ----------------------
def skill_matches(candidate_skills: List[str], job_skills: List[str], threshold: int) -> Tuple[int, List[str]]:
    """Return number of matched skills and list of matched skill names (job skill form).
    Uses rapidfuzz partial_ratio comparing candidate skill -> job skill.
    """
    matched = []
    for js in job_skills:
        best = 0
        best_cs = None
        for cs in candidate_skills:
            try:
                score = fuzz.partial_ratio(cs, js)
            except Exception:
                score = 0
            if score > best:
                best = score
                best_cs = cs
        if best >= threshold:
            matched.append(js)
    return len(matched), matched

def fuzzy_text_match(a: str, b: str, threshold: int = 80) -> bool:
    if not a or not b:
        return False
    score = fuzz.token_sort_ratio(a, b)
    return score >= threshold

# ----------------------
# Scoring logic
# ----------------------
def compute_match(candidate: Dict, job: Dict, config=CONFIG) -> Dict:
    """Compute % match for a job and also return explanation data."""
    raw = 0
    explanations = []

    # Skills (fuzzy)
    cand_skills = [s for s in candidate.get("skills", []) if s]
    job_skills = [s for s in job.get("required_skills", []) if s]
    num_skill_matches, matched_skill_names = skill_matches(cand_skills, job_skills, config["SKILL_FUZZY_THRESH"])
    raw += config["WEIGHT_PER_SKILL"] * num_skill_matches
    if matched_skill_names:
        explanations.append(f"Skills matched: {', '.join(matched_skill_names)}")

    # Education
    if candidate.get("academic_background") and candidate.get("academic_background") in (job.get("academic_background") or ""):
        raw += config["WEIGHT_EDU"]
        explanations.append("Academic background matches")

    # Sector (support multiple preferred sectors)
    cand_sectors = candidate.get("sector_interest", [])
    sector_matched = False
    for cs in cand_sectors:
        if cs and (cs == job.get("sector") or fuzzy_text_match(cs, job.get("sector"))):
            sector_matched = True
            break
    if sector_matched:
        raw += config["WEIGHT_SECTOR"]
        explanations.append("Sector match")

    # Location (support multiple preferred locations)
    cand_locs = candidate.get("location_preference", [])
    loc_matched = False
    if candidate.get("prefers_remote") and (job.get("location") == "remote" or not job.get("location")):
        raw += config["WEIGHT_REMOTE"]
        explanations.append("Remote preference matches")
        loc_matched = True
    else:
        for loc in cand_locs:
            if loc and (loc == job.get("location") or fuzzy_text_match(loc, job.get("location"))):
                loc_matched = True
                break
        if loc_matched:
            raw += config["WEIGHT_LOCATION"]
            explanations.append("Location match")

    # Fresher
    if candidate.get("is_fresher") and str(job.get("is_fresher_friendly", "")).lower() in ["true", "yes", "1"]:
        raw += config["WEIGHT_FRESHER"]
        explanations.append("Fresher friendly")

    # Compute max_possible for normalization
    max_possible = 0
    max_possible += config["WEIGHT_PER_SKILL"] * max(1, len(job_skills))
    max_possible += config["WEIGHT_EDU"]
    max_possible += config["WEIGHT_SECTOR"]
    max_possible += config["WEIGHT_LOCATION"]
    max_possible += config["WEIGHT_FRESHER"]
    max_possible += config["WEIGHT_REMOTE"]

    pct = 0.0
    if max_possible > 0:
        pct = (raw / max_possible) * 100.0
    pct = round(max(0.0, min(100.0, pct)), 1)

    return {"match_pct": pct, "explanations": explanations, "num_skill_matches": num_skill_matches}

# ----------------------
# Filtering + scoring pipeline
# ----------------------
def recommend(candidate: Dict, internships: List[Dict], min_score: float = 0.0, filters: Dict = None) -> List[Dict]:
    filters = filters or {}
    results = []

    for job in internships:
        # Apply simple filters first (to reduce computations)
        if filters.get("fresher_only"):
            if str(job.get("is_fresher_friendly", "")).lower() not in ["true", "yes", "1"]:
                continue
        if filters.get("remote_only"):
            if job.get("location") != "remote":
                continue

        meta = compute_match(candidate, job)
        if meta["match_pct"] >= min_score:
            job_copy = job.copy()
            job_copy.update(meta)
            results.append(job_copy)

    # sort by match_pct desc then by number of skill matches
    results = sorted(results, key=lambda x: (x.get("match_pct", 0), x.get("num_skill_matches", 0)), reverse=True)
    return results

# ----------------------
# Interactive prompt & input handling
# ----------------------
def parse_multi_input(s: str) -> List[str]:
    # Allow user to skip by entering blank
    if not s:
        return []
    return [item.strip().lower() for item in re.split(r",|;|/| and ", s) if item.strip()]

def get_user_input_interactive() -> Tuple[Dict, Dict, float]:
    print("Enter your details. You can skip any question by pressing Enter.\n")
    name = input("Your Name [optional]: ").strip() or "Candidate"
    education = normalize_text(input("Academic Background (e.g., Computer Science, Arts) [optional]: ").strip())
    skills = parse_multi_input(input("Skills (comma-separated, e.g., python, sql, excel) [optional]: ").strip())
    sectors = parse_multi_input(input("Preferred Sectors (comma-separated, e.g., IT, Marketing) [optional]: ").strip())
    locations = parse_multi_input(input("Preferred Locations (comma-separated, e.g., Delhi, Remote) [optional]: ").strip())

    prefers_remote_raw = input("Prefer Remote? (y/n) [n]: ").strip().lower() or "n"
    prefers_remote = prefers_remote_raw in ["y", "yes"]

    is_fresher = (input("Are you a fresher? (y/n) [n]: ").strip().lower() or "n") in ["y", "yes"]

    # Filters
    remote_only = (input("Filter: Remote only internships? (y/n) [n]: ").strip().lower() or "n") in ["y", "yes"]
    fresher_only = (input("Filter: Fresher-only internships? (y/n) [n]: ").strip().lower() or "n") in ["y", "yes"]
    min_score_inp = input("Minimum match percentage to show (0-100) [default 0]: ").strip()
    try:
        min_score = float(min_score_inp) if min_score_inp else 0.0
        min_score = max(0.0, min(100.0, min_score))
    except ValueError:
        print("Invalid minimum score input. Using 0.")
        min_score = 0.0

    candidate = {
        "name": name,
        "academic_background": education,
        "skills": skills,
        "sector_interest": sectors,
        "location_preference": locations,
        "prefers_remote": prefers_remote,
        "is_fresher": is_fresher
    }

    filters = {"remote_only": remote_only, "fresher_only": fresher_only}

    return candidate, filters, min_score

# ----------------------
# Output formatting
# ----------------------
def print_recommendations(name: str, recs: List[Dict], top_k: int = 5):
    if not recs:
        print(f"\nNo internships matched your profile or filters. Suggestions:")
        print(" - Try removing filters (e.g., Remote only / Fresher only).")
        print(" - Broaden your skills input or use general terms (e.g., 'data' instead of 'pandas').")
        print(" - Leave location blank to include remote and on-site options.")
        return

    print(f"\n=== Recommendations for: {name} ===\n")
    for i, r in enumerate(recs[:top_k], 1):
        title = r.get("title", "Unknown")
        company = r.get("company", "N/A")
        sector = (r.get("sector") or "").title()
        location = (r.get("location") or "").title()
        skills = ", ".join(r.get("required_skills", []))
        desc = r.get("description", "N/A")
        fresher = 'Yes' if str(r.get("is_fresher_friendly")).lower() in ['true','yes','1'] else 'No'
        score = r.get("match_pct", 0)
        explains = r.get("explanations", [])

        print(f"{i}. {title} at {company}")
        print(f"   Sector: {sector}")
        print(f"   Location: {location}")
        print(f"   Required Skills: {skills}")
        print(f"   Description: {desc}")
        print(f"   Fresher Friendly: {fresher}")
        print(f"   Match Score: {score}/100")
        if explains:
            print(f"   Why: { '; '.join(explains) }")
        print("-" * 50)

# ----------------------
# Main
# ----------------------
if __name__ == "__main__":
    try:
        internships = load_internships("internships.csv")
    except FileNotFoundError as e:
        print(str(e))
        sys.exit(1)
    except ValueError as e:
        print(str(e))
        sys.exit(1)
    except Exception as e:
        print("Unexpected error while loading internships:", e)
        sys.exit(1)

    try:
        candidate, filters, min_score = get_user_input_interactive()
        recs = recommend(candidate, internships, min_score=min_score, filters=filters)
        if not recs:
            # friendly guidance
            print_recommendations(candidate.get("name", "Candidate"), recs, top_k=5)
            sys.exit(0)

        print_recommendations(candidate.get("name", "Candidate"), recs, top_k=5)

    except KeyboardInterrupt:
        print("\nInterrupted by user. Exiting.")
        sys.exit(0)
    except Exception as e:
        print("An unexpected error occurred:", e)
        sys.exit(1)
