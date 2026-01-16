import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { 
  Play, Mic, MicOff, Target, Trophy, ChevronRight, CheckCircle, 
  Zap, Code, BookOpen, Sparkles, ArrowRight, RotateCcw, Timer, Lightbulb, 
  MessageSquare, RefreshCw, Home
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

const SessionStartScreen = ({ 
  onStartSession, 
  weakAreas 
}: { 
  onStartSession: (duration: number, type: string, category: string) => void
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

        <Button 
          onClick={() => onStartSession(selectedDuration, selectedType, '')}
          className="w-full h-14 text-lg bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40"
        >
          <Play className="w-5 h-5 mr-2" />
          Start {selectedType.charAt(0).toUpperCase() + selectedType.slice(1)} Session
        </Button>
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
  const [screen, setScreen] = useState<'start' | 'question' | 'summary'>('start')
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

  useEffect(() => {
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

  const generateQuestion = async (type?: string) => {
    setIsLoading(true)
    setFeedback(null)
    setCurrentQuestion(null)

    try {
      const response = await fetch(`${API_URL}/api/question`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: '',
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

  return (
    <div className="font-sans">
      {screen === 'start' && (
        <SessionStartScreen 
          onStartSession={startSession}
          weakAreas={weakAreas}
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
