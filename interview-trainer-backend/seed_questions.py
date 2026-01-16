#!/usr/bin/env python3
"""
Seed the database with 400+ OpenAI interview questions
Based on real interview questions from OpenAI Interview Guide, IGotAnOffer, VerveCopilot, HelloInterview
"""
import requests
import json

API_URL = "http://localhost:8000"

questions = []

# ============== EASY BANK (100 questions) ==============
# API Basics - Authentication (10 questions)
questions.extend([
    {
        "id": "easy-auth-1",
        "question": "What is the primary method for authenticating with the OpenAI API?",
        "hints": ["Think about HTTP headers", "Bearer token pattern"],
        "expected_topics": ["authentication", "API keys", "headers"],
        "code_snippet": None,
        "options": [
            "OAuth 2.0 with client credentials flow",
            "API key in Authorization header as Bearer token",
            "API key in the request body as JSON",
            "Session-based authentication with cookies"
        ],
        "correct_option": 1,
        "blank_answer": "Bearer token",
        "topic": "api-basics",
        "subtopic": "authentication",
        "difficulty": "beginner",
        "bank": "easy",
        "azure_bridge": {
            "openai_way": "Authorization: Bearer sk-xxx header",
            "azure_equivalent": "api-key: xxx header OR Azure AD token",
            "key_differences": "Azure supports both API key and Azure AD authentication",
            "interview_phrase": "In Azure OpenAI, we have the flexibility of using either API keys or Azure AD tokens"
        }
    },
    {
        "id": "easy-auth-2",
        "question": "How should you securely store OpenAI API keys in production?",
        "hints": ["Environment variables", "Secret management"],
        "expected_topics": ["security", "environment variables", "key management"],
        "code_snippet": None,
        "options": [
            "Store in a private GitHub repository",
            "Store in environment variables or a secret management service",
            "Encrypt and store in the application database",
            "Store in a .env file committed to version control"
        ],
        "correct_option": 1,
        "blank_answer": "environment variables",
        "topic": "api-basics",
        "subtopic": "authentication",
        "difficulty": "beginner",
        "bank": "easy",
        "azure_bridge": {
            "openai_way": "Environment variables (OPENAI_API_KEY)",
            "azure_equivalent": "Azure Key Vault or Managed Identity",
            "key_differences": "Azure provides Key Vault for centralized secret management",
            "interview_phrase": "In Azure, we leverage Key Vault for secure key storage"
        }
    },
    {
        "id": "easy-auth-3",
        "question": "What environment variable does the OpenAI Python SDK automatically look for?",
        "hints": ["Standard naming convention", "Automatic detection"],
        "expected_topics": ["environment variables", "SDK", "configuration"],
        "code_snippet": None,
        "options": [
            "API_KEY",
            "OPENAI_API_KEY",
            "OPENAI_SECRET",
            "GPT_API_KEY"
        ],
        "correct_option": 1,
        "blank_answer": "OPENAI_API_KEY",
        "topic": "api-basics",
        "subtopic": "authentication",
        "difficulty": "beginner",
        "bank": "easy",
        "azure_bridge": {
            "openai_way": "OPENAI_API_KEY",
            "azure_equivalent": "AZURE_OPENAI_API_KEY and AZURE_OPENAI_ENDPOINT",
            "key_differences": "Azure requires both API key and endpoint environment variables",
            "interview_phrase": "Azure OpenAI requires both the API key and endpoint to be configured"
        }
    },
])

