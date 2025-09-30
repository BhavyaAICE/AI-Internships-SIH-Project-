# Fixed main.py - Complete Version with All Fixes
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, JSONResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import os
import logging
import asyncio
from contextlib import asynccontextmanager
import httpx
import uvicorn

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Load environment variables
from dotenv import load_dotenv
load_dotenv()

# Global HTTP client for reuse
http_client = None

# Lifespan context - FIXED VERSION
@asynccontextmanager
async def lifespan(app: FastAPI):
    global http_client
    
    logger.info("🚀 Starting PM Internship Recommendation API with ElevenLabs TTS")
    
    # Initialize HTTP client
    http_client = httpx.AsyncClient(
        timeout=httpx.Timeout(connect=10.0, read=30.0, write=10.0, pool=10.0),
        limits=httpx.Limits(max_connections=10, max_keepalive_connections=5)
    )
    
    # Test ElevenLabs API connection
    api_key = os.getenv("ELEVENLABS_API_KEY")
    voice_id = os.getenv("ELEVEN_VOICE_ID")
    
    if api_key and voice_id:
        try:
            logger.info("🔍 Testing ElevenLabs API connection...")
            response = await http_client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": api_key}
            )
            if response.status_code == 200:
                voices = response.json()
                voice_found = any(v.get("voice_id") == voice_id for v in voices.get("voices", []))
                
                if voice_found:
                    logger.info("✅ ElevenLabs API connection successful - Voice ID verified")
                else:
                    logger.warning(f"⚠️ Voice ID {voice_id} not found in your ElevenLabs account")
                    available_voices = [v.get("name", "Unknown") for v in voices.get("voices", [])]
                    logger.info(f"Available voices: {', '.join(available_voices[:5])}")
            else:
                logger.warning(f"⚠️ ElevenLabs API test failed: {response.status_code}")
                
        except Exception as e:
            logger.warning(f"⚠️ ElevenLabs connection test failed: {str(e)}")
    else:
        logger.warning("⚠️ ElevenLabs credentials not configured")
        logger.info("Set ELEVENLABS_API_KEY and ELEVEN_VOICE_ID environment variables")
    
    yield
    
    # Cleanup
    if http_client:
        await http_client.aclose()
    logger.info("🛑 Shutting down PM Internship API")

app = FastAPI(
    title="PM Internship Recommendation API with ElevenLabs TTS",
    description="Enhanced API with voice assistant capabilities",
    version="2.0.0",
    lifespan=lifespan
)

