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

type QuestionFormat = 'multiple_choice' | 'fill_blank' | 'free_response' | 'voice_explain' | 'flashcard' | 'scenario' | 'teaching_moment' | 'code_recognition' | 'code_fix'

type PracticeMode = 'guided' | 'independent' | 'learning'

export type InterviewType = 'screening' | 'technical' | 'behavioral'

interface Question {
  question: string
  hints: string[]
  expected_topics: string[]
  code_snippet: string | null
  format?: QuestionFormat
  options?: string[]
  correct_option?: number
  blank_answer?: string
  topic?: string
  subtopic?: string
  azure_bridge?: {
    openai_way: string
    azure_equivalent: string
    key_differences: string
    interview_phrase: string
  }
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
  practiceMode: PracticeMode
  showAzurePerspective: boolean
}

// Spaced Repetition - SM-2 Algorithm inspired
interface SpacedRepetitionItem {
  questionId: string
  easeFactor: number // 2.5 default, min 1.3
  interval: number // days until next review
  repetitions: number
  nextReview: string // ISO date
  lastScore: number
}

export interface SkillProfile {
  [topicId: string]: {
    level: number // 1-10
    confidence: number // 0-100
    questionsAnswered: number
    avgScore: number
    lastPracticed: string
    weakSubtopics: string[]
    strongSubtopics: string[]
  }
}

// Behavioral/HR Question Bank
interface BehavioralQuestion {
  id: string
  question: string
  category: 'career_transition' | 'salary' | 'culture_fit' | 'strengths' | 'motivation' | 'conflict' | 'leadership'
  hints: string[]
  sampleAnswer: string
  keyPoints: string[]
  gregSpecific: string // Tailored for Greg's 23 years at Microsoft
}

export const BEHAVIORAL_QUESTIONS: BehavioralQuestion[] = [
  {
    id: 'bh-1',
    question: 'Why are you looking to leave Microsoft after 23 years?',
    category: 'career_transition',
    hints: ['Focus on growth, not escape', 'Highlight what excites you about OpenAI'],
    sampleAnswer: 'After 23 incredible years at Microsoft, I\'ve had the privilege of growing from an individual contributor to leading major initiatives. I\'ve seen the company transform multiple times. Now, I\'m drawn to OpenAI because it represents the next frontier of technology that will reshape how we work and live. I want to be at the center of that transformation, bringing my enterprise experience to help scale AI responsibly.',
    keyPoints: ['Growth mindset', 'Positive framing', 'Specific interest in OpenAI', 'Value you bring'],
    gregSpecific: 'Emphasize your Azure AI experience and how it directly translates to OpenAI\'s enterprise needs.'
  },
  {
    id: 'bh-2',
    question: 'What are your salary expectations?',
    category: 'salary',
    hints: ['Research market rates', 'Consider total compensation', 'Be flexible but know your worth'],
    sampleAnswer: 'Based on my research and experience level, I\'m targeting a total compensation package in the range of [X-Y]. However, I\'m flexible and more focused on finding the right opportunity where I can make a significant impact. I\'d love to understand more about the role\'s scope and OpenAI\'s compensation philosophy.',
    keyPoints: ['Research-backed range', 'Total comp focus', 'Flexibility', 'Redirect to value'],
    gregSpecific: 'With 23 years of Microsoft experience including Azure AI, you can command senior-level compensation. Research OpenAI Glassdoor for ranges.'
  },
  {
    id: 'bh-3',
    question: 'Tell me about yourself.',
    category: 'career_transition',
    hints: ['2-3 minute response', 'Present-Past-Future structure', 'End with why this role'],
    sampleAnswer: 'I\'m currently a senior engineer at Microsoft where I\'ve spent the last 23 years building enterprise-scale solutions. Most recently, I\'ve been deeply involved in Azure AI services, helping enterprise customers adopt and scale AI solutions. Throughout my career, I\'ve progressed from hands-on development to technical leadership, always staying close to the technology. What excites me about OpenAI is the opportunity to work on foundational AI technology that\'s changing the world, while bringing my enterprise scaling experience to help more organizations benefit from these capabilities.',
    keyPoints: ['Present role', 'Key achievements', 'Relevant experience', 'Why OpenAI'],
    gregSpecific: 'Highlight your Azure OpenAI experience specifically - you understand both sides of the partnership.'
  },
  {
    id: 'bh-4',
    question: 'What\'s your greatest strength?',
    category: 'strengths',
    hints: ['Be specific', 'Give an example', 'Relate to the role'],
    sampleAnswer: 'My greatest strength is bridging the gap between complex technical concepts and business value. After 23 years at Microsoft, I\'ve learned to translate cutting-edge technology into solutions that executives can understand and customers can adopt. For example, when Azure OpenAI was launching, I helped create the technical enablement program that helped our enterprise customers understand not just how to use the API, but how to build responsible AI practices around it.',
    keyPoints: ['Specific strength', 'Concrete example', 'Relevance to role'],
    gregSpecific: 'Your ability to work across technical and business domains is valuable for OpenAI\'s enterprise growth.'
  },
  {
    id: 'bh-5',
    question: 'Describe a time you failed and what you learned.',
    category: 'conflict',
    hints: ['Be honest', 'Focus on learning', 'Show growth'],
    sampleAnswer: 'Early in my career at Microsoft, I led a project where I was so focused on the technical elegance of the solution that I didn\'t adequately involve stakeholders in the design process. We built something technically impressive but it didn\'t fully meet user needs. I learned that the best technical solution is worthless if it doesn\'t solve the right problem. Since then, I\'ve made stakeholder alignment and user feedback central to my approach.',
    keyPoints: ['Real failure', 'Ownership', 'Specific learning', 'Changed behavior'],
    gregSpecific: 'Choose a failure from earlier in your career to show growth over time.'
  },
  {
    id: 'bh-6',
    question: 'Why OpenAI specifically?',
    category: 'motivation',
    hints: ['Research the company', 'Be specific about mission', 'Connect to your experience'],
    sampleAnswer: 'OpenAI is at the absolute frontier of AI development, and I believe the work being done here will define the next decade of technology. Having worked on Azure OpenAI, I\'ve seen firsthand how transformative these models are for enterprises. But I want to be closer to where the core innovation happens. I\'m also drawn to OpenAI\'s mission of ensuring AI benefits humanity - after 23 years in tech, I want my work to have that kind of impact.',
    keyPoints: ['Specific to OpenAI', 'Mission alignment', 'Personal connection', 'Unique value'],
    gregSpecific: 'Your Azure OpenAI experience gives you unique insight into how enterprises adopt these technologies.'
  },
  {
    id: 'bh-7',
    question: 'How do you handle disagreements with colleagues?',
    category: 'conflict',
    hints: ['Stay professional', 'Focus on resolution', 'Give example'],
    sampleAnswer: 'I believe healthy disagreement leads to better outcomes. When I disagree with a colleague, I first make sure I fully understand their perspective by asking questions. Then I share my view with data and reasoning, not emotion. If we can\'t resolve it, I\'m comfortable escalating to get a decision, but I always commit fully once a decision is made, even if it wasn\'t my preferred approach.',
    keyPoints: ['Listen first', 'Data-driven', 'Escalation path', 'Commitment to decisions'],
    gregSpecific: 'With 23 years of experience, you\'ve navigated many disagreements - pick a recent example.'
  },
  {
    id: 'bh-8',
    question: 'Where do you see yourself in 5 years?',
    category: 'motivation',
    hints: ['Be ambitious but realistic', 'Align with company growth', 'Show commitment'],
    sampleAnswer: 'In 5 years, I see myself as a technical leader at OpenAI who has helped scale the enterprise adoption of AI significantly. I want to have built teams, mentored engineers, and contributed to products that millions of people use daily. I\'m also passionate about responsible AI, so I hope to have influenced how we think about safety and alignment in production systems.',
    keyPoints: ['Growth trajectory', 'Company alignment', 'Specific contributions', 'Long-term commitment'],
    gregSpecific: 'Show you\'re committed to OpenAI long-term, not just looking for a stepping stone.'
  },
  {
    id: 'bh-9',
    question: 'What questions do you have for us?',
    category: 'culture_fit',
    hints: ['Prepare 3-5 questions', 'Show research', 'Ask about team/role'],
    sampleAnswer: 'I have several questions: 1) How does this team collaborate with the research teams? 2) What does success look like in this role in the first 6 months? 3) How is OpenAI thinking about the balance between moving fast and ensuring safety? 4) What\'s the biggest challenge the team is facing right now?',
    keyPoints: ['Thoughtful questions', 'Shows research', 'Role-specific', 'Company-level thinking'],
    gregSpecific: 'Ask about the Microsoft partnership and how your Azure experience could be leveraged.'
  },
  {
    id: 'bh-10',
    question: 'How do you stay current with AI developments?',
    category: 'motivation',
    hints: ['Be specific', 'Show genuine interest', 'Mention diverse sources'],
    sampleAnswer: 'I\'m genuinely passionate about AI, so staying current comes naturally. I read arXiv papers weekly, follow key researchers on Twitter, and participate in internal Microsoft AI communities. I also build side projects to experiment with new capabilities - recently I built a RAG application using GPT-4 to help me prepare for interviews. I find that hands-on experimentation is the best way to truly understand new developments.',
    keyPoints: ['Multiple sources', 'Hands-on learning', 'Genuine passion', 'Specific examples'],
    gregSpecific: 'Mention this training app as an example of your hands-on learning approach!'
  }
]

