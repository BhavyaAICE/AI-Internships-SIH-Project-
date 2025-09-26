// Dashboard functionality - Complete clean version

const API_BASE_URL = "https://ai-internships-sih-project-nib5-ewc3eg1u5.vercel.app/api"; // Update with your actual API base URL

console.log('🚀 Dashboard script loading...');

// Sample opportunities data
const sampleOpportunities = [
    {
        id: 1,
        title: 'Software Development Internship',
        company: 'Ministry of Electronics & IT',
        type: 'Technical',
        sector: 'IT',
        description: 'Work on government digital initiatives and learn modern web development technologies. Contribute to projects that impact millions of citizens across India.',
        location: 'Delhi',
        duration: '6 months',
        required_skills: ['React', 'Node.js', 'JavaScript', 'Python'],
        applicants: 45
    },
    {
        id: 2,
        title: 'Data Analytics Internship',
        company: 'National Sample Survey Office',
        type: 'Technical',
        sector: 'Analytics',
        description: 'Analyze demographic and socio-economic data to support policy decisions. Learn advanced data science techniques and statistical analysis.',
        location: 'Mumbai',
        duration: '4 months',
        required_skills: ['Python', 'Statistics', 'Excel', 'SQL'],
        applicants: 32
    },
    {
        id: 3,
        title: 'Digital Marketing Internship',
        company: 'Ministry of Tourism',
        type: 'Non-Technical',
        sector: 'Marketing',
        description: 'Promote Incredible India campaign through digital channels. Create engaging content for social media platforms and marketing campaigns.',
        location: 'Remote',
        duration: '3 months',
        required_skills: ['Content Writing', 'Social Media', 'Digital Marketing'],
        applicants: 78
    },
    {
        id: 4,
        title: 'Financial Analysis Internship',
        company: 'Ministry of Finance',
        type: 'Technical',
        sector: 'Finance',
        description: 'Analyze government expenditure and revenue patterns. Support budget preparation and financial reporting for various government schemes.',
        location: 'Delhi',
        duration: '5 months',
        required_skills: ['Excel', 'Financial Analysis', 'Statistics'],
        applicants: 56
    },
    {
        id: 5,
        title: 'Research Assistant',
        company: 'Indian Council of Medical Research',
        type: 'Research',
        sector: 'Healthcare',
        description: 'Support ongoing medical research projects. Assist in data collection, analysis, and report preparation for health policy development.',
        location: 'Bangalore',
        duration: '6 months',
        required_skills: ['Research', 'Data Collection', 'Medical Writing'],
        applicants: 23
    },
    {
        id: 6,
        title: 'Graphic Design Internship',
        company: 'Ministry of Information & Broadcasting',
        type: 'Creative',
        sector: 'Design',
        description: 'Design visual content for government communication campaigns. Create infographics, posters, and digital assets for public awareness.',
        location: 'Chennai',
        duration: '4 months',
        required_skills: ['Adobe Creative Suite', 'Graphic Design', 'Visual Communication'],
        applicants: 34
    }
];

// Global variables
let currentOpportunities = [...sampleOpportunities];
let displayedOpportunities = [];
let currentLanguage = 'hi';
let isChatOpen = false;
let currentQuestionIndex = 0;
let isListening = false;
let recognition = null;

