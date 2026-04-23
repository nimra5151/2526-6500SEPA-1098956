import { useState } from"react";
import { Card, CardContent } from"@/components/ui/card";
import { Button } from"@/components/ui/button";
import { Textarea } from"@/components/ui/textarea";
import { Label } from"@/components/ui/label";
import { Checkbox } from"@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from"@/components/ui/select";
import { Input } from"@/components/ui/input";
import { useToast } from"@/hooks/use-toast";
import { authFetch } from"@/lib/api";
import { motion } from"framer-motion";
import { AlertTriangle, Loader2, Send } from"lucide-react";

export default function Report() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState("");
  const [targetType, setTargetType] = useState("");
  const [targetId, setTargetId] = useState("");
  const [description, setDescription] = useState("");
  const [anonymous, setAnonymous] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportType) {
      toast({ title:"Please select a report type", variant:"destructive" });
      return;
    }
    if (!targetType) {
      toast({ title:"Please select what you are reporting", variant:"destructive" });
      return;
    }
    if (targetType !== "message" && !targetId.trim()) {
      toast({ title:"Please provide the target ID (user ID, class ID, or message ID)", variant:"destructive" });
      return;
    }
    if (!description.trim()) {
      toast({ title:"Description is required", variant:"destructive" });
      return;
    }
    setLoading(true);
    try {
      await authFetch("/api/report", { method: "POST", body: JSON.stringify({
        reportType,
        targetType,
        targetId: targetType === "message" ? null : Number(targetId),
        description,
        anonymous,
      }) });
      toast({ title:"Report submitted successfully. Our team will review it promptly." });
      setReportType("");
      setTargetType("");
      setTargetId("");
      setDescription("");
      setAnonymous(false);
    } catch {
      toast({ title:"Failed to submit report. Please try again.", variant:"destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:py-8">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-destructive text-destructive-foreground mb-2">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-display font-semibold" data-testid="text-report-title">
            Report a Concern
          </h1>
          <p className="text-sm text-muted-foreground">
            Your safety matters. Use this form to report any concerns about behaviour,
            content, or safety on the platform. All reports are reviewed by our safeguarding team.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="report-type">Report Type</Label>
                <Select value={reportType} onValueChange={setReportType}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select a report type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="harassment">Harassment</SelectItem>
                    <SelectItem value="inappropriate_content">Inappropriate Content</SelectItem>
                    <SelectItem value="safety_concern">Safety Concern</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="target-type">What are you reporting?</Label>
                <Select value={targetType} onValueChange={setTargetType}>
                  <SelectTrigger data-testid="select-target-type">
                    <SelectValue placeholder="Select target type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="class">Class</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {targetType && targetType !== "message" && (
                <div className="space-y-2">
                  <Label htmlFor="target-id">
                    {targetType === "user" ? "User ID" : targetType === "class" ? "Class ID" : "Target ID"}
                  </Label>
                  <Input
                    id="target-id"
                    type="text"
                    placeholder={`Enter the ${targetType === "user" ? "user ID" : targetType === "class" ? "class ID" : "target ID"}...`}
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    data-testid="input-target-id"
                  />
                  <p className="text-xs text-muted-foreground">
                    {targetType === "user" 
                      ? "Enter the user ID you are reporting. You can find this in their profile URL."
                      : targetType === "class"
                      ? "Enter the class ID you are reporting. You can find this in the class URL."
                      : "Enter the target ID for this report."
                    }
                  </p>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  placeholder="Please describe your concern in detail..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="resize-none min-h-[120px]"
                  data-testid="input-description"
                />
              </div>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="anonymous"
                  checked={anonymous}
                  onCheckedChange={(checked) => setAnonymous(checked === true)}
                  data-testid="checkbox-anonymous"
                />
                <Label htmlFor="anonymous" className="text-sm font-normal cursor-pointer">
                  Submit this report anonymously
                </Label>
              </div>

              <Button type="submit" className="w-full neon-btn" disabled={loading} data-testid="button-submit-report">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Send className="w-4 h-4" /> Submit Report</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground space-y-1">
          <p>If someone is in immediate danger, please contact emergency services directly.</p>
          <p className="font-medium">safeguarding@tutorbridge.org</p>
        </div>
      </motion.div>
    </div>
  );
}
