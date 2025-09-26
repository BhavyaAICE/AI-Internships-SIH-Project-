from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any
import os
import logging
from contextlib import asynccontextmanager
import httpx

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Lifespan context
@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("🚀 Starting PM Internship Recommendation API with ElevenLabs TTS")
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVEN_VOICE_ID")
    if api_key and voice_id:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": api_key})
                if r.status_code == 200:
                    logger.info("✅ ElevenLabs API connection successful")
                else:
                    logger.warning(f"⚠️ ElevenLabs API test failed: {r.status_code}")
        except Exception as e:
            logger.warning(f"⚠️ ElevenLabs connection test failed: {str(e)}")
    else:
        logger.warning("⚠️ ElevenLabs credentials not configured")
    yield
    logger.info("🛑 Shutting down PM Internship API")

app = FastAPI(
    title="PM Internship Recommendation API with ElevenLabs TTS",
    description="Enhanced API with voice assistant capabilities",
    version="2.0.0",
    lifespan=lifespan
)

# CORS
origins = [
    "https://ai-internships-sih-project-nib5.vercel.app",
    "https://ai-internships-sih-project-nib5-qkstzkxak.vercel.app",
    "http://localhost:3000",
    "http://localhost:8000",
    "http://127.0.0.1:8000"
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://ai-internships-sih-project-nib5-.*\.vercel\.app",
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import your recommendation functions
from .phase1_rule_based import load_internships, recommend

# Mount static files
try:
    app.mount("/static", StaticFiles(directory="public"), name="static")
except Exception as e:
    logger.warning(f"Could not mount static files: {e}")

# Load internships data
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
csv_path = os.path.join(BASE_DIR, 'internships.csv')

try:
    INTERNSHIPS = load_internships(csv_path)
    logger.info(f"✅ Loaded {len(INTERNSHIPS)} internships from CSV")
except Exception as e:
    logger.error(f"❌ Failed to load internships: {e}")
    INTERNSHIPS = []

# ElevenLabs credentials
ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVEN_VOICE_ID = os.getenv("ELEVEN_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")  # default Rachel

# Models
class Candidate(BaseModel):
    name: str = "Candidate"
    academic_background: str = ""
    skills: List[str] = []
    sector_interest: List[str] = []
    location_preference: List[str] = []
    prefers_remote: bool = False
    is_fresher: bool = False

class SpeakRequest(BaseModel):
    text: str

class HealthResponse(BaseModel):
    status: str
    elevenlabs_configured: bool
    voice_id_configured: bool
    elevenlabs_connection: bool
    cors_enabled: bool
    allowed_origins: List[str]
    internships_loaded: int

# Endpoints
@app.get("/")
def read_root():
    return {
        "message": "PM Internship API with ElevenLabs TTS is running! 🚀",
        "version": "2.0.0",
        "endpoints": {
            "health": "/api/health",
            "recommend": "/api/recommend",
            "speak": "/api/speak"
        }
    }

@app.get("/api/health", response_model=HealthResponse)
def health_check():
    api_key_configured = bool(ELEVEN_API_KEY)
    voice_id_configured = bool(ELEVEN_VOICE_ID)
    connection_status = False
    if api_key_configured and voice_id_configured:
        try:
            r = httpx.get("https://api.elevenlabs.io/v1/voices", headers={"xi-api-key": ELEVEN_API_KEY}, timeout=5)
            connection_status = r.status_code == 200
        except:
            connection_status = False
    return HealthResponse(
        status="healthy",
        elevenlabs_configured=api_key_configured,
        voice_id_configured=voice_id_configured,
        elevenlabs_connection=connection_status,
        cors_enabled=True,
        allowed_origins=origins,
        internships_loaded=len(INTERNSHIPS)
    )

@app.post("/api/recommend")
def recommend_endpoint(candidate: Candidate, min_score: float = 0.0, remote_only: bool = False, fresher_only: bool = False):
    try:
        logger.info(f"📊 Recommendation request for: {candidate.name}")
        filters = {
            "remote_only": remote_only,
            "fresher_only": fresher_only
        }
        results = recommend(
            candidate.model_dump(),
            INTERNSHIPS,
            min_score=min_score,
            filters=filters
        )
        return JSONResponse({
            "count": len(results),
            "recommendations": results[:10],
            "candidate_profile": candidate.model_dump(),
            "filters_applied": filters
        })
    except Exception as e:
        logger.error(f"❌ Recommendation error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Recommendation system error: {str(e)}")

@app.post("/api/speak")
async def speak_text(request: SpeakRequest):
    text = request.text.strip()

    if not text:
        raise HTTPException(status_code=400, detail="Text is required and cannot be empty")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
    if not ELEVEN_API_KEY or not ELEVEN_VOICE_ID:
        raise HTTPException(status_code=500, detail="ElevenLabs credentials not configured")

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}"
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_API_KEY
    }
    data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.8,
            "style": 0.0,
            "use_speaker_boost": True
        }
    }

    response = None  # ← Fix added here

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(url, json=data, headers=headers)

        if response.status_code != 200:
            logger.error(f"❌ ElevenLabs API error {response.status_code}: {response.text[:200]}")
            raise HTTPException(status_code=502, detail=f"ElevenLabs API error {response.status_code}")

        audio_content = response.content
        if not audio_content:
            raise HTTPException(status_code=502, detail="Empty audio response from ElevenLabs")

        return Response(
            content=audio_content,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Length": str(len(audio_content)),
                "Accept-Ranges": "bytes"
            }
        )

    except httpx.RequestError as e:
        logger.error(f"❌ ElevenLabs request error: {str(e)}")
        raise HTTPException(status_code=502, detail="Cannot connect to ElevenLabs TTS service")

    except HTTPException:
        raise

    except Exception as e:
        # This is where the bug was — accessing 'response' without checking if it exists
        logger.error(f"❌ Unexpected ElevenLabs error: {str(e)}")
        if response is not None:
            logger.error(f"Last response status: {response.status_code}, text: {response.text[:200]}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech error: {str(e)}")


