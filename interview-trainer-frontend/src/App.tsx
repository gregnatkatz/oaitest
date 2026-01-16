import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, Mic, MicOff, Target, Trophy, ChevronRight, CheckCircle, 
  Zap, Code, BookOpen, Sparkles, ArrowRight, RotateCcw, Timer, Lightbulb, 
  MessageSquare, RefreshCw, Home, Layers, Brain, Shield, Database, Settings,
  Wrench, Lock, ChevronDown, ChevronUp, Star
} from 'lucide-react'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

type QuestionFormat = 'multiple_choice' | 'fill_blank' | 'free_response' | 'voice_explain'

interface Question {
  question: string
  hints: string[]
  expected_topics: string[]
  code_snippet: string | null
  format?: QuestionFormat
  options?: string[]
  correct_option?: number
  blank_answer?: string
}

interface Feedback {
  score: number
  feedback: string
  correct_answer: string
  azure_alternative: string | null
  improvement_tips: string[]
}

interface SessionStats {
  correct: number
  total: number
  streak: number
  bestStreak: number
}

interface Topic {
  id: string
  name: string
  icon: React.ElementType
  color: string
  description: string
  subtopics: { id: string; name: string; mastery: number }[]
}

interface TopicMastery {
  [topicId: string]: {
    [subtopicId: string]: { correct: number; total: number; lastPracticed: string }
  }
}

interface UserProgress {
  totalQuestionsAnswered: number
  currentStreak: number
  avgScore: number
  unlockedFormats: QuestionFormat[]
  level: number
}

const getUnlockedFormats = (progress: UserProgress): QuestionFormat[] => {
  const formats: QuestionFormat[] = ['multiple_choice']
  if (progress.totalQuestionsAnswered >= 20 && progress.avgScore >= 40) {
    formats.push('fill_blank')
  }
  if (progress.totalQuestionsAnswered >= 40 && progress.avgScore >= 60) {
    formats.push('free_response')
  }
  if (progress.totalQuestionsAnswered >= 60 && progress.avgScore >= 70) {
    formats.push('voice_explain')
  }
  return formats
}

const getQuestionFormat = (progress: UserProgress, questionIndex: number): QuestionFormat => {
  const unlocked = getUnlockedFormats(progress)
  if (questionIndex <= 20 || unlocked.length === 1) {
    return 'multiple_choice'
  }
  if (progress.currentStreak >= 3 && unlocked.includes('fill_blank')) {
    return Math.random() > 0.5 ? 'fill_blank' : 'multiple_choice'
  }
  if (progress.currentStreak >= 5 && unlocked.includes('free_response')) {
    return Math.random() > 0.6 ? 'free_response' : 'fill_blank'
  }
  return unlocked[Math.floor(Math.random() * unlocked.length)]
}

const FORMAT_LABELS: Record<QuestionFormat, { label: string; color: string; icon: string }> = {
  multiple_choice: { label: 'Multiple Choice', color: 'text-emerald-400', icon: '🔘' },
  fill_blank: { label: 'Fill in the Blank', color: 'text-blue-400', icon: '✏️' },
  free_response: { label: 'Free Response', color: 'text-purple-400', icon: '📝' },
  voice_explain: { label: 'Voice Explain', color: 'text-amber-400', icon: '🎤' }
}

const TOPICS: Topic[] = [
  {
    id: 'api-basics',
    name: 'API Basics',
    icon: Settings,
    color: 'text-blue-400',
    description: 'Authentication, endpoints, rate limits',
    subtopics: [
      { id: 'authentication', name: 'Authentication & API Keys', mastery: 0 },
      { id: 'endpoints', name: 'Endpoint Structure', mastery: 0 },
      { id: 'rate-limits', name: 'Rate Limits & Quotas', mastery: 0 },
      { id: 'error-handling', name: 'Error Handling', mastery: 0 }
    ]
  },
  {
    id: 'chat-completions',
    name: 'Chat Completions',
    icon: MessageSquare,
    color: 'text-emerald-400',
    description: 'Messages, roles, streaming, parameters',
    subtopics: [
      { id: 'messages', name: 'Message Structure & Roles', mastery: 0 },
      { id: 'parameters', name: 'Temperature & Top-P', mastery: 0 },
      { id: 'streaming', name: 'Streaming Responses', mastery: 0 },
      { id: 'tokens', name: 'Token Management', mastery: 0 }
    ]
  },
  {
    id: 'function-calling',
    name: 'Function Calling',
    icon: Wrench,
    color: 'text-purple-400',
    description: 'Tools, schemas, parallel calls',
    subtopics: [
      { id: 'tool-definition', name: 'Tool Definitions', mastery: 0 },
      { id: 'json-schema', name: 'JSON Schema', mastery: 0 },
      { id: 'parallel-calls', name: 'Parallel Tool Calls', mastery: 0 },
      { id: 'structured-output', name: 'Structured Outputs', mastery: 0 }
    ]
  },
  {
    id: 'assistants-api',
    name: 'Assistants API',
    icon: Brain,
    color: 'text-pink-400',
    description: 'Threads, runs, file handling',
    subtopics: [
      { id: 'assistants', name: 'Creating Assistants', mastery: 0 },
      { id: 'threads', name: 'Threads & Messages', mastery: 0 },
      { id: 'runs', name: 'Runs & Polling', mastery: 0 },
      { id: 'files', name: 'File Handling', mastery: 0 }
    ]
  },
  {
    id: 'embeddings-rag',
    name: 'Embeddings & RAG',
    icon: Database,
    color: 'text-cyan-400',
    description: 'Vector search, chunking, retrieval',
    subtopics: [
      { id: 'embeddings', name: 'Creating Embeddings', mastery: 0 },
      { id: 'vector-search', name: 'Vector Search', mastery: 0 },
      { id: 'chunking', name: 'Document Chunking', mastery: 0 },
      { id: 'retrieval', name: 'Retrieval Strategies', mastery: 0 }
    ]
  },
  {
    id: 'fine-tuning',
    name: 'Fine-Tuning',
    icon: Layers,
    color: 'text-amber-400',
    description: 'Training data, jobs, evaluation',
    subtopics: [
      { id: 'data-prep', name: 'Data Preparation', mastery: 0 },
      { id: 'training-jobs', name: 'Training Jobs', mastery: 0 },
      { id: 'hyperparameters', name: 'Hyperparameters', mastery: 0 },
      { id: 'evaluation', name: 'Model Evaluation', mastery: 0 }
    ]
  },
  {
    id: 'production',
    name: 'Production Patterns',
    icon: Zap,
    color: 'text-orange-400',
    description: 'Caching, fallbacks, monitoring',
    subtopics: [
      { id: 'caching', name: 'Response Caching', mastery: 0 },
      { id: 'fallbacks', name: 'Fallback Strategies', mastery: 0 },
      { id: 'monitoring', name: 'Monitoring & Logging', mastery: 0 },
      { id: 'cost-optimization', name: 'Cost Optimization', mastery: 0 }
    ]
  },
  {
    id: 'safety',
    name: 'Safety & Moderation',
    icon: Shield,
    color: 'text-red-400',
    description: 'Content filtering, guardrails',
    subtopics: [
      { id: 'moderation', name: 'Moderation API', mastery: 0 },
      { id: 'content-filtering', name: 'Content Filtering', mastery: 0 },
      { id: 'prompt-injection', name: 'Prompt Injection Defense', mastery: 0 },
      { id: 'responsible-ai', name: 'Responsible AI', mastery: 0 }
    ]
  }
]

// Pre-generated Question Banks with Azure Bridge Format
interface QuestionBankItem {
  id: string
  question: string
  hints: string[]
  expected_topics: string[]
  code_snippet: string | null
  options: string[]
  correct_option: number
  blank_answer: string
  topic: string
  subtopic: string
  difficulty: 'beginner' | 'intermediate' | 'advanced'
  azure_bridge: {
    openai_way: string
    azure_equivalent: string
    key_differences: string
    interview_phrase: string
  }
}

