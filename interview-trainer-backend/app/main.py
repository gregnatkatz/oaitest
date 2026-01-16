from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Literal
from openai import AzureOpenAI
from dotenv import load_dotenv
import os
import json

load_dotenv()

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