// Screening Questions (Higher-level conceptual)
export const SCREENING_QUESTIONS: QuestionBankItem[] = [
  {
    id: 'screen-1',
    question: 'How do Large Language Models (LLMs) work at a high level?',
    hints: ['Think about transformers', 'Next token prediction', 'Training on text data'],
    expected_topics: ['transformers', 'attention', 'tokens', 'training'],
    code_snippet: null,
    options: [
      'They memorize all possible responses and look them up',
      'They use transformer architecture to predict the next token based on context',
      'They search the internet in real-time for answers',
      'They use rule-based systems with predefined responses'
    ],
    correct_option: 1,
    blank_answer: 'transformer architecture predicting next tokens',
    topic: 'api-basics',
    subtopic: 'authentication',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'GPT models use transformer architecture',
      azure_equivalent: 'Same models available through Azure OpenAI',
      key_differences: 'No difference in model architecture - Azure hosts the same models',
      interview_phrase: 'The underlying transformer architecture is identical whether accessed through OpenAI or Azure OpenAI.'
    }
  },
  {
    id: 'screen-2',
    question: 'What is prompt engineering and why is it important?',
    hints: ['Crafting inputs', 'Improving outputs', 'No code changes needed'],
    expected_topics: ['prompts', 'instructions', 'context', 'output quality'],
    code_snippet: null,
    options: [
      'Writing code to modify the model weights',
      'Designing effective inputs to get better outputs from LLMs without changing the model',
      'Engineering the hardware that runs the models',
      'Creating new model architectures'
    ],
    correct_option: 1,
    blank_answer: 'designing effective inputs',
    topic: 'chat-completions',
    subtopic: 'messages',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Prompt engineering techniques apply universally',
      azure_equivalent: 'Same techniques work in Azure OpenAI',
      key_differences: 'Azure provides Prompt Flow for systematic prompt management',
      interview_phrase: 'Prompt engineering is platform-agnostic, though Azure Prompt Flow adds enterprise tooling for prompt management.'
    }
  },
  {
    id: 'screen-3',
    question: 'What is the difference between fine-tuning and prompt engineering?',
    hints: ['One changes the model', 'One changes the input', 'Cost and complexity differ'],
    expected_topics: ['fine-tuning', 'prompt engineering', 'model weights', 'training'],
    code_snippet: null,
    options: [
      'They are the same thing',
      'Fine-tuning modifies model weights with training data; prompt engineering crafts better inputs',
      'Prompt engineering is more expensive than fine-tuning',
      'Fine-tuning only works with GPT-3, not GPT-4'
    ],
    correct_option: 1,
    blank_answer: 'fine-tuning modifies weights, prompting crafts inputs',
    topic: 'fine-tuning',
    subtopic: 'data-prep',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Both available through OpenAI API',
      azure_equivalent: 'Both available through Azure OpenAI',
      key_differences: 'Azure fine-tuning requires uploading data to Azure storage first',
      interview_phrase: 'I typically recommend starting with prompt engineering and only moving to fine-tuning when you have clear evidence it\'s needed.'
    }
  },
  {
    id: 'screen-4',
    question: 'What are tokens in the context of LLMs?',
    hints: ['Not whole words', 'Subword units', 'Affect pricing and limits'],
    expected_topics: ['tokens', 'tokenization', 'BPE', 'context window'],
    code_snippet: null,
    options: [
      'Authentication credentials for API access',
      'Subword units that models use to process text, affecting pricing and context limits',
      'Individual characters in the input',
      'Complete sentences that the model processes'
    ],
    correct_option: 1,
    blank_answer: 'subword units',
    topic: 'chat-completions',
    subtopic: 'tokens',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Tokenization using tiktoken library',
      azure_equivalent: 'Same tokenization, same token counts',
      key_differences: 'No difference - tokenization is model-specific, not platform-specific',
      interview_phrase: 'Token counting is identical across platforms since it\'s determined by the model\'s tokenizer, not the hosting platform.'
    }
  },
  {
    id: 'screen-5',
    question: 'What is RAG (Retrieval-Augmented Generation)?',
    hints: ['Combines retrieval with generation', 'Reduces hallucination', 'Uses external knowledge'],
    expected_topics: ['RAG', 'retrieval', 'embeddings', 'grounding'],
    code_snippet: null,
    options: [
      'A new type of neural network architecture',
      'Combining document retrieval with LLM generation to ground responses in specific data',
      'A method to make models run faster',
      'A technique for compressing model size'
    ],
    correct_option: 1,
    blank_answer: 'retrieval combined with generation',
    topic: 'embeddings-rag',
    subtopic: 'retrieval',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Build RAG with embeddings API + vector DB',
      azure_equivalent: 'Azure AI Search provides integrated RAG with On Your Data',
      key_differences: 'Azure offers turnkey RAG solution; OpenAI requires building the retrieval pipeline',
      interview_phrase: 'Azure AI Search simplifies RAG significantly with its integrated vector search and On Your Data feature.'
    }
  },
  {
    id: 'screen-6',
    question: 'What is hallucination in LLMs and how can you reduce it?',
    hints: ['Confident but wrong', 'Grounding helps', 'Temperature affects it'],
    expected_topics: ['hallucination', 'grounding', 'RAG', 'temperature'],
    code_snippet: null,
    options: [
      'When the model produces visual images',
      'When the model generates confident but factually incorrect information',
      'When the model refuses to answer',
      'When the model runs out of tokens'
    ],
    correct_option: 1,
    blank_answer: 'confident but incorrect information',
    topic: 'safety',
    subtopic: 'responsible-ai',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Use RAG, lower temperature, ask model to cite sources',
      azure_equivalent: 'Same techniques plus Azure content filtering',
      key_differences: 'Azure On Your Data automatically grounds responses in your documents',
      interview_phrase: 'RAG is the most effective hallucination reduction technique - grounding responses in retrieved documents.'
    }
  },
  {
    id: 'screen-7',
    question: 'What is the context window and why does it matter?',
    hints: ['Maximum input size', 'Affects what model can see', 'Varies by model'],
    expected_topics: ['context window', 'tokens', 'memory', 'limitations'],
    code_snippet: null,
    options: [
      'The GUI window where you type prompts',
      'The maximum number of tokens the model can process in a single request',
      'The time window for API rate limits',
      'The browser window size for the playground'
    ],
    correct_option: 1,
    blank_answer: 'maximum tokens per request',
    topic: 'chat-completions',
    subtopic: 'tokens',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'GPT-4 Turbo: 128K tokens, GPT-4: 8K/32K',
      azure_equivalent: 'Same context windows for same models',
      key_differences: 'No difference - context window is model-specific',
      interview_phrase: 'Context windows are identical across platforms since they\'re determined by the model architecture.'
    }
  },
  {
    id: 'screen-8',
    question: 'What is the Assistants API and when would you use it?',
    hints: ['Stateful conversations', 'Built-in tools', 'Thread management'],
    expected_topics: ['Assistants', 'threads', 'stateful', 'tools'],
    code_snippet: null,
    options: [
      'An API for creating chatbots with no memory',
      'A stateful API that manages conversation threads, tool use, and file handling automatically',
      'An API only for voice assistants',
      'A deprecated API replaced by Chat Completions'
    ],
    correct_option: 1,
    blank_answer: 'stateful conversation management',
    topic: 'assistants-api',
    subtopic: 'assistants',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'Full Assistants API with threads, runs, tools',
      azure_equivalent: 'Azure OpenAI Assistants API (preview)',
      key_differences: 'Azure version is in preview with some feature limitations',
      interview_phrase: 'The Assistants API is great for complex conversational apps where you need persistent state and tool use.'
    }
  }
]

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
  voice_explain: { label: 'Voice Explain', color: 'text-amber-400', icon: '🎤' },
  flashcard: { label: 'Flashcard', color: 'text-cyan-400', icon: '🃏' },
  scenario: { label: 'Scenario', color: 'text-rose-400', icon: '🎭' },
  teaching_moment: { label: 'Teaching Moment', color: 'text-lime-400', icon: '💡' },
  code_recognition: { label: 'Code Recognition', color: 'text-orange-400', icon: '👁️' },
  code_fix: { label: 'Code Fix', color: 'text-red-400', icon: '🔧' }
}