const QUESTION_BANK: QuestionBankItem[] = [
  // API Basics - Authentication
  {
    id: 'api-auth-1',
    question: 'What is the primary method for authenticating with the OpenAI API?',
    hints: ['Think about HTTP headers', 'Bearer token pattern'],
    expected_topics: ['authentication', 'API keys', 'headers'],
    code_snippet: null,
    options: ['OAuth 2.0 with refresh tokens', 'API key in Authorization header as Bearer token', 'Basic authentication with username/password', 'Certificate-based authentication'],
    correct_option: 1,
    blank_answer: 'Bearer token',
    topic: 'api-basics',
    subtopic: 'authentication',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Authorization: Bearer sk-xxx header',
      azure_equivalent: 'api-key: xxx header OR Azure AD token',
      key_differences: 'Azure supports both API key and Azure AD authentication. Azure uses api-key header instead of Authorization Bearer.',
      interview_phrase: 'In Azure OpenAI, we have the flexibility of using either API keys or Azure AD tokens for authentication, which integrates well with enterprise identity management.'
    }
  },
  {
    id: 'api-auth-2',
    question: 'How should you securely store and manage OpenAI API keys in a production application?',
    hints: ['Environment variables', 'Secret management services'],
    expected_topics: ['security', 'environment variables', 'key management'],
    code_snippet: null,
    options: ['Hardcode in source code for easy access', 'Store in environment variables or secret management service', 'Include in client-side JavaScript', 'Save in a public configuration file'],
    correct_option: 1,
    blank_answer: 'environment variables',
    topic: 'api-basics',
    subtopic: 'authentication',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Environment variables (OPENAI_API_KEY)',
      azure_equivalent: 'Azure Key Vault, Managed Identity, or environment variables',
      key_differences: 'Azure provides Key Vault for centralized secret management and Managed Identity for passwordless authentication.',
      interview_phrase: 'In Azure, we leverage Key Vault for secure key storage and Managed Identity to eliminate the need for storing credentials entirely.'
    }
  },
  // Chat Completions - Messages
  {
    id: 'chat-msg-1',
    question: 'What are the three primary message roles in the Chat Completions API?',
    hints: ['Think about who is speaking', 'System sets the behavior'],
    expected_topics: ['messages', 'roles', 'system', 'user', 'assistant'],
    code_snippet: null,
    options: ['admin, user, bot', 'system, user, assistant', 'prompt, response, context', 'input, output, memory'],
    correct_option: 1,
    blank_answer: 'system, user, assistant',
    topic: 'chat-completions',
    subtopic: 'messages',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'messages: [{role: "system"}, {role: "user"}, {role: "assistant"}]',
      azure_equivalent: 'Identical message structure in Azure OpenAI',
      key_differences: 'The message format is identical. Azure adds optional content filtering annotations.',
      interview_phrase: 'The message structure is consistent between OpenAI and Azure OpenAI, making migration straightforward.'
    }
  },
  {
    id: 'chat-msg-2',
    question: 'What is the purpose of the system message in Chat Completions?',
    hints: ['Sets the AI behavior', 'Defines personality and constraints'],
    expected_topics: ['system message', 'behavior', 'instructions'],
    code_snippet: null,
    options: ['To store conversation history', 'To define the AI assistant behavior and constraints', 'To handle error messages', 'To manage rate limiting'],
    correct_option: 1,
    blank_answer: 'behavior and constraints',
    topic: 'chat-completions',
    subtopic: 'messages',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'System message sets assistant behavior',
      azure_equivalent: 'Same functionality, plus Azure content filtering respects system message',
      key_differences: 'Azure content filtering can be configured to work with system message guidelines.',
      interview_phrase: 'System messages work identically, and Azure content filtering can be tuned to complement your system message guidelines.'
    }
  },
  // Chat Completions - Parameters
  {
    id: 'chat-params-1',
    question: 'What does the temperature parameter control in Chat Completions?',
    hints: ['Affects randomness', 'Range from 0 to 2'],
    expected_topics: ['temperature', 'randomness', 'creativity'],
    code_snippet: null,
    options: ['Response length', 'Randomness/creativity of responses', 'Processing speed', 'Token cost'],
    correct_option: 1,
    blank_answer: 'randomness',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'temperature: 0.7 (0-2 range)',
      azure_equivalent: 'Identical parameter and behavior',
      key_differences: 'No differences - temperature works the same way.',
      interview_phrase: 'Temperature behaves identically in both platforms - I typically use 0 for deterministic tasks and 0.7-1.0 for creative tasks.'
    }
  },
  {
    id: 'chat-params-2',
    question: 'What is the difference between temperature and top_p parameters?',
    hints: ['Both affect randomness', 'Nucleus sampling'],
    expected_topics: ['temperature', 'top_p', 'sampling'],
    code_snippet: null,
    options: ['Temperature is for speed, top_p is for quality', 'Temperature scales logits, top_p uses nucleus sampling', 'They are identical parameters', 'Temperature is deprecated, use top_p instead'],
    correct_option: 1,
    blank_answer: 'nucleus sampling',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'temperature OR top_p (not both recommended)',
      azure_equivalent: 'Same parameters and recommendation',
      key_differences: 'OpenAI recommends using one or the other, not both. Same in Azure.',
      interview_phrase: 'Best practice is to adjust either temperature or top_p, not both simultaneously, to maintain predictable behavior.'
    }
  },
  // Function Calling - Tool Definition
  {
    id: 'func-tool-1',
    question: 'What format is used to define tools/functions for the Chat Completions API?',
    hints: ['Schema definition', 'Describes parameters'],
    expected_topics: ['JSON Schema', 'function definition', 'tools'],
    code_snippet: null,
    options: ['YAML configuration', 'JSON Schema', 'XML definition', 'Protocol Buffers'],
    correct_option: 1,
    blank_answer: 'JSON Schema',
    topic: 'function-calling',
    subtopic: 'tool-definition',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'tools: [{type: "function", function: {name, description, parameters}}]',
      azure_equivalent: 'Identical tool definition format',
      key_differences: 'Function calling works identically in Azure OpenAI.',
      interview_phrase: 'Function calling is fully supported in Azure OpenAI with the same JSON Schema format for tool definitions.'
    }
  },
  {
    id: 'func-tool-2',
    question: 'What is the tool_choice parameter used for?',
    hints: ['Controls when functions are called', 'auto, none, or specific'],
    expected_topics: ['tool_choice', 'function calling', 'control'],
    code_snippet: null,
    options: ['Selects which model to use', 'Controls whether and which tools the model should call', 'Determines response format', 'Sets the maximum number of tool calls'],
    correct_option: 1,
    blank_answer: 'controls tool calling',
    topic: 'function-calling',
    subtopic: 'tool-definition',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'tool_choice: "auto" | "none" | {type: "function", function: {name}}',
      azure_equivalent: 'Same tool_choice options',
      key_differences: 'No differences in tool_choice behavior.',
      interview_phrase: 'tool_choice gives us fine-grained control - auto for model discretion, none to disable, or specify a function to force its use.'
    }
  },
  // Embeddings & RAG
  {
    id: 'embed-1',
    question: 'What is the output of the Embeddings API?',
    hints: ['Numerical representation', 'Vector'],
    expected_topics: ['embeddings', 'vectors', 'dimensions'],
    code_snippet: null,
    options: ['A text summary', 'A numerical vector representing the input', 'A classification label', 'A similarity score'],
    correct_option: 1,
    blank_answer: 'numerical vector',
    topic: 'embeddings-rag',
    subtopic: 'embeddings',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'POST /embeddings with model: "text-embedding-3-large"',
      azure_equivalent: 'POST /deployments/{deployment}/embeddings',
      key_differences: 'Azure uses deployment names instead of model names in the endpoint.',
      interview_phrase: 'In Azure, we reference our deployment name rather than the model name, which allows us to manage multiple deployments of the same model.'
    }
  },
  {
    id: 'embed-2',
    question: 'What is the recommended chunk size for document embeddings in RAG applications?',
    hints: ['Balance between context and specificity', 'Typically 500-1500 tokens'],
    expected_topics: ['chunking', 'RAG', 'document processing'],
    code_snippet: null,
    options: ['As large as possible for maximum context', '500-1500 tokens with overlap', 'Exactly 100 tokens', 'One sentence per chunk'],
    correct_option: 1,
    blank_answer: '500-1500 tokens',
    topic: 'embeddings-rag',
    subtopic: 'chunking',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Manual chunking with tiktoken',
      azure_equivalent: 'Azure AI Search has built-in chunking, or use manual chunking',
      key_differences: 'Azure AI Search provides integrated chunking and vectorization in the indexer pipeline.',
      interview_phrase: 'Azure AI Search simplifies RAG by providing built-in document chunking and vectorization in the indexer, reducing custom code.'
    }
  },
  // Assistants API
  {
    id: 'assist-1',
    question: 'What are the main components of the Assistants API?',
    hints: ['Persistent entities', 'Conversation management'],
    expected_topics: ['Assistants', 'Threads', 'Messages', 'Runs'],
    code_snippet: null,
    options: ['Models, Prompts, Responses', 'Assistants, Threads, Messages, Runs', 'Agents, Tasks, Results', 'Bots, Channels, Events'],
    correct_option: 1,
    blank_answer: 'Assistants, Threads, Messages, Runs',
    topic: 'assistants-api',
    subtopic: 'assistants',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Assistants API with threads and runs',
      azure_equivalent: 'Azure OpenAI Assistants API (preview)',
      key_differences: 'Azure Assistants API is in preview with some feature limitations.',
      interview_phrase: 'Azure OpenAI now supports the Assistants API in preview, enabling stateful conversations with tool use and file handling.'
    }
  },
  {
    id: 'assist-2',
    question: 'How do you handle long-running Assistant runs?',
    hints: ['Asynchronous pattern', 'Status checking'],
    expected_topics: ['polling', 'streaming', 'run status'],
    code_snippet: null,
    options: ['Synchronous blocking call', 'Polling the run status or using streaming', 'Webhook callbacks only', 'Automatic retry mechanism'],
    correct_option: 1,
    blank_answer: 'polling or streaming',
    topic: 'assistants-api',
    subtopic: 'runs',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Poll run status or use streaming',
      azure_equivalent: 'Same polling/streaming patterns',
      key_differences: 'Streaming support may vary in Azure preview.',
      interview_phrase: 'We implement polling with exponential backoff or use streaming when available for responsive user experiences.'
    }
  },
  // Fine-Tuning
  {
    id: 'finetune-1',
    question: 'What format is required for fine-tuning training data?',
    hints: ['Line-delimited', 'JSON format'],
    expected_topics: ['JSONL', 'training data', 'format'],
    code_snippet: null,
    options: ['CSV with headers', 'JSONL (JSON Lines) format', 'Plain text files', 'Parquet files'],
    correct_option: 1,
    blank_answer: 'JSONL',
    topic: 'fine-tuning',
    subtopic: 'data-prep',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'JSONL with messages array',
      azure_equivalent: 'Same JSONL format',
      key_differences: 'Azure requires uploading files to Azure OpenAI resource first.',
      interview_phrase: 'The training data format is identical - JSONL with messages arrays. Azure requires uploading to the resource before creating the job.'
    }
  },
  {
    id: 'finetune-2',
    question: 'What is the minimum recommended number of training examples for fine-tuning?',
    hints: ['Quality over quantity', 'But need enough examples'],
    expected_topics: ['training data', 'examples', 'minimum'],
    code_snippet: null,
    options: ['10 examples', '50-100 examples minimum, 500+ recommended', '1000 examples required', '10000 examples minimum'],
    correct_option: 1,
    blank_answer: '50-100 minimum',
    topic: 'fine-tuning',
    subtopic: 'data-prep',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: '50-100 minimum, more is better',
      azure_equivalent: 'Same recommendations',
      key_differences: 'Azure has the same data requirements.',
      interview_phrase: 'We recommend starting with at least 50-100 high-quality examples, though 500+ typically yields better results.'
    }
  },
  // Production Patterns
  {
    id: 'prod-1',
    question: 'What is the recommended approach for handling rate limits in production?',
    hints: ['Retry strategy', 'Exponential backoff'],
    expected_topics: ['rate limits', 'retry', 'backoff'],
    code_snippet: null,
    options: ['Ignore rate limits and retry immediately', 'Implement exponential backoff with jitter', 'Increase API key quota only', 'Cache all responses indefinitely'],
    correct_option: 1,
    blank_answer: 'exponential backoff',
    topic: 'production',
    subtopic: 'fallbacks',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Exponential backoff, check Retry-After header',
      azure_equivalent: 'Same pattern, plus Azure API Management for advanced throttling',
      key_differences: 'Azure API Management can provide additional rate limiting and caching layers.',
      interview_phrase: 'In Azure, we can layer API Management in front for sophisticated rate limiting, caching, and multi-region failover.'
    }
  },
  {
    id: 'prod-2',
    question: 'How can you reduce latency for repeated similar queries?',
    hints: ['Store previous results', 'Semantic similarity'],
    expected_topics: ['caching', 'semantic cache', 'latency'],
    code_snippet: null,
    options: ['Use a faster model only', 'Implement semantic caching based on query similarity', 'Reduce max_tokens to 1', 'Disable streaming'],
    correct_option: 1,
    blank_answer: 'semantic caching',
    topic: 'production',
    subtopic: 'caching',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'Custom semantic cache implementation',
      azure_equivalent: 'Azure API Management semantic caching or custom implementation',
      key_differences: 'Azure API Management has built-in semantic caching capabilities.',
      interview_phrase: 'Azure API Management now offers semantic caching out of the box, which can significantly reduce costs and latency for similar queries.'
    }
  },
  // Safety & Moderation
  {
    id: 'safety-1',
    question: 'What does the Moderation API check for?',
    hints: ['Content categories', 'Harmful content'],
    expected_topics: ['moderation', 'content filtering', 'safety'],
    code_snippet: null,
    options: ['Grammar and spelling', 'Harmful content categories like hate, violence, self-harm', 'Code quality', 'Factual accuracy'],
    correct_option: 1,
    blank_answer: 'harmful content',
    topic: 'safety',
    subtopic: 'moderation',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'POST /moderations endpoint',
      azure_equivalent: 'Built-in content filtering on all requests + optional Moderation API',
      key_differences: 'Azure has automatic content filtering enabled by default on all requests.',
      interview_phrase: 'Azure OpenAI has content filtering enabled by default, providing an additional safety layer beyond the Moderation API.'
    }
  },
  {
    id: 'safety-2',
    question: 'What is prompt injection and how can you defend against it?',
    hints: ['Malicious input', 'Input validation'],
    expected_topics: ['prompt injection', 'security', 'input validation'],
    code_snippet: null,
    options: ['A performance optimization technique', 'An attack where user input tries to override system instructions', 'A method to improve response quality', 'A caching strategy'],
    correct_option: 1,
    blank_answer: 'override system instructions',
    topic: 'safety',
    subtopic: 'prompt-injection',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Input validation, output filtering, instruction hierarchy',
      azure_equivalent: 'Same defenses plus Azure content filtering jailbreak detection',
      key_differences: 'Azure content filtering includes jailbreak attempt detection.',
      interview_phrase: 'Azure content filtering includes jailbreak detection, adding a layer of defense against prompt injection attacks.'
    }
  }
]