# CORS Configuration - IMPROVED
origins = [
    "http://localhost:3000",
    "http://localhost:8000", 
    "http://127.0.0.1:8000",
    "https://*.vercel.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_origins=origins + ["*"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Import recommendation functions
try:
    from phase1_rule_based import load_internships, recommend
    logger.info("✅ Successfully imported recommendation functions")
except ImportError as e:
    logger.error(f"❌ Failed to import recommendation functions: {e}")
    # Create dummy functions for testing
    def load_internships(csv_path):
        return []
    def recommend(candidate, internships, min_score=0.0, filters=None):
        return []

# Directories
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Mount static files - IMPROVED ERROR HANDLING
try:
    static_dir = os.path.abspath(os.path.join(BASE_DIR, "..", "public"))
    if os.path.isdir(static_dir):
        app.mount("/static", StaticFiles(directory=static_dir), name="static")
        logger.info(f"✅ Mounted static files from: {static_dir}")
    else:
        logger.warning(f"⚠️ Static directory not found: {static_dir}")
except Exception as e:
    logger.warning(f"Could not mount static files: {e}")

# Load internships data
csv_path = os.path.join(BASE_DIR, 'internships.csv')
try:
    INTERNSHIPS = load_internships(csv_path)
    logger.info(f"✅ Loaded {len(INTERNSHIPS)} internships from CSV")
except Exception as e:
    logger.error(f"❌ Failed to load internships: {e}")
    INTERNSHIPS = []

# ElevenLabs credentials - IMPROVED
ELEVEN_API_KEY = os.getenv("ELEVENLABS_API_KEY")
ELEVEN_VOICE_ID = os.getenv("ELEVEN_VOICE_ID", "TgnhEILA8UwUqIMi20rp")  # Your voice ID as default

# Pydantic Models - ENHANCED
class Candidate(BaseModel):
    name: str = "Candidate"
    academic_background: str = ""
    skills: List[str] = []
    sector_interest: List[str] = []
    location_preference: List[str] = []
    prefers_remote: bool = False
    is_fresher: bool = True

class SpeakRequest(BaseModel):
    text: str
    voice_settings: Optional[Dict] = None

class HealthResponse(BaseModel):
    status: str
    elevenlabs_configured: bool
    voice_id_configured: bool
    elevenlabs_connection: bool
    cors_enabled: bool
    allowed_origins: List[str]
    internships_loaded: int
    voice_id: Optional[str] = None

# Root endpoint
@app.get("/")
def read_root():
    return {
        "message": "PM Internship API with ElevenLabs TTS is running! 🚀",
        "version": "2.0.0",
        "status": "healthy",
        "endpoints": {
            "health": "/api/health",
            "recommend": "/api/recommend", 
            "speak": "/api/speak",
            "dashboard": "/dashboard",
            "docs": "/docs"
        }
    }

# Serve dashboard
@app.get("/dashboard")
def serve_dashboard():
    try:
        dashboard_path = os.path.join(BASE_DIR, "..", "public", "dashboard.html")
        if os.path.exists(dashboard_path):
            return FileResponse(dashboard_path)
        else:
            return JSONResponse(
                {"message": "Dashboard not available", "path_checked": dashboard_path},
                status_code=404
            )
    except Exception as e:
        logger.error(f"Dashboard error: {e}")
        return JSONResponse(
            {"message": "Dashboard error", "error": str(e)},
            status_code=500
        )

# Health check endpoint - COMPREHENSIVE
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    api_key_configured = bool(ELEVEN_API_KEY)
    voice_id_configured = bool(ELEVEN_VOICE_ID)
    connection_status = False
    
    # Test ElevenLabs connection
    if api_key_configured and voice_id_configured and http_client:
        try:
            response = await http_client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": ELEVEN_API_KEY},
                timeout=5.0
            )
            connection_status = response.status_code == 200
            
            if connection_status:
                voices_data = response.json()
                voices = voices_data.get("voices", [])
                voice_exists = any(v.get("voice_id") == ELEVEN_VOICE_ID for v in voices)
                if not voice_exists:
                    logger.warning(f"Voice ID {ELEVEN_VOICE_ID} not found")
                    
        except Exception as e:
            logger.error(f"Health check ElevenLabs test failed: {e}")
            connection_status = False

    return HealthResponse(
        status="healthy",
        elevenlabs_configured=api_key_configured,
        voice_id_configured=voice_id_configured,
        elevenlabs_connection=connection_status,
        cors_enabled=True,
        allowed_origins=origins,
        internships_loaded=len(INTERNSHIPS),
        voice_id=ELEVEN_VOICE_ID if voice_id_configured else None
    )

# Options handler for CORS preflight
@app.options("/api/{full_path:path}")
async def options_handler():
    return JSONResponse({"message": "CORS preflight success"}, status_code=200)

# Recommendation endpoint - ENHANCED ERROR HANDLING
@app.post("/api/recommend")
async def recommend_endpoint(
    candidate: Candidate, 
    min_score: float = 0.0, 
    remote_only: bool = False, 
    fresher_only: bool = False
):
    try:
        logger.info(f"📊 Recommendation request for: {candidate.name}")
        
        if not INTERNSHIPS:
            logger.warning("No internships data available")
            return JSONResponse({
                "count": 0,
                "recommendations": [],
                "candidate_profile": candidate.model_dump(),
                "message": "No internships data available",
                "filters_applied": {"remote_only": remote_only, "fresher_only": fresher_only}
            })
        
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
        
        # Ensure results are properly formatted
        formatted_results = []
        for result in results[:10]:  # Limit to top 10
            if isinstance(result, dict):
                formatted_results.append(result)
            else:
                # Handle different result formats
                formatted_results.append({
                    "title": getattr(result, 'title', 'Unknown Position'),
                    "company": getattr(result, 'company', 'Unknown Company'),
                    "match_pct": getattr(result, 'match_pct', 75)
                })
        
        return JSONResponse({
            "count": len(formatted_results),
            "recommendations": formatted_results,
            "candidate_profile": candidate.model_dump(),
            "filters_applied": filters,
            "message": f"Found {len(formatted_results)} matching opportunities"
        })
        
    except Exception as e:
        logger.error(f"❌ Recommendation error: {str(e)}")
        raise HTTPException(
            status_code=500, 
            detail=f"Recommendation system error: {str(e)}"
        )

