from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal
from openai import AzureOpenAI
from dotenv import load_dotenv
import os
import json
import sqlite3
from datetime import datetime
from contextlib import contextmanager

load_dotenv()

# SQLite Database Setup - use /data for persistent storage in production
DB_PATH = os.getenv("DATABASE_PATH", "/data/app.db" if os.path.exists("/data") else "app.db")

@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()

def init_db():
    with get_db() as conn:
        cursor = conn.cursor()
        
        # Questions table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS questions (
                id TEXT PRIMARY KEY,
                question TEXT NOT NULL,
                hints TEXT,
                expected_topics TEXT,
                code_snippet TEXT,
                options TEXT,
                correct_option INTEGER,
                blank_answer TEXT,
                topic TEXT,
                subtopic TEXT,
                difficulty TEXT,
                bank TEXT DEFAULT 'easy',
                azure_bridge TEXT,
                format TEXT DEFAULT 'multiple_choice',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        
        # Answer history table for tracking user performance
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS answer_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                question_id TEXT,
                user_answer TEXT,
                is_correct BOOLEAN,
                score INTEGER,
                answered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (question_id) REFERENCES questions(id)
            )
        ''')
        
        # Spaced repetition table for SM-2 algorithm
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS spaced_repetition (
                question_id TEXT PRIMARY KEY,
                easiness_factor REAL DEFAULT 2.5,
                interval INTEGER DEFAULT 1,
                repetitions INTEGER DEFAULT 0,
                next_review TIMESTAMP,
                last_reviewed TIMESTAMP,
                FOREIGN KEY (question_id) REFERENCES questions(id)
            )
        ''')
        
        # Topic mastery table
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS topic_mastery (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                topic TEXT NOT NULL,
                subtopic TEXT,
                correct_count INTEGER DEFAULT 0,
                total_count INTEGER DEFAULT 0,
                last_practiced TIMESTAMP,
                UNIQUE(topic, subtopic)
            )
        ''')
        
        conn.commit()

# Initialize database on startup
init_db()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = AzureOpenAI(
    api_version=os.getenv("AZURE_OPENAI_API_VERSION", "2024-12-01-preview"),
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT"),
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
)

DEPLOYMENT = os.getenv("DEFAULT_MODEL", "gpt-5.2")

QuestionFormat = Literal[
    "flashcard", "multiple-choice", "code-recognition", 
    "fill-blank", "voice-explain", "teaching-moment", "open-ended"
]

SessionType = Literal["quick-fire", "deep-dive", "code-lab", "weak-area-focus", "mixed"]


class QuestionRequest(BaseModel):
    category: str
    difficulty: str
    interview_type: str
    topic: Optional[str] = None
    question_format: QuestionFormat = "open-ended"


class AnswerRequest(BaseModel):
    question: str
    user_answer: str
    is_azure_developer: bool = False
    category: str
    difficulty: str
    question_format: QuestionFormat = "open-ended"


class FlashcardResponse(BaseModel):
    format: Literal["flashcard"] = "flashcard"
    front: str
    back: str
    category: str
    time_limit: int = 45


class MultipleChoiceResponse(BaseModel):
    format: Literal["multiple-choice"] = "multiple-choice"
    question: str
    options: List[str]
    correct_index: int
    explanation: str
    category: str
    time_limit: int = 60


class CodeRecognitionResponse(BaseModel):
    format: Literal["code-recognition"] = "code-recognition"
    code: str
    question: str
    question_type: Literal["what-does-it-do", "find-the-bug", "what-happens-next", "fill-blank"]
    answer: str
    hints: List[str]
    category: str
    time_limit: int = 120


class FillBlankResponse(BaseModel):
    format: Literal["fill-blank"] = "fill-blank"
    code_with_blanks: str
    blanks: List[str]
    hints: List[str]
    category: str
    time_limit: int = 90


class TeachingMomentResponse(BaseModel):
    format: Literal["teaching-moment"] = "teaching-moment"
    topic: str
    explanation: str
    code_example: Optional[str]
    key_takeaways: List[str]
    practice_question: str
    practice_answer: str
    category: str


class VoiceExplainResponse(BaseModel):
    format: Literal["voice-explain"] = "voice-explain"
    prompt: str
    key_points: List[str]
    category: str
    time_limit: int = 180


class QuestionResponse(BaseModel):
    question: str
    hints: List[str]
    expected_topics: List[str]
    code_snippet: Optional[str] = None


class FeedbackResponse(BaseModel):
    score: int
    feedback: str
    correct_answer: str
    azure_alternative: Optional[str] = None
    improvement_tips: List[str]


class SessionRequest(BaseModel):
    session_type: SessionType
    duration: Literal[20, 25, 30] = 25
    focus_categories: Optional[List[str]] = None
    interview_type: str = "technical"


class SessionQuestion(BaseModel):
    format: QuestionFormat
    data: dict
    time_limit: int


class SessionResponse(BaseModel):
    session_id: str
    session_type: SessionType
    duration: int
    questions: List[SessionQuestion]
    total_questions: int


SCREENING_CATEGORIES = [
    "OpenAI Platform Basics",
    "API Authentication & Security",
    "Model Selection & Capabilities",
    "Prompt Engineering Fundamentals",
    "Rate Limits & Quotas",
    "Pricing & Cost Management",
    "Safety & Content Moderation",
    "OpenAI Mission & Values",
    "Products & Ecosystem",
    "Common Use Cases",
]

TECHNICAL_CATEGORIES = [
    "Function Calling & Tools",
    "Assistants API & Threads",
    "Fine-tuning & Custom Models",
    "Embeddings & Vector Search",
    "RAG Architecture Patterns",
    "Multi-modal (Vision, Audio)",
    "Streaming & Real-time",
    "Error Handling & Retry Patterns",
    "Production Best Practices",
    "Code Recognition & Debugging",
    "GPU & Infrastructure",
    "Multi-Agent Patterns",
    "Evaluation & Testing",
    "Advanced Prompt Engineering",
]

BEHAVIORAL_CATEGORIES = [
    "Why Leave Microsoft After 23 Years",
    "Salary & Compensation Expectations",
    "Career Motivations & Goals",
    "Tell Me About Yourself",
    "Why OpenAI Specifically",
    "Leadership & Team Experience",
    "Handling Failure & Learning",
    "Work Style & Culture Fit",
    "Biggest Achievements",
    "Challenges & Problem Solving",
    "Future Vision & Aspirations",
    "Questions for the Interviewer",
]

SESSION_TEMPLATES = {
    "quick-fire": {
        "duration": 20,
        "description": "Fast-paced review of concepts",
        "structure": [
            {"format": "flashcard", "count": 5},
            {"format": "multiple-choice", "count": 5},
            {"format": "code-recognition", "count": 3},
        ]
    },
    "deep-dive": {
        "duration": 30,
        "description": "Focus on one category with depth",
        "structure": [
            {"format": "teaching-moment", "count": 1},
            {"format": "open-ended", "count": 2},
            {"format": "code-recognition", "count": 2},
            {"format": "fill-blank", "count": 2},
        ]
    },
    "code-lab": {
        "duration": 25,
        "description": "Hands-on coding practice",
        "structure": [
            {"format": "code-recognition", "count": 3},
            {"format": "fill-blank", "count": 3},
            {"format": "open-ended", "count": 2},
        ]
    },
    "weak-area-focus": {
        "duration": 25,
        "description": "Targeted practice on struggling topics",
        "structure": [
            {"format": "teaching-moment", "count": 2},
            {"format": "multiple-choice", "count": 3},
            {"format": "fill-blank", "count": 2},
            {"format": "open-ended", "count": 2},
        ]
    },
    "mixed": {
        "duration": 20,
        "description": "Variety of formats for engagement",
        "structure": [
            {"format": "flashcard", "count": 3},
            {"format": "multiple-choice", "count": 3},
            {"format": "code-recognition", "count": 2},
            {"format": "voice-explain", "count": 1},
        ]
    }
}


@app.get("/healthz")
async def healthz():
    return {"status": "ok"}


@app.get("/api/categories")
async def get_categories():
    return {
        "screening": SCREENING_CATEGORIES,
        "technical": TECHNICAL_CATEGORIES,
        "behavioral": BEHAVIORAL_CATEGORIES,
    }


@app.post("/api/question", response_model=QuestionResponse)
async def generate_question(request: QuestionRequest):
    try:
        if request.interview_type == "screening":
            system_prompt = """You are an OpenAI interview preparation assistant. Generate a screening-level interview question about OpenAI/Azure OpenAI.
            
The question should test foundational knowledge suitable for an initial screening interview.
Focus on concepts, terminology, and basic understanding.

Return your response as JSON with this exact structure:
{
    "question": "The interview question",
    "hints": ["hint1", "hint2", "hint3"],
    "expected_topics": ["topic1", "topic2"],
    "code_snippet": null or "code if relevant"
}"""
        elif request.interview_type == "behavioral":
            system_prompt = """You are an interview coach helping a senior Microsoft employee (23 years) prepare for behavioral/HR interviews at OpenAI.

Generate a behavioral interview question that helps them practice articulating their story. The candidate has deep Azure OpenAI expertise and is transitioning to OpenAI.

Focus on:
- Authentic storytelling about career transition
- Demonstrating passion for AI and OpenAI's mission
- Showing leadership and impact from Microsoft experience
- Addressing potential concerns (why leave after 23 years, salary expectations, etc.)

Return your response as JSON with this exact structure:
{
    "question": "The behavioral interview question",
    "hints": ["hint about what to emphasize", "hint about structure", "hint about authenticity"],
    "expected_topics": ["topic they should cover", "another topic"],
    "code_snippet": null
}"""
        else:
            system_prompt = """You are an OpenAI interview preparation assistant. Generate a deep technical interview question about OpenAI/Azure OpenAI.
            
The question should be challenging and test deep understanding of:
- Complex implementation patterns
- Production-ready code
- Business problem solving with AI
- Architecture decisions
- Performance optimization
- Error handling and edge cases

Include code snippets when relevant. The question should require detailed technical knowledge.

Return your response as JSON with this exact structure:
{
    "question": "The interview question",
    "hints": ["hint1", "hint2", "hint3"],
    "expected_topics": ["topic1", "topic2", "topic3"],
    "code_snippet": "relevant code snippet or null"
}"""

        user_prompt = f"""Generate a {request.difficulty} difficulty question about: {request.category}
{"Additional focus: " + request.topic if request.topic else ""}

Make sure the question is practical and tests real-world knowledge."""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.8,
            max_completion_tokens=1000,
        )

        result = json.loads(response.choices[0].message.content)
        return QuestionResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/evaluate", response_model=FeedbackResponse)
async def evaluate_answer(request: AnswerRequest):
    try:
        azure_context = ""
        if request.is_azure_developer:
            azure_context = """
The user has indicated they are answering from an Azure Developer perspective.
If their answer uses Azure-specific approaches (like Azure AI Foundry, Azure OpenAI Service, 
Azure Key Vault, DefaultAzureCredential, etc.) instead of direct OpenAI approaches, 
this is acceptable and should be evaluated positively.

Also provide the equivalent OpenAI (non-Azure) approach in the azure_alternative field."""

        system_prompt = f"""You are an expert OpenAI interview evaluator. Evaluate the candidate's answer.
{azure_context}

Be constructive but honest. Score from 0-100.
Consider:
- Technical accuracy
- Completeness
- Best practices mentioned
- Real-world applicability

Return your response as JSON with this exact structure:
{{
    "score": 85,
    "feedback": "Detailed feedback on the answer",
    "correct_answer": "The ideal/complete answer",
    "azure_alternative": "Azure-specific approach if different, or null",
    "improvement_tips": ["tip1", "tip2", "tip3"]
}}"""

        user_prompt = f"""Question: {request.question}

Category: {request.category}
Difficulty: {request.difficulty}

Candidate's Answer: {request.user_answer}

Evaluate this answer thoroughly."""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.3,
            max_completion_tokens=1500,
        )

        result = json.loads(response.choices[0].message.content)
        return FeedbackResponse(**result)

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/study-topics/{interview_type}")
async def get_study_topics(interview_type: str):
    try:
        if interview_type == "screening":
            prompt = """List the most important topics to study for an OpenAI initial screening interview.
Include key concepts, terminology, and foundational knowledge areas.

Return as JSON: {"topics": [{"name": "topic", "description": "brief description", "priority": "high/medium/low"}]}"""
        else:
            prompt = """List the most important deep technical topics to study for an OpenAI technical interview.
Include advanced concepts, implementation patterns, and architecture knowledge.

Return as JSON: {"topics": [{"name": "topic", "description": "brief description", "priority": "high/medium/low"}]}"""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_completion_tokens=1500,
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/session-types")
async def get_session_types():
    return {
        session_type: {
            "duration": template["duration"],
            "description": template["description"],
            "question_count": sum(item["count"] for item in template["structure"])
        }
        for session_type, template in SESSION_TEMPLATES.items()
    }


@app.post("/api/generate-flashcard")
async def generate_flashcard(category: str, difficulty: str = "medium"):
    try:
        prompt = f"""Generate a flashcard for OpenAI/Azure OpenAI interview prep.
Category: {category}
Difficulty: {difficulty}

Return JSON:
{{
    "front": "Question or concept to recall",
    "back": "Answer or explanation (concise, 1-3 sentences)",
    "category": "{category}"
}}"""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.9,
            max_completion_tokens=500,
        )

        result = json.loads(response.choices[0].message.content)
        result["format"] = "flashcard"
        result["time_limit"] = 45
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-multiple-choice")
async def generate_multiple_choice(category: str, difficulty: str = "medium"):
    try:
        prompt = f"""Generate a multiple choice question for OpenAI/Azure OpenAI interview prep.
Category: {category}
Difficulty: {difficulty}

Return JSON:
{{
    "question": "The question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correct_index": 0,
    "explanation": "Why the correct answer is correct",
    "category": "{category}"
}}

Make sure options are plausible and the question tests real knowledge."""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_completion_tokens=800,
        )

        result = json.loads(response.choices[0].message.content)
        result["format"] = "multiple-choice"
        result["time_limit"] = 60
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-code-recognition")
async def generate_code_recognition(category: str, difficulty: str = "medium"):
    try:
        prompt = f"""Generate a code recognition question for OpenAI/Azure OpenAI interview prep.
Category: {category}
Difficulty: {difficulty}

Show a code snippet and ask what it does, find a bug, or predict output.

Return JSON:
{{
    "code": "// Python or JavaScript code snippet using OpenAI API",
    "question": "What does this code do? / What's the bug? / What will be printed?",
    "question_type": "what-does-it-do",
    "answer": "The correct answer",
    "hints": ["hint1", "hint2"],
    "category": "{category}"
}}

Use realistic OpenAI SDK code patterns."""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_completion_tokens=1000,
        )

        result = json.loads(response.choices[0].message.content)
        result["format"] = "code-recognition"
        result["time_limit"] = 120
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-fill-blank")
async def generate_fill_blank(category: str, difficulty: str = "medium"):
    try:
        prompt = f"""Generate a fill-in-the-blank code question for OpenAI/Azure OpenAI interview prep.
Category: {category}
Difficulty: {difficulty}

Return JSON:
{{
    "code_with_blanks": "code with ___BLANK_1___ and ___BLANK_2___ placeholders",
    "blanks": ["answer1", "answer2"],
    "hints": ["hint for blank 1", "hint for blank 2"],
    "category": "{category}"
}}

Use realistic OpenAI SDK code with 2-3 blanks for key concepts."""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_completion_tokens=800,
        )

        result = json.loads(response.choices[0].message.content)
        result["format"] = "fill-blank"
        result["time_limit"] = 90
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-teaching-moment")
async def generate_teaching_moment(category: str, difficulty: str = "medium"):
    try:
        prompt = f"""Generate a teaching moment for OpenAI/Azure OpenAI interview prep.
Category: {category}
Difficulty: {difficulty}

This should TEACH a concept, not just test it. Include explanation, example, and practice.

Return JSON:
{{
    "topic": "Specific topic being taught",
    "explanation": "Clear 2-3 paragraph explanation of the concept",
    "code_example": "Working code example demonstrating the concept",
    "key_takeaways": ["takeaway1", "takeaway2", "takeaway3"],
    "practice_question": "A simple question to check understanding",
    "practice_answer": "The answer to the practice question",
    "category": "{category}"
}}"""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,
            max_completion_tokens=1500,
        )

        result = json.loads(response.choices[0].message.content)
        result["format"] = "teaching-moment"
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/generate-voice-explain")
async def generate_voice_explain(category: str, difficulty: str = "medium"):
    try:
        prompt = f"""Generate a voice explanation prompt for OpenAI/Azure OpenAI interview prep.
Category: {category}
Difficulty: {difficulty}

This is for verbal practice - the user will explain the concept out loud.

Return JSON:
{{
    "prompt": "Explain [concept] as if you were in an interview. Cover [specific aspects].",
    "key_points": ["point they should mention 1", "point 2", "point 3", "point 4"],
    "category": "{category}"
}}"""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8,
            max_completion_tokens=600,
        )

        result = json.loads(response.choices[0].message.content)
        result["format"] = "voice-explain"
        result["time_limit"] = 180
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/create-session")
async def create_session(request: SessionRequest):
    import uuid
    import random
    
    try:
        template = SESSION_TEMPLATES[request.session_type]
        categories = request.focus_categories or (
            SCREENING_CATEGORIES if request.interview_type == "screening" 
            else TECHNICAL_CATEGORIES
        )
        
        questions = []
        
        for item in template["structure"]:
            fmt = item["format"]
            count = item["count"]
            
            for _ in range(count):
                category = random.choice(categories)
                
                if fmt == "flashcard":
                    q_data = await generate_flashcard(category)
                elif fmt == "multiple-choice":
                    q_data = await generate_multiple_choice(category)
                elif fmt == "code-recognition":
                    q_data = await generate_code_recognition(category)
                elif fmt == "fill-blank":
                    q_data = await generate_fill_blank(category)
                elif fmt == "teaching-moment":
                    q_data = await generate_teaching_moment(category)
                elif fmt == "voice-explain":
                    q_data = await generate_voice_explain(category)
                else:
                    q_resp = await generate_question(QuestionRequest(
                        category=category,
                        difficulty="medium",
                        interview_type=request.interview_type,
                        question_format="open-ended"
                    ))
                    q_data = {
                        "format": "open-ended",
                        "question": q_resp.question,
                        "hints": q_resp.hints,
                        "expected_topics": q_resp.expected_topics,
                        "code_snippet": q_resp.code_snippet,
                        "category": category,
                        "time_limit": 180
                    }
                
                questions.append(SessionQuestion(
                    format=fmt,
                    data=q_data,
                    time_limit=q_data.get("time_limit", 120)
                ))
        
        return SessionResponse(
            session_id=str(uuid.uuid4()),
            session_type=request.session_type,
            duration=request.duration,
            questions=questions,
            total_questions=len(questions)
        )
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/cheat-sheet/{category}")
async def get_cheat_sheet(category: str):
    try:
        prompt = f"""Generate a quick reference cheat sheet for: {category}

This is for interview prep - include the most important code snippets and concepts.

Return JSON:
{{
    "category": "{category}",
    "snippets": [
        {{"title": "snippet title", "code": "code example", "explanation": "brief explanation"}},
        ...
    ],
    "key_concepts": ["concept1", "concept2", "concept3"],
    "common_mistakes": ["mistake1", "mistake2"]
}}

Include 3-5 practical code snippets."""

        response = client.chat.completions.create(
            model=DEPLOYMENT,
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_completion_tokens=2000,
        )

        result = json.loads(response.choices[0].message.content)
        return result

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============== SQLite Question Bank API Endpoints ==============

class QuestionBankItem(BaseModel):
    id: str
    question: str
    hints: List[str]
    expected_topics: List[str]
    code_snippet: Optional[str] = None
    options: Optional[List[str]] = None
    correct_option: Optional[int] = None
    blank_answer: Optional[str] = None
    topic: str
    subtopic: str
    difficulty: str
    bank: str = "easy"  # easy, medium, hard, code_review, advanced
    azure_bridge: Optional[dict] = None


class AnswerHistoryItem(BaseModel):
    question_id: str
    user_answer: str
    is_correct: bool
    score: int


class TopicMasteryUpdate(BaseModel):
    topic: str
    subtopic: str
    is_correct: bool


@app.get("/api/questions")
async def get_questions(topic: Optional[str] = None, subtopic: Optional[str] = None, difficulty: Optional[str] = None, bank: Optional[str] = None, banks: Optional[str] = None, limit: int = 50):
    """Get questions from the database with optional filters. Use 'banks' param for comma-separated list of banks."""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            query = "SELECT * FROM questions WHERE 1=1"
            params = []
            
            if topic:
                query += " AND topic = ?"
                params.append(topic)
            if subtopic:
                query += " AND subtopic = ?"
                params.append(subtopic)
            if difficulty:
                query += " AND difficulty = ?"
                params.append(difficulty)
            if bank:
                query += " AND bank = ?"
                params.append(bank)
            if banks:
                bank_list = banks.split(',')
                placeholders = ','.join(['?' for _ in bank_list])
                query += f" AND bank IN ({placeholders})"
                params.extend(bank_list)
            
            query += " ORDER BY RANDOM() LIMIT ?"
            params.append(limit)
            
            cursor.execute(query, params)
            rows = cursor.fetchall()
            
            questions = []
            for row in rows:
                q = dict(row)
                q['hints'] = json.loads(q['hints']) if q['hints'] else []
                q['expected_topics'] = json.loads(q['expected_topics']) if q['expected_topics'] else []
                q['options'] = json.loads(q['options']) if q['options'] else None
                q['azure_bridge'] = json.loads(q['azure_bridge']) if q['azure_bridge'] else None
                questions.append(q)
            
            return {"questions": questions, "count": len(questions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/questions")
async def add_question(question: QuestionBankItem):
    """Add a new question to the database"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT OR REPLACE INTO questions 
                (id, question, hints, expected_topics, code_snippet, options, correct_option, blank_answer, topic, subtopic, difficulty, bank, azure_bridge)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                question.id,
                question.question,
                json.dumps(question.hints),
                json.dumps(question.expected_topics),
                question.code_snippet,
                json.dumps(question.options) if question.options else None,
                question.correct_option,
                question.blank_answer,
                question.topic,
                question.subtopic,
                question.difficulty,
                question.bank,
                json.dumps(question.azure_bridge) if question.azure_bridge else None
            ))
            conn.commit()
            return {"status": "success", "id": question.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/questions/bulk")
async def add_questions_bulk(questions: List[QuestionBankItem]):
    """Add multiple questions to the database"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            for question in questions:
                cursor.execute('''
                    INSERT OR REPLACE INTO questions 
                    (id, question, hints, expected_topics, code_snippet, options, correct_option, blank_answer, topic, subtopic, difficulty, bank, azure_bridge)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (
                    question.id,
                    question.question,
                    json.dumps(question.hints),
                    json.dumps(question.expected_topics),
                    question.code_snippet,
                    json.dumps(question.options) if question.options else None,
                    question.correct_option,
                    question.blank_answer,
                    question.topic,
                    question.subtopic,
                    question.difficulty,
                    question.bank,
                    json.dumps(question.azure_bridge) if question.azure_bridge else None
                ))
            conn.commit()
            return {"status": "success", "count": len(questions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/answer-history")
async def record_answer(answer: AnswerHistoryItem):
    """Record an answer in the history"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO answer_history (question_id, user_answer, is_correct, score)
                VALUES (?, ?, ?, ?)
            ''', (answer.question_id, answer.user_answer, answer.is_correct, answer.score))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/answer-history")
async def get_answer_history(limit: int = 100):
    """Get recent answer history"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT ah.*, q.question, q.topic, q.subtopic 
                FROM answer_history ah
                LEFT JOIN questions q ON ah.question_id = q.id
                ORDER BY ah.answered_at DESC
                LIMIT ?
            ''', (limit,))
            rows = cursor.fetchall()
            return {"history": [dict(row) for row in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/topic-mastery")
async def update_topic_mastery(update: TopicMasteryUpdate):
    """Update topic mastery based on answer"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                INSERT INTO topic_mastery (topic, subtopic, correct_count, total_count, last_practiced)
                VALUES (?, ?, ?, 1, ?)
                ON CONFLICT(topic, subtopic) DO UPDATE SET
                    correct_count = correct_count + ?,
                    total_count = total_count + 1,
                    last_practiced = ?
            ''', (
                update.topic, 
                update.subtopic, 
                1 if update.is_correct else 0,
                datetime.now().isoformat(),
                1 if update.is_correct else 0,
                datetime.now().isoformat()
            ))
            conn.commit()
            return {"status": "success"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/topic-mastery")
async def get_topic_mastery():
    """Get all topic mastery data"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('SELECT * FROM topic_mastery ORDER BY topic, subtopic')
            rows = cursor.fetchall()
            
            mastery = {}
            for row in rows:
                r = dict(row)
                topic = r['topic']
                subtopic = r['subtopic']
                if topic not in mastery:
                    mastery[topic] = {}
                mastery[topic][subtopic] = {
                    'correct': r['correct_count'],
                    'total': r['total_count'],
                    'lastPracticed': r['last_practiced']
                }
            
            return {"mastery": mastery}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/weak-areas")
async def get_weak_areas():
    """Get topics where user is struggling (< 60% accuracy with at least 3 attempts)"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            cursor.execute('''
                SELECT topic, subtopic, correct_count, total_count,
                       CAST(correct_count AS FLOAT) / total_count as accuracy
                FROM topic_mastery
                WHERE total_count >= 3
                AND CAST(correct_count AS FLOAT) / total_count < 0.6
                ORDER BY accuracy ASC
            ''')
            rows = cursor.fetchall()
            return {"weak_areas": [dict(row) for row in rows]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/stats")
async def get_stats():
    """Get overall learning statistics"""
    try:
        with get_db() as conn:
            cursor = conn.cursor()
            
            cursor.execute('SELECT COUNT(*) as total, SUM(CASE WHEN is_correct THEN 1 ELSE 0 END) as correct FROM answer_history')
            answer_stats = dict(cursor.fetchone())
            
            cursor.execute('SELECT COUNT(*) as count FROM questions')
            question_count = cursor.fetchone()['count']
            
            cursor.execute('SELECT AVG(score) as avg_score FROM answer_history')
            avg_score = cursor.fetchone()['avg_score'] or 0
            
            cursor.execute('SELECT COUNT(DISTINCT topic) as count FROM topic_mastery')
            topics_practiced = cursor.fetchone()['count']
            
            return {
                "total_answered": answer_stats['total'] or 0,
                "total_correct": answer_stats['correct'] or 0,
                "accuracy": (answer_stats['correct'] / answer_stats['total'] * 100) if answer_stats['total'] else 0,
                "avg_score": round(avg_score, 1),
                "questions_in_bank": question_count,
                "topics_practiced": topics_practiced
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