// Code Sample Library - 10 Real Interview Patterns
interface CodeSample {
  id: string
  title: string
  description: string
  code: string
  language: string
  topic: string
  walkthrough_questions: string[]
  key_concepts: string[]
  azure_notes: string
}

const CODE_SAMPLES: CodeSample[] = [
  {
    id: 'code-1',
    title: 'Basic Chat Completion',
    description: 'Simple chat completion request with system and user messages',
    code: `from openai import OpenAI

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4",
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "What is the capital of France?"}
    ],
    temperature=0.7,
    max_tokens=150
)

print(response.choices[0].message.content)`,
    language: 'python',
    topic: 'chat-completions',
    walkthrough_questions: [
      'What does each message role represent?',
      'Why might you adjust the temperature parameter?',
      'How would you handle the response in a production application?'
    ],
    key_concepts: ['message roles', 'temperature', 'max_tokens', 'response structure'],
    azure_notes: 'In Azure, use AzureOpenAI client with azure_endpoint and api_key parameters. Model is specified via deployment name.'
  },
  {
    id: 'code-2',
    title: 'Streaming Response',
    description: 'Handle streaming responses for real-time output',
    code: `from openai import OpenAI

client = OpenAI()

stream = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "Write a short poem"}],
    stream=True
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)`,
    language: 'python',
    topic: 'chat-completions',
    walkthrough_questions: [
      'Why use streaming instead of waiting for the full response?',
      'What is the structure of each chunk in the stream?',
      'How would you handle errors during streaming?'
    ],
    key_concepts: ['streaming', 'delta content', 'real-time output', 'chunk processing'],
    azure_notes: 'Streaming works identically in Azure OpenAI. Same chunk structure and processing pattern.'
  },
  {
    id: 'code-3',
    title: 'Function Calling',
    description: 'Define and handle function calls with the model',
    code: `from openai import OpenAI
import json

client = OpenAI()

tools = [{
    "type": "function",
    "function": {
        "name": "get_weather",
        "description": "Get current weather for a location",
        "parameters": {
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City name"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]}
            },
            "required": ["location"]
        }
    }
}]

response = client.chat.completions.create(
    model="gpt-4",
    messages=[{"role": "user", "content": "What's the weather in Paris?"}],
    tools=tools,
    tool_choice="auto"
)

if response.choices[0].message.tool_calls:
    tool_call = response.choices[0].message.tool_calls[0]
    args = json.loads(tool_call.function.arguments)
    print(f"Function: {tool_call.function.name}, Args: {args}")`,
    language: 'python',
    topic: 'function-calling',
    walkthrough_questions: [
      'How is the function schema defined?',
      'What does tool_choice="auto" mean?',
      'How would you execute the function and return results to the model?'
    ],
    key_concepts: ['tools array', 'JSON Schema', 'tool_choice', 'function arguments'],
    azure_notes: 'Function calling is fully supported in Azure OpenAI with identical syntax.'
  },
  {
    id: 'code-4',
    title: 'Embeddings for Similarity',
    description: 'Create embeddings and calculate similarity',
    code: `from openai import OpenAI
import numpy as np

client = OpenAI()

def get_embedding(text):
    response = client.embeddings.create(
        model="text-embedding-3-large",
        input=text
    )
    return response.data[0].embedding

def cosine_similarity(a, b):
    return np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b))

text1 = "The cat sat on the mat"
text2 = "A feline rested on the rug"
text3 = "Python is a programming language"

emb1 = get_embedding(text1)
emb2 = get_embedding(text2)
emb3 = get_embedding(text3)

print(f"Similarity 1-2: {cosine_similarity(emb1, emb2):.3f}")
print(f"Similarity 1-3: {cosine_similarity(emb1, emb3):.3f}")`,
    language: 'python',
    topic: 'embeddings-rag',
    walkthrough_questions: [
      'What is the output dimension of text-embedding-3-large?',
      'Why use cosine similarity instead of Euclidean distance?',
      'How would you use this for a RAG application?'
    ],
    key_concepts: ['embeddings', 'cosine similarity', 'vector comparison', 'semantic search'],
    azure_notes: 'Use deployment name instead of model name. Azure AI Search can handle similarity calculations automatically.'
  },
  {
    id: 'code-5',
    title: 'RAG with Context Injection',
    description: 'Retrieve relevant context and inject into prompt',
    code: `from openai import OpenAI

client = OpenAI()

def retrieve_context(query, documents, top_k=3):
    # In production, use vector DB like Pinecone, Azure AI Search
    query_emb = get_embedding(query)
    scores = [(doc, cosine_similarity(query_emb, get_embedding(doc))) 
              for doc in documents]
    return [doc for doc, _ in sorted(scores, key=lambda x: -x[1])[:top_k]]

def rag_query(query, documents):
    context = retrieve_context(query, documents)
    
    response = client.chat.completions.create(
        model="gpt-4",
        messages=[
            {"role": "system", "content": f"""Answer based on this context:
{chr(10).join(context)}

If the answer isn't in the context, say so."""},
            {"role": "user", "content": query}
        ]
    )
    return response.choices[0].message.content`,
    language: 'python',
    topic: 'embeddings-rag',
    walkthrough_questions: [
      'What is the purpose of the system message in RAG?',
      'How would you handle cases where context is not relevant?',
      'What are the tradeoffs of including more vs less context?'
    ],
    key_concepts: ['context retrieval', 'prompt injection', 'grounding', 'hallucination prevention'],
    azure_notes: 'Azure AI Search provides integrated RAG with On Your Data feature, handling retrieval automatically.'
  },
  {
    id: 'code-6',
    title: 'Structured Output with JSON Mode',
    description: 'Force model to output valid JSON',
    code: `from openai import OpenAI
import json

client = OpenAI()

response = client.chat.completions.create(
    model="gpt-4-turbo",
    messages=[
        {"role": "system", "content": "Extract entities as JSON with keys: name, type, description"},
        {"role": "user", "content": "Apple Inc. is a technology company founded by Steve Jobs."}
    ],
    response_format={"type": "json_object"}
)

data = json.loads(response.choices[0].message.content)
print(json.dumps(data, indent=2))`,
    language: 'python',
    topic: 'function-calling',
    walkthrough_questions: [
      'What does response_format json_object guarantee?',
      'How is this different from asking the model to output JSON in the prompt?',
      'What are the limitations of JSON mode?'
    ],
    key_concepts: ['JSON mode', 'structured output', 'response format', 'parsing'],
    azure_notes: 'JSON mode is supported in Azure OpenAI with the same response_format parameter.'
  },
  {
    id: 'code-7',
    title: 'Error Handling and Retries',
    description: 'Production-ready error handling with exponential backoff',
    code: `from openai import OpenAI, RateLimitError, APIError
import time

client = OpenAI()

def call_with_retry(messages, max_retries=3):
    for attempt in range(max_retries):
        try:
            response = client.chat.completions.create(
                model="gpt-4",
                messages=messages
            )
            return response.choices[0].message.content
        except RateLimitError as e:
            wait_time = 2 ** attempt  # Exponential backoff
            print(f"Rate limited. Waiting {wait_time}s...")
            time.sleep(wait_time)
        except APIError as e:
            if attempt == max_retries - 1:
                raise
            print(f"API error: {e}. Retrying...")
            time.sleep(1)
    raise Exception("Max retries exceeded")`,
    language: 'python',
    topic: 'production',
    walkthrough_questions: [
      'Why use exponential backoff instead of fixed delays?',
      'What other error types should you handle?',
      'How would you add jitter to prevent thundering herd?'
    ],
    key_concepts: ['error handling', 'exponential backoff', 'rate limits', 'resilience'],
    azure_notes: 'Same error handling patterns apply. Azure also returns Retry-After header for rate limits.'
  },
  {
    id: 'code-8',
    title: 'Assistants API Basic Flow',
    description: 'Create assistant, thread, and run a conversation',
    code: `from openai import OpenAI
import time

client = OpenAI()

# Create an assistant
assistant = client.beta.assistants.create(
    name="Math Tutor",
    instructions="You are a math tutor. Help students understand math concepts.",
    model="gpt-4-turbo"
)

# Create a thread
thread = client.beta.threads.create()

# Add a message
client.beta.threads.messages.create(
    thread_id=thread.id,
    role="user",
    content="Explain the Pythagorean theorem"
)

# Run the assistant
run = client.beta.threads.runs.create(
    thread_id=thread.id,
    assistant_id=assistant.id
)

# Poll for completion
while run.status in ["queued", "in_progress"]:
    time.sleep(1)
    run = client.beta.threads.runs.retrieve(thread_id=thread.id, run_id=run.id)

# Get messages
messages = client.beta.threads.messages.list(thread_id=thread.id)
print(messages.data[0].content[0].text.value)`,
    language: 'python',
    topic: 'assistants-api',
    walkthrough_questions: [
      'What is the lifecycle of a Run?',
      'How would you handle tool calls in the Assistants API?',
      'What are the benefits of threads over managing conversation history yourself?'
    ],
    key_concepts: ['assistants', 'threads', 'runs', 'polling', 'stateful conversations'],
    azure_notes: 'Azure OpenAI Assistants API is in preview. Same concepts apply with Azure-specific client initialization.'
  },
  {
    id: 'code-9',
    title: 'Content Moderation',
    description: 'Check content for policy violations',
    code: `from openai import OpenAI

client = OpenAI()

def check_content(text):
    response = client.moderations.create(input=text)
    result = response.results[0]
    
    if result.flagged:
        flagged_categories = [
            cat for cat, flagged in result.categories.model_dump().items()
            if flagged
        ]
        return {
            "safe": False,
            "categories": flagged_categories,
            "scores": {cat: getattr(result.category_scores, cat) 
                      for cat in flagged_categories}
        }
    return {"safe": True}

# Example usage
print(check_content("Hello, how are you?"))
print(check_content("I want to hurt someone"))`,
    language: 'python',
    topic: 'safety',
    walkthrough_questions: [
      'What categories does the Moderation API check?',
      'How would you use this in a production chat application?',
      'What is the difference between flagged and category scores?'
    ],
    key_concepts: ['moderation', 'content filtering', 'safety categories', 'scores'],
    azure_notes: 'Azure has built-in content filtering on all requests. Moderation API is also available for additional checks.'
  },
  {
    id: 'code-10',
    title: 'Fine-Tuning Data Preparation',
    description: 'Prepare and validate training data for fine-tuning',
    code: `import json

def create_training_example(system, user, assistant):
    return {
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
            {"role": "assistant", "content": assistant}
        ]
    }

# Create training data
training_data = [
    create_training_example(
        "You are a customer service agent for TechCorp.",
        "How do I reset my password?",
        "To reset your password, go to Settings > Security > Reset Password. You'll receive an email with a reset link."
    ),
    create_training_example(
        "You are a customer service agent for TechCorp.",
        "What are your business hours?",
        "TechCorp support is available Monday-Friday, 9 AM to 6 PM EST. For urgent issues, use our 24/7 chat."
    )
]

# Write to JSONL file
with open("training_data.jsonl", "w") as f:
    for example in training_data:
        f.write(json.dumps(example) + "\\n")

# Validate format
def validate_training_file(filepath):
    with open(filepath) as f:
        for i, line in enumerate(f):
            try:
                data = json.loads(line)
                assert "messages" in data
                assert len(data["messages"]) >= 2
            except Exception as e:
                print(f"Error on line {i+1}: {e}")
                return False
    return True`,
    language: 'python',
    topic: 'fine-tuning',
    walkthrough_questions: [
      'What is the required format for fine-tuning data?',
      'How many examples are recommended for fine-tuning?',
      'What makes a good fine-tuning example?'
    ],
    key_concepts: ['JSONL format', 'training data', 'validation', 'message structure'],
    azure_notes: 'Same JSONL format. Upload file to Azure OpenAI resource before creating fine-tuning job.'
  }
]