# ElevenLabs TTS endpoint - COMPLETELY REWRITTEN FOR RELIABILITY
@app.post("/api/speak")
async def speak_text(request: SpeakRequest):
    text = request.text.strip()
    
    # Input validation
    if not text:
        raise HTTPException(status_code=400, detail="Text is required and cannot be empty")
    if len(text) > 5000:
        raise HTTPException(status_code=400, detail="Text too long (max 5000 characters)")
    
    # Check credentials
    if not ELEVEN_API_KEY:
        raise HTTPException(
            status_code=500, 
            detail="ElevenLabs API key not configured. Please set ELEVENLABS_API_KEY environment variable."
        )
    if not ELEVEN_VOICE_ID:
        raise HTTPException(
            status_code=500, 
            detail="ElevenLabs Voice ID not configured. Please set ELEVEN_VOICE_ID environment variable."
        )
    
    # Default voice settings
    default_voice_settings = {
        "stability": 0.5,
        "similarity_boost": 0.8,
        "style": 0.0,
        "use_speaker_boost": True
    }
    
    # Merge custom voice settings if provided
    voice_settings = {**default_voice_settings, **(request.voice_settings or {})}
    
    # TTS API request data
    tts_data = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": voice_settings
    }
    
    headers = {
        "Accept": "audio/mpeg",
        "Content-Type": "application/json",
        "xi-api-key": ELEVEN_API_KEY
    }
    
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{ELEVEN_VOICE_ID}"
    
    try:
        logger.info(f"🗣️ Generating TTS for: '{text[:50]}...'")
        
        if not http_client:
            raise HTTPException(status_code=500, detail="HTTP client not initialized")
        
        # Make TTS request
        response = await http_client.post(
            url=url,
            json=tts_data,
            headers=headers,
            timeout=30.0
        )
        
        logger.info(f"📡 ElevenLabs response: {response.status_code}")
        
        # Handle different error codes
        if response.status_code == 401:
            raise HTTPException(
                status_code=401,
                detail="ElevenLabs authentication failed. Check your API key."
            )
        elif response.status_code == 422:
            error_detail = "Invalid voice ID or request parameters"
            try:
                error_json = response.json()
                if "detail" in error_json:
                    error_detail = str(error_json["detail"])
            except:
                pass
            raise HTTPException(status_code=422, detail=error_detail)
        elif response.status_code == 429:
            raise HTTPException(
                status_code=429,
                detail="ElevenLabs rate limit exceeded. Please try again later."
            )
        elif response.status_code != 200:
            logger.error(f"ElevenLabs API error: {response.status_code} - {response.text}")
            raise HTTPException(
                status_code=502,
                detail=f"ElevenLabs API error: {response.status_code}"
            )
        
        # Get audio content
        audio_content = response.content
        
        if not audio_content:
            raise HTTPException(status_code=502, detail="Empty audio response from ElevenLabs")
        
        if len(audio_content) < 1000:
            logger.warning(f"⚠️ Small audio response: {len(audio_content)} bytes")
        
        logger.info(f"✅ Generated audio: {len(audio_content)} bytes")
        
        # Return audio response
        return Response(
            content=audio_content,
            media_type="audio/mpeg",
            headers={
                "Cache-Control": "public, max-age=3600",
                "Content-Length": str(len(audio_content)),
                "Content-Disposition": "inline; filename=\"speech.mp3\"",
                "Accept-Ranges": "bytes"
            }
        )
        
    except HTTPException:
        raise
    except httpx.TimeoutException:
        logger.error("❌ ElevenLabs request timeout")
        raise HTTPException(status_code=504, detail="ElevenLabs request timed out")
    except httpx.RequestError as e:
        logger.error(f"❌ ElevenLabs request error: {str(e)}")
        raise HTTPException(status_code=502, detail="Cannot connect to ElevenLabs TTS service")
    except Exception as e:
        logger.error(f"❌ Unexpected ElevenLabs error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Text-to-speech error: {str(e)}")

# Voice input processing endpoint - IMPROVED
@app.post("/api/process-voice-input")
async def process_voice_input(audio_data: Dict[str, Any]):
    try:
        text = audio_data.get("text", "")
        if not text:
            raise HTTPException(status_code=400, detail="No text provided in audio data")
        
        candidate_profile = parse_voice_to_profile(text)
        recommendations = recommend(
            candidate_profile, 
            INTERNSHIPS, 
            min_score=20.0
        ) if INTERNSHIPS else []
        
        return JSONResponse({
            "candidate_profile": candidate_profile,
            "recommendations": recommendations[:5],
            "success": True,
            "message": "Voice input processed successfully"
        })
        
    except Exception as e:
        logger.error(f"❌ Voice processing error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Voice processing error: {str(e)}")