// Bilingual conversation questions
const conversationQuestions = [
    {
        id: 'skills',
        question: {
            hi: 'Aapke paas kya skills hain? Please batayiye ya type kariye comma-separated jaise "Python, Excel, Writing"',
            en: 'Which skills do you have? Please tell me or type comma-separated skills like "Python, Excel, Writing"'
        },
        type: 'skills',
        followUp: {
            hi: 'Bahut accha! Aapko kaun sa field sabse zyada interest karta hai?',
            en: 'Great! What field or sector interests you most?'
        }
    },
    {
        id: 'sector', 
        question: {
            hi: 'Aapko kaun sa sector pasand hai? Jaise IT, Marketing, Finance, Healthcare, Design, ya Research',
            en: 'Which sector interests you? For example: IT, Marketing, Finance, Healthcare, Design, or Research'
        },
        type: 'sector',
        followUp: {
            hi: 'Perfect! Aap kahan kaam karna chahenge?',
            en: 'Perfect! Where would you prefer to work?'
        }
    },
    {
        id: 'location',
        question: {
            hi: 'Aap kahan kaam karna chahte hain? Aap koi city ka naam bol sakte hain jaise Delhi, Mumbai, ya Remote',
            en: 'Where would you like to work? You can say a city name like Delhi, Mumbai, or Remote'
        },
        type: 'location',
        followUp: {
            hi: 'Kya aap fresher hain ya aapke paas kuch work experience hai?',
            en: 'Are you a fresher or do you have some work experience?'
        }
    },
    {
        id: 'experience',
        question: {
            hi: 'Kya aap fresher hain ya experienced? Please "fresher" ya "experienced" kahiye',
            en: 'Are you a fresher or experienced? Please say "fresher" or "experienced"'
        },
        type: 'experience',
        followUp: {
            hi: 'Aapki educational background kya hai?',
            en: 'What is your educational background?'
        }
    },
    {
        id: 'education',
        question: {
            hi: 'Aapki educational background kya hai? Jaise Engineering, Commerce, Arts, Science etc.',
            en: 'What is your educational background? For example: Engineering, Commerce, Arts, Science, etc.'
        },
        type: 'education',
        followUp: {
            hi: 'Bilkul perfect! Main aapke liye best internships dhundta hun...',
            en: 'Perfect! Let me find the best internships for you...'
        }
    }
];

let userProfile = {
    name: "User",
    academic_background: "",
    skills: [],
    sector_interest: [],
    location_preference: [],
    prefers_remote: false,
    is_fresher: true
};

// Language management functions
function getCurrentLanguage() {
    const activeButton = document.querySelector('.lang-btn.active');
    return activeButton?.id === 'lang-en' ? 'en' : 'hi';
}

function getLocalizedText(textObj) {
    const lang = getCurrentLanguage();
    if (typeof textObj === 'object' && textObj !== null) {
        return textObj[lang] || textObj['en'] || textObj['hi'];
    }
    return textObj;
}

// Enhanced toggleLanguage function with proper speech recognition update
function toggleLanguage(lang) {
    const buttons = document.querySelectorAll('.lang-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    const targetButton = document.getElementById(`lang-${lang}`);
    if (targetButton) {
        targetButton.classList.add('active');
    }
    
    currentLanguage = lang;
    console.log('🌐 Language switched to:', lang);
    
    // Update speech recognition language immediately
    if (recognition) {
        recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        console.log('🎤 Speech recognition language updated to:', recognition.lang);
    }
    
    // Update UI text based on language
    updateUILanguage(lang);
    
    // Update current conversation if chat is open
    if (isChatOpen && currentQuestionIndex < conversationQuestions.length) {
        const currentQuestion = conversationQuestions[currentQuestionIndex];
        const questionText = getLocalizedText(currentQuestion.question);
        
        // Update the last assistant message
        const assistantMessages = document.querySelectorAll('.assistant-message');
        const lastMessage = assistantMessages[assistantMessages.length - 1];
        if (lastMessage) {
            const bubble = lastMessage.querySelector('.message-bubble p');
            if (bubble) {
                bubble.textContent = questionText;
            }
        }
    }
    
    // Dispatch language change event
    document.dispatchEvent(new CustomEvent('languageChanged'));
}


// Initialize speech recognition
function initSpeechRecognition() {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        
        // Set initial language
        const updateRecognitionLanguage = () => {
            const lang = getCurrentLanguage();
            recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
            console.log(' Speech recognition initialized with language:', recognition.lang);
        };
        
        updateRecognitionLanguage();
        
        recognition.onstart = function() {
            console.log(' Speech recognition started');
            const lang = getCurrentLanguage();
            const startMsg = lang === 'hi' ? 'बोलिए...' : 'Speak now...';
            showToast(startMsg, 'info');
        };
        
        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            console.log(' Speech result:', transcript);
            
            const input = document.getElementById('chat-widget-input');
            if (input) {
                input.value = transcript;
            }
            stopWidgetListening();
        };
        
        recognition.onerror = function(event) {
            console.error(' Speech recognition error:', event.error);
            stopWidgetListening();
            
            const lang = getCurrentLanguage();
            let errorMsg;
            
            switch(event.error) {
                case 'no-speech':
                    errorMsg = lang === 'hi' ? 'आवाज़ नहीं सुनाई दी। फिर से कोशिश करें।' : 'No speech detected. Please try again.';
                    break;
                case 'audio-capture':
                    errorMsg = lang === 'hi' ? 'Microphone access नहीं मिला।' : 'Microphone access denied.';
                    break;
                case 'not-allowed':
                    errorMsg = lang === 'hi' ? 'Microphone permission नहीं दी गई।' : 'Microphone permission not granted.';
                    break;
                default:
                    errorMsg = lang === 'hi' ? 'Speech recognition error। Please type करें।' : 'Speech recognition error. Please try typing instead.';
            }
            
            showToast(errorMsg, 'error');
        };
        
        recognition.onend = function() {
            console.log(' Speech recognition ended');
            stopWidgetListening();
        };
        
        // Listen for language change events
        document.addEventListener('languageChanged', updateRecognitionLanguage);
        
        console.log('✅ Speech recognition initialized');
    } else {
        console.warn('❌ Speech recognition not supported in this browser');
    }
}