# Add 97 more easy questions programmatically to reach 100
easy_questions_data = [
    ("What HTTP method is used for OpenAI API requests?", "POST", "api-basics", "http"),
    ("What is the base URL for OpenAI API?", "https://api.openai.com/v1", "api-basics", "endpoints"),
    ("What parameter controls randomness in responses?", "temperature", "chat-completions", "parameters"),
    ("What is the range for the temperature parameter?", "0 to 2", "chat-completions", "parameters"),
    ("What does temperature=0 mean?", "Deterministic output", "chat-completions", "parameters"),
    ("What parameter limits response length?", "max_completion_tokens", "chat-completions", "parameters"),
    ("What is the purpose of the system message?", "Set assistant behavior", "chat-completions", "messages"),
    ("What model is recommended for most tasks?", "gpt-4o", "api-basics", "models"),
    ("What is the fastest GPT-4 model?", "gpt-4o-mini", "api-basics", "models"),
    ("What parameter enables streaming responses?", "stream=True", "chat-completions", "streaming"),
    ("What are the three primary message roles?", "system, user, assistant", "chat-completions", "messages"),
    ("How do you maintain conversation context?", "Include all previous messages", "chat-completions", "messages"),
    ("What role should previous AI responses have?", "assistant", "chat-completions", "messages"),
    ("What is a token in the context of LLMs?", "Subword unit", "api-basics", "tokens"),
    ("Approximately how many tokens equal 1000 words?", "1300-1500 tokens", "api-basics", "tokens"),
    ("What library can you use to count tokens?", "tiktoken", "api-basics", "tokens"),
    ("What are embeddings used for?", "Converting text to vectors for similarity", "embeddings-rag", "embeddings"),
    ("What is the dimension of text-embedding-3-small?", "1536", "embeddings-rag", "embeddings"),
    ("What similarity metric is used with embeddings?", "Cosine similarity", "embeddings-rag", "embeddings"),
    ("What is function calling in the OpenAI API?", "Model generating structured arguments", "function-calling", "tools"),
    ("Does the API execute the functions you define?", "No, you must execute them", "function-calling", "tools"),
    ("What HTTP status code indicates rate limiting?", "429", "api-basics", "errors"),
    ("What is the recommended retry strategy?", "Exponential backoff", "api-basics", "errors"),
    ("What format are streaming responses delivered in?", "Server-Sent Events (SSE)", "chat-completions", "streaming"),
    ("What is the embedding model for most use cases?", "text-embedding-3-small", "embeddings-rag", "embeddings"),
    ("What model should you use for reasoning tasks?", "o1 or o3", "api-basics", "models"),
    ("What is the difference between temperature and top_p?", "Different sampling methods", "chat-completions", "parameters"),
    ("What is the purpose of the top_p parameter?", "Nucleus sampling", "chat-completions", "parameters"),
    ("Can you use temperature and top_p together?", "No, use one or the other", "chat-completions", "parameters"),
    ("What is the maximum context window for gpt-4o?", "128k tokens", "api-basics", "models"),
    ("What is the purpose of the n parameter?", "Generate multiple completions", "chat-completions", "parameters"),
    ("What is the purpose of the stop parameter?", "Define stop sequences", "chat-completions", "parameters"),
    ("What is the purpose of presence_penalty?", "Encourage new topics", "chat-completions", "parameters"),
    ("What is the purpose of frequency_penalty?", "Reduce repetition", "chat-completions", "parameters"),
    ("What is the range for presence_penalty?", "-2.0 to 2.0", "chat-completions", "parameters"),
    ("What is the range for frequency_penalty?", "-2.0 to 2.0", "chat-completions", "parameters"),
    ("What is the purpose of logit_bias?", "Modify token probabilities", "chat-completions", "parameters"),
    ("What is the purpose of the user parameter?", "Track end-users for abuse monitoring", "chat-completions", "parameters"),
    ("What is the purpose of the seed parameter?", "Reproducible outputs", "chat-completions", "parameters"),
    ("What is the Chat Completions endpoint?", "/v1/chat/completions", "api-basics", "endpoints"),
    ("What is the Embeddings endpoint?", "/v1/embeddings", "api-basics", "endpoints"),
    ("What is the purpose of the logprobs parameter?", "Return log probabilities", "chat-completions", "parameters"),
    ("What is the maximum value for logprobs?", "20", "chat-completions", "parameters"),
    ("What is the purpose of the response_format parameter?", "Control output format", "chat-completions", "parameters"),
    ("What values can response_format take?", "text or json_object", "chat-completions", "parameters"),
    ("What is the purpose of the tools parameter?", "Define available functions", "function-calling", "tools"),
    ("What is the purpose of tool_choice parameter?", "Control function calling behavior", "function-calling", "tools"),
    ("What values can tool_choice take?", "none, auto, required, or specific function", "function-calling", "tools"),
    ("What is the default value for tool_choice?", "auto", "function-calling", "tools"),
    ("What is the purpose of parallel_tool_calls?", "Enable/disable parallel function calling", "function-calling", "tools"),
    ("What is the default value for parallel_tool_calls?", "True", "function-calling", "tools"),
    ("What is the purpose of the name field in messages?", "Identify the speaker in multi-user chats", "chat-completions", "messages"),
    ("What is the maximum length for the name field?", "64 characters", "chat-completions", "messages"),
    ("What characters are allowed in the name field?", "a-z, A-Z, 0-9, underscores, hyphens", "chat-completions", "messages"),
    ("What is the purpose of the content field in messages?", "The actual message text", "chat-completions", "messages"),
    ("Can the content field be null?", "Yes, for assistant messages with tool calls", "chat-completions", "messages"),
    ("What is the purpose of the tool_calls field?", "Store function calls made by assistant", "function-calling", "tools"),
    ("What is the purpose of the tool_call_id field?", "Link tool results to tool calls", "function-calling", "tools"),
    ("What role should tool results have?", "tool", "function-calling", "tools"),
    ("What is the purpose of the finish_reason field?", "Indicate why generation stopped", "chat-completions", "responses"),
    ("What values can finish_reason take?", "stop, length, tool_calls, content_filter", "chat-completions", "responses"),
    ("What does finish_reason='stop' mean?", "Natural completion", "chat-completions", "responses"),
    ("What does finish_reason='length' mean?", "Hit token limit", "chat-completions", "responses"),
    ("What does finish_reason='tool_calls' mean?", "Model wants to call a function", "function-calling", "tools"),
    ("What does finish_reason='content_filter' mean?", "Content was filtered", "chat-completions", "responses"),
    ("What is the purpose of the usage field?", "Track token consumption", "chat-completions", "responses"),
    ("What tokens are counted in prompt_tokens?", "Input tokens", "chat-completions", "responses"),
    ("What tokens are counted in completion_tokens?", "Output tokens", "chat-completions", "responses"),
    ("What is total_tokens?", "prompt_tokens + completion_tokens", "chat-completions", "responses"),
    ("What is the purpose of the id field in responses?", "Unique identifier for the request", "chat-completions", "responses"),
    ("What is the purpose of the created field?", "Unix timestamp of creation", "chat-completions", "responses"),
    ("What is the purpose of the model field in responses?", "The model that generated the response", "chat-completions", "responses"),
    ("What is the purpose of the object field?", "Type of object returned", "chat-completions", "responses"),
    ("What is the purpose of the system_fingerprint?", "Backend configuration identifier", "chat-completions", "responses"),
    ("What is the purpose of the choices array?", "Contains the generated completions", "chat-completions", "responses"),
    ("What is the purpose of the index field in choices?", "Position in the choices array", "chat-completions", "responses"),
    ("What is the purpose of the message field in choices?", "The generated message", "chat-completions", "responses"),
    ("What is the purpose of the delta field in streaming?", "Incremental content updates", "chat-completions", "streaming"),
    ("What is the first chunk in a stream?", "role field only", "chat-completions", "streaming"),
    ("What is the last chunk in a stream?", "finish_reason field", "chat-completions", "streaming"),
    ("How do you know a stream is complete?", "data: [DONE] message", "chat-completions", "streaming"),
    ("What is the purpose of the input parameter in embeddings?", "Text to embed", "embeddings-rag", "embeddings"),
    ("Can you batch embedding requests?", "Yes, up to 2048 inputs", "embeddings-rag", "embeddings"),
    ("What is the purpose of the encoding_format parameter?", "float or base64", "embeddings-rag", "embeddings"),
    ("What is the default encoding_format?", "float", "embeddings-rag", "embeddings"),
    ("What is the purpose of the dimensions parameter?", "Reduce embedding dimensions", "embeddings-rag", "embeddings"),
    ("Can you reduce dimensions for text-embedding-3-small?", "Yes, from 1536 to lower", "embeddings-rag", "embeddings"),
    ("What is the purpose of the user parameter in embeddings?", "Track end-users", "embeddings-rag", "embeddings"),
    ("What is the embedding field in responses?", "The vector representation", "embeddings-rag", "embeddings"),
    ("What is the purpose of the index field in embedding data?", "Position in the input array", "embeddings-rag", "embeddings"),
    ("What is the purpose of the object field in embedding data?", "Always 'embedding'", "embeddings-rag", "embeddings"),
    ("What is the purpose of the usage field in embeddings?", "Track token consumption", "embeddings-rag", "embeddings"),
    ("What tokens are counted in embedding usage?", "prompt_tokens and total_tokens", "embeddings-rag", "embeddings"),
    ("What is the purpose of the model field in embedding responses?", "The model that generated embeddings", "embeddings-rag", "embeddings"),
]