// Multi-LLM Support - Model configurations
interface ModelConfig {
  id: string
  name: string
  endpoint: string
  deployment: string
  description: string
  bestFor: string[]
}

export const AVAILABLE_MODELS: ModelConfig[] = [
  {
    id: 'gpt-5.2',
    name: 'GPT-5.2',
    endpoint: 'east-us-2',
    deployment: 'gpt-5.2',
    description: 'Latest GPT model with advanced reasoning',
    bestFor: ['complex questions', 'code generation', 'analysis']
  },
  {
    id: 'gpt-5-pro',
    name: 'GPT-5 Pro',
    endpoint: 'sweden-central',
    deployment: 'gpt-5-pro',
    description: 'Professional tier with enhanced capabilities',
    bestFor: ['detailed explanations', 'evaluation', 'feedback']
  },
  {
    id: 'o3',
    name: 'O3 Reasoning',
    endpoint: 'sweden-central',
    deployment: 'o3-3',
    description: 'Specialized reasoning model',
    bestFor: ['complex reasoning', 'multi-step problems', 'logic']
  },
  {
    id: 'model-router',
    name: 'Model Router',
    endpoint: 'sweden-central',
    deployment: 'model-router-2',
    description: 'Intelligent routing to best model',
    bestFor: ['general questions', 'varied tasks', 'cost optimization']
  }
]

