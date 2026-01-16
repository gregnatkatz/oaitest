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

interface Question {
  question: string
  hints: string[]
  expected_topics: string[]
  code_snippet: string | null
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
            className="flex-1 h-14 text-lg border-zinc-700 hover:border-orange-500/50 hover:bg-orange-500/10"
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
  onSubmitAnswer, onNextQuestion, feedback, isLoading, onEndSession
}: { 
  question: Question | null
  questionIndex: number
  totalQuestions: number
  timeLeft: number
  sessionStats: SessionStats
  onSubmitAnswer: (answer: string) => void
  onNextQuestion: () => void
  feedback: Feedback | null
  isLoading: boolean
  onEndSession: () => void
}) => {
  const [userAnswer, setUserAnswer] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [showHints, setShowHints] = useState(false)

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

  const handleSubmit = () => { if (userAnswer.trim()) onSubmitAnswer(userAnswer) }
  const handleNext = () => { setUserAnswer(''); setShowHints(false); onNextQuestion() }
  const getScoreColor = (score: number) => score >= 80 ? 'text-emerald-400' : score >= 60 ? 'text-amber-400' : 'text-red-400'

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div className="sticky top-0 bg-zinc-950/90 backdrop-blur-sm border-b border-zinc-800 p-4 z-10">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-4">
              <span className="text-sm text-zinc-400">Question {questionIndex} of {totalQuestions}</span>
              <Badge className="bg-orange-500/20 text-orange-400">Session</Badge>
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
                        <div className="relative">
                          <Textarea value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="Type your answer here or use voice input..." className="min-h-32 bg-zinc-800 border-zinc-700 text-zinc-200 pr-12" />
                          <Button variant="ghost" size="sm" className="absolute right-2 top-2" onClick={toggleVoiceInput}>
                            {isListening ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5 text-zinc-400" />}
                          </Button>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                          <Button onClick={handleSubmit} disabled={isLoading || !userAnswer.trim()} className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
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

  useEffect(() => {
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

    try {
      const response = await fetch(`${API_URL}/api/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: subtopicName || topicName || '',
          difficulty: 'medium',
          interview_type: type || sessionType
        })
      })
      const data = await response.json()
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