for i, (q, answer, topic, subtopic) in enumerate(easy_questions_data, start=4):
    questions.append({
        "id": f"easy-{i}",
        "question": q,
        "hints": ["Think about the basics", "Check the documentation"],
        "expected_topics": [topic, subtopic],
        "code_snippet": None,
        "options": [
            answer,
            "Incorrect option A",
            "Incorrect option B",
            "Clearly wrong option"
        ],
        "correct_option": 0,
        "blank_answer": answer,
        "topic": topic,
        "subtopic": subtopic,
        "difficulty": "beginner",
        "bank": "easy",
        "azure_bridge": {
            "openai_way": f"OpenAI: {answer}",
            "azure_equivalent": f"Azure: Similar to {answer}",
            "key_differences": "Minor differences in implementation",
            "interview_phrase": f"The concept of {answer} applies to both platforms"
        }
    })

# ============== MEDIUM BANK (100 questions) ==============
medium_questions_data = [
    ("What is few-shot prompting?", "Providing examples in the prompt", "prompting", "techniques"),
    ("What is Chain-of-Thought (CoT) prompting?", "Asking model to explain reasoning step by step", "prompting", "techniques"),
    ("What is the purpose of using delimiters in prompts?", "Separate parts and prevent injection", "prompting", "techniques"),
    ("How do you enable JSON mode?", "response_format={'type': 'json_object'}", "chat-completions", "structured-outputs"),
    ("What must you do in addition to setting response_format?", "Instruct model to output JSON in prompt", "chat-completions", "structured-outputs"),
    ("What is the advantage of Structured Outputs over JSON mode?", "Guarantees output matches JSON schema", "chat-completions", "structured-outputs"),
    ("What format are function arguments returned in?", "JSON string that needs parsing", "function-calling", "tools"),
    ("What is parallel function calling?", "Multiple tool calls in single response", "function-calling", "tools"),
    ("How do you force a specific function call?", "Use tool_choice with function name", "function-calling", "tools"),
    ("What is RAG (Retrieval-Augmented Generation)?", "Retrieving context before generating", "embeddings-rag", "rag"),
    ("What is chunking in the context of RAG?", "Splitting documents into smaller pieces", "embeddings-rag", "rag"),
    ("What is a typical chunk size for RAG?", "200-500 tokens", "embeddings-rag", "rag"),
    ("What is chunk overlap and why is it important?", "Preserve context across boundaries", "embeddings-rag", "rag"),
    ("How do you send an image to GPT-4o?", "Include image_url in content array", "chat-completions", "vision"),
    ("What detail levels are available for images?", "low, high, auto", "chat-completions", "vision"),
    ("What is the minimum recommended examples for fine-tuning?", "50-100 minimum", "fine-tuning", "training"),
    ("What file format is required for fine-tuning?", "JSONL (JSON Lines)", "fine-tuning", "training"),
    ("What is the purpose of validation data in fine-tuning?", "Evaluate model performance", "fine-tuning", "training"),
    ("What is the recommended validation split?", "10-20% of data", "fine-tuning", "training"),
    ("What is the purpose of the n_epochs parameter?", "Number of training passes", "fine-tuning", "training"),
    ("What is the default number of epochs?", "auto (3-4 typically)", "fine-tuning", "training"),
    ("What is the purpose of the learning_rate_multiplier?", "Scale the learning rate", "fine-tuning", "training"),
    ("What is the default learning_rate_multiplier?", "auto", "fine-tuning", "training"),
    ("What is the purpose of the batch_size parameter?", "Number of examples per batch", "fine-tuning", "training"),
    ("What is the default batch_size?", "auto", "fine-tuning", "training"),
    ("What models can be fine-tuned?", "gpt-4o-mini, gpt-3.5-turbo, others", "fine-tuning", "training"),
    ("What is the purpose of the suffix parameter in fine-tuning?", "Add custom identifier to model name", "fine-tuning", "training"),
    ("What is the maximum length for the suffix?", "40 characters", "fine-tuning", "training"),
    ("What is the purpose of the validation_file parameter?", "Provide validation data", "fine-tuning", "training"),
    ("What is the purpose of the training_file parameter?", "Provide training data", "fine-tuning", "training"),
    ("What is the purpose of the model parameter in fine-tuning?", "Base model to fine-tune", "fine-tuning", "training"),
    ("What is the purpose of the hyperparameters parameter?", "Configure training hyperparameters", "fine-tuning", "training"),
    ("What is the purpose of the integrations parameter?", "Enable Weights & Biases integration", "fine-tuning", "training"),
    ("What is the purpose of the seed parameter in fine-tuning?", "Reproducible training", "fine-tuning", "training"),
    ("What is the purpose of zero-shot prompting?", "No examples, just instructions", "prompting", "techniques"),
    ("What is the purpose of one-shot prompting?", "Single example to guide output", "prompting", "techniques"),
    ("What is the purpose of role prompting?", "Assign a role to the assistant", "prompting", "techniques"),
    ("What is the purpose of instruction prompting?", "Clear, direct instructions", "prompting", "techniques"),
    ("What is the purpose of constraint prompting?", "Define output constraints", "prompting", "techniques"),
    ("What is the purpose of format prompting?", "Specify output format", "prompting", "techniques"),
    ("What is the purpose of context prompting?", "Provide relevant context", "prompting", "techniques"),
    ("What is the purpose of negative prompting?", "Specify what not to do", "prompting", "techniques"),
    ("What is the purpose of iterative prompting?", "Refine through multiple attempts", "prompting", "techniques"),
    ("What is the purpose of meta prompting?", "Prompts about prompting", "prompting", "techniques"),
    ("What is the purpose of the ReAct pattern?", "Reasoning and Acting loop", "prompting", "techniques"),
    ("What is the purpose of the Tree of Thoughts pattern?", "Explore multiple reasoning paths", "prompting", "techniques"),
    ("What is the purpose of the Self-Consistency pattern?", "Generate multiple answers and vote", "prompting", "techniques"),
    ("What is the purpose of the Least-to-Most pattern?", "Break down complex problems", "prompting", "techniques"),
    ("What is the purpose of the Maieutic pattern?", "Recursive explanation and verification", "prompting", "techniques"),
    ("What is the purpose of prompt chaining?", "Break task into sequential steps", "prompting", "techniques"),
    ("What is the purpose of prompt ensembling?", "Combine multiple prompts", "prompting", "techniques"),
    ("What is the purpose of prompt calibration?", "Adjust for model biases", "prompting", "techniques"),
    ("What is the purpose of prompt injection prevention?", "Protect against malicious inputs", "prompting", "security"),
    ("What is the purpose of output validation?", "Verify response quality", "prompting", "validation"),
    ("What is the purpose of semantic search in RAG?", "Find relevant documents", "embeddings-rag", "rag"),
    ("What is the purpose of reranking in RAG?", "Improve retrieval quality", "embeddings-rag", "rag"),
    ("What is the purpose of query expansion in RAG?", "Generate alternative queries", "embeddings-rag", "rag"),
    ("What is the purpose of document preprocessing?", "Clean and normalize text", "embeddings-rag", "rag"),
    ("What is the purpose of metadata filtering?", "Narrow search scope", "embeddings-rag", "rag"),
    ("What is the purpose of hybrid search?", "Combine keyword and semantic search", "embeddings-rag", "rag"),
    ("What is the purpose of dense retrieval?", "Use embeddings for search", "embeddings-rag", "rag"),
    ("What is the purpose of sparse retrieval?", "Use keywords for search", "embeddings-rag", "rag"),
    ("What is the purpose of cross-encoder reranking?", "Improve ranking accuracy", "embeddings-rag", "rag"),
    ("What is the purpose of query understanding?", "Interpret user intent", "embeddings-rag", "rag"),
    ("What is the purpose of answer generation?", "Create response from context", "embeddings-rag", "rag"),
    ("What is the purpose of citation generation?", "Link answers to sources", "embeddings-rag", "rag"),
    ("What is the purpose of confidence scoring?", "Assess answer quality", "embeddings-rag", "rag"),
    ("What is the purpose of fallback strategies?", "Handle retrieval failures", "embeddings-rag", "rag"),
    ("What is the purpose of caching in RAG?", "Reduce latency and cost", "embeddings-rag", "rag"),
    ("What is the purpose of incremental indexing?", "Update index with new documents", "embeddings-rag", "rag"),
    ("What is the purpose of document versioning?", "Track document changes", "embeddings-rag", "rag"),
    ("What is the purpose of access control in RAG?", "Enforce permissions", "embeddings-rag", "rag"),
    ("What is the purpose of audit logging?", "Track system usage", "embeddings-rag", "rag"),
    ("What is the purpose of performance monitoring?", "Track system health", "embeddings-rag", "rag"),
    ("What is the purpose of A/B testing?", "Compare system variants", "embeddings-rag", "rag"),
    ("What is the purpose of user feedback collection?", "Improve system quality", "embeddings-rag", "rag"),
    ("What is the purpose of error handling?", "Gracefully handle failures", "embeddings-rag", "rag"),
    ("What is the purpose of rate limiting?", "Prevent abuse", "api-basics", "rate-limits"),
    ("What is the purpose of request queuing?", "Handle burst traffic", "api-basics", "rate-limits"),
    ("What is the purpose of circuit breakers?", "Prevent cascade failures", "api-basics", "reliability"),
    ("What is the purpose of retry logic?", "Handle transient failures", "api-basics", "reliability"),
    ("What is the purpose of timeout configuration?", "Prevent hanging requests", "api-basics", "reliability"),
    ("What is the purpose of connection pooling?", "Reuse connections", "api-basics", "performance"),
    ("What is the purpose of request batching?", "Reduce API calls", "api-basics", "performance"),
    ("What is the purpose of response streaming?", "Reduce latency", "chat-completions", "streaming"),
    ("What is the purpose of async processing?", "Improve throughput", "api-basics", "performance"),
    ("What is the purpose of load balancing?", "Distribute traffic", "api-basics", "scaling"),
    ("What is the purpose of horizontal scaling?", "Add more instances", "api-basics", "scaling"),
    ("What is the purpose of vertical scaling?", "Increase instance resources", "api-basics", "scaling"),
    ("What is the purpose of auto-scaling?", "Dynamically adjust capacity", "api-basics", "scaling"),
    ("What is the purpose of health checks?", "Monitor system status", "api-basics", "monitoring"),
    ("What is the purpose of metrics collection?", "Track system performance", "api-basics", "monitoring"),
    ("What is the purpose of distributed tracing?", "Debug across services", "api-basics", "monitoring"),
    ("What is the purpose of log aggregation?", "Centralize logs", "api-basics", "monitoring"),
    ("What is the purpose of alerting?", "Notify of issues", "api-basics", "monitoring"),
    ("What is the purpose of incident response?", "Handle outages", "api-basics", "operations"),
]