# Voice input processing
@app.post("/api/process-voice-input")
def process_voice_input(audio_data: Dict[str, Any]):
    try:
        text = audio_data.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text provided in audio data")
        candidate_profile = parse_voice_to_profile(text)
        recommendations = recommend(candidate_profile, INTERNSHIPS, min_score=20.0)
        return JSONResponse({
            "candidate_profile": candidate_profile,
            "recommendations": recommendations[:5],
            "success": True,
            "message": "Voice input processed successfully"
        })
    except Exception as e:
        logger.error(f"❌ Voice processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice processing error: {str(e)}")

def parse_voice_to_profile(text: str) -> Dict:
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
    skills_keywords = ["python","java","javascript","react","node","nodejs","html","css","data","analytics","sql","excel","powerbi","tableau","marketing","digital marketing","content","writing","seo","design","graphic design","photoshop","illustrator","research","analysis","statistics","machine learning","ai","finance","accounting","economics"]
    profile["skills"] = [s for s in skills_keywords if s in text_lower][:5]

    sectors = {
        "it": ["software","development","coding","programming","tech"],
        "marketing": ["marketing","content","social media","advertising"],
        "analytics": ["data","analytics","statistics","analysis"],
        "finance": ["finance","accounting","economics","banking"],
        "design": ["design","creative","graphics","ui","ux"],
        "research": ["research","academic","study","investigation"]
    }
    for sector, keywords in sectors.items():
        if any(word in text_lower for word in keywords):
            profile["sector_interest"].append(sector)

    locations = ["delhi","mumbai","bangalore","chennai","hyderabad","pune","kolkata","ahmedabad","remote"]
    profile["location_preference"] = [loc for loc in locations if loc in text_lower][:3]
    if "remote" in text_lower:
        profile["prefers_remote"] = True
    if any(word in text_lower for word in ["experienced","experience","worked","professional"]):
        profile["is_fresher"] = False

    education_keywords = {
        "engineering": ["engineering","engineer","btech","beng","mtech"],
        "commerce": ["commerce","bcom","mcom","accounting","finance"],
        "science": ["science","bsc","msc","physics","chemistry","biology"],
        "arts": ["arts","ba","ma","humanities","literature"],
        "management": ["mba","management","business","administration"],
        "computer science": ["computer science","cs","it","information technology"]
    }
    for edu_type, keywords in education_keywords.items():
        if any(k in text_lower for k in keywords):
            profile["academic_background"] = edu_type
            break
    return profile

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    logger.error(f"❌ Global exception: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected error occurred", "type": "internal_server_error"}
    )

@app.get("/dashboard")
def serve_dashboard():
    try:
        return FileResponse("public/dashboard.html")
    except:
        return {"message": "Dashboard not available in static files"}

# Export for Vercel
app_handler = app