// Spaced Repetition Algorithm (SM-2 inspired)
export const calculateNextReview = (
  item: SpacedRepetitionItem,
  score: number // 0-100
): SpacedRepetitionItem => {
  const quality = Math.round((score / 100) * 5) // Convert to 0-5 scale
  
  let newEaseFactor = item.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
  newEaseFactor = Math.max(1.3, newEaseFactor) // Minimum ease factor
  
  let newInterval: number
  let newRepetitions: number
  
  if (quality < 3) {
    // Failed - reset
    newRepetitions = 0
    newInterval = 1
  } else {
    newRepetitions = item.repetitions + 1
    if (item.repetitions === 0) {
      newInterval = 1
    } else if (item.repetitions === 1) {
      newInterval = 6
    } else {
      newInterval = Math.round(item.interval * newEaseFactor)
    }
  }
  
  const nextReview = new Date()
  nextReview.setDate(nextReview.getDate() + newInterval)
  
  return {
    ...item,
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
    nextReview: nextReview.toISOString(),
    lastScore: score
  }
}

// Get questions due for review based on spaced repetition
export const getQuestionsForReview = (
  spacedRepData: Record<string, SpacedRepetitionItem>,
  allQuestions: QuestionBankItem[]
): QuestionBankItem[] => {
  const now = new Date()
  const dueQuestions: QuestionBankItem[] = []
  const newQuestions: QuestionBankItem[] = []
  
  for (const q of allQuestions) {
    const srItem = spacedRepData[q.id]
    if (!srItem) {
      // New question, never seen
      newQuestions.push(q)
    } else if (new Date(srItem.nextReview) <= now) {
      // Due for review
      dueQuestions.push(q)
    }
  }
  
  // Prioritize due questions, then add new ones
  // Sort due questions by how overdue they are
  dueQuestions.sort((a, b) => {
    const aDate = new Date(spacedRepData[a.id].nextReview)
    const bDate = new Date(spacedRepData[b.id].nextReview)
    return aDate.getTime() - bDate.getTime()
  })
  
  return [...dueQuestions, ...newQuestions]
}

// Adaptive difficulty based on recent performance
export const getAdaptiveDifficulty = (
  recentScores: number[],
  currentDifficulty: 'beginner' | 'intermediate' | 'advanced'
): 'beginner' | 'intermediate' | 'advanced' => {
  if (recentScores.length < 3) return currentDifficulty
  
  const avgRecent = recentScores.slice(-5).reduce((a, b) => a + b, 0) / Math.min(5, recentScores.length)
  
  if (avgRecent >= 85 && currentDifficulty !== 'advanced') {
    return currentDifficulty === 'beginner' ? 'intermediate' : 'advanced'
  }
  if (avgRecent < 50 && currentDifficulty !== 'beginner') {
    return currentDifficulty === 'advanced' ? 'intermediate' : 'beginner'
  }
  
  return currentDifficulty
}