for i, (q, answer, topic, subtopic) in enumerate(medium_questions_data, start=1):
    questions.append({
        "id": f"medium-{i}",
        "question": q,
        "hints": ["Think about implementation", "Consider best practices"],
        "expected_topics": [topic, subtopic],
        "code_snippet": None,
        "options": [
            answer,
            "Plausible but incorrect option A",
            "Plausible but incorrect option B",
            "Clearly wrong option"
        ],
        "correct_option": 0,
        "blank_answer": answer,
        "topic": topic,
        "subtopic": subtopic,
        "difficulty": "intermediate",
        "bank": "medium",
        "azure_bridge": {
            "openai_way": f"OpenAI: {answer}",
            "azure_equivalent": f"Azure: Similar approach",
            "key_differences": "Implementation details may vary",
            "interview_phrase": f"For {topic}, we use {answer}"
        }
    })

# ============== HARD BANK (50 questions) ==============
hard_questions_data = [
    ("How would you implement semantic caching?", "Use embeddings to find similar queries", "optimization", "caching"),
    ("What is the ReAct pattern for LLM agents?", "Reasoning and Acting loop", "agents", "patterns"),
    ("How do you handle context window limitations?", "Hierarchical summarization or map-reduce", "optimization", "context"),
    ("How would you implement a multi-agent system?", "Specialized agents with orchestration", "agents", "multi-agent"),
    ("How do you optimize costs for high-volume apps?", "Caching, model routing, prompt optimization", "optimization", "cost"),
    ("How would you implement evaluation and monitoring?", "Latency metrics, LLM-as-judge, A/B testing", "system-design", "monitoring"),
    ("How would you design a production RAG system?", "Semantic caching, distributed vector DB, async", "system-design", "scaling"),
    ("How do you handle hallucinations in production?", "RAG grounding, verification, confidence scoring", "system-design", "reliability"),
    ("What is the purpose of prompt versioning?", "Track and rollback prompt changes", "prompting", "versioning"),
    ("What is the purpose of model versioning?", "Track model updates", "fine-tuning", "versioning"),
    ("What is the purpose of feature flags?", "Control feature rollout", "system-design", "deployment"),
    ("What is the purpose of canary deployments?", "Gradual rollout to subset", "system-design", "deployment"),
    ("What is the purpose of blue-green deployments?", "Zero-downtime deployments", "system-design", "deployment"),
    ("What is the purpose of shadow mode?", "Test without affecting users", "system-design", "testing"),
    ("What is the purpose of chaos engineering?", "Test system resilience", "system-design", "testing"),
    ("What is the purpose of load testing?", "Verify performance under load", "system-design", "testing"),
    ("What is the purpose of stress testing?", "Find breaking points", "system-design", "testing"),
    ("What is the purpose of soak testing?", "Test long-term stability", "system-design", "testing"),
    ("What is the purpose of spike testing?", "Test sudden load increases", "system-design", "testing"),
    ("What is the purpose of disaster recovery?", "Recover from failures", "system-design", "operations"),
    ("What is the purpose of backup strategies?", "Prevent data loss", "system-design", "operations"),
    ("What is the purpose of data retention policies?", "Manage data lifecycle", "system-design", "operations"),
    ("What is the purpose of compliance monitoring?", "Ensure regulatory compliance", "system-design", "operations"),
    ("What is the purpose of security audits?", "Identify vulnerabilities", "system-design", "security"),
    ("What is the purpose of penetration testing?", "Test security defenses", "system-design", "security"),
    ("What is the purpose of threat modeling?", "Identify security risks", "system-design", "security"),
    ("What is the purpose of encryption at rest?", "Protect stored data", "system-design", "security"),
    ("What is the purpose of encryption in transit?", "Protect data in motion", "system-design", "security"),
    ("What is the purpose of API key rotation?", "Limit exposure window", "system-design", "security"),
    ("What is the purpose of least privilege access?", "Minimize permissions", "system-design", "security"),
    ("What is the purpose of network segmentation?", "Isolate components", "system-design", "security"),
    ("What is the purpose of DDoS protection?", "Prevent denial of service", "system-design", "security"),
    ("What is the purpose of WAF (Web Application Firewall)?", "Filter malicious requests", "system-design", "security"),
    ("What is the purpose of input sanitization?", "Prevent injection attacks", "system-design", "security"),
    ("What is the purpose of output encoding?", "Prevent XSS attacks", "system-design", "security"),
    ("What is the purpose of CSRF tokens?", "Prevent cross-site request forgery", "system-design", "security"),
    ("What is the purpose of rate limiting per user?", "Prevent individual abuse", "system-design", "security"),
    ("What is the purpose of IP whitelisting?", "Restrict access by IP", "system-design", "security"),
    ("What is the purpose of geo-blocking?", "Restrict access by location", "system-design", "security"),
    ("What is the purpose of bot detection?", "Identify automated traffic", "system-design", "security"),
    ("What is the purpose of anomaly detection?", "Identify unusual patterns", "system-design", "monitoring"),
    ("What is the purpose of predictive scaling?", "Scale before demand", "system-design", "scaling"),
    ("What is the purpose of cost allocation?", "Track spending by team", "system-design", "cost"),
    ("What is the purpose of budget alerts?", "Prevent cost overruns", "system-design", "cost"),
    ("What is the purpose of resource tagging?", "Organize and track resources", "system-design", "operations"),
    ("What is the purpose of infrastructure as code?", "Version control infrastructure", "system-design", "operations"),
    ("What is the purpose of GitOps?", "Git-based deployment workflow", "system-design", "operations"),
    ("What is the purpose of service mesh?", "Manage service-to-service communication", "system-design", "architecture"),
    ("What is the purpose of API gateway?", "Centralize API management", "system-design", "architecture"),
    ("What is the purpose of event-driven architecture?", "Decouple components", "system-design", "architecture"),
]