// Helper function to get question from bank based on topic and difficulty
export const getQuestionFromBank = (
  topic: string | null,
  subtopic: string | null,
  difficulty: 'beginner' | 'intermediate' | 'advanced',
  usedQuestionIds: Set<string>
): QuestionBankItem | null => {
  let candidates = QUESTION_BANK.filter(q => !usedQuestionIds.has(q.id))
  
  if (topic) {
    candidates = candidates.filter(q => q.topic === topic)
  }
  if (subtopic) {
    candidates = candidates.filter(q => q.subtopic === subtopic)
  }
  
  // Prefer matching difficulty, but fall back to any available
  const byDifficulty = candidates.filter(q => q.difficulty === difficulty)
  const pool = byDifficulty.length > 0 ? byDifficulty : candidates
  
  if (pool.length === 0) return null
  return pool[Math.floor(Math.random() * pool.length)]
}

// Helper function to get code sample for topic
export const getCodeSampleForTopic = (topic: string): CodeSample | null => {
  const samples = CODE_SAMPLES.filter(s => s.topic === topic)
  if (samples.length === 0) return null
  return samples[Math.floor(Math.random() * samples.length)]
}

const ScoreCircle = ({ score, size = 120 }: { score: number; size?: number }) => {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (score / 100) * circumference
  
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="transform -rotate-90" width={size} height={size}>
        <circle cx={size/2} cy={size/2} r="45" stroke="#27272a" strokeWidth="8" fill="none" />
        <circle cx={size/2} cy={size/2} r="45" stroke="url(#scoreGradient)" strokeWidth="8" fill="none" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={strokeDashoffset} className="transition-all duration-1000" />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#c2410c" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-xs text-zinc-500 uppercase tracking-wider">/ 100</span>
      </div>
    </div>
  )
}

const getMasteryLevel = (mastery: number): { label: string; color: string; stars: number } => {
  if (mastery >= 90) return { label: 'Master', color: 'text-amber-400', stars: 5 }
  if (mastery >= 75) return { label: 'Expert', color: 'text-purple-400', stars: 4 }
  if (mastery >= 60) return { label: 'Proficient', color: 'text-emerald-400', stars: 3 }
  if (mastery >= 40) return { label: 'Learning', color: 'text-blue-400', stars: 2 }
  if (mastery >= 20) return { label: 'Beginner', color: 'text-zinc-400', stars: 1 }
  return { label: 'New', color: 'text-zinc-500', stars: 0 }
}