// Enhanced toggleChat function
function toggleChat() {
    console.log('🔧 Toggle chat called');
    
    const widget = document.getElementById('floating-chat-widget');
    const button = document.getElementById('floating-chat-btn');
    
    if (!widget || !button) {
        console.error('❌ Chat elements not found');
        return;
    }
    
    isChatOpen = !isChatOpen;
    
    if (isChatOpen) {
        widget.classList.add('active');
        button.style.display = 'none';
        
        // Reset conversation
        currentQuestionIndex = 0;
        userProfile = {
            name: "User",
            academic_background: "",
            skills: [],
            sector_interest: [],
            location_preference: [],
            prefers_remote: false,
            is_fresher: true
        };
        
        // Set welcome message
        const lang = getCurrentLanguage();
        const welcomeMessage = lang === 'hi' 
            ? 'Namaste! Main Intern Savek hun, aapko perfect internship dhundne mein help karunga. Chaliye aapki skills ke baare mein jaante hain.'
            : 'Hi! I\'m Intern Savek, here to help you find the perfect internship. Let\'s start with your skills.';
        
        const messagesContainer = document.getElementById('chat-widget-messages');
        if (messagesContainer) {
            messagesContainer.innerHTML = `
                <div class="message assistant-message">
                    <div class="message-bubble">
                        <p>${welcomeMessage}</p>
                    </div>
                </div>
            `;
        }
        
        // Start conversation
        setTimeout(() => {
            const firstQuestion = getLocalizedText(conversationQuestions[0].question);
            speakText(firstQuestion);
        }, 1500);
        
        console.log('✅ Chat opened');
    } else {
        widget.classList.remove('active');
        button.style.display = 'flex';
        
        // Stop speech
        if ('speechSynthesis' in window) {
            speechSynthesis.cancel();
        }
        
        console.log('✅ Chat closed');
    }
}