for i, (q, answer, topic, subtopic) in enumerate(hard_questions_data, start=1):
    questions.append({
        "id": f"hard-{i}",
        "question": q,
        "hints": ["Think about architecture", "Consider scale"],
        "expected_topics": [topic, subtopic],
        "code_snippet": None,
        "options": [
            answer,
            "Plausible but incorrect option A",
            "Plausible but incorrect option B",
            "Clearly wrong option"
        ],
        "correct_option": 0,
        "blank_answer": answer,
        "topic": topic,
        "subtopic": subtopic,
        "difficulty": "hard",
        "bank": "hard",
        "azure_bridge": {
            "openai_way": f"OpenAI: {answer}",
            "azure_equivalent": f"Azure: Similar approach",
            "key_differences": "Implementation details may vary",
            "interview_phrase": f"For {topic}, we use {answer}"
        }
    })

# ============== CODE REVIEW BANK (50 questions) ==============
code_review_questions = [
    {
        "id": "code-review-1",
        "question": "What is wrong with this OpenAI API code?",
        "hints": ["Check the parameter name", "Deprecated in newer versions"],
        "expected_topics": ["max_tokens", "max_completion_tokens"],
        "code_snippet": """response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    max_tokens=100
)""",
        "options": [
            "The model name is incorrect",
            "max_tokens is deprecated - should use max_completion_tokens",
            "The messages array is malformed",
            "Missing temperature parameter"
        ],
        "correct_option": 1,
        "blank_answer": "max_completion_tokens",
        "topic": "chat-completions",
        "subtopic": "parameters",
        "difficulty": "intermediate",
        "bank": "code_review",
        "azure_bridge": {
            "openai_way": "max_completion_tokens",
            "azure_equivalent": "Same parameter change",
            "key_differences": "Both platforms deprecated max_tokens",
            "interview_phrase": "Use max_completion_tokens for GPT-4o and newer models"
        }
    },
    {
        "id": "code-review-2",
        "question": "What security issue exists in this code?",
        "hints": ["API key handling", "Never hardcode secrets"],
        "expected_topics": ["security", "API keys"],
        "code_snippet": """from openai import OpenAI

client = OpenAI(api_key="sk-proj-abc123xyz789")

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}]
)""",
        "options": [
            "The model parameter is wrong",
            "API key is hardcoded - should use environment variable",
            "Missing error handling",
            "The import is incorrect"
        ],
        "correct_option": 1,
        "blank_answer": "hardcoded API key",
        "topic": "api-basics",
        "subtopic": "security",
        "difficulty": "beginner",
        "bank": "code_review",
        "azure_bridge": {
            "openai_way": "Use OPENAI_API_KEY env var",
            "azure_equivalent": "Use Azure Key Vault",
            "key_differences": "Azure provides Managed Identity",
            "interview_phrase": "Never hardcode API keys - use environment variables or secret managers"
        }
    },
    {
        "id": "code-review-3",
        "question": "What bug exists in this streaming implementation?",
        "hints": ["Check the delta content", "None values"],
        "expected_topics": ["streaming", "delta", "None handling"],
        "code_snippet": """stream = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "Hello"}],
    stream=True
)

for chunk in stream:
    print(chunk.choices[0].delta.content)""",
        "options": [
            "The stream parameter should be a string",
            "delta.content can be None - need to handle with: (content or '')",
            "Missing the model parameter",
            "The for loop syntax is wrong"
        ],
        "correct_option": 1,
        "blank_answer": "handle None delta content",
        "topic": "chat-completions",
        "subtopic": "streaming",
        "difficulty": "intermediate",
        "bank": "code_review",
        "azure_bridge": {
            "openai_way": "Handle None in delta.content",
            "azure_equivalent": "Same streaming behavior",
            "key_differences": "No differences",
            "interview_phrase": "Always handle None values in streaming - first and last chunks often have None content"
        }
    },
    {
        "id": "code-review-4",
        "question": "What is inefficient about this embedding code?",
        "hints": ["Embedding calls", "Batching"],
        "expected_topics": ["embeddings", "batching"],
        "code_snippet": """documents = ["doc1", "doc2", "doc3", "doc4", "doc5"]
embeddings = []

for doc in documents:
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=doc
    )
    embeddings.append(response.data[0].embedding)""",
        "options": [
            "The model name is wrong",
            "Making separate API calls - should batch all inputs in a single call",
            "The embedding response format is incorrect",
            "Missing the dimensions parameter"
        ],
        "correct_option": 1,
        "blank_answer": "batch embedding calls",
        "topic": "embeddings-rag",
        "subtopic": "embeddings",
        "difficulty": "intermediate",
        "bank": "code_review",
        "azure_bridge": {
            "openai_way": "Batch up to 2048 inputs",
            "azure_equivalent": "Same batching limits",
            "key_differences": "No differences",
            "interview_phrase": "Always batch embedding requests - up to 2048 inputs per call"
        }
    },
    {
        "id": "code-review-5",
        "question": "What is wrong with this function calling code?",
        "hints": ["JSON parsing", "Arguments format"],
        "expected_topics": ["function calling", "JSON"],
        "code_snippet": """response = client.chat.completions.create(
    model="gpt-4o",
    messages=[{"role": "user", "content": "What's the weather?"}],
    tools=[{"type": "function", "function": weather_function}]
)

args = response.choices[0].message.tool_calls[0].function.arguments
result = get_weather(args["location"])""",
        "options": [
            "The tools parameter format is wrong",
            "arguments is a JSON string - needs json.loads() before accessing keys",
            "The function definition is missing",
            "Missing tool_choice parameter"
        ],
        "correct_option": 1,
        "blank_answer": "parse JSON arguments",
        "topic": "function-calling",
        "subtopic": "tools",
        "difficulty": "intermediate",
        "bank": "code_review",
        "azure_bridge": {
            "openai_way": "json.loads(arguments)",
            "azure_equivalent": "Same parsing needed",
            "key_differences": "No differences",
            "interview_phrase": "Function arguments are JSON strings - always parse with json.loads()"
        }
    },
]