const TopicPickerScreen = ({
  onSelectTopic,
  onBack,
  topicMastery
}: {
  onSelectTopic: (topicId: string, subtopicId?: string) => void
  onBack: () => void
  topicMastery: TopicMastery
}) => {
  const [expandedTopic, setExpandedTopic] = useState<string | null>(null)
  const [filterLevel, setFilterLevel] = useState<'all' | 'weak' | 'strong'>('all')

  const getTopicMasteryScore = (topicId: string): number => {
    const topicData = topicMastery[topicId]
    if (!topicData) return 0
    const subtopics = Object.values(topicData)
    if (subtopics.length === 0) return 0
    const totalScore = subtopics.reduce((acc, s) => {
      if (s.total === 0) return acc
      return acc + (s.correct / s.total) * 100
    }, 0)
    const practiced = subtopics.filter(s => s.total > 0).length
    return practiced > 0 ? Math.round(totalScore / practiced) : 0
  }

  const getSubtopicMastery = (topicId: string, subtopicId: string): number => {
    const data = topicMastery[topicId]?.[subtopicId]
    if (!data || data.total === 0) return 0
    return Math.round((data.correct / data.total) * 100)
  }

  const filteredTopics = TOPICS.filter(topic => {
    const mastery = getTopicMasteryScore(topic.id)
    if (filterLevel === 'weak') return mastery < 60
    if (filterLevel === 'strong') return mastery >= 60
    return true
  })

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-orange-500/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={onBack} className="text-zinc-400 hover:text-white">
            <ChevronRight className="w-4 h-4 mr-1 rotate-180" /> Back
          </Button>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Topic Browser</span>
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Choose Your Focus
          </h1>
          <p className="text-zinc-400">Select a topic area to practice</p>
        </div>

        <div className="flex items-center justify-center gap-2 mb-8">
          {[
            { id: 'all', label: 'All Topics' },
            { id: 'weak', label: 'Needs Work' },
            { id: 'strong', label: 'Strong Areas' }
          ].map((filter) => (
            <button
              key={filter.id}
              onClick={() => setFilterLevel(filter.id as 'all' | 'weak' | 'strong')}
              className={`px-4 py-2 rounded-lg text-sm transition-all ${
                filterLevel === filter.id
                  ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                  : 'bg-zinc-900 text-zinc-400 border border-zinc-800 hover:border-zinc-700'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="grid gap-4">
          {filteredTopics.map((topic) => {
            const mastery = getTopicMasteryScore(topic.id)
            const masteryInfo = getMasteryLevel(mastery)
            const isExpanded = expandedTopic === topic.id
            
            return (
              <Card key={topic.id} className="bg-zinc-900 border-zinc-800 overflow-hidden">
                <button
                  onClick={() => setExpandedTopic(isExpanded ? null : topic.id)}
                  className="w-full p-4 flex items-center gap-4 text-left hover:bg-zinc-800/50 transition-colors"
                >
                  <div className={`w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center ${topic.color}`}>
                    <topic.icon className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-white">{topic.name}</h3>
                      <Badge className={`${masteryInfo.color} bg-transparent border-current`}>
                        {masteryInfo.label}
                      </Badge>
                    </div>
                    <p className="text-sm text-zinc-500">{topic.description}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 justify-end mb-1">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`w-3 h-3 ${i < masteryInfo.stars ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}`}
                          />
                        ))}
                      </div>
                      <span className="text-sm text-zinc-500">{mastery}% mastery</span>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-zinc-500" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-zinc-500" />
                    )}
                  </div>
                </button>
                
                {isExpanded && (
                  <div className="border-t border-zinc-800 p-4 bg-zinc-900/50">
                    <div className="grid grid-cols-2 gap-3">
                      {topic.subtopics.map((subtopic) => {
                        const subMastery = getSubtopicMastery(topic.id, subtopic.id)
                        const subMasteryInfo = getMasteryLevel(subMastery)
                        
                        return (
                          <button
                            key={subtopic.id}
                            onClick={() => onSelectTopic(topic.id, subtopic.id)}
                            className="p-3 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-orange-500/50 transition-all text-left group"
                          >
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm font-medium text-zinc-200 group-hover:text-orange-400 transition-colors">
                                {subtopic.name}
                              </span>
                              <Lock className={`w-3 h-3 ${subMastery === 0 ? 'text-zinc-600' : 'text-transparent'}`} />
                            </div>
                            <div className="flex items-center gap-2">
                              <Progress value={subMastery} className="h-1.5 flex-1" />
                              <span className={`text-xs ${subMasteryInfo.color}`}>{subMastery}%</span>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                    <Button
                      onClick={() => onSelectTopic(topic.id)}
                      className="w-full mt-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                    >
                      Practice All {topic.name}
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const SessionStartScreen = ({ 
  onStartSession, 
  onBrowseTopics,
  weakAreas 
}: { 
  onStartSession: (duration: number, type: string, category: string) => void
  onBrowseTopics: () => void
  weakAreas: { category: string; avgScore: number }[]
}) => {
  const [selectedDuration, setSelectedDuration] = useState(20)
  const [selectedType, setSelectedType] = useState('screening')
  
  const durations = [
    { time: 10, label: 'Quick', desc: '10 questions' },
    { time: 20, label: 'Standard', desc: '20 questions', recommended: true },
    { time: 30, label: 'Deep', desc: '30 questions' }
  ]

  const sessionTypes = [
    { id: 'screening', icon: BookOpen, name: 'Screening', desc: 'Foundational concepts', color: 'text-orange-400' },
    { id: 'technical', icon: Code, name: 'Technical', desc: 'Deep implementation', color: 'text-amber-400' },
    { id: 'behavioral', icon: MessageSquare, name: 'Behavioral', desc: 'Career & culture', color: 'text-rose-400' }
  ]

  const weakArea = weakAreas[0]

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="fixed top-0 left-1/2 -translate-x-1/2 w-full max-w-4xl h-96 bg-gradient-to-b from-orange-500/20 via-amber-500/10 to-transparent blur-3xl pointer-events-none" />
      
      <div className="max-w-3xl mx-auto relative">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-orange-500/10 border border-orange-500/20 mb-6">
            <Sparkles className="w-4 h-4 text-orange-400" />
            <span className="text-sm text-orange-300">Greg's Ramp for Success</span>
          </div>
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
            Ready to Train?
          </h1>
          <p className="text-zinc-400 text-lg italic">Learning new stuff as it gets real brother</p>
        </div>

        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Questions Per Session</h2>
          <div className="grid grid-cols-3 gap-4">
            {durations.map((d) => (
              <button
                key={d.time}
                onClick={() => setSelectedDuration(d.time)}
                className={`relative p-6 rounded-xl border-2 transition-all duration-200 ${
                  selectedDuration === d.time
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
                }`}
              >
                {d.recommended && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2">
                    <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30">Recommended</Badge>
                  </div>
                )}
                <div className="text-3xl font-bold mb-1">{d.time}</div>
                <div className="text-sm text-zinc-500">questions</div>
                <div className="text-xs text-zinc-600 mt-2">{d.label}</div>
              </button>
            ))}
          </div>
        </div>

        {weakArea && (
          <Card className="mb-8 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-zinc-800 shadow-lg shadow-orange-500/10">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center flex-shrink-0">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold">Recommended: {weakArea.category}</h3>
                    <Badge variant="destructive">Weak Area</Badge>
                  </div>
                  <p className="text-zinc-400 text-sm mb-4">Your weakest area - Last score: {weakArea.avgScore}%</p>
                  <Button 
                    onClick={() => onStartSession(selectedDuration, 'screening', weakArea.category)}
                    className="bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
                  >
                    Start Focused Session
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="mb-8">
          <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Choose Interview Type</h2>
          <div className="grid grid-cols-3 gap-4">
            {sessionTypes.map((type) => (
              <button
                key={type.id}
                onClick={() => setSelectedType(type.id)}
                className={`p-5 rounded-xl border-2 transition-all duration-200 text-left group ${
                  selectedType === type.id
                    ? 'border-orange-500 bg-orange-500/10'
                    : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <type.icon className={`w-8 h-8 ${type.color} mb-3 group-hover:scale-110 transition-transform`} />
                <div className="font-semibold mb-1">{type.name}</div>
                <div className="text-xs text-zinc-500">{type.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-4">
          <Button 
            variant="outline"
            onClick={onBrowseTopics}
            className="flex-1 h-14 text-lg bg-zinc-900 text-zinc-200 border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/10 hover:text-orange-400"
          >
            <Layers className="w-5 h-5 mr-2" />
            Browse Topics
          </Button>
          <Button 
            onClick={() => onStartSession(selectedDuration, selectedType, '')}
            className="flex-1 h-14 text-lg bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
          >
            <Play className="w-5 h-5 mr-2" />
            Start Session
          </Button>
        </div>
      </div>
    </div>
  )
}

const QuestionScreen = ({
  question, questionIndex, totalQuestions, timeLeft, sessionStats,
  onSubmitAnswer, onNextQuestion, feedback, isLoading, onEndSession, userProgress
}: { 
  question: Question | null
  questionIndex: number
  totalQuestions: number
  timeLeft: number
  sessionStats: SessionStats
  onSubmitAnswer: (answer: string, selectedOption?: number) => void
  onNextQuestion: () => void
  feedback: Feedback | null
  isLoading: boolean
  onEndSession: () => void
  userProgress: UserProgress
}) => {
  const [userAnswer, setUserAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState<number | null>(null)
  const [isListening, setIsListening] = useState(false)
  const [showHints, setShowHints] = useState(false)
  
  const questionFormat = question?.format || 'multiple_choice'
  const formatInfo = FORMAT_LABELS[questionFormat]

  const toggleVoiceInput = useCallback(() => {
    if (isListening) { setIsListening(false); return }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const windowAny = window as any
    const SpeechRecognitionClass = windowAny.webkitSpeechRecognition || windowAny.SpeechRecognition
    if (!SpeechRecognitionClass) return
    const recognition = new SpeechRecognitionClass()
    recognition.continuous = true
    recognition.interimResults = true
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let transcript = ''
      for (let i = 0; i < event.results.length; i++) { transcript += event.results[i][0].transcript }
      setUserAnswer(transcript)
    }
    recognition.onerror = () => setIsListening(false)
    recognition.onend = () => setIsListening(false)
    recognition.start()
    setIsListening(true)
  }, [isListening])

  const handleSubmit = () => {
    if (questionFormat === 'multiple_choice' && selectedOption !== null) {
      onSubmitAnswer(question?.options?.[selectedOption] || '', selectedOption)
    } else if (userAnswer.trim()) {
      onSubmitAnswer(userAnswer)
    }
  }
  const handleNext = () => { setUserAnswer(''); setSelectedOption(null); setShowHints(false); onNextQuestion() }
  const getScoreColor = (score: number) => score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 p-4 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">Question {questionIndex} of {totalQuestions}</span>
              <Badge className={`${formatInfo.color} bg-transparent border-current`}>
                {formatInfo.icon} {formatInfo.label}
              </Badge>
            </div>
            <div className="flex items-center gap-4">
              <div className={`flex items-center gap-2 ${timeLeft < 60 ? 'text-red-400' : 'text-zinc-400'}`}>
                <Timer className="w-4 h-4" />
                <span className="font-mono">{Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={onEndSession} className="text-zinc-400 hover:text-white">
                <Home className="w-4 h-4 mr-1" /> End
              </Button>
            </div>
          </div>
          <Progress value={(questionIndex / totalQuestions) * 100} className="h-2" />
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-8">
        <div className="grid grid-cols-3 gap-8">
          <div className="col-span-2 space-y-6">
            {question ? (
              <>
                <Card className="bg-zinc-900 border-zinc-800">
                  <CardHeader><CardTitle className="text-xl text-zinc-100">{question.question}</CardTitle></CardHeader>
                  <CardContent>
                    {question.code_snippet && (
                      <div className="rounded-xl overflow-hidden border border-zinc-800 mb-4">
                        <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700">
                          <span className="text-xs text-zinc-500 uppercase tracking-wider">Code</span>
                        </div>
                        <pre className="p-4 bg-zinc-950 overflow-x-auto">
                          <code className="text-sm font-mono text-emerald-400">{question.code_snippet}</code>
                        </pre>
                      </div>
                    )}
                    {showHints && question.hints && question.hints.length > 0 && (
                      <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 mb-4">
                        <h4 className="text-amber-400 font-semibold mb-2 flex items-center gap-2"><Lightbulb className="w-4 h-4" /> Hints</h4>
                        <ul className="list-disc list-inside text-zinc-300 space-y-1 text-sm">
                          {question.hints.map((hint, i) => <li key={i}>{hint}</li>)}
                        </ul>
                      </div>
                    )}
                    {!feedback && (
                      <>
                        {questionFormat === 'multiple_choice' && question?.options ? (
                          <div className="space-y-3">
                            {question.options.map((option, idx) => (
                              <button
                                key={idx}
                                onClick={() => setSelectedOption(idx)}
                                className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 ${
                                  selectedOption === idx
                                    ? 'border-orange-500 bg-orange-500/10'
                                    : 'border-zinc-700 bg-zinc-800 hover:border-zinc-600'
                                }`}
                              >
                                <div className="flex items-center gap-3">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                    selectedOption === idx ? 'bg-orange-500 text-white' : 'bg-zinc-700 text-zinc-400'
                                  }`}>
                                    {String.fromCharCode(65 + idx)}
                                  </div>
                                  <span className="text-zinc-200">{option}</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        ) : questionFormat === 'fill_blank' ? (
                          <div className="space-y-4">
                            <div className="bg-zinc-800 rounded-xl p-4 border border-zinc-700">
                              <p className="text-zinc-400 text-sm mb-2">Fill in the blank:</p>
                              <input
                                type="text"
                                value={userAnswer}
                                onChange={(e) => setUserAnswer(e.target.value)}
                                placeholder="Type your answer..."
                                className="w-full bg-zinc-900 border border-zinc-600 rounded-lg px-4 py-3 text-zinc-200 focus:border-orange-500 focus:outline-none"
                              />
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            <Textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Type your answer here or use voice input..." className="min-h-32 bg-zinc-800 border-zinc-700 text-zinc-200 pr-12" />
                            <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={toggleVoiceInput}>
                              {isListening ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-zinc-400" />}
                            </Button>
                          </div>
                        )}
                        <div className="flex items-center gap-4 mt-4">
                          <Button 
                            onClick={handleSubmit} 
                            disabled={isLoading || (questionFormat === 'multiple_choice' ? selectedOption === null : !userAnswer.trim())} 
                            className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white"
                          >
                            {isLoading ? 'Evaluating...' : 'Submit Answer'}
                          </Button>
                          <Button variant="ghost" onClick={() => setShowHints(!showHints)}>
                            <Lightbulb className={`w-4 h-4 mr-1 ${showHints ? 'text-amber-400' : ''}`} /> Hint
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
                {feedback && (
                  <Card className="bg-zinc-900 border-zinc-800">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">Feedback</CardTitle>
                        <div className="flex items-center gap-2">
                          <span className={`text-3xl font-bold ${getScoreColor(feedback.score)}`}>{feedback.score}</span>
                          <span className="text-zinc-500">/100</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-zinc-300">{feedback.feedback}</p>
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4">
                        <h4 className="text-emerald-400 font-semibold mb-2">Ideal Answer</h4>
                        <p className="text-zinc-300 text-sm">{feedback.correct_answer}</p>
                      </div>
                      {feedback.azure_alternative && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                          <h4 className="text-blue-400 font-semibold mb-2">Azure Equivalent</h4>
                          <p className="text-zinc-300 text-sm">{feedback.azure_alternative}</p>
                        </div>
                      )}
                      <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="flex-1 border-zinc-700" onClick={handleNext}>
                          <RotateCcw className="w-4 h-4 mr-2" /> Practice Similar
                        </Button>
                        <Button onClick={handleNext} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500">
                          Next Question <ChevronRight className="w-4 h-4 ml-2" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <Card className="bg-zinc-900 border-zinc-800"><CardContent className="p-8 text-center"><p className="text-zinc-400">Loading question...</p></CardContent></Card>
            )}
          </div>
          <div className="space-y-4">
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4 text-center">
                <div className={`text-4xl font-mono font-bold mb-1 ${timeLeft < 60 ? 'text-red-400' : 'text-white'}`}>
                  {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, '0')}
                </div>
                <div className="text-xs text-zinc-500 uppercase tracking-wider">Time Remaining</div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Voice Input</h3>
                <button onClick={toggleVoiceInput} className={`w-full p-4 rounded-xl border transition-all duration-200 flex flex-col items-center gap-2 group ${isListening ? 'bg-orange-500/20 border-orange-500' : 'bg-zinc-800 border-zinc-700 hover:border-orange-500'}`}>
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isListening ? 'bg-orange-500' : 'bg-orange-500/20 group-hover:bg-orange-500/30'}`}>
                    {isListening ? <MicOff className="w-6 h-6 text-white" /> : <Mic className="w-6 h-6 text-orange-400" />}
                  </div>
                  <span className="text-sm text-zinc-400">{isListening ? 'Click to stop' : 'Click to speak'}</span>
                </button>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">This Session</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-zinc-500 text-sm">Correct</span><span className="text-emerald-400 font-semibold">{sessionStats.correct}/{sessionStats.total}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500 text-sm">Streak</span><span className="text-amber-400 font-semibold">{sessionStats.streak > 0 ? `${sessionStats.streak}` : '0'}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500 text-sm">Avg Score</span><span className="text-zinc-300 font-semibold">{sessionStats.total > 0 ? Math.round((sessionStats.correct / sessionStats.total) * 100) : 0}%</span></div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-zinc-900 border-zinc-800">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium text-zinc-400 mb-3">Your Progress</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between"><span className="text-zinc-500 text-sm">Level</span><span className="text-orange-400 font-semibold">{userProgress.level}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500 text-sm">Total Answered</span><span className="text-zinc-300 font-semibold">{userProgress.totalQuestionsAnswered}</span></div>
                  <div className="flex items-center justify-between"><span className="text-zinc-500 text-sm">Formats Unlocked</span><span className="text-emerald-400 font-semibold">{userProgress.unlockedFormats.length}/4</span></div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}

const SessionSummaryScreen = ({ 
  sessionStats, avgScore, onContinue, onFinish 
}: { 
  sessionStats: SessionStats
  avgScore: number
  onContinue: () => void
  onFinish: () => void
}) => {
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-orange-500 to-amber-500 mb-6">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
          <p className="text-zinc-400">Great work on your interview prep</p>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Questions', value: sessionStats.total.toString(), sub: 'answered' },
            { label: 'Accuracy', value: `${Math.round((sessionStats.correct / Math.max(sessionStats.total, 1)) * 100)}%`, sub: `${sessionStats.correct}/${sessionStats.total} correct` },
            { label: 'Best Streak', value: `${sessionStats.bestStreak}`, sub: 'in a row' }
          ].map((stat) => (
            <Card key={stat.label} className="bg-zinc-900 border-zinc-800 text-center">
              <CardContent className="p-4">
                <div className="text-2xl font-bold mb-1">{stat.value}</div>
                <div className="text-xs text-zinc-500">{stat.sub}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-8 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 border-zinc-800 shadow-lg shadow-orange-500/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-8">
              <ScoreCircle score={avgScore} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold mb-1">Session Score</h3>
                <p className="text-zinc-400 text-sm mb-4">Based on your answers this session</p>
                <div className="inline-flex items-center gap-1 text-orange-400 text-sm font-medium">
                  <Zap className="w-4 h-4" />
                  Keep practicing to improve!
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <h4 className="font-semibold text-emerald-400">Strong Areas</h4>
              </div>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>Keep practicing consistently</li>
                <li>Review your correct answers</li>
                <li>Build on your strengths</li>
              </ul>
            </CardContent>
          </Card>
          <Card className="bg-zinc-900 border-zinc-800">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-5 h-5 text-amber-400" />
                <h4 className="font-semibold text-amber-400">Focus Next</h4>
              </div>
              <ul className="space-y-2 text-sm text-zinc-300">
                <li>Review missed questions</li>
                <li>Practice weak areas</li>
                <li>Try harder difficulty</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8 bg-zinc-900 border-orange-500/20">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <Lightbulb className="w-5 h-5 text-orange-400 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold mb-1">Next Steps</h4>
                <p className="text-sm text-zinc-400">
                  Great session! Consider focusing on your weak areas next time. 
                  Consistent practice is key to interview success!
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button variant="outline" className="flex-1 border-zinc-700 h-12" onClick={onContinue}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Practice More
          </Button>
          <Button className="flex-1 h-12 bg-gradient-to-r from-orange-500 to-amber-500" onClick={onFinish}>
            Done for Now
            <CheckCircle className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function App() {
  const [screen, setScreen] = useState<'start' | 'topics' | 'question' | 'summary'>('start')
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null)
  const [feedback, setFeedback] = useState<Feedback | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [questionIndex, setQuestionIndex] = useState(0)
  const [totalQuestions, setTotalQuestions] = useState(20)
  const [timeLeft, setTimeLeft] = useState(1800)
  const [sessionType, setSessionType] = useState('screening')
  const [sessionStats, setSessionStats] = useState<SessionStats>({ correct: 0, total: 0, streak: 0, bestStreak: 0 })
  const [avgScore, setAvgScore] = useState(0)
  const [totalScore, setTotalScore] = useState(0)
  const [weakAreas, setWeakAreas] = useState<{ category: string; avgScore: number }[]>([])
  const [topicMastery, setTopicMastery] = useState<TopicMastery>({})
  const [currentTopic, setCurrentTopic] = useState<string>('')
  const [currentSubtopic, setCurrentSubtopic] = useState<string>('')
  const [userProgress, setUserProgress] = useState<UserProgress>({
    totalQuestionsAnswered: 0,
    currentStreak: 0,
    avgScore: 0,
    unlockedFormats: ['multiple_choice'],
    level: 1
  })

  useEffect(() => {
    const savedProgress = localStorage.getItem('userProgress')
    if (savedProgress) {
      try {
        setUserProgress(JSON.parse(savedProgress))
      } catch (e) {
        console.error('Failed to parse user progress:', e)
      }
    }

    const savedMastery = localStorage.getItem('topicMastery')
    if (savedMastery) {
      try {
        setTopicMastery(JSON.parse(savedMastery))
      } catch (e) {
        console.error('Failed to parse topic mastery:', e)
      }
    }

    const saved = localStorage.getItem('interviewProgress')
    if (saved) {
      try {
        const progress = JSON.parse(saved)
        const allAreas: { category: string; avgScore: number }[] = []
        for (const type of ['screening', 'technical', 'behavioral']) {
          if (progress[type]) {
            for (const cat of progress[type]) {
              if (cat.avgScore < 70) {
                allAreas.push({ category: cat.category, avgScore: cat.avgScore })
              }
            }
          }
        }
        allAreas.sort((a, b) => a.avgScore - b.avgScore)
        setWeakAreas(allAreas.slice(0, 3))
      } catch (e) {
        console.error('Failed to parse progress:', e)
      }
    }
  }, [])

  useEffect(() => {
    if (screen === 'question' && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 1) {
            setScreen('summary')
            return 0
          }
          return t - 1
        })
      }, 1000)
      return () => clearInterval(timer)
    }
  }, [screen, timeLeft])

  const startSession = async (duration: number, type: string, _category: string) => {
    setTotalQuestions(duration)
    setSessionType(type)
    setQuestionIndex(0)
    setSessionStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 })
    setTotalScore(0)
    setAvgScore(0)
    setTimeLeft(duration * 90)
    setScreen('question')
    await generateQuestion(type)
  }

  const generateQuestion = async (type?: string, topicId?: string, subtopicId?: string) => {
    setIsLoading(true)
    setFeedback(null)
    setCurrentQuestion(null)

    const topic = topicId || currentTopic
    const subtopic = subtopicId || currentSubtopic
    const topicName = TOPICS.find(t => t.id === topic)?.name || ''
    const subtopicName = TOPICS.find(t => t.id === topic)?.subtopics.find(s => s.id === subtopic)?.name || ''
    
    const format = getQuestionFormat(userProgress, questionIndex + 1)

    try {
      const response = await fetch(`${API_URL}/api/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: subtopicName || topicName || '',
          difficulty: 'medium',
          interview_type: type || sessionType,
          format: format
        })
      })
      const data = await response.json()
      
      if (format === 'multiple_choice' && !data.options) {
        const correctAnswer = data.correct_answer || data.expected_topics?.[0] || 'Correct answer'
        const wrongAnswers = [
          'This is not the correct approach',
          'This option is incorrect',
          'This is a common misconception'
        ]
        const allOptions = [correctAnswer, ...wrongAnswers].sort(() => Math.random() - 0.5)
        data.options = allOptions
        data.correct_option = allOptions.indexOf(correctAnswer)
      }
      
      data.format = format
      setCurrentQuestion(data)
      setQuestionIndex(prev => prev + 1)
    } catch (error) {
      console.error('Failed to generate question:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const submitAnswer = async (answer: string) => {
    if (!currentQuestion) return

    setIsLoading(true)

    try {
      const response = await fetch(`${API_URL}/api/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: currentQuestion.question,
          user_answer: answer,
          is_azure_developer: true,
          category: '',
          difficulty: 'medium'
        })
      })
      const data = await response.json()
      setFeedback(data)
      
      const isCorrect = data.score >= 70
      const newStreak = isCorrect ? sessionStats.streak + 1 : 0
      setSessionStats(prev => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: newStreak,
        bestStreak: Math.max(prev.bestStreak, newStreak)
      }))
      const newTotalScore = totalScore + data.score
      setTotalScore(newTotalScore)
      setAvgScore(Math.round(newTotalScore / (sessionStats.total + 1)))
      
      if (currentTopic && currentSubtopic) {
        updateTopicMastery(currentTopic, currentSubtopic, isCorrect)
      }
      
      setUserProgress(prev => {
        const newTotal = prev.totalQuestionsAnswered + 1
        const newAvg = Math.round((prev.avgScore * prev.totalQuestionsAnswered + data.score) / newTotal)
        const newStreak = isCorrect ? prev.currentStreak + 1 : 0
        const updated = {
          ...prev,
          totalQuestionsAnswered: newTotal,
          currentStreak: newStreak,
          avgScore: newAvg,
          unlockedFormats: getUnlockedFormats({ ...prev, totalQuestionsAnswered: newTotal, avgScore: newAvg }),
          level: Math.floor(newTotal / 20) + 1
        }
        localStorage.setItem('userProgress', JSON.stringify(updated))
        return updated
      })
    } catch (error) {
      console.error('Failed to evaluate answer:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const nextQuestion = async () => {
    if (questionIndex >= totalQuestions) {
      setScreen('summary')
    } else {
      await generateQuestion()
    }
  }

  const endSession = () => {
    setScreen('summary')
  }

  const handleSelectTopic = (topicId: string, subtopicId?: string) => {
    setCurrentTopic(topicId)
    setCurrentSubtopic(subtopicId || '')
    setTotalQuestions(20)
    setSessionType('technical')
    setQuestionIndex(0)
    setSessionStats({ correct: 0, total: 0, streak: 0, bestStreak: 0 })
    setTotalScore(0)
    setAvgScore(0)
    setTimeLeft(20 * 90)
    setScreen('question')
    generateQuestion('technical', topicId, subtopicId)
  }

  const updateTopicMastery = (topicId: string, subtopicId: string, isCorrect: boolean) => {
    setTopicMastery(prev => {
      const updated = { ...prev }
      if (!updated[topicId]) updated[topicId] = {}
      if (!updated[topicId][subtopicId]) {
        updated[topicId][subtopicId] = { correct: 0, total: 0, lastPracticed: '' }
      }
      updated[topicId][subtopicId] = {
        correct: updated[topicId][subtopicId].correct + (isCorrect ? 1 : 0),
        total: updated[topicId][subtopicId].total + 1,
        lastPracticed: new Date().toISOString()
      }
      localStorage.setItem('topicMastery', JSON.stringify(updated))
      return updated
    })
  }

  return (
    <div className="font-sans">
      {screen === 'start' && (
        <SessionStartScreen 
          onStartSession={startSession}
          onBrowseTopics={() => setScreen('topics')}
          weakAreas={weakAreas}
        />
      )}
      {screen === 'topics' && (
        <TopicPickerScreen
          onSelectTopic={handleSelectTopic}
          onBack={() => setScreen('start')}
          topicMastery={topicMastery}
        />
      )}
      {screen === 'question' && (
        <QuestionScreen 
          question={currentQuestion}
          questionIndex={questionIndex}
          totalQuestions={totalQuestions}
          timeLeft={timeLeft}
          sessionStats={sessionStats}
          onSubmitAnswer={submitAnswer}
          onNextQuestion={nextQuestion}
          feedback={feedback}
          isLoading={isLoading}
          onEndSession={endSession}
          userProgress={userProgress}
        />
      )}
      {screen === 'summary' && (
        <SessionSummaryScreen 
          sessionStats={sessionStats}
          avgScore={avgScore}
          onContinue={() => setScreen('start')}
          onFinish={() => setScreen('start')}
        />
      )}
    </div>
  )
}
