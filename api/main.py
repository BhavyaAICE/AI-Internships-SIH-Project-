from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import requests


app = FastAPI(title="PM Internship Recommendation API")
from dotenv import load_dotenv
load_dotenv()


# Improved CORS configuration

origins = [
    "https://ai-internships-sih-project-nib5.vercel.app"
    # Add more allowed origins if needed
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://ai-internships-sih-project-nib5-.*\.vercel\.app", # Matches any deployment
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from .phase1_rule_based import load_internships, recommend

app.mount("/static", StaticFiles(directory="public"), name="static")

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, 'internships.csv')

# Read ElevenLabs credentials
ELEVEN_API_KEY = os.environ.get("ELEVENLABS_API_KEY")
ELEVEN_VOICE_ID = os.environ.get("ELEVEN_VOICE_ID", "alloy")



INTERNSHIPS = load_internships(csv_path)
class Candidate(BaseModel):
    name: str = "Candidate"
    academic_background: str = ""
    skills: List[str] = []
    sector_interest: List[str] = []
    location_preference: List[str] = []
    prefers_remote: bool = False
    is_fresher: bool = False

@app.post("/api/recommend")
def recommend_endpoint(candidate: Candidate, min_score: float = 0.0, remote_only: bool = False, fresher_only: bool = False):
    filters = {"remote_only": remote_only, "fresher_only": fresher_only}
    results = recommend(candidate.model_dump(), INTERNSHIPS, min_score=min_score, filters=filters)
    return JSONResponse({"count": len(results), "recommendations": results[:10]})

# Pydantic model for speak request
class SpeakRequest(BaseModel):
    text: str

@app.post("/api/speak")
async def speak_text(request: SpeakRequest):
    try:
        text = request.text
        
        if not text:
            raise HTTPException(status_code=400, detail="Text is required")
            
        # Get API credentials from environment
        api_key = os.getenv("ELEVENLABS_API_KEY")
        voice_id = os.getenv("ELEVEN_VOICE_ID")
        
        if not api_key or not voice_id:
            raise HTTPException(status_code=500, detail="ElevenLabs credentials not configured")
        
        print(f"🗣️ Speaking: {text[:50]}...")
        
        # ElevenLabs API call
        url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
        
        headers = {
            "Accept": "audio/mpeg",
            "Content-Type": "application/json",
            "xi-api-key": api_key
        }
        
        data = {
            "text": text,
            "model_id": "eleven_multilingual_v2",  
            "voice_settings": {
                "stability": 0.5,
                "similarity_boost": 0.8,
                "style": 0.2,
                "use_speaker_boost": True
            }
        }
        
        response = requests.post(url, json=data, headers=headers, timeout=30)

        response.raise_for_status()

        print("✅ ElevenLabs TTS successful")
        return Response(
            content=response.content,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "attachment; filename=speech.mp3",
                "Cache-Control": "no-cache"
            }
        )
    except requests.exceptions.Timeout:
        print("❌ ElevenLabs API timeout")
        raise HTTPException(status_code=504, detail="Text-to-speech service timeout")

    except requests.exceptions.HTTPError as e:
        # This catches errors returned by the ElevenLabs API (like 401, 422, etc.)
        print(f"❌ ElevenLabs API HTTP error: {e.response.status_code}")
        print(f"Response: {e.response.text}")
        raise HTTPException(status_code=502, detail=f"ElevenLabs API Error: {e.response.text}")

    except requests.exceptions.RequestException as e:
        # This catches fundamental network errors (DNS failure, connection refused, etc.)
        # In this case, the `response` object does not exist.
        print(f"❌ ElevenLabs network request failed: {e}")
        raise HTTPException(status_code=502, detail="Text-to-speech service unavailable")

    except Exception as e:
        # Catch any other unexpected errors
        print(f"❌ An unexpected error occurred in TTS: {e}")
        raise HTTPException(status_code=500, detail=f"An unexpected text-to-speech error occurred.")

@app.get("/")
def read_root():
    return {"message": "PM Internship API with ElevenLabs TTS is running!"}
def serve_frontend():
    return FileResponse("public/index.html")


@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "elevenlabs_configured": bool(os.getenv("ELEVENLABS_API_KEY")),
        "voice_id_configured": bool(os.getenv("ELEVEN_VOICE_ID")),
        "cors_enabled": True,
        "allowed_origins": origins
    }



@app.post("/api/process-voice-input")
def process_voice_input(audio_data: Dict[str, Any]):
    """Process voice input and return candidate profile"""
    try:
        text = audio_data.get("text", "")
        
        # Parse the voice input to create candidate profile
        candidate_profile = parse_voice_to_profile(text)
        
        # Get recommendations using your rule model
        recommendations = recommend(candidate_profile, INTERNSHIPS, min_score=20.0)
        
        return JSONResponse({
            "candidate_profile": candidate_profile,
            "recommendations": recommendations[:5],  
            "success": True
        })
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

def parse_voice_to_profile(text: str) -> Dict:
    """Parse voice input to extract candidate information"""
    # Simple keyword extraction - you can enhance this
    profile = {
        "name": "User",
        "academic_background": "",
        "skills": [],
        "sector_interest": [],
        "location_preference": [],
        "prefers_remote": False,
        "is_fresher": True
    }
    
    text_lower = text.lower()
    
    # Extract skills
    skills_keywords = ["python", "java", "javascript", "react", "node", "data", "analytics", 
                      "marketing", "design", "content", "writing", "excel", "sql"]
    profile["skills"] = [skill for skill in skills_keywords if skill in text_lower]
    
    # Extract sectors
    if any(word in text_lower for word in ["software", "development", "coding", "programming"]):
        profile["sector_interest"].append("it")
    if any(word in text_lower for word in ["marketing", "content", "social media"]):
        profile["sector_interest"].append("marketing")
    if any(word in text_lower for word in ["data", "analytics", "statistics"]):
        profile["sector_interest"].append("analytics")
    
    # Extract location preferences
    if "remote" in text_lower:
        profile["prefers_remote"] = True
    if "delhi" in text_lower:
        profile["location_preference"].append("delhi")
    if "mumbai" in text_lower:
        profile["location_preference"].append("mumbai")
    
    return profile