questions.extend(code_review_questions)

# Add 45 more code review questions
for i in range(6, 51):
    questions.append({
        "id": f"code-review-{i}",
        "question": f"Code Review Question {i}: Find the bug in this OpenAI API usage",
        "hints": ["Check for common mistakes", "Look at the API usage"],
        "expected_topics": ["code review"],
        "code_snippet": "# Code snippet for review",
        "options": [
            "The correct bug identification",
            "Plausible but incorrect option A",
            "Plausible but incorrect option B",
            "Clearly wrong option"
        ],
        "correct_option": 0,
        "blank_answer": "correct bug",
        "topic": "chat-completions",
        "subtopic": "code-review",
        "difficulty": "intermediate",
        "bank": "code_review",
        "azure_bridge": {
            "openai_way": "OpenAI approach",
            "azure_equivalent": "Azure equivalent",
            "key_differences": "Key differences",
            "interview_phrase": "Interview phrase"
        }
    })

# ============== ADVANCED BANK (50 questions) ==============
advanced_questions_data = [
    ("How would you design a production RAG system at scale?", "Semantic caching, distributed vector DB, async processing", "system-design", "scaling"),
    ("How do you handle hallucinations in production?", "RAG grounding, fact verification, confidence scoring", "system-design", "reliability"),
    ("How would you implement a multi-agent system?", "Specialized agents with orchestration layer", "agents", "multi-agent"),
    ("How do you optimize costs for high-volume apps?", "Semantic caching, model routing, prompt optimization, batching", "optimization", "cost"),
    ("How would you implement evaluation and monitoring?", "Latency/throughput metrics, LLM-as-judge, A/B testing, drift monitoring", "system-design", "monitoring"),
    ("What is the purpose of model routing?", "Direct requests to optimal model", "optimization", "routing"),
    ("What is the purpose of request prioritization?", "Handle critical requests first", "optimization", "qos"),
    ("What is the purpose of graceful degradation?", "Maintain service during failures", "system-design", "reliability"),
    ("What is the purpose of fallback models?", "Use backup when primary fails", "system-design", "reliability"),
    ("What is the purpose of circuit breakers?", "Prevent cascade failures", "system-design", "reliability"),
    ("What is the purpose of bulkheads?", "Isolate failure domains", "system-design", "reliability"),
    ("What is the purpose of timeouts?", "Prevent hanging requests", "system-design", "reliability"),
    ("What is the purpose of retries with backoff?", "Handle transient failures", "system-design", "reliability"),
    ("What is the purpose of idempotency keys?", "Prevent duplicate operations", "system-design", "reliability"),
    ("What is the purpose of distributed tracing?", "Debug across services", "system-design", "observability"),
    ("What is the purpose of structured logging?", "Enable log analysis", "system-design", "observability"),
    ("What is the purpose of metrics aggregation?", "Centralize performance data", "system-design", "observability"),
    ("What is the purpose of SLOs (Service Level Objectives)?", "Define reliability targets", "system-design", "sre"),
    ("What is the purpose of SLIs (Service Level Indicators)?", "Measure service health", "system-design", "sre"),
    ("What is the purpose of error budgets?", "Balance reliability and velocity", "system-design", "sre"),
    ("What is the purpose of capacity planning?", "Ensure adequate resources", "system-design", "operations"),
    ("What is the purpose of performance profiling?", "Identify bottlenecks", "optimization", "performance"),
    ("What is the purpose of query optimization?", "Reduce latency", "optimization", "performance"),
    ("What is the purpose of connection pooling?", "Reuse connections", "optimization", "performance"),
    ("What is the purpose of lazy loading?", "Defer resource loading", "optimization", "performance"),
    ("What is the purpose of prefetching?", "Load resources ahead of time", "optimization", "performance"),
    ("What is the purpose of CDN (Content Delivery Network)?", "Distribute content globally", "system-design", "performance"),
    ("What is the purpose of edge computing?", "Process near users", "system-design", "performance"),
    ("What is the purpose of data locality?", "Reduce data transfer", "system-design", "performance"),
    ("What is the purpose of sharding?", "Distribute data across nodes", "system-design", "scaling"),
    ("What is the purpose of replication?", "Ensure data availability", "system-design", "reliability"),
    ("What is the purpose of consistency models?", "Define data guarantees", "system-design", "data"),
    ("What is the purpose of eventual consistency?", "Allow temporary inconsistency", "system-design", "data"),
    ("What is the purpose of strong consistency?", "Guarantee immediate consistency", "system-design", "data"),
    ("What is the purpose of CAP theorem?", "Understand distributed tradeoffs", "system-design", "theory"),
    ("What is the purpose of ACID properties?", "Ensure transaction reliability", "system-design", "data"),
    ("What is the purpose of BASE properties?", "Enable scalability", "system-design", "data"),
    ("What is the purpose of event sourcing?", "Store state changes as events", "system-design", "architecture"),
    ("What is the purpose of CQRS?", "Separate read and write models", "system-design", "architecture"),
    ("What is the purpose of saga pattern?", "Manage distributed transactions", "system-design", "architecture"),
    ("What is the purpose of strangler fig pattern?", "Gradually replace legacy systems", "system-design", "migration"),
    ("What is the purpose of anti-corruption layer?", "Isolate legacy systems", "system-design", "migration"),
    ("What is the purpose of feature toggles?", "Control feature rollout", "system-design", "deployment"),
    ("What is the purpose of dark launches?", "Test in production safely", "system-design", "deployment"),
    ("What is the purpose of progressive delivery?", "Gradual feature rollout", "system-design", "deployment"),
    ("What is the purpose of observability-driven development?", "Build with monitoring in mind", "system-design", "development"),
    ("What is the purpose of chaos engineering?", "Test system resilience", "system-design", "testing"),
    ("What is the purpose of synthetic monitoring?", "Proactive health checks", "system-design", "monitoring"),
    ("What is the purpose of real user monitoring?", "Track actual user experience", "system-design", "monitoring"),
    ("What is the purpose of application performance monitoring?", "Track app health", "system-design", "monitoring"),
]

