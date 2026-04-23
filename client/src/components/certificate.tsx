import { useRef } from"react";
import { Button } from"@/components/ui/button";
import { Download, FileText } from"lucide-react";
import jsPDF from"jspdf";

interface CertificateProps {
  studentName: string;
  courseName: string;
  completionDate?: string;
  tutorName?: string;
  verificationCode?: string;
  issuedAt?: string;
}

export function Certificate({ studentName, courseName, completionDate, tutorName, verificationCode, issuedAt }: CertificateProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  // Compute resolved date once to ensure consistency between PDF and PNG certificates
  const resolvedDate = issuedAt
    ? new Date(issuedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
    : completionDate || new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  const downloadPDF = () => {
    const doc = new jsPDF({ orientation:"landscape", unit:"mm", format:"a4" });
    const w = doc.internal.pageSize.getWidth();
    const h = doc.internal.pageSize.getHeight();

    // Background
    doc.setFillColor(238, 242, 255);
    doc.rect(0, 0, w, h,"F");

    // Border
    doc.setDrawColor(99, 102, 241);
    doc.setLineWidth(3);
    doc.rect(8, 8, w - 16, h - 16,"D");
    doc.setLineWidth(1);
    doc.rect(11, 11, w - 22, h - 22,"D");

    // Title
    doc.setFont("helvetica","bold");
    doc.setFontSize(28);
    doc.setTextColor(99, 102, 241);
    doc.text("Certificate of Completion", w / 2, 35, { align:"center" });

    // Subtitle
    doc.setFontSize(12);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica","normal");
    doc.text("TutorBridge — Peer Tutoring Platform", w / 2, 45, { align:"center" });

    // Divider
    doc.setDrawColor(199, 210, 254);
    doc.setLineWidth(0.5);
    doc.line(30, 52, w - 30, 52);

    // This certifies text
    doc.setFontSize(13);
    doc.setTextColor(71, 85, 105);
    doc.text("This is to certify that", w / 2, 65, { align:"center" });

    // Student name
    doc.setFont("helvetica","bold");
    doc.setFontSize(26);
    doc.setTextColor(30, 41, 59);
    doc.text(studentName, w / 2, 80, { align:"center" });

    // Has completed
    doc.setFont("helvetica","normal");
    doc.setFontSize(13);
    doc.setTextColor(71, 85, 105);
    doc.text("has successfully completed the course", w / 2, 92, { align:"center" });

    // Course name
    doc.setFont("helvetica","bold");
    doc.setFontSize(20);
    doc.setTextColor(99, 102, 241);
    doc.text(courseName, w / 2, 107, { align:"center" });

    // Tutor
    if (tutorName) {
      doc.setFont("helvetica","normal");
      doc.setFontSize(12);
      doc.setTextColor(71, 85, 105);
      doc.text(`Taught by: ${tutorName}`, w / 2, 120, { align:"center" });
    }

    // Date and verification
    const dateStr = resolvedDate;

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139);
    doc.text(`Issued: ${dateStr}`, 30, h - 30);
    if (verificationCode) {
      doc.text(`Verification: ${verificationCode}`, w - 30, h - 30, { align:"right" });
    }

    doc.save(`certificate_${studentName.replace(/\s+/g, '_')}.pdf`);
  };

  const downloadCertificate = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = 1200;
    canvas.height = 850;

    // Background gradient
    const gradient = ctx.createLinearGradient(0, 0, 1200, 850);
    gradient.addColorStop(0,"#667EEA");
    gradient.addColorStop(1,"#764BA2");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1200, 850);

    // White inner box
    ctx.fillStyle ="rgba(255,255,255,0.95)";
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(60, 60, 1080, 730, 20);
    } else {
      ctx.rect(60, 60, 1080, 730);
    }
    ctx.fill();

    // Decorative border inside white box
    ctx.strokeStyle ="#6366F1";
    ctx.lineWidth = 3;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(80, 80, 1040, 690, 15);
    } else {
      ctx.rect(80, 80, 1040, 690);
    }
    ctx.stroke();

    // Title
    ctx.fillStyle ="#1E1B4B";
    ctx.font ="bold 52px Arial";
    ctx.textAlign ="center";
    ctx.fillText("Certificate of Completion", 600, 200);

    // Subtitle
    ctx.fillStyle ="#6366F1";
    ctx.font ="26px Arial";
    ctx.fillText("TutorBridge Peer Learning Platform", 600, 255);

    // Divider
    ctx.strokeStyle ="#6366F1";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(300, 280);
    ctx.lineTo(900, 280);
    ctx.stroke();

    // Body text
    ctx.fillStyle ="#334155";
    ctx.font ="24px Arial";
    ctx.fillText("This certifies that", 600, 345);

    // Student Name
    ctx.fillStyle ="#1E1B4B";
    ctx.font ="bold 52px Arial";
    ctx.fillText(studentName, 600, 420);

    // Course text
    ctx.fillStyle ="#334155";
    ctx.font ="24px Arial";
    ctx.fillText("has successfully completed", 600, 495);

    // Course Name
    ctx.fillStyle ="#4F46E5";
    ctx.font ="bold 36px Arial";
    ctx.fillText(courseName, 600, 555);

    // Date
    ctx.fillStyle ="#64748B";
    ctx.font ="20px Arial";
    ctx.fillText(`Completed on: ${resolvedDate}`, 600, 625);

    if (tutorName) {
      ctx.fillText(`Instructor: ${tutorName}`, 600, 660);
    }

    // Bottom line
    ctx.strokeStyle ="#E2E8F0";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(120, 710);
    ctx.lineTo(1080, 710);
    ctx.stroke();

    ctx.fillStyle ="#94A3B8";
    ctx.font ="16px Arial";
    ctx.fillText("TutorBridge — Empowering Learners, Inspiring Futures", 600, 740);

    // Download
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `certificate_${studentName.replace(/\s/g,"_")}.png`;
    a.click();
  };

  return (
    <div className="flex gap-2">
      <canvas ref={canvasRef} style={{ display:"none" }} />
      <Button onClick={downloadCertificate} size="sm" className="bg-indigo-600 hover:bg-indigo-700">
        <Download className="w-4 h-4 mr-2" />
        PNG
      </Button>
      <Button onClick={downloadPDF} size="sm" variant="outline" className="border-indigo-300 text-indigo-700 hover:bg-indigo-50">
        <FileText className="w-4 h-4 mr-2" />
        PDF
      </Button>
    </div>
  );
}