// Teaching moment generator
export const generateTeachingMoment = (
  question: QuestionBankItem,
  _userAnswer: string,
  wasCorrect: boolean
): string => {
  if (wasCorrect) {
    return `Great job! ${question.azure_bridge.interview_phrase}`
  }
  
  return `Let's learn from this! The correct answer involves ${question.blank_answer}. 

**OpenAI Way:** ${question.azure_bridge.openai_way}

**Azure Equivalent:** ${question.azure_bridge.azure_equivalent}

**Key Difference:** ${question.azure_bridge.key_differences}

**Interview Tip:** ${question.azure_bridge.interview_phrase}

This concept is important because it's frequently asked in interviews. Try to remember the key differences between OpenAI and Azure approaches.`
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
  // API Basics - Authentication (IMPROVED DISTRACTORS)
  {
    id: 'api-auth-1',
    question: 'What is the primary method for authenticating with the OpenAI API?',
    hints: ['Think about HTTP headers', 'Bearer token pattern'],
    expected_topics: ['authentication', 'API keys', 'headers'],
    code_snippet: null,
    options: [
      'OAuth 2.0 with client credentials flow and refresh tokens',
      'API key in Authorization header as Bearer token',
      'API key in the request body as a JSON parameter',
      'Session-based authentication with cookies'
    ],
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
    options: [
      'Store in a private GitHub repository with restricted access',
      'Store in environment variables or a secret management service like AWS Secrets Manager',
      'Encrypt and store in the application database with AES-256',
      'Store in a .env file committed to version control with .gitignore'
    ],
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
  // Chat Completions - Messages (IMPROVED DISTRACTORS)
  {
    id: 'chat-msg-1',
    question: 'What are the three primary message roles in the Chat Completions API?',
    hints: ['Think about who is speaking', 'System sets the behavior'],
    expected_topics: ['messages', 'roles', 'system', 'user', 'assistant'],
    code_snippet: null,
    options: [
      'developer, human, ai',
      'system, user, assistant',
      'context, query, response',
      'instruction, input, output'
    ],
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
    options: [
      'To provide context from previous conversations for memory',
      'To define the AI assistant behavior, personality, and constraints',
      'To specify the output format like JSON or markdown',
      'To set token limits and control response length'
    ],
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
  // Chat Completions - Parameters (IMPROVED DISTRACTORS)
  {
    id: 'chat-params-1',
    question: 'What does the temperature parameter control in Chat Completions?',
    hints: ['Affects randomness', 'Range from 0 to 2'],
    expected_topics: ['temperature', 'randomness', 'creativity'],
    code_snippet: null,
    options: [
      'The maximum number of tokens in the response',
      'The randomness and creativity of the model responses',
      'The speed of response generation (higher = faster)',
      'The confidence threshold for the model predictions'
    ],
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
    options: [
      'Temperature controls creativity, top_p controls response length',
      'Temperature scales the probability distribution, top_p uses nucleus sampling to limit token selection',
      'Temperature is for chat models, top_p is for completion models',
      'Temperature affects input processing, top_p affects output generation'
    ],
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
  // Function Calling - Tool Definition (IMPROVED DISTRACTORS)
  {
    id: 'func-tool-1',
    question: 'What format is used to define tools/functions for the Chat Completions API?',
    hints: ['Schema definition', 'Describes parameters'],
    expected_topics: ['JSON Schema', 'function definition', 'tools'],
    code_snippet: null,
    options: [
      'OpenAPI/Swagger specification format',
      'JSON Schema for parameter definitions',
      'TypeScript interface definitions',
      'GraphQL schema definition language'
    ],
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
    options: [
      'Specifies which tools are available to the model',
      'Controls whether and which specific tool the model should call',
      'Sets the priority order for multiple tools',
      'Determines if tool results should be streamed'
    ],
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
  // Embeddings & RAG (IMPROVED DISTRACTORS)
  {
    id: 'embed-1',
    question: 'What is the output of the Embeddings API?',
    hints: ['Numerical representation', 'Vector'],
    expected_topics: ['embeddings', 'vectors', 'dimensions'],
    code_snippet: null,
    options: [
      'A semantic similarity score between 0 and 1',
      'A high-dimensional numerical vector representing the input text',
      'A compressed text representation for storage',
      'A list of related keywords and topics'
    ],
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
    options: [
      'Match the model context window (e.g., 128K tokens) for maximum context',
      '500-1500 tokens with 10-20% overlap between chunks',
      'One paragraph per chunk regardless of length',
      '50-100 tokens for maximum granularity in search'
    ],
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
  // Assistants API (IMPROVED DISTRACTORS)
  {
    id: 'assist-1',
    question: 'What are the main components of the Assistants API?',
    hints: ['Persistent entities', 'Conversation management'],
    expected_topics: ['Assistants', 'Threads', 'Messages', 'Runs'],
    code_snippet: null,
    options: [
      'Agents, Conversations, Responses, Actions',
      'Assistants, Threads, Messages, Runs',
      'Bots, Sessions, Prompts, Completions',
      'Models, Contexts, Queries, Results'
    ],
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
    options: [
      'Set a longer timeout and wait synchronously',
      'Poll the run status endpoint or use streaming for real-time updates',
      'Use webhooks configured in the Assistant settings',
      'Queue the request and check a separate results endpoint'
    ],
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
  // Fine-Tuning (IMPROVED DISTRACTORS)
  {
    id: 'finetune-1',
    question: 'What format is required for fine-tuning training data?',
    hints: ['Line-delimited', 'JSON format'],
    expected_topics: ['JSONL', 'training data', 'format'],
    code_snippet: null,
    options: [
      'CSV with columns for prompt and completion',
      'JSONL (JSON Lines) with messages array per line',
      'JSON array containing all training examples',
      'Markdown files with prompt/response pairs'
    ],
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
    question: 'What hyperparameters can you adjust when fine-tuning?',
    hints: ['Training iterations', 'Learning rate'],
    expected_topics: ['n_epochs', 'learning_rate_multiplier', 'batch_size'],
    code_snippet: null,
    options: [
      'temperature, top_p, and max_tokens',
      'n_epochs, learning_rate_multiplier, and batch_size',
      'model_size, layer_count, and attention_heads',
      'context_length, embedding_dim, and dropout_rate'
    ],
    correct_option: 1,
    blank_answer: 'n_epochs, learning_rate_multiplier, batch_size',
    topic: 'fine-tuning',
    subtopic: 'hyperparameters',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'n_epochs, learning_rate_multiplier, batch_size',
      azure_equivalent: 'Same hyperparameters available',
      key_differences: 'Azure has the same fine-tuning hyperparameters.',
      interview_phrase: 'Fine-tuning hyperparameters are identical - we typically start with defaults and adjust n_epochs based on validation loss.'
    }
  },
  {
    id: 'finetune-3',
    question: 'What is the minimum recommended number of training examples for fine-tuning?',
    hints: ['Quality over quantity', 'But need enough examples'],
    expected_topics: ['training data', 'examples', 'minimum'],
    code_snippet: null,
    options: [
      '10-20 high-quality examples is sufficient',
      '50-100 examples minimum, with 500+ recommended for best results',
      'At least 1,000 examples are required',
      'No minimum - even 5 examples can work'
    ],
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
  // Production Patterns (IMPROVED DISTRACTORS)
  {
    id: 'prod-1',
    question: 'What is the recommended approach for handling rate limits in production?',
    hints: ['Retry strategy', 'Exponential backoff'],
    expected_topics: ['rate limits', 'retry', 'backoff'],
    code_snippet: null,
    options: [
      'Catch 429 errors and retry immediately with the same request',
      'Implement exponential backoff with jitter, respecting Retry-After headers',
      'Queue all requests and process them sequentially',
      'Increase your rate limit tier and ignore 429 errors'
    ],
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
    options: [
      'Use a smaller, faster model for all requests',
      'Implement semantic caching that returns cached responses for similar queries',
      'Reduce the max_tokens parameter to get shorter responses',
      'Enable streaming to get partial responses faster'
    ],
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
  // Safety & Moderation (IMPROVED DISTRACTORS)
  {
    id: 'safety-1',
    question: 'What does the Moderation API check for?',
    hints: ['Content categories', 'Harmful content'],
    expected_topics: ['moderation', 'content filtering', 'safety'],
    code_snippet: null,
    options: [
      'Factual accuracy and hallucinations in responses',
      'Harmful content categories including hate speech, violence, self-harm, and sexual content',
      'Copyright infringement and plagiarism',
      'Personal identifiable information (PII) exposure'
    ],
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
    options: [
      'A technique to improve prompt quality by injecting examples',
      'An attack where user input attempts to override or bypass system instructions',
      'A method to dynamically add context to prompts at runtime',
      'A way to inject variables into prompt templates'
    ],
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
  },
  // Additional API Basics Questions (IMPROVED DISTRACTORS)
  {
    id: 'api-basics-3',
    question: 'What is the difference between the /chat/completions and /completions endpoints?',
    hints: ['Message format vs raw text', 'Chat vs legacy'],
    expected_topics: ['chat completions', 'completions', 'API endpoints'],
    code_snippet: null,
    options: [
      '/chat/completions is for GPT-4 only, /completions is for GPT-3.5',
      '/chat/completions uses structured message arrays, /completions uses raw text prompts',
      '/completions supports streaming, /chat/completions does not',
      '/chat/completions has higher rate limits than /completions'
    ],
    correct_option: 1,
    blank_answer: 'message arrays vs raw prompts',
    topic: 'api-basics',
    subtopic: 'endpoints',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: '/chat/completions for chat models, /completions for legacy',
      azure_equivalent: 'Same endpoints available in Azure OpenAI',
      key_differences: 'Azure recommends using chat completions for all new development.',
      interview_phrase: 'Both platforms support chat completions as the primary endpoint, with legacy completions available for backward compatibility.'
    }
  },
  {
    id: 'api-basics-4',
    question: 'What HTTP status code indicates you have exceeded your rate limit?',
    hints: ['4xx error', 'Too many requests'],
    expected_topics: ['rate limits', 'HTTP status', 'error handling'],
    code_snippet: null,
    options: [
      '400 Bad Request - invalid parameters',
      '401 Unauthorized - authentication failed',
      '429 Too Many Requests - rate limit exceeded',
      '503 Service Unavailable - server overloaded'
    ],
    correct_option: 2,
    blank_answer: '429',
    topic: 'api-basics',
    subtopic: 'rate-limits',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: '429 with Retry-After header',
      azure_equivalent: 'Same 429 response with Retry-After',
      key_differences: 'Azure provides more granular rate limit headers.',
      interview_phrase: 'Both platforms return 429 with Retry-After headers - we implement exponential backoff respecting these headers.'
    }
  },
  {
    id: 'api-basics-5',
    question: 'What is the purpose of the organization header in OpenAI API requests?',
    hints: ['Multi-org accounts', 'Billing separation'],
    expected_topics: ['organization', 'headers', 'billing'],
    code_snippet: null,
    options: [
      'Required for all API requests to identify the caller',
      'Specifies which organization to bill when using multi-org accounts',
      'Enables organization-specific model fine-tunes',
      'Sets rate limit tiers for the organization'
    ],
    correct_option: 1,
    blank_answer: 'billing for multi-org',
    topic: 'api-basics',
    subtopic: 'authentication',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'OpenAI-Organization header',
      azure_equivalent: 'Azure uses subscriptions and resource groups for billing separation',
      key_differences: 'Azure uses Azure subscription model instead of organization headers.',
      interview_phrase: 'In Azure, we use subscriptions and resource groups for cost management rather than organization headers.'
    }
  },
  {
    id: 'api-basics-6',
    question: 'What is streaming in the context of the OpenAI API?',
    hints: ['Real-time responses', 'Server-sent events'],
    expected_topics: ['streaming', 'SSE', 'real-time'],
    code_snippet: null,
    options: [
      'Uploading large files in chunks to the API',
      'Receiving response tokens incrementally as they are generated via SSE',
      'Processing multiple requests in a continuous pipeline',
      'Real-time audio/video processing capabilities'
    ],
    correct_option: 1,
    blank_answer: 'tokens as generated',
    topic: 'api-basics',
    subtopic: 'streaming',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'stream: true returns SSE chunks',
      azure_equivalent: 'Identical streaming support',
      key_differences: 'No differences in streaming behavior.',
      interview_phrase: 'Streaming works identically - we use it to improve perceived latency by showing tokens as they generate.'
    }
  },
  // Additional Chat Completions Questions (IMPROVED DISTRACTORS)
  {
    id: 'chat-comp-3',
    question: 'What is the max_tokens parameter used for?',
    hints: ['Output length', 'Cost control'],
    expected_topics: ['max_tokens', 'output length', 'parameters'],
    code_snippet: null,
    options: [
      'Sets the maximum tokens allowed in the input prompt',
      'Limits the maximum number of tokens the model will generate in the response',
      'Controls the total conversation context window size',
      'Defines the maximum tokens per minute for rate limiting'
    ],
    correct_option: 1,
    blank_answer: 'output tokens',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'max_tokens limits response length',
      azure_equivalent: 'max_tokens or max_completion_tokens for newer models',
      key_differences: 'GPT-5 models use max_completion_tokens instead of max_tokens.',
      interview_phrase: 'For newer models like GPT-5, we use max_completion_tokens to control output length.'
    }
  },
  {
    id: 'chat-comp-4',
    question: 'What is the purpose of the stop parameter?',
    hints: ['Termination sequences', 'Custom stop words'],
    expected_topics: ['stop sequences', 'parameters', 'output control'],
    code_snippet: null,
    options: [
      'Pauses the API request for a specified duration',
      'Defines sequences that cause the model to stop generating further tokens',
      'Stops the model from generating unsafe content',
      'Cancels the request if it exceeds a time limit'
    ],
    correct_option: 1,
    blank_answer: 'stop generating',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'stop: ["\\n", "END"]',
      azure_equivalent: 'Identical stop parameter',
      key_differences: 'No differences in stop sequence behavior.',
      interview_phrase: 'Stop sequences are useful for structured outputs - the model stops when it encounters any specified sequence.'
    }
  },
  {
    id: 'chat-comp-5',
    question: 'What does the presence_penalty parameter do?',
    hints: ['Token repetition', 'Encourages new topics'],
    expected_topics: ['presence_penalty', 'repetition', 'parameters'],
    code_snippet: null,
    options: [
      'Penalizes responses that are too long or verbose',
      'Applies a flat penalty to tokens that have already appeared, encouraging topic diversity',
      'Penalizes the model for generating low-confidence predictions',
      'Reduces the likelihood of generating content similar to the input'
    ],
    correct_option: 1,
    blank_answer: 'penalizes appeared tokens',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'presence_penalty: -2.0 to 2.0',
      azure_equivalent: 'Identical parameter',
      key_differences: 'No differences.',
      interview_phrase: 'Presence penalty encourages the model to explore new topics by penalizing tokens that have already appeared.'
    }
  },
  {
    id: 'chat-comp-6',
    question: 'How does frequency_penalty differ from presence_penalty?',
    hints: ['Count-based vs binary', 'Repetition control'],
    expected_topics: ['frequency_penalty', 'presence_penalty', 'comparison'],
    code_snippet: null,
    options: [
      'They are identical parameters with different names for compatibility',
      'frequency_penalty scales proportionally with token occurrence count, presence_penalty is a flat penalty',
      'frequency_penalty affects input tokens, presence_penalty affects output tokens',
      'frequency_penalty controls word repetition, presence_penalty controls phrase repetition'
    ],
    correct_option: 1,
    blank_answer: 'scales with frequency',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'frequency_penalty increases with each occurrence',
      azure_equivalent: 'Identical behavior',
      key_differences: 'No differences.',
      interview_phrase: 'Frequency penalty is proportional to occurrence count, while presence penalty is a flat penalty for any occurrence.'
    }
  },
  {
    id: 'chat-comp-7',
    question: 'What is the response_format parameter used for?',
    hints: ['JSON mode', 'Structured output'],
    expected_topics: ['response_format', 'JSON', 'structured output'],
    code_snippet: null,
    options: [
      'Changes the encoding format of the API response (UTF-8, ASCII, etc.)',
      'Constrains the model to output valid JSON that can be reliably parsed',
      'Sets the language of the response (English, Spanish, etc.)',
      'Specifies whether to return the response as text or binary'
    ],
    correct_option: 1,
    blank_answer: 'valid JSON',
    topic: 'chat-completions',
    subtopic: 'parameters',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'response_format: {type: "json_object"}',
      azure_equivalent: 'Same JSON mode support',
      key_differences: 'Azure supports the same JSON mode.',
      interview_phrase: 'JSON mode ensures valid JSON output - essential for programmatic parsing of responses.'
    }
  },
  // Additional Function Calling Questions (IMPROVED DISTRACTORS)
  {
    id: 'func-call-3',
    question: 'What happens when the model decides to call a function?',
    hints: ['Response structure', 'Tool calls array'],
    expected_topics: ['tool_calls', 'function calling', 'response'],
    code_snippet: null,
    options: [
      'The OpenAI API automatically executes the function on their servers',
      'The response includes a tool_calls array with the function name and arguments to execute locally',
      'The API makes an HTTP request to your registered webhook endpoint',
      'The function result is automatically included in the next response'
    ],
    correct_option: 1,
    blank_answer: 'tool_calls in response',
    topic: 'function-calling',
    subtopic: 'execution',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'response.choices[0].message.tool_calls',
      azure_equivalent: 'Identical response structure',
      key_differences: 'No differences in tool_calls format.',
      interview_phrase: 'The model returns tool_calls - we execute the function locally and send results back in a tool message.'
    }
  },
  {
    id: 'func-call-4',
    question: 'How do you send function results back to the model?',
    hints: ['Tool role', 'Message with tool_call_id'],
    expected_topics: ['tool message', 'function results', 'conversation'],
    code_snippet: null,
    options: [
      'Append the result to the user message content',
      'Add a message with role "tool", the matching tool_call_id, and the result as content',
      'Include the result in the system message for the next request',
      'Use a separate /function-results endpoint'
    ],
    correct_option: 1,
    blank_answer: 'role tool with tool_call_id',
    topic: 'function-calling',
    subtopic: 'execution',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: '{role: "tool", tool_call_id: "...", content: "result"}',
      azure_equivalent: 'Identical message format',
      key_differences: 'No differences.',
      interview_phrase: 'We send function results as tool messages with the matching tool_call_id to maintain conversation context.'
    }
  },
  {
    id: 'func-call-5',
    question: 'What is parallel function calling?',
    hints: ['Multiple functions', 'Single response'],
    expected_topics: ['parallel', 'function calling', 'efficiency'],
    code_snippet: null,
    options: [
      'Executing functions in parallel threads on your server',
      'The model requesting multiple independent function calls in a single response',
      'Calling the same function with different parameters simultaneously',
      'Running function calls across multiple API endpoints'
    ],
    correct_option: 1,
    blank_answer: 'multiple calls in one response',
    topic: 'function-calling',
    subtopic: 'advanced',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Multiple tool_calls in response.choices[0].message.tool_calls',
      azure_equivalent: 'Same parallel calling support',
      key_differences: 'No differences.',
      interview_phrase: 'Parallel function calling improves efficiency - the model can request multiple independent functions at once.'
    }
  },
  {
    id: 'func-call-6',
    question: 'What is Structured Outputs and how does it relate to function calling?',
    hints: ['Schema enforcement', 'Guaranteed format'],
    expected_topics: ['structured outputs', 'schema', 'function calling'],
    code_snippet: null,
    options: [
      'A separate API endpoint for generating structured data',
      'A mode that guarantees model output exactly matches a provided JSON schema',
      'A feature exclusive to GPT-3.5 for backward compatibility',
      'A replacement for function calling that handles execution automatically'
    ],
    correct_option: 1,
    blank_answer: 'matches JSON schema exactly',
    topic: 'function-calling',
    subtopic: 'advanced',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'strict: true in function definition',
      azure_equivalent: 'Structured Outputs supported in Azure OpenAI',
      key_differences: 'Azure supports Structured Outputs with the same strict mode.',
      interview_phrase: 'Structured Outputs with strict mode guarantees schema compliance - essential for reliable function argument parsing.'
    }
  },
  // Additional Embeddings & RAG Questions (IMPROVED DISTRACTORS)
  {
    id: 'embed-3',
    question: 'What is cosine similarity and why is it used with embeddings?',
    hints: ['Vector comparison', 'Angle between vectors'],
    expected_topics: ['cosine similarity', 'embeddings', 'similarity'],
    code_snippet: null,
    options: [
      'A type of embedding model optimized for similarity search',
      'A metric that measures the angle between vectors to determine semantic similarity',
      'A chunking strategy that groups similar content together',
      'A database indexing technique for faster vector lookups'
    ],
    correct_option: 1,
    blank_answer: 'angle between vectors',
    topic: 'embeddings-rag',
    subtopic: 'similarity',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Cosine similarity for vector comparison',
      azure_equivalent: 'Azure AI Search uses cosine similarity by default',
      key_differences: 'Azure AI Search has built-in vector similarity search.',
      interview_phrase: 'Cosine similarity is the standard metric - Azure AI Search handles this automatically in vector search.'
    }
  },
  {
    id: 'embed-4',
    question: 'What is the dimensions parameter in text-embedding-3 models?',
    hints: ['Vector size', 'Matryoshka embeddings'],
    expected_topics: ['dimensions', 'embeddings', 'text-embedding-3'],
    code_snippet: null,
    options: [
      'The maximum number of documents that can be embedded in one request',
      'Allows reducing the embedding vector size for storage/compute efficiency trade-offs',
      'The number of parallel API calls allowed',
      'The maximum input text length in characters'
    ],
    correct_option: 1,
    blank_answer: 'reducing dimensions',
    topic: 'embeddings-rag',
    subtopic: 'embeddings',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'dimensions: 256/512/1024/1536/3072',
      azure_equivalent: 'Same dimensions parameter support',
      key_differences: 'No differences.',
      interview_phrase: 'Matryoshka embeddings let us trade off between quality and storage/compute costs by reducing dimensions.'
    }
  },
  {
    id: 'embed-5',
    question: 'What is hybrid search in the context of RAG?',
    hints: ['Combining methods', 'Keyword + semantic'],
    expected_topics: ['hybrid search', 'RAG', 'retrieval'],
    code_snippet: null,
    options: ['Using two different LLMs', 'Combining keyword search with vector similarity search', 'Searching multiple databases', 'Using both CPU and GPU'],
    correct_option: 1,
    blank_answer: 'keyword + vector',
    topic: 'embeddings-rag',
    subtopic: 'retrieval',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Custom implementation combining BM25 + vectors',
      azure_equivalent: 'Azure AI Search has built-in hybrid search',
      key_differences: 'Azure AI Search provides hybrid search out of the box.',
      interview_phrase: 'Azure AI Search hybrid search combines BM25 keyword matching with vector similarity for better retrieval quality.'
    }
  },
  {
    id: 'embed-6',
    question: 'What is semantic ranking in Azure AI Search?',
    hints: ['Re-ranking', 'Deep learning'],
    expected_topics: ['semantic ranking', 'Azure AI Search', 'reranking'],
    code_snippet: null,
    options: ['Initial search method', 'A re-ranking step using deep learning for better relevance', 'A type of embedding', 'A caching strategy'],
    correct_option: 1,
    blank_answer: 're-ranking with deep learning',
    topic: 'embeddings-rag',
    subtopic: 'retrieval',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'Custom reranking with cross-encoder models',
      azure_equivalent: 'Built-in semantic ranker in Azure AI Search',
      key_differences: 'Azure provides semantic ranking as a managed service.',
      interview_phrase: 'Azure AI Search semantic ranker applies deep learning re-ranking to improve result relevance without custom infrastructure.'
    }
  },
  // Additional Assistants API Questions
  {
    id: 'assist-3',
    question: 'What is a Thread in the Assistants API?',
    hints: ['Conversation container', 'Message history'],
    expected_topics: ['Thread', 'Assistants API', 'conversation'],
    code_snippet: null,
    options: ['A background process', 'A container for a conversation that stores message history', 'A type of model', 'A rate limit category'],
    correct_option: 1,
    blank_answer: 'conversation container',
    topic: 'assistants-api',
    subtopic: 'threads',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'client.beta.threads.create()',
      azure_equivalent: 'Same Thread API in Azure OpenAI',
      key_differences: 'Azure Assistants API is in preview.',
      interview_phrase: 'Threads persist conversation state server-side, eliminating the need to manage message history client-side.'
    }
  },
  {
    id: 'assist-4',
    question: 'What tools are available to Assistants?',
    hints: ['Built-in capabilities', 'Code interpreter, retrieval'],
    expected_topics: ['tools', 'code interpreter', 'retrieval', 'functions'],
    code_snippet: null,
    options: ['Only custom functions', 'Code Interpreter, File Search, and custom Functions', 'Only web browsing', 'Only image generation'],
    correct_option: 1,
    blank_answer: 'Code Interpreter, File Search, Functions',
    topic: 'assistants-api',
    subtopic: 'tools',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'code_interpreter, file_search, function tools',
      azure_equivalent: 'Same tools available in Azure preview',
      key_differences: 'Tool availability may vary in Azure preview.',
      interview_phrase: 'Assistants can use Code Interpreter for computation, File Search for RAG, and custom functions for external integrations.'
    }
  },
  {
    id: 'assist-5',
    question: 'What is a Run in the Assistants API?',
    hints: ['Execution instance', 'Processing a thread'],
    expected_topics: ['Run', 'execution', 'Assistants API'],
    code_snippet: null,
    options: ['A type of model', 'An invocation of an Assistant on a Thread to process messages', 'A billing unit', 'A test execution'],
    correct_option: 1,
    blank_answer: 'invocation on a Thread',
    topic: 'assistants-api',
    subtopic: 'runs',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'client.beta.threads.runs.create()',
      azure_equivalent: 'Same Run API',
      key_differences: 'No differences in Run concept.',
      interview_phrase: 'A Run processes the Thread messages and generates a response, potentially using tools along the way.'
    }
  },
  {
    id: 'assist-6',
    question: 'How do you handle required_action status in a Run?',
    hints: ['Tool outputs needed', 'Submit results'],
    expected_topics: ['required_action', 'tool outputs', 'Run status'],
    code_snippet: null,
    options: ['Restart the Run', 'Submit tool outputs using submit_tool_outputs', 'Cancel and retry', 'Wait for automatic resolution'],
    correct_option: 1,
    blank_answer: 'submit_tool_outputs',
    topic: 'assistants-api',
    subtopic: 'runs',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'client.beta.threads.runs.submit_tool_outputs()',
      azure_equivalent: 'Same tool output submission',
      key_differences: 'No differences.',
      interview_phrase: 'When a Run requires action, we execute the requested functions and submit results to continue processing.'
    }
  },
  // Additional Fine-Tuning Questions
  {
    id: 'finetune-3',
    question: 'What is the purpose of a validation file in fine-tuning?',
    hints: ['Evaluation', 'Overfitting detection'],
    expected_topics: ['validation', 'fine-tuning', 'evaluation'],
    code_snippet: null,
    options: ['Required for all fine-tuning jobs', 'Optional file to evaluate model performance and detect overfitting', 'Contains the model weights', 'Stores API credentials'],
    correct_option: 1,
    blank_answer: 'evaluate and detect overfitting',
    topic: 'fine-tuning',
    subtopic: 'training',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'validation_file parameter in fine-tuning job',
      azure_equivalent: 'Same validation file support',
      key_differences: 'No differences.',
      interview_phrase: 'Validation files help monitor training progress and detect overfitting by evaluating on held-out data.'
    }
  },
  {
    id: 'finetune-4',
    question: 'What hyperparameters can you adjust in fine-tuning?',
    hints: ['Learning rate, epochs', 'Batch size'],
    expected_topics: ['hyperparameters', 'fine-tuning', 'training'],
    code_snippet: null,
    options: ['Only the model name', 'n_epochs, learning_rate_multiplier, batch_size', 'Temperature and top_p', 'Max tokens only'],
    correct_option: 1,
    blank_answer: 'epochs, learning rate, batch size',
    topic: 'fine-tuning',
    subtopic: 'training',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'hyperparameters: {n_epochs, learning_rate_multiplier, batch_size}',
      azure_equivalent: 'Same hyperparameter options',
      key_differences: 'No differences.',
      interview_phrase: 'We typically start with defaults and adjust epochs based on validation loss curves.'
    }
  },
  {
    id: 'finetune-5',
    question: 'When should you consider fine-tuning vs few-shot prompting?',
    hints: ['Cost, consistency', 'Use case specific'],
    expected_topics: ['fine-tuning', 'few-shot', 'decision'],
    code_snippet: null,
    options: ['Always fine-tune for best results', 'Fine-tune for consistent style/format at scale, few-shot for flexibility', 'Few-shot is always better', 'They are interchangeable'],
    correct_option: 1,
    blank_answer: 'consistent style at scale',
    topic: 'fine-tuning',
    subtopic: 'decision',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'Fine-tuning for style, few-shot for knowledge',
      azure_equivalent: 'Same decision framework',
      key_differences: 'Azure also offers Prompt Flow for prompt optimization.',
      interview_phrase: 'Fine-tuning excels at consistent style and format, while few-shot is better for injecting specific knowledge or handling edge cases.'
    }
  },
  {
    id: 'finetune-6',
    question: 'What is the suffix parameter in fine-tuning?',
    hints: ['Model naming', 'Identification'],
    expected_topics: ['suffix', 'model name', 'fine-tuning'],
    code_snippet: null,
    options: ['Adds text to all responses', 'Custom identifier appended to the fine-tuned model name', 'File extension for training data', 'API version suffix'],
    correct_option: 1,
    blank_answer: 'custom model name identifier',
    topic: 'fine-tuning',
    subtopic: 'management',
    difficulty: 'beginner',
    azure_bridge: {
      openai_way: 'suffix: "my-custom-model"',
      azure_equivalent: 'Custom deployment name in Azure',
      key_differences: 'Azure uses deployment names for model identification.',
      interview_phrase: 'The suffix helps identify fine-tuned models - in Azure, we use meaningful deployment names instead.'
    }
  },
  // Additional Production Questions
  {
    id: 'prod-3',
    question: 'What is the Batch API and when should you use it?',
    hints: ['Async processing', 'Cost savings'],
    expected_topics: ['Batch API', 'async', 'cost optimization'],
    code_snippet: null,
    options: ['Real-time processing', 'Async API for large volumes with 50% cost savings and 24-hour turnaround', 'A testing framework', 'Database batch operations'],
    correct_option: 1,
    blank_answer: '50% cost savings, 24-hour turnaround',
    topic: 'production',
    subtopic: 'optimization',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Batch API with JSONL input files',
      azure_equivalent: 'Azure OpenAI Batch API (preview)',
      key_differences: 'Azure Batch API is in preview with similar functionality.',
      interview_phrase: 'Batch API is ideal for non-time-sensitive workloads like daily report generation - 50% cost savings is significant at scale.'
    }
  },
  {
    id: 'prod-4',
    question: 'How do you implement graceful degradation when the API is unavailable?',
    hints: ['Fallbacks', 'User experience'],
    expected_topics: ['graceful degradation', 'fallbacks', 'reliability'],
    code_snippet: null,
    options: ['Show error and stop', 'Implement fallback responses, cached results, or alternative models', 'Retry indefinitely', 'Ignore the error'],
    correct_option: 1,
    blank_answer: 'fallback responses or cached results',
    topic: 'production',
    subtopic: 'fallbacks',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Custom fallback logic',
      azure_equivalent: 'Azure API Management policies for fallbacks',
      key_differences: 'Azure API Management can route to backup deployments automatically.',
      interview_phrase: 'Azure API Management enables automatic failover to backup regions or models without application changes.'
    }
  },
  {
    id: 'prod-5',
    question: 'What metrics should you monitor for an LLM application in production?',
    hints: ['Latency, tokens', 'Quality metrics'],
    expected_topics: ['monitoring', 'metrics', 'production'],
    code_snippet: null,
    options: ['Only error rates', 'Latency, token usage, error rates, and response quality metrics', 'Only cost', 'Only uptime'],
    correct_option: 1,
    blank_answer: 'latency, tokens, errors, quality',
    topic: 'production',
    subtopic: 'monitoring',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Custom logging and monitoring',
      azure_equivalent: 'Azure Monitor, Application Insights integration',
      key_differences: 'Azure provides built-in monitoring with Application Insights.',
      interview_phrase: 'Azure Monitor and Application Insights provide out-of-box LLM metrics including token usage, latency percentiles, and error rates.'
    }
  },
  {
    id: 'prod-6',
    question: 'What is prompt caching and how does it reduce costs?',
    hints: ['Repeated prefixes', 'Automatic optimization'],
    expected_topics: ['prompt caching', 'cost optimization', 'performance'],
    code_snippet: null,
    options: ['Storing all responses', 'Automatically caches repeated prompt prefixes for faster, cheaper subsequent requests', 'Manual response caching', 'Caching model weights'],
    correct_option: 1,
    blank_answer: 'caches repeated prefixes',
    topic: 'production',
    subtopic: 'caching',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'Automatic prompt caching for repeated prefixes',
      azure_equivalent: 'Azure OpenAI supports prompt caching',
      key_differences: 'Both platforms support automatic prompt caching.',
      interview_phrase: 'Prompt caching automatically reduces costs when system prompts or context are repeated across requests.'
    }
  },
  // Additional Safety Questions
  {
    id: 'safety-3',
    question: 'What content categories does the Moderation API check?',
    hints: ['Hate, violence', 'Multiple categories'],
    expected_topics: ['moderation', 'content categories', 'safety'],
    code_snippet: null,
    options: ['Only profanity', 'Hate, harassment, self-harm, sexual, violence, and their subcategories', 'Only illegal content', 'Only spam'],
    correct_option: 1,
    blank_answer: 'hate, harassment, self-harm, sexual, violence',
    topic: 'safety',
    subtopic: 'moderation',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Moderation API with category scores',
      azure_equivalent: 'Azure Content Safety API with similar categories',
      key_differences: 'Azure Content Safety provides additional customization options.',
      interview_phrase: 'Azure Content Safety allows custom severity thresholds per category for enterprise compliance requirements.'
    }
  },
  {
    id: 'safety-4',
    question: 'What is the difference between input and output content filtering?',
    hints: ['Before vs after', 'Both directions'],
    expected_topics: ['content filtering', 'input', 'output'],
    code_snippet: null,
    options: ['They are the same', 'Input filtering checks user prompts, output filtering checks model responses', 'Input is for images, output is for text', 'Only output filtering exists'],
    correct_option: 1,
    blank_answer: 'prompts vs responses',
    topic: 'safety',
    subtopic: 'content-filtering',
    difficulty: 'intermediate',
    azure_bridge: {
      openai_way: 'Moderation API for both input and output',
      azure_equivalent: 'Automatic input and output filtering in Azure OpenAI',
      key_differences: 'Azure applies content filtering automatically to both input and output.',
      interview_phrase: 'Azure OpenAI filters both directions by default - we can customize thresholds but cannot disable filtering entirely.'
    }
  },
  {
    id: 'safety-5',
    question: 'How can you implement responsible AI practices in your application?',
    hints: ['Multiple layers', 'Human oversight'],
    expected_topics: ['responsible AI', 'best practices', 'safety'],
    code_snippet: null,
    options: ['Rely solely on model safety', 'Layer multiple safeguards: content filtering, output validation, human review, and user feedback', 'Only use the Moderation API', 'Disable all safety features for better performance'],
    correct_option: 1,
    blank_answer: 'multiple safeguards',
    topic: 'safety',
    subtopic: 'responsible-ai',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'Custom implementation of safety layers',
      azure_equivalent: 'Azure Responsible AI tools and content filtering',
      key_differences: 'Azure provides Responsible AI dashboard and tools.',
      interview_phrase: 'Azure Responsible AI tools help implement defense in depth - content filtering, custom blocklists, and monitoring dashboards.'
    }
  },
  {
    id: 'safety-6',
    question: 'What is a jailbreak attempt and how do you detect it?',
    hints: ['Bypass safety', 'Pattern detection'],
    expected_topics: ['jailbreak', 'detection', 'safety'],
    code_snippet: null,
    options: ['A type of API error', 'An attempt to bypass model safety guidelines through crafted prompts', 'A performance optimization', 'A debugging technique'],
    correct_option: 1,
    blank_answer: 'bypass safety guidelines',
    topic: 'safety',
    subtopic: 'prompt-injection',
    difficulty: 'advanced',
    azure_bridge: {
      openai_way: 'Custom detection logic',
      azure_equivalent: 'Azure Content Safety jailbreak detection',
      key_differences: 'Azure provides built-in jailbreak detection.',
      interview_phrase: 'Azure Content Safety includes jailbreak detection that identifies common bypass patterns automatically.'
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
                  <Card className="bg-zinc-900/80 border-zinc-700/50 backdrop-blur-sm shadow-xl">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-xl font-semibold text-zinc-100">Your Score</CardTitle>
                        <div className="flex items-center gap-3 bg-zinc-800/50 px-4 py-2 rounded-xl">
                          <span className={`text-4xl font-bold ${getScoreColor(feedback.score)}`}>{feedback.score}</span>
                          <span className="text-zinc-400 text-lg">/100</span>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30">
                        <h4 className="text-orange-400 font-semibold text-lg mb-3 flex items-center gap-2">
                          <MessageSquare className="w-5 h-5" /> Feedback
                        </h4>
                        <div className="text-zinc-200 text-base leading-relaxed space-y-3">
                          {feedback.feedback.split('\n').map((para, i) => (
                            <p key={i} className={para.startsWith('-') ? 'pl-4 border-l-2 border-zinc-600' : ''}>{para}</p>
                          ))}
                        </div>
                      </div>
                      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5">
                        <h4 className="text-emerald-400 font-semibold text-lg mb-3 flex items-center gap-2">
                          <CheckCircle className="w-5 h-5" /> Ideal Answer
                        </h4>
                        <div className="text-zinc-200 text-base leading-relaxed space-y-3">
                          {feedback.correct_answer.split('\n').map((para, i) => {
                            const isNumbered = /^\d+\)/.test(para.trim())
                            const isBullet = para.trim().startsWith('-')
                            return (
                              <p key={i} className={`${isNumbered ? 'font-medium text-emerald-300 mt-4' : ''} ${isBullet ? 'pl-4 text-zinc-300 text-sm' : ''}`}>
                                {para}
                              </p>
                            )
                          })}
                        </div>
                      </div>
                      {feedback.azure_alternative && (
                        <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-5">
                          <h4 className="text-blue-400 font-semibold text-lg mb-3 flex items-center gap-2">
                            <Sparkles className="w-5 h-5" /> Azure Bridge (Your Existing Knowledge)
                          </h4>
                          <p className="text-zinc-400 text-sm mb-3 italic">Use this to connect what you already know from Azure to OpenAI concepts</p>
                          <div className="text-zinc-200 text-base leading-relaxed space-y-3">
                            {feedback.azure_alternative.split('\n').map((para, i) => (
                              <p key={i}>{para}</p>
                            ))}
                          </div>
                        </div>
                      )}
                      {feedback.improvement_tips && feedback.improvement_tips.length > 0 && (
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5">
                          <h4 className="text-amber-400 font-semibold text-lg mb-3 flex items-center gap-2">
                            <Lightbulb className="w-5 h-5" /> Tips to Improve
                          </h4>
                          <ul className="space-y-2">
                            {feedback.improvement_tips.map((tip: string, i: number) => (
                              <li key={i} className="flex items-start gap-3 text-zinc-200">
                                <span className="text-amber-400 mt-1">•</span>
                                <span>{tip}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      <div className="flex gap-4 pt-4">
                        <Button variant="outline" className="flex-1 border-zinc-600 hover:border-orange-500/50 hover:bg-orange-500/10" onClick={handleNext}>
                          <RotateCcw className="w-4 h-4 mr-2" /> Practice Similar
                        </Button>
                        <Button onClick={handleNext} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold shadow-lg shadow-orange-500/25">
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
  const [_sessionType, setSessionType] = useState('screening')
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
      level: 1,
      practiceMode: 'guided',
      showAzurePerspective: true
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

  const generateQuestion = (_type?: string, topicId?: string, subtopicId?: string) => {
    setFeedback(null)
    
    const topic = topicId || currentTopic
    const subtopic = subtopicId || currentSubtopic
    const format = getQuestionFormat(userProgress, questionIndex + 1)

    // ADAPTIVE LEARNING: Determine target difficulty based on performance
    const totalAnswered = userProgress.totalQuestionsAnswered
    const avgScore = userProgress.avgScore
    let targetDifficulty: 'beginner' | 'intermediate' | 'advanced' = 'beginner'
    
    // Progressive difficulty: Start easy, get harder as you improve
    if (totalAnswered >= 30 && avgScore >= 80) {
      targetDifficulty = 'advanced'
    } else if (totalAnswered >= 15 && avgScore >= 70) {
      targetDifficulty = 'intermediate'
    } else if (totalAnswered >= 5 && avgScore >= 60) {
      // Mix beginner and intermediate
      targetDifficulty = Math.random() > 0.5 ? 'intermediate' : 'beginner'
    }

    // ADAPTIVE LEARNING: Find weak areas from topicMastery
    const weakTopics: string[] = []
    Object.entries(topicMastery).forEach(([topicKey, subtopics]) => {
      Object.entries(subtopics).forEach(([_subtopicKey, data]) => {
        const accuracy = data.total > 0 ? data.correct / data.total : 0
        if (data.total >= 2 && accuracy < 0.6) {
          weakTopics.push(topicKey)
        }
      })
    })

    // Use local question bank for instant loading - no API call needed
    let availableQuestions = QUESTION_BANK.filter(q => {
      if (topic && q.topic !== topic) return false
      if (subtopic && q.subtopic !== subtopic) return false
      return true
    })

    // If no topic-specific questions, use all questions
    if (availableQuestions.length === 0) {
      availableQuestions = [...QUESTION_BANK]
    }

    // ADAPTIVE LEARNING: Prioritize weak areas (70% chance to pick from weak topics if available)
    if (weakTopics.length > 0 && Math.random() < 0.7) {
      const weakQuestions = availableQuestions.filter(q => weakTopics.includes(q.topic))
      if (weakQuestions.length > 0) {
        availableQuestions = weakQuestions
      }
    }

    // ADAPTIVE LEARNING: Filter by target difficulty (with fallback)
    const difficultyQuestions = availableQuestions.filter(q => q.difficulty === targetDifficulty)
    if (difficultyQuestions.length > 0) {
      availableQuestions = difficultyQuestions
    }

    // Pick a random question from the filtered bank
    const randomIndex = Math.floor(Math.random() * availableQuestions.length)
    const bankQuestion = availableQuestions[randomIndex]

    // Convert bank question to the format expected by QuestionScreen
    const question: Question = {
      question: bankQuestion.question,
      hints: bankQuestion.hints,
      expected_topics: bankQuestion.expected_topics,
      code_snippet: bankQuestion.code_snippet,
      options: bankQuestion.options,
      correct_option: bankQuestion.correct_option,
      format: format,
      topic: bankQuestion.topic,
      subtopic: bankQuestion.subtopic,
      azure_bridge: bankQuestion.azure_bridge
    }

    setCurrentQuestion(question)
    setQuestionIndex(prev => prev + 1)
  }

  const submitAnswer = async (answer: string) => {
    if (!currentQuestion) return

    setIsLoading(true)

    try {
      let data: Feedback
      
      // For multiple choice questions, evaluate locally without LLM
      if (currentQuestion.format === 'multiple_choice' && currentQuestion.options && currentQuestion.correct_option !== undefined) {
        const selectedIndex = currentQuestion.options.indexOf(answer)
        const isCorrect = selectedIndex === currentQuestion.correct_option
        const correctAnswer = currentQuestion.options[currentQuestion.correct_option]
        
        data = {
          score: isCorrect ? 100 : 0,
          feedback: isCorrect 
            ? 'Correct! You selected the right answer.' 
            : `Incorrect. You selected "${answer}" but the correct answer is "${correctAnswer}".`,
          correct_answer: correctAnswer,
          azure_alternative: currentQuestion.azure_bridge 
            ? `OpenAI: ${currentQuestion.azure_bridge.openai_way}\n\nAzure: ${currentQuestion.azure_bridge.azure_equivalent}\n\nKey Differences: ${currentQuestion.azure_bridge.key_differences}\n\nInterview Tip: ${currentQuestion.azure_bridge.interview_phrase}`
            : null,
          improvement_tips: isCorrect 
            ? ['Great job! Keep practicing to reinforce this knowledge.']
            : ['Review this topic to strengthen your understanding.', 'Try to understand why the correct answer is right.']
        }
      } else {
        // For free response and other formats, use LLM evaluation
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
        data = await response.json()
      }
      
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

  const nextQuestion = () => {
    if (questionIndex >= totalQuestions) {
      setScreen('summary')
    } else {
      generateQuestion()
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