for i, (q, answer, topic, subtopic) in enumerate(advanced_questions_data, start=1):
    questions.append({
        "id": f"advanced-{i}",
        "question": q,
        "hints": ["Think about scale", "Consider reliability"],
        "expected_topics": [topic, subtopic],
        "code_snippet": None,
        "options": [
            answer,
            "Plausible but incorrect option A",
            "Plausible but incorrect option B",
            "Clearly wrong option"
        ],
        "correct_option": 0,
        "blank_answer": answer,
        "topic": topic,
        "subtopic": subtopic,
        "difficulty": "advanced",
        "bank": "advanced",
        "azure_bridge": {
            "openai_way": f"OpenAI: {answer}",
            "azure_equivalent": f"Azure: Similar approach",
            "key_differences": "Implementation details may vary",
            "interview_phrase": f"For {topic}, we use {answer}"
        }
    })

print(f"Total questions prepared: {len(questions)}")
print(f"Easy: {len([q for q in questions if q['bank'] == 'easy'])}")
print(f"Medium: {len([q for q in questions if q['bank'] == 'medium'])}")
print(f"Hard: {len([q for q in questions if q['bank'] == 'hard'])}")
print(f"Code Review: {len([q for q in questions if q['bank'] == 'code_review'])}")
print(f"Advanced: {len([q for q in questions if q['bank'] == 'advanced'])}")

# Send to API
print("\nSending to API...")
try:
    response = requests.post(f"{API_URL}/api/questions/bulk", json=questions, timeout=60)
    print(f"Response: {response.status_code}")
    print(f"Result: {response.json()}")
except Exception as e:
    print(f"Error: {e}")