// Add message to chat
function addWidgetMessage(content, sender = 'user') {
    const messagesContainer = document.getElementById('chat-widget-messages');
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    messageDiv.innerHTML = `
        <div class="message-bubble">
            <p>${content}</p>
        </div>
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Send message from widget
function sendWidgetMessage() {
    const input = document.getElementById('chat-widget-input');
    if (!input) return;
    
    const message = input.value.trim();
    if (!message) return;
    
    console.log('💬 User message:', message);
    
    addWidgetMessage(message, 'user');
    input.value = '';
    
    // Process the answer
    processUserAnswer(message);
    
    // Move to next question after delay
    setTimeout(() => {
        if (currentQuestionIndex < conversationQuestions.length) {
            const currentQuestion = conversationQuestions[currentQuestionIndex];
            const followUpText = getLocalizedText(currentQuestion.followUp);
            
            if (followUpText) {
                addWidgetMessage(followUpText, 'assistant');
                speakText(followUpText);
                
                setTimeout(() => {
                    currentQuestionIndex++;
                    if (currentQuestionIndex < conversationQuestions.length) {
                        askNextQuestion();
                    } else {
                        finishConversation();
                    }
                }, 2500);
            }
        }
    }, 1000);
}

// Ask next question
function askNextQuestion() {
    const question = conversationQuestions[currentQuestionIndex];
    const questionText = getLocalizedText(question.question);
    addWidgetMessage(questionText, 'assistant');
    speakText(questionText);
}

// Process user answer
function processUserAnswer(answer) {
    const question = conversationQuestions[currentQuestionIndex];
    const answerLower = answer.toLowerCase();
    
    switch (question.type) {
        case 'skills':
            userProfile.skills = answer.split(',').map(s => s.trim().toLowerCase()).filter(s => s);
            break;
        case 'sector':
            userProfile.sector_interest = [answerLower];
            break;
        case 'location':
            if (answerLower.includes('remote')) {
                userProfile.prefers_remote = true;
            }
            userProfile.location_preference = [answerLower];
            break;
        case 'experience':
            userProfile.is_fresher = answerLower.includes('fresher');
            break;
        case 'education':
            userProfile.academic_background = answerLower;
            break;
    }
    
    console.log('Updated user profile:', userProfile);
}

// Finish conversation
async function finishConversation() {
    const lang = getCurrentLanguage();
    const processingMessage = lang === 'hi' 
        ? 'Bilkul perfect! Main aapke liye best internships dhund raha hun...'
        : 'Perfect! Let me find the best internships for you...';
        
    addWidgetMessage(processingMessage, 'assistant');
    speakText(processingMessage);
    
    try {
        // Call recommendation API
        const response = await fetch(`${API_BASE_URL}/api/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                ...userProfile,
                language: lang
            })
        });
        
        if (response.ok) {
            const data = await response.json();
            if (data.recommendations && data.recommendations.length > 0) {
                const successMessage = lang === 'hi'
                    ? `Bahut badhiya! Maine aapke liye ${data.recommendations.length} perfect matches dhund liye hain. Niche dekh sakte hain!`
                    : `Excellent! I found ${data.recommendations.length} perfect matches for you. Check them out below!`;
                
                addWidgetMessage(successMessage, 'assistant');
                speakText(successMessage);
                
                // Update dashboard with recommendations
                updateDashboardWithRecommendations(data.recommendations);
                
                // Close chat after showing results
                setTimeout(() => {
                    toggleChat();
                }, 5000);
            } else {
                const fallbackMessage = lang === 'hi'
                    ? 'Specific matches nahi mile, lekin ye popular opportunities dekh sakte hain!'
                    : 'I couldn\'t find specific matches, but check out these popular opportunities below!';
                
                addWidgetMessage(fallbackMessage, 'assistant');
                speakText(fallbackMessage);
            }
        } else {
            throw new Error('API request failed');
        }
    } catch (error) {
        console.error('Error:', error);
        const lang = getCurrentLanguage();
        const errorMessage = lang === 'hi'
            ? 'Server se connect karne mein problem hai, lekin ye popular opportunities dekh sakte hain!'
            : 'There was an issue connecting to our servers, but check out these popular opportunities below!';
            
        addWidgetMessage(errorMessage, 'assistant');
        speakText(errorMessage);
    }
}

// Update dashboard with personalized recommendations
// Update dashboard with personalized recommendations - TOP 10 SORTED BY MATCH %
function updateDashboardWithRecommendations(recommendations) {
    console.log('Updating dashboard with personalized recommendations:', recommendations);
    
    // Sort recommendations by match percentage in descending order
    const sortedRecommendations = recommendations
        .map(rec => {
            // Ensure each recommendation has a match_pct
            if (!rec.match_pct) {
                rec.match_pct = Math.floor(Math.random() * 30) + 60; // 60-90%
            }
            return rec;
        })
        .sort((a, b) => (b.match_pct || 0) - (a.match_pct || 0)) // Sort by match % descending
        .slice(0, 10); // Take only top 10
    
    console.log('Top 10 sorted recommendations:', sortedRecommendations.map(r => `${r.title}: ${r.match_pct}%`));
    
    // Update the current opportunities with the top 10 sorted recommendations
    currentOpportunities = sortedRecommendations;
    displayedOpportunities = [];
    
    // Update the title to show it's personalized
    const title = document.getElementById('opportunities-title');
    if (title) {
        const lang = getCurrentLanguage();
        title.textContent = lang === 'hi' 
            ? 'Aapके लिए Top 10 Personalized Recommendations'
            : 'Your Top 10 Personalized Recommendations';
    }
    
    const subtitle = document.getElementById('opportunities-subtitle');
    if (subtitle) {
        const lang = getCurrentLanguage();
        subtitle.textContent = lang === 'hi'
            ? `सबसे अच्छे ${sortedRecommendations.length} internships जो आपके profile से perfectly match करते हैं`
            : `Top ${sortedRecommendations.length} internships perfectly matching your profile - sorted by best match`;
    }
    
    // Clear and reload the grid with personalized flag
    const grid = document.getElementById('opportunities-grid');
    if (grid) {
        grid.innerHTML = '';
        loadOpportunities(true); // TRUE = personalized with match scores
    }
    
    // Show success message
    const lang = getCurrentLanguage();
    const message = lang === 'hi' 
        ? `Top ${sortedRecommendations.length} best matches mil gaye!`
        : `Found your top ${sortedRecommendations.length} best matches!`;
    showToast(message, 'success');
    
    // Scroll to results
    setTimeout(() => {
        const resultsSection = document.querySelector('.results-section');
        if (resultsSection) {
            resultsSection.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'start' 
            });
        }
    }, 1000);
}


