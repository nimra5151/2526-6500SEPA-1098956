import { useState } from"react";
import { Card, CardContent, CardHeader, CardTitle } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Badge } from"@/components/ui/badge";
import { Input } from"@/components/ui/input";
import { Textarea } from"@/components/ui/textarea";
import { Label } from"@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { useToast } from"@/hooks/use-toast";
import { apiRequest, ApiError } from"@/lib/queryClient";
import { motion } from"framer-motion";
import { Mail, MessageSquare, Loader2, MapPin, Clock, Send } from"lucide-react";

type SubjectType = "general" | "partnership" | "volunteering" | "technical" | "other";

const subjects: { value: SubjectType; label: string }[] = [
  { value:"general", label:"General Inquiry" },
  { value:"partnership", label:"Partnership" },
  { value:"volunteering", label:"Volunteering" },
  { value:"technical", label:"Technical Support" },
  { value:"other", label:"Other" },
];

interface ContactFormData {
  name: string;
  email: string;
  subject: SubjectType | "";
  message: string;
}

interface ContactFormPayload {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export default function Contact() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<ContactFormData>({ name:"", email:"", subject:"", message:"" });

  const updateField = (key: keyof ContactFormData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.subject || !form.message) {
      toast({ title:"Please fill in all required fields", variant:"destructive" });
      return;
    }
    setLoading(true);
    try {
      const payload: ContactFormPayload = {
        name: form.name,
        email: form.email,
        subject: form.subject,
        message: form.message,
      };
      await apiRequest("POST","/api/contact", payload);
      toast({ title:"Message sent! We will get back to you soon." });
      setForm({ name:"", email:"", subject:"", message:"" });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Failed to send message";
      toast({ title: errorMessage, variant:"destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen py-8 md:py-16">
      <div className="max-w-5xl mx-auto px-4">
        <motion.div initial="hidden" animate="visible" variants={stagger} className="space-y-10">
          <motion.div variants={fadeUp} className="text-center space-y-4">
            <Badge variant="secondary" className="no-default-active-elevate">
              <MessageSquare className="w-3 h-3" /> Get in Touch
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold font-display" data-testid="text-contact-title">
              Contact{" "}
              <span className="text-primary">Us</span>
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Have questions, feedback, or want to partner with us? We would love to hear from you.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div variants={fadeUp} className="lg:col-span-2">
              <div className="border border-slate-200 dark:border-slate-800 rounded-md">
                <Card className="border-0">
                  <CardHeader>
                    <CardTitle className="text-lg font-display flex items-center gap-2 flex-wrap">
                      <Send className="w-5 h-5 text-primary" />
                      Send a Message
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-5" data-testid="form-contact">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="name" className="text-sm font-medium">
                            Name <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="name"
                            placeholder="Your full name"
                            value={form.name}
                            onChange={(e) => updateField("name", e.target.value)}
                            data-testid="input-name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="email" className="text-sm font-medium">
                            Email <span className="text-destructive">*</span>
                          </Label>
                          <Input
                            id="email"
                            type="email"
                            placeholder="you@example.com"
                            value={form.email}
                            onChange={(e) => updateField("email", e.target.value)}
                            data-testid="input-email"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">
                          Subject <span className="text-destructive">*</span>
                        </Label>
                        <Select value={form.subject} onValueChange={(v) => updateField("subject", v)}>
                          <SelectTrigger data-testid="select-subject">
                            <SelectValue placeholder="Select a subject" />
                          </SelectTrigger>
                          <SelectContent>
                            {subjects.map((s) => (
                              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message" className="text-sm font-medium">
                          Message <span className="text-destructive">*</span>
                        </Label>
                        <Textarea
                          id="message"
                          placeholder="Tell us how we can help..."
                          value={form.message}
                          onChange={(e) => updateField("message", e.target.value)}
                          className="resize-none min-h-[140px]"
                          data-testid="input-message"
                        />
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-primary border-0 text-white neon-btn"
                        disabled={loading}
                        data-testid="button-send"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            Send Message
                          </>
                        )}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="space-y-4">
              <Card className="">
                <CardContent className="pt-6 space-y-5">
                  <h3 className="font-semibold font-display">Contact Information</h3>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
                        <Mail className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Email</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-contact-email">
                          {import.meta.env.VITE_SUPPORT_EMAIL || "support@tutorbridge.org"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
                        <MapPin className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Location</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-contact-location">
                          Global Platform - Remote First
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-md bg-primary flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Hours</p>
                        <p className="text-sm text-muted-foreground" data-testid="text-contact-hours">
                          Mon - Fri: 9:00 AM - 6:00 PM (UTC)
                        </p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="">
                <CardContent className="pt-6 space-y-3">
                  <h3 className="font-semibold font-display">Quick Response</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    We typically respond within 24 hours. For urgent safeguarding concerns,
                    please use our dedicated reporting system.
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
