import { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ChevronLeft, Coffee, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProductCard from '@/components/coffee/ProductCard';
import { useProducts, getUniqueProducts } from '@/hooks/useProducts';
import {
  QUIZ_QUESTIONS,
  getQuizRecommendations,
  saveQuizResults,
  type QuizAnswers,
  type FlatProduct,
} from '@/lib/taste-profile-quiz';

const TasteProfileQuiz = () => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});

  const { data: rawProducts, isLoading } = useProducts();
  const allProducts = rawProducts ? getUniqueProducts(rawProducts) : [];
  const flatProducts: FlatProduct[] = allProducts.map((p) => ({
    productId: p.productId,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: p.image,
    category: p.category,
    categorySlug: p.categorySlug,
    description: p.description,
    flavorNotes: p.flavorNotes,
    inStock: p.inStock,
    roastLevel: p.roastLevel,
    intensity: p.intensity,
    isFeatured: p.isFeatured,
  }));

  const currentQuestion = QUIZ_QUESTIONS[step];
  const isLastStep = step === QUIZ_QUESTIONS.length - 1;
  const isComplete = step >= QUIZ_QUESTIONS.length;
  const currentAnswer = currentQuestion && answers[currentQuestion.id as keyof QuizAnswers];

  const handleSelect = (value: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (isLastStep) {
      setStep(QUIZ_QUESTIONS.length); // Show results
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    setStep((s) => Math.max(0, s - 1));
  };

  const handleRestart = () => {
    setStep(0);
    setAnswers({});
  };

  // Results
  const fullAnswers = answers as QuizAnswers;
  const hasAllAnswers = QUIZ_QUESTIONS.every((q) => answers[q.id as keyof QuizAnswers]);
  const recommendations = hasAllAnswers
    ? getQuizRecommendations(flatProducts, fullAnswers, 8)
    : [];

  if (hasAllAnswers && isComplete) {
    saveQuizResults(fullAnswers, recommendations.map((p) => p.productId));
  }

  const displayProducts = recommendations.map((p) => ({
    id: p.productId,
    name: p.name,
    slug: p.slug,
    price: p.price,
    image: p.image,
    category: p.category,
    categorySlug: p.categorySlug || p.category.toLowerCase().replace(/\s+/g, '-'),
    description: p.description,
    flavorNotes: p.flavorNotes,
    inStock: p.inStock,
  }));

  return (
    <div className="min-h-screen bg-background">
      {/* Announcement Bar */}
      <div className="bg-primary text-primary-foreground py-2.5 text-center text-xs font-medium tracking-[0.2em] uppercase">
        Free Shipping — A Privilege Extended Only to Our Subscription Members
      </div>

      {/* Breadcrumb */}
      <div className="border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center gap-2 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors">
              Home
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <Link to="/shop" className="text-muted-foreground hover:text-primary transition-colors">
              Shop
            </Link>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
            <span className="text-foreground">Taste Profile Quiz</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8 md:py-12 max-w-2xl">
        <AnimatePresence mode="wait">
          {!isComplete ? (
            <motion.div
              key={`step-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {/* Progress */}
              <div className="flex gap-2">
                {QUIZ_QUESTIONS.map((_, i) => (
                  <div
                    key={i}
                    className={`
                      h-1 flex-1 rounded-full transition-colors
                      ${i <= step ? 'bg-primary' : 'bg-muted'}
                    `}
                  />
                ))}
              </div>

              {/* Question */}
              <div className="text-center space-y-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-medium tracking-wider uppercase mb-4">
                  <Coffee className="w-3.5 h-3.5" />
                  Question {step + 1} of {QUIZ_QUESTIONS.length}
                </div>
                <h2 className="font-serif text-2xl md:text-3xl font-semibold text-foreground">
                  {currentQuestion?.question}
                </h2>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {currentQuestion?.options.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt.value)}
                    className={`
                      w-full p-4 rounded-xl border-2 text-left transition-all
                      ${currentAnswer === opt.value
                        ? 'border-primary bg-primary/10 text-foreground'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                      }
                    `}
                  >
                    <span className="font-medium">{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-4 pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={step === 0}
                  className="gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!currentAnswer}
                  className="flex-1 gap-2"
                >
                  {isLastStep ? 'See my matches' : 'Next'}
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="space-y-8"
            >
              {/* Results header */}
              <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full">
                  <Sparkles className="w-4 h-4" />
                  <span className="font-medium">Your taste profile</span>
                </div>
                <h1 className="font-serif text-3xl md:text-4xl font-semibold text-foreground">
                  Coffees you'll love
                </h1>
                <p className="text-muted-foreground max-w-md mx-auto">
                  Based on your preferences, here are our top picks for you.
                </p>
              </div>

              {/* Products */}
              {isLoading ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="aspect-square bg-muted rounded-lg animate-pulse" />
                  ))}
                </div>
              ) : displayProducts.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {displayProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-muted/30 rounded-xl">
                  <p className="text-muted-foreground mb-4">
                    We're still curating recommendations for you.
                  </p>
                  <Link to="/shop">
                    <Button>Browse all coffees</Button>
                  </Link>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center pt-6">
                <Button variant="outline" onClick={handleRestart} className="gap-2">
                  Retake quiz
                </Button>
                <Link to="/shop">
                  <Button className="w-full sm:w-auto gap-2">
                    View all products
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default TasteProfileQuiz;