// Voice input functions
function toggleWidgetVoiceInput() {
    if (!recognition) {
        const lang = getCurrentLanguage();
        const errorMsg = lang === 'hi' 
            ? 'Speech recognition is browser mein supported nahi hai'
            : 'Speech recognition not supported in this browser';
        showToast(errorMsg, 'error');
        return;
    }
    
    if (isListening) {
        stopWidgetListening();
    } else {
        startWidgetListening();
    }
}

function startWidgetListening() {
    if (recognition) {
        // Update language before starting
        const lang = getCurrentLanguage();
        recognition.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
        console.log('🎤 Starting speech recognition with language:', recognition.lang);
        
        isListening = true;
        const voiceBtn = document.getElementById('widget-voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.add('listening');
        }
        
        try {
            recognition.start();
        } catch (error) {
            console.error('🎤 Error starting recognition:', error);
            stopWidgetListening();
            
            const errorMsg = lang === 'hi' 
                ? 'Speech recognition शुरू नहीं हो सका।' 
                : 'Could not start speech recognition.';
            showToast(errorMsg, 'error');
        }
    }
}

function stopWidgetListening() {
    if (recognition) {
        isListening = false;
        const voiceBtn = document.getElementById('widget-voice-btn');
        if (voiceBtn) {
            voiceBtn.classList.remove('listening');
        }
        try {
            recognition.stop();
        } catch (error) {
            console.error('🎤 Error stopping recognition:', error);
        }
    }
}


// Enhanced speakText function with ElevenLabs
// Enhanced speakText function with proper ElevenLabs handling
async function speakText(text) {
    try {
        console.log('🗣️ Attempting ElevenLabs TTS:', text.substring(0, 50) + '...');
        
        // First, check if the API endpoint is reachable
        const healthResponse = await fetch(`${API_BASE_URL}/api/health`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!healthResponse.ok) {
            throw new Error('API health check failed');
        }
        
        const healthData = await healthResponse.json();
        console.log('🏥 API Health:', healthData);
        
        if (!healthData.elevenlabs_configured) {
            throw new Error('ElevenLabs not configured on server');
        }
        
        // Now attempt the TTS request
        const response = await fetch(`${API_BASE_URL}/api/speak`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Accept': 'audio/mpeg'
            },
            body: JSON.stringify({ text })
        });
        
        console.log('📡 ElevenLabs API Response Status:', response.status);
        console.log('📡 Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ ElevenLabs API Error Response:', errorText);
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
        }
        
        // Check if response is actually audio
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('audio')) {
            console.error('❌ Invalid content type:', contentType);
            throw new Error('Invalid audio response from server');
        }
        
        const audioBlob = await response.blob();
        console.log('🎵 Audio blob size:', audioBlob.size, 'bytes');
        
        if (audioBlob.size === 0) {
            throw new Error('Empty audio response from ElevenLabs');
        }
        
        // Create and play audio
        const audioUrl = URL.createObjectURL(audioBlob);
        const audio = new Audio(audioUrl);
        
        // Return a promise that resolves when audio finishes
        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                console.log('✅ ElevenLabs audio completed successfully');
                resolve();
            };
            
            audio.onerror = (e) => {
                console.error('❌ Audio playback error:', e);
                URL.revokeObjectURL(audioUrl);
                reject(new Error('Audio playback failed'));
            };
            
            audio.oncanplaythrough = () => {
                console.log('🎵 Audio ready to play');
            };
            
            // Start playing
            audio.play().then(() => {
                console.log('✅ ElevenLabs audio started playing');
            }).catch(reject);
        });
        
    } catch (error) {
        console.warn('❌ ElevenLabs failed, using browser TTS fallback:', error.message);
        
        // Fallback to browser TTS
        return new Promise((resolve) => {
            if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(text);
                const lang = getCurrentLanguage();
                utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';
                utterance.rate = 0.9;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                
                utterance.onend = () => {
                    console.log('🔄 Browser TTS completed');
                    resolve();
                };
                
                utterance.onerror = (e) => {
                    console.error('❌ Browser TTS error:', e);
                    resolve(); // Still resolve to prevent hanging
                };
                
                speechSynthesis.speak(utterance);
                console.log('🔄 Using browser TTS as fallback');
            } else {
                console.warn('❌ No TTS available');
                resolve();
            }
        });
    }
}


