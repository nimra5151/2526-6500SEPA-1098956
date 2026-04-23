import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from"@/components/ui/accordion";
import { Input } from"@/components/ui/input";
import { Button } from"@/components/ui/button";
import { Search, Mail, MessageSquare, BookOpen, Shield, Users } from"lucide-react";
import { useState } from"react";
import { motion } from"framer-motion";

const helpCategories = [
  {
    title:"Getting Started",
    icon: BookOpen,
    articles: [
      {
        question:"How do I create an account?",
        answer:"Click the 'Sign Up' button in the top right. Choose your role (Student or Tutor), fill in your details, and verify your email. For orphanage coordinators, contact our support team."
      },
      {
        question:"How do I find classes?",
        answer:"Go to 'Browse Classes' in the navigation menu. Use filters to find classes by subject, level, or type (on-demand, live, upcoming)."
      },
      {
        question:"How do I enroll in a class?",
        answer:"Click on any class card, review the details, and click 'Enroll Now'. Free classes enroll instantly. For live classes, you'll receive a confirmation and calendar invite."
      }
    ]
  },
  {
    title:"For Students",
    icon: Users,
    articles: [
      {
        question:"What is the AI Study Buddy?",
        answer:"AI Study Buddy is your 24/7 learning assistant. After enrolling in a class, click the chat icon to ask questions, get explanations, and receive study tips tailored to your course."
      },
      {
        question:"How do I access recorded sessions?",
        answer:"Recorded sessions are available for 3 days after a live class. Go to 'My Classes' and click on the class to watch the recording."
      },
      {
        question:"What are Auto Summaries?",
        answer:"After completing a class, AI generates a comprehensive summary with key points, takeaways, practice questions, and next steps. You can download these for offline study."
      }
    ]
  },
  {
    title:"For Tutors",
    icon: Shield,
    articles: [
      {
        question:"How do I create a class?",
        answer:"Click 'Create Class' in the navigation. Fill in the class details (title, description, duration, level, type). You can create on-demand courses, schedule live sessions, or plan upcoming classes."
      },
      {
        question:"What is the AI Lesson Planner?",
        answer:"The AI Lesson Planner helps you create structured lesson plans in minutes. Enter your topic, duration, and student level, and AI generates objectives, activities, materials, and assessment methods."
      },
      {
        question:"How do I manage my students?",
        answer:"Go to 'Dashboard' → 'My Classes' tab. You'll see all enrolled students, can track attendance, send messages, and view their progress."
      }
    ]
  },
  {
    title:"Safety & Safeguarding",
    icon: Shield,
    articles: [
      {
        question:"How are students protected?",
        answer:"All content is reviewed by our AI safety system. All tutors are verified. Sessions can be monitored by orphanage coordinators. We have a zero-tolerance policy for inappropriate content."
      },
      {
        question:"How do I report concerns?",
        answer:"Click 'Report Concerns' in the footer or use the report button on any user profile or class. Our safety team reviews all reports within 24 hours."
      },
      {
        question:"What data is collected?",
        answer:"We only collect necessary data for platform functionality. Students' personal information is protected. See our Privacy Policy for full details."
      }
    ]
  }
];

const faqs = [
  {
    question:"Is TutorBridge completely free?",
    answer:"Yes! All classes marked as 'Free' are completely free for students. Some advanced courses may have optional fees to support tutors, but core learning is always free."
  },
  {
    question:"Can I access classes offline?",
    answer:"On-demand courses can be watched anytime online. You can download AI-generated summaries for offline study. We're working on downloadable course content."
  },
  {
    question:"How do I change my account settings?",
    answer:"Click your profile icon → Settings. Here you can update your profile, change password, manage notifications, and control privacy settings."
  },
  {
    question:"What if I miss a live class?",
    answer:"Live classes are automatically recorded (if the tutor enables recording). The recording is available for 3 days after the session in 'My Classes'."
  },
  {
    question:"How do AI features work?",
    answer:"Our AI features use advanced language models to provide personalized learning support. They analyze your progress, generate recommendations, create summaries, and answer questions in real-time."
  }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCategories = helpCategories.map(category => ({
    ...category,
    articles: category.articles.filter(article =>
      article.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.answer.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(category => category.articles.length > 0);

  return (
    <div className="min-h-screen pb-20">
      <div className="relative bg-gradient-to-br from-[#667EEA]/10 via-[#764BA2]/5 to-transparent py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-5xl font-bold font-display mb-4"
          >
            How can we <span className="text-primary">help you?</span>
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-lg text-muted-foreground mb-8"
          >
            Search our knowledge base or browse by category
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="relative max-w-2xl mx-auto"
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <Input
              placeholder="Search for help..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 pr-4 py-6 text-lg"
            />
          </motion.div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          {(searchQuery ? filteredCategories : helpCategories).map((category, index) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <category.icon className="w-5 h-5 text-primary" />
                    {category.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Accordion type="single" collapsible className="space-y-2">
                    {category.articles.map((article, i) => (
                      <AccordionItem key={i} value={`item-${i}`}>
                        <AccordionTrigger className="text-sm font-medium text-left">
                          {article.question}
                        </AccordionTrigger>
                        <AccordionContent className="text-sm text-muted-foreground">
                          {article.answer}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="mb-16">
          <h2 className="text-3xl font-bold font-display mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <Card>
            <CardContent className="pt-6">
              <Accordion type="single" collapsible className="space-y-4">
                {faqs.map((faq, i) => (
                  <AccordionItem key={i} value={`faq-${i}`}>
                    <AccordionTrigger className="text-base font-semibold">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <Card className="border-2">
          <CardContent className="p-8 text-center">
            <MessageSquare className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold font-display mb-2">
              Still need help?
            </h3>
            <p className="text-muted-foreground mb-6">
              Our support team is here to assist you
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-primary" onClick={() => window.location.href = '/contact'}>
                <Mail className="w-4 h-4 mr-2" />
                Email Support
              </Button>
              <Button variant="outline" disabled>
                <MessageSquare className="w-4 h-4 mr-2" />
                Live Chat (Coming Soon)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
