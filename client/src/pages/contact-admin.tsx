import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Shield, Send, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { authFetch } from '@/lib/api';
import { useMutation } from '@tanstack/react-query';

export default function ContactAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    subject: '',
    message: '',
  });

  const sendMessage = useMutation({
    mutationFn: (data: typeof formData) =>
      authFetch('/api/contact-admin', {
        method: 'POST',
        body: JSON.stringify({
          subject: data.subject,
          message: data.message,
        }),
      }),
    onSuccess: () => {
      toast({
        title: 'Message Sent',
        description: 'Your message has been sent to the admin team.',
      });
      setFormData({ subject: '', message: '' });
    },
    onError: (err: any) => {
      const errorDescription = err.message || 'Failed to send message. Please try again.';
      toast({
        title: 'Error',
        description: errorDescription,
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.subject || !formData.message) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }
    sendMessage.mutate(formData);
  };

  return (
    <div className="min-h-screen bg-background py-12">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-4xl font-bold mb-2">Contact Admin</h1>
            <p className="text-muted-foreground">
              Need help or have a question? Send a message to the admin team.
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Send Message</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <Label htmlFor="name">Your Name</Label>
                  <Input
                    id="name"
                    value={user?.name || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="email">Your Email</Label>
                  <Input
                    id="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div>
                  <Label htmlFor="subject">Subject *</Label>
                  <Input
                    id="subject"
                    value={formData.subject}
                    onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                    placeholder="What is this about?"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="message">Message *</Label>
                  <Textarea
                    id="message"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    placeholder="Describe your issue or question..."
                    rows={6}
                    required
                  />
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={sendMessage.isPending}
                >
                  {sendMessage.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Send Message
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