# Voice to profile parser - ENHANCED
def parse_voice_to_profile(text: str) -> Dict:
    """Parse voice input text to create candidate profile"""
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
    
    # Skills extraction
    skills_keywords = [
        "python", "java", "javascript", "react", "node", "nodejs", "html", "css",
        "data", "analytics", "sql", "excel", "powerbi", "tableau", "marketing",
        "digital marketing", "content", "writing", "seo", "design", "graphic design",
        "photoshop", "illustrator", "research", "analysis", "statistics",
        "machine learning", "ai", "finance", "accounting", "economics", "aws", "azure"
    ]
    profile["skills"] = [s for s in skills_keywords if s in text_lower][:5]
    
    # Sector interest mapping
    sectors = {
        "it": ["software", "development", "coding", "programming", "tech", "computer"],
        "marketing": ["marketing", "content", "social media", "advertising", "branding"],
        "analytics": ["data", "analytics", "statistics", "analysis", "bi"],
        "finance": ["finance", "accounting", "economics", "banking", "investment"],
        "design": ["design", "creative", "graphics", "ui", "ux", "visual"],
        "research": ["research", "academic", "study", "investigation", "science"]
    }
    
    for sector, keywords in sectors.items():
        if any(word in text_lower for word in keywords):
            profile["sector_interest"].append(sector)
    
    # Location preference
    locations = ["delhi", "mumbai", "bangalore", "chennai", "hyderabad", "pune", 
                "kolkata", "ahmedabad", "remote", "work from home", "wfh"]
    profile["location_preference"] = [loc for loc in locations if loc in text_lower][:3]
    
    if any(remote in text_lower for remote in ["remote", "work from home", "wfh"]):
        profile["prefers_remote"] = True
    
    # Experience level
    experience_indicators = ["experienced", "experience", "worked", "professional", "job"]
    if any(word in text_lower for word in experience_indicators):
        profile["is_fresher"] = False
    
    # Education background
    education_keywords = {
        "engineering": ["engineering", "engineer", "btech", "b.tech", "mtech"],
        "commerce": ["commerce", "bcom", "b.com", "mcom", "accounting", "finance"],
        "science": ["science", "bsc", "b.sc", "msc", "physics", "chemistry", "biology"],
        "arts": ["arts", "ba", "b.a", "ma", "humanities", "literature"],
        "management": ["mba", "management", "business", "administration"],
        "computer science": ["computer science", "cs", "it", "information technology"]
    }
    
    for edu_type, keywords in education_keywords.items():
        if any(k in text_lower for k in keywords):
            profile["academic_background"] = edu_type
            break
    
    return profile

# Global exception handler - IMPROVED
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"❌ Global exception on {request.url}: {str(exc)}")
    return JSONResponse(
        status_code=500,
        content={
            "detail": "An unexpected error occurred",
            "type": "internal_server_error",
            "path": str(request.url.path)
        }
    )

# Test endpoint for ElevenLabs
@app.get("/api/test-elevenlabs")
async def test_elevenlabs():
    """Test endpoint for ElevenLabs integration"""
    if not ELEVEN_API_KEY:
        return {"status": "error", "message": "API key not configured"}
    
    try:
        if http_client:
            response = await http_client.get(
                "https://api.elevenlabs.io/v1/voices",
                headers={"xi-api-key": ELEVEN_API_KEY},
                timeout=10.0
            )
            
            if response.status_code == 200:
                voices_data = response.json()
                voices = voices_data.get("voices", [])
                
                return {
                    "status": "success",
                    "voice_count": len(voices),
                    "configured_voice_id": ELEVEN_VOICE_ID,
                    "voice_id_exists": any(v.get("voice_id") == ELEVEN_VOICE_ID for v in voices),
                    "available_voices": [
                        {"name": v.get("name"), "voice_id": v.get("voice_id")} 
                        for v in voices[:5]
                    ]
                }
            else:
                return {
                    "status": "error",
                    "message": f"API responded with {response.status_code}",
                    "response": response.text
                }
        else:
            return {"status": "error", "message": "HTTP client not available"}
            
    except Exception as e:
        return {"status": "error", "message": str(e)}

# Export for Vercel
app_handler = app

if __name__ == "__main__":
    print("🚀 Starting server with ElevenLabs TTS on http://localhost:8000")
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)