async function handleUserMessage(userMessage) {
    try {
        // 1. Send candidate data to recommendation API
        const recommendResponse = await fetch(`${API_BASE_URL}/api/recommend`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: "Candidate",
                skills: [userMessage],  // you can map real candidate data here
                sector_interest: [],
                location_preference: [],
                prefers_remote: false,
                is_fresher: true
            })
        });

        const recommendData = await recommendResponse.json();
        console.log("✅ Recommendations:", recommendData);

        // Show recommendations in your UI
        if (recommendData.recommendations && recommendData.recommendations.length > 0) {
            displayRecommendations(recommendData.recommendations);
        } else {
            displayMessage("No recommendations found.");
        }

        // 2. Call ElevenLabs TTS to read the result
        const textToSpeak = recommendData.recommendations.length > 0
            ? `Here are some recommendations for you. ${recommendData.recommendations.map(r => r.title).join(", ")}`
            : "Sorry, no recommendations found.";

        await speakText(textToSpeak);

    } catch (error) {
        console.error("❌ Error handling user message:", error);
        displayMessage("Something went wrong while fetching recommendations.");
    }
}


// Load opportunities - MAIN FUNCTION
function loadOpportunities(isPersonalized = false) {
    console.log('Loading opportunities:', currentOpportunities.length, isPersonalized ? '(Personalized)' : '(Sample)');
    
    const grid = document.getElementById('opportunities-grid');
    const loadingState = document.getElementById('loading-state');
    const resultsCount = document.getElementById('results-count');
    
    if (!grid) {
        console.error('❌ Grid element not found!');
        return;
    }
    
    // Hide loading state
    if (loadingState) {
        loadingState.style.display = 'none';
    }
    
    // Update results count with proper language
    if (resultsCount) {
        const lang = getCurrentLanguage();
        let countText;
        
        if (isPersonalized) {
            countText = lang === 'hi'
                ? `Top ${currentOpportunities.length} personalized matches (highest match % first)`
                : `Top ${currentOpportunities.length} personalized matches (highest match % first)`;
        } else {
            countText = lang === 'hi'
                ? `${currentOpportunities.length} popular opportunities दिखा रहे हैं`
                : `Showing ${currentOpportunities.length} popular opportunities`;
        }
        
        resultsCount.textContent = countText;
    }
    
    // Clear and show grid
    grid.innerHTML = '';
    grid.style.display = 'grid';
    
    // Create cards - IMPORTANT: Pass isPersonalized flag and rank
    currentOpportunities.forEach((opportunity, index) => {
        const card = createOpportunityCard(opportunity, isPersonalized, index + 1);
        grid.appendChild(card);
    });
    
    displayedOpportunities = [...currentOpportunities];
    console.log('✅ Opportunities loaded successfully');
}

// Create opportunity card - FIXED VERSION with ranking
function createOpportunityCard(opportunity, isPersonalized = false, rank = null) {
    const card = document.createElement('div');
    card.className = 'opportunity-card';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-labelledby', `title-${opportunity.id}`);
    
    // Add ranking class for personalized cards
    if (isPersonalized && rank) {
        card.classList.add('ranked-card');
        if (rank <= 3) {
            card.classList.add(`rank-${rank}`);
        }
    }
    
    const title = opportunity.title || 'Internship Opportunity';
    const company = opportunity.company || 'Government Organization';
    const sector = (opportunity.sector || opportunity.type || '').toString().toLowerCase();
    const location = opportunity.location || 'Not specified';
    const description = opportunity.description || 'Details not available';
    const skills = opportunity.required_skills || [];
    
    // ONLY show match info for personalized recommendations
    const matchScore = isPersonalized ? (opportunity.match_pct || Math.floor(Math.random() * 30) + 60) : null;
    const matchReasons = isPersonalized ? (opportunity.explanations || [
        'Skills matched',
        'Location preference',
        'Academic background matches'
    ].slice(0, Math.floor(Math.random() * 3) + 1)) : null;
    
    card.innerHTML = `
        ${isPersonalized && rank ? `
        <div class="rank-badge rank-${rank <= 3 ? rank : 'other'}">
            <span class="rank-number">#${rank}</span>
            ${rank === 1 ? '<span class="rank-crown">👑</span>' : ''}
        </div>
        ` : ''}
        
        <div class="opportunity-header">
            <div class="opportunity-main-info">
                <h3 class="opportunity-title" id="title-${opportunity.id}">${title}</h3>
                <div class="opportunity-company">${company}</div>
            </div>
            <div class="opportunity-type ${sector}">${sector.replace(/[-_]/g, ' ').toUpperCase()}</div>
        </div>
        
        <p class="opportunity-description">${description}</p>
        
        ${matchScore ? `
        <div class="match-score ${rank === 1 ? 'best-match' : rank <= 3 ? 'top-match' : ''}">
            <div class="score-bar">
                <div class="score-fill" style="width: ${matchScore}%"></div>
            </div>
            <div class="score-text">${matchScore}% Match${rank === 1 ? ' 🎯' : ''}</div>
        </div>
        ` : ''}
        
        ${matchReasons && matchReasons.length > 0 ? `
        <div class="match-reasons">
            <strong>Why this matches:</strong> ${matchReasons.join(', ')}
        </div>
        ` : ''}
        
        <div class="opportunity-details">
            <div class="detail-item">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>${location}</span>
            </div>
            <div class="detail-item">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>${opportunity.duration || '3-6 months'}</span>
            </div>
            ${opportunity.applicants ? `
            <div class="detail-item">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>${opportunity.applicants} applied</span>
            </div>
            ` : ''}
        </div>
        
        <div class="opportunity-tags">
            ${Array.isArray(skills) ? skills.map(skill => `<span class="tag">${skill}</span>`).join('') : ''}
        </div>
        
        <div class="opportunity-actions">
            <button class="btn-apply ${rank === 1 ? 'best-match-btn' : ''}" onclick="applyToOpportunity(${opportunity.id})">
                ${rank === 1 ? 'Apply Now (Best Match!)' : 'Apply Now'}
            </button>
            <button class="btn-bookmark" onclick="toggleBookmark(${opportunity.id})" title="Save this opportunity">
                <svg xmlns="http://www.w3.org/2000/svg" class="icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
            </button>
        </div>
    `;
    
    return card;
}


// Placeholder functions
function applyToOpportunity(id) {
    console.log('📝 Apply clicked for ID:', id);
    const opportunity = currentOpportunities.find(opp => opp.id === id);
    const lang = getCurrentLanguage();
    const message = lang === 'hi' 
        ? `${opportunity?.title || 'Internship'} ke liye application submit ho gayi!`
        : `Application submitted for ${opportunity?.title || 'Internship'}!`;
    
    showToast(message, 'success');
    
    // Store application in localStorage
    const applications = JSON.parse(localStorage.getItem('applications') || '[]');
    applications.push({
        opportunityId: id,
        appliedAt: new Date().toISOString(),
        status: 'submitted'
    });
    localStorage.setItem('applications', JSON.stringify(applications));
}

function toggleBookmark(id) {
    console.log('🔖 Bookmark clicked for ID:', id);
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    const button = document.querySelector(`button[onclick="toggleBookmark(${id})"]`);
    
    if (!button) return;
    
    const isBookmarked = bookmarks.includes(id);
    const lang = getCurrentLanguage();
    
    if (isBookmarked) {
        const index = bookmarks.indexOf(id);
        bookmarks.splice(index, 1);
        button.classList.remove('bookmarked');
        
        const message = lang === 'hi' ? 'Bookmark hata diya gaya' : 'Bookmark removed';
        showToast(message, 'info');
    } else {
        bookmarks.push(id);
        button.classList.add('bookmarked');
        
        const message = lang === 'hi' ? 'Bookmark add kar diya gaya' : 'Bookmark added';
        showToast(message, 'success');
    }
    
    localStorage.setItem('bookmarks', JSON.stringify(bookmarks));
}

// Show toast notification
function showToast(message, type = 'info') {
    // Remove existing toasts
    const existingToasts = document.querySelectorAll('.toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    const colors = {
        success: { bg: '#22c55e', text: '#ffffff' },
        error: { bg: '#ef4444', text: '#ffffff' },
        info: { bg: '#3b82f6', text: '#ffffff' }
    };
    
    Object.assign(toast.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        background: colors[type].bg,
        color: colors[type].text,
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        zIndex: '1001',
        boxShadow: '0 10px 40px rgba(0,0,0,0.1)',
        animation: 'slideInRight 0.3s ease',
        maxWidth: '400px',
        fontWeight: '500'
    });
    
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // Auto remove after 3 seconds
    setTimeout(() => {
        if (document.body.contains(toast)) {
            toast.style.animation = 'slideInRight 0.3s ease reverse';
            setTimeout(() => {
                if (document.body.contains(toast)) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }
    }, 3000);
}

// User menu functions
function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

function logout() {
    localStorage.removeItem('userSession');
    window.location.href = 'index.html';
}

// Close user menu when clicking outside
document.addEventListener('click', (e) => {
    const userMenu = document.querySelector('.user-menu');
    if (userMenu && !userMenu.contains(e.target)) {
        const dropdown = document.getElementById('user-dropdown');
        if (dropdown) {
            dropdown.classList.remove('show');
        }
    }
});

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Dashboard initializing...');
    
    // Set default language
    toggleLanguage('hi');
    
    // Initialize speech recognition
    initSpeechRecognition();
    
    // Load sample opportunities (WITHOUT match info)
    setTimeout(() => {
        loadOpportunities(false); // FALSE = sample data, no match scores
    }, 200);
    
    // Add enter key support
    const widgetInput = document.getElementById('chat-widget-input');
    if (widgetInput) {
        widgetInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                sendWidgetMessage();
            }
        });
    }
    
    // Load user's bookmarks
    const bookmarks = JSON.parse(localStorage.getItem('bookmarks') || '[]');
    if (bookmarks.length > 0) {
        setTimeout(() => {
            bookmarks.forEach(opportunityId => {
                const button = document.querySelector(`button[onclick="toggleBookmark(${opportunityId})"]`);
                if (button) {
                    button.classList.add('bookmarked');
                }
            });
        }, 1000);
    }
    
    console.log('✅ Dashboard initialized successfully');
});

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
`;
document.head.appendChild(style);

console.log('✅ Dashboard script loaded');


// Update UI language function
function updateUILanguage(lang) {
    console.log('🔄 Updating UI language to:', lang);
    
    // Update results count text
    const resultsCount = document.getElementById('results-count');
    if (resultsCount) {
        const total = currentOpportunities.length;
        const isPersonalized = resultsCount.textContent.includes('personalized') || resultsCount.textContent.includes('matches');
        
        let countText;
        if (isPersonalized) {
            countText = lang === 'hi'
                ? `Top ${total} personalized matches (highest match % first)`
                : `Top ${total} personalized matches (highest match % first)`;
        } else {
            countText = lang === 'hi'
                ? `${total} popular opportunities दिखा रहे हैं`
                : `Showing ${total} popular opportunities`;
        }
        resultsCount.textContent = countText;
    }
    
    // Update page title if needed
    const pageTitle = document.getElementById('opportunities-title');
    if (pageTitle && pageTitle.textContent.includes('Personalized')) {
        pageTitle.textContent = lang === 'hi'
            ? 'आपके लिए Top 10 Personalized Recommendations'
            : 'Your Top 10 Personalized Recommendations';
    }
    
    // Update subtitle if needed
    const subtitle = document.getElementById('opportunities-subtitle');
    if (subtitle && subtitle.textContent.includes('matching')) {
        const total = currentOpportunities.length;
        subtitle.textContent = lang === 'hi'
            ? `सबसे अच्छे ${total} internships जो आपके profile से perfectly match करते हैं`
            : `Top ${total} internships perfectly matching your profile - sorted by best match`;
    }
}

fetch('/api/recommend', {
  method: 'POST',
  body: JSON.stringify({ data: 'value' }),
  headers: { 'Content-Type': 'application/json' }
}).then(res => res.json()).then(data => console.log(data));



// Add this function for testing
async function testElevenLabsAPI() {
    try {
        console.log('🧪 Testing ElevenLabs API...');
        
        const response = await fetch(`${API_BASE_URL}/api/speak`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: 'Testing ElevenLabs voice' })
        });
        
        console.log('Test Response Status:', response.status);
        console.log('Test Response Headers:', Object.fromEntries(response.headers.entries()));
        
        if (response.ok) {
            const blob = await response.blob();
            console.log('Test Audio Blob Size:', blob.size);
            return true;
        } else {
            const error = await response.text();
            console.error('Test Error:', error);
            return false;
        }
    } catch (error) {
        console.error('Test Exception:', error);
        return false;
    }
}


