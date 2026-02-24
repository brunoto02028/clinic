"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Footprints,
  Activity,
  Calendar,
  Heart,
  Dumbbell,
  Stethoscope,
  Camera,
  Brain,
  FileText,
  CheckCircle2,
  Ruler,
  Target,
  TrendingUp,
  Shield,
} from "lucide-react";
import ProfessionalReviewBanner from "@/components/dashboard/professional-review-banner";

interface ServiceShowcaseProps {
  service: "foot_scan" | "body_assessment" | "treatment" | "exercises" | "blood_pressure" | "appointments" | "documents" | "screening";
}

const SHOWCASE_DATA: Record<string, {
  title: string;
  subtitle: string;
  icon: any;
  color: string;
  bgGradient: string;
  features: { icon: any; title: string; desc: string }[];
  howItWorks: { step: number; title: string; desc: string }[];
}> = {
  foot_scan: {
    title: "Foot Scan Analysis",
    subtitle: "Advanced biomechanical analysis of your feet using AI technology",
    icon: Footprints,
    color: "text-blue-600",
    bgGradient: "from-blue-50 to-cyan-50",
    features: [
      { icon: Camera, title: "3D Scan Capture", desc: "High-resolution photos of your feet from multiple angles for precise analysis" },
      { icon: Brain, title: "AI-Powered Analysis", desc: "Artificial intelligence identifies arch type, pronation patterns, and biomechanical issues" },
      { icon: Ruler, title: "Measurements", desc: "Accurate measurements of foot length, width, arch height, and alignment" },
      { icon: FileText, title: "Custom Report", desc: "Detailed report with recommendations for orthotics, footwear, and exercises" },
    ],
    howItWorks: [
      { step: 1, title: "Capture", desc: "Use your phone camera to capture photos of your feet following the guided instructions" },
      { step: 2, title: "AI Analysis", desc: "Our AI analyses your scan to identify arch type, pressure points, and alignment" },
      { step: 3, title: "Results", desc: "Receive a detailed report with personalised recommendations from your therapist" },
    ],
  },
  body_assessment: {
    title: "Body Assessment",
    subtitle: "Full-body posture and movement analysis powered by AI",
    icon: Activity,
    color: "text-purple-600",
    bgGradient: "from-purple-50 to-pink-50",
    features: [
      { icon: Camera, title: "Multi-Angle Capture", desc: "Photos from front, back, left, and right for comprehensive posture analysis" },
      { icon: Brain, title: "AI Posture Analysis", desc: "MediaPipe technology detects 33 body landmarks for precise alignment assessment" },
      { icon: Target, title: "Symmetry Score", desc: "Quantified scores for posture, symmetry, and mobility — track your progress over time" },
      { icon: FileText, title: "Clinical Findings", desc: "AI-generated findings with severity levels and targeted recommendations" },
    ],
    howItWorks: [
      { step: 1, title: "Capture", desc: "Stand in front of your camera while we capture 4 views of your body posture" },
      { step: 2, title: "AI Detection", desc: "Pose detection identifies joint positions, angles, and alignment deviations" },
      { step: 3, title: "Assessment", desc: "Receive posture scores, findings, and therapist-reviewed recommendations" },
    ],
  },
  treatment: {
    title: "Treatment Plan",
    subtitle: "Your personalised rehabilitation protocol created by your physiotherapist",
    icon: Heart,
    color: "text-red-600",
    bgGradient: "from-red-50 to-orange-50",
    features: [
      { icon: Stethoscope, title: "Personalised Protocol", desc: "Treatment plan tailored to your diagnosis, goals, and lifestyle" },
      { icon: TrendingUp, title: "Progress Tracking", desc: "Track completed exercises and see your recovery progress over time" },
      { icon: Calendar, title: "Phased Approach", desc: "Short-term, medium-term, and long-term goals for structured recovery" },
      { icon: Dumbbell, title: "Home Exercises", desc: "Video-guided exercises you can do at home between clinic sessions" },
    ],
    howItWorks: [
      { step: 1, title: "Assessment", desc: "Your therapist creates a diagnosis based on your screening and assessments" },
      { step: 2, title: "Protocol", desc: "A personalised treatment protocol is generated with exercises and sessions" },
      { step: 3, title: "Recovery", desc: "Follow your plan, track progress, and adjust with your therapist" },
    ],
  },
  exercises: {
    title: "My Exercises",
    subtitle: "Video-guided exercises prescribed by your physiotherapist",
    icon: Dumbbell,
    color: "text-green-600",
    bgGradient: "from-green-50 to-emerald-50",
    features: [
      { icon: Dumbbell, title: "Prescribed Exercises", desc: "Exercises specifically chosen for your condition and recovery goals" },
      { icon: Camera, title: "Video Demonstrations", desc: "Watch clear video demonstrations for correct form and technique" },
      { icon: Target, title: "Sets, Reps & Hold Times", desc: "Clear parameters for each exercise — sets, reps, hold duration, and rest" },
      { icon: CheckCircle2, title: "Completion Tracking", desc: "Mark exercises as complete and track your adherence over time" },
    ],
    howItWorks: [
      { step: 1, title: "Prescription", desc: "Your therapist selects exercises from our library tailored to your needs" },
      { step: 2, title: "Follow Along", desc: "Watch videos and follow the prescribed sets, reps, and hold times" },
      { step: 3, title: "Track Progress", desc: "Mark exercises as done and share your progress with your therapist" },
    ],
  },
  blood_pressure: {
    title: "Blood Pressure Monitor",
    subtitle: "Track your blood pressure readings and share with your healthcare team",
    icon: Heart,
    color: "text-rose-600",
    bgGradient: "from-rose-50 to-pink-50",
    features: [
      { icon: Heart, title: "Easy Recording", desc: "Quickly log systolic and diastolic readings with your pulse rate" },
      { icon: TrendingUp, title: "Trend Analysis", desc: "Visual charts showing your blood pressure trends over time" },
      { icon: Shield, title: "Health Alerts", desc: "Automatic alerts for readings outside the normal range" },
      { icon: FileText, title: "Share with GP", desc: "Export your readings to share with your GP or specialist" },
    ],
    howItWorks: [
      { step: 1, title: "Measure", desc: "Take your blood pressure using a home monitor or our camera-based tool" },
      { step: 2, title: "Record", desc: "Log your readings — systolic, diastolic, and pulse rate" },
      { step: 3, title: "Monitor", desc: "View trends and share results with your healthcare team" },
    ],
  },
  appointments: {
    title: "Appointments",
    subtitle: "Book and manage your physiotherapy appointments online",
    icon: Calendar,
    color: "text-teal-600",
    bgGradient: "from-teal-50 to-cyan-50",
    features: [
      { icon: Calendar, title: "Online Booking", desc: "Book appointments at your convenience — choose date, time, and therapist" },
      { icon: Stethoscope, title: "In-Clinic & Remote", desc: "Choose between in-clinic visits or remote video consultations" },
      { icon: FileText, title: "Appointment History", desc: "View past and upcoming appointments with session notes" },
      { icon: CheckCircle2, title: "Reminders", desc: "Receive email reminders before your scheduled appointments" },
    ],
    howItWorks: [
      { step: 1, title: "Choose", desc: "Select your preferred date, time, and therapist" },
      { step: 2, title: "Book", desc: "Confirm your booking and receive a confirmation email" },
      { step: 3, title: "Attend", desc: "Attend your session in clinic or join online" },
    ],
  },
  documents: {
    title: "My Documents",
    subtitle: "Upload and manage your medical documents securely",
    icon: FileText,
    color: "text-indigo-600",
    bgGradient: "from-indigo-50 to-violet-50",
    features: [
      { icon: FileText, title: "Upload Documents", desc: "Upload GP referrals, medical reports, prescriptions, and imaging results" },
      { icon: Camera, title: "Camera Capture", desc: "Take photos of documents directly from your phone" },
      { icon: Brain, title: "AI Summary", desc: "AI extracts key information from your documents for your therapist" },
      { icon: Shield, title: "Secure Storage", desc: "Your documents are stored securely and only accessible to your care team" },
    ],
    howItWorks: [
      { step: 1, title: "Upload", desc: "Upload PDF or photos of your medical documents" },
      { step: 2, title: "Processing", desc: "AI extracts text and generates a summary for your therapist" },
      { step: 3, title: "Review", desc: "Your therapist reviews and uses the information in your treatment" },
    ],
  },
  screening: {
    title: "Medical Screening",
    subtitle: "Complete your medical history form to ensure safe and personalised care",
    icon: Shield,
    color: "text-amber-600",
    bgGradient: "from-amber-50 to-yellow-50",
    features: [
      { icon: Shield, title: "Safety First", desc: "Red flag screening to identify conditions requiring medical attention" },
      { icon: Stethoscope, title: "Medical History", desc: "Record medications, allergies, surgical history, and conditions" },
      { icon: FileText, title: "Emergency Contact", desc: "Provide emergency contact details and GP information" },
      { icon: CheckCircle2, title: "One-Time Setup", desc: "Complete once — your therapist reviews and uses this throughout your care" },
    ],
    howItWorks: [
      { step: 1, title: "Complete", desc: "Answer the medical screening questions honestly and thoroughly" },
      { step: 2, title: "Submit", desc: "Submit the form — it locks for safety and your therapist is notified" },
      { step: 3, title: "Review", desc: "Your therapist reviews your screening before your first session" },
    ],
  },
};

export default function ServiceShowcase({ service }: ServiceShowcaseProps) {
  const data = SHOWCASE_DATA[service];
  if (!data) return null;

  const Icon = data.icon;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className={`bg-gradient-to-br ${data.bgGradient} rounded-xl p-6 sm:p-8 border`}>
        <div className="flex items-center gap-3 mb-3">
          <div className={`w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center shadow-sm`}>
            <Icon className={`h-6 w-6 ${data.color}`} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{data.title}</h2>
            <p className="text-sm text-muted-foreground">{data.subtitle}</p>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {data.features.map((f, i) => {
          const FIcon = f.icon;
          return (
            <Card key={i} className="border-muted/60">
              <CardContent className="p-4 flex gap-3">
                <div className={`w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0`}>
                  <FIcon className={`h-4 w-4 ${data.color}`} />
                </div>
                <div>
                  <p className="text-sm font-semibold">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* How it Works */}
      <Card>
        <CardContent className="p-5">
          <h3 className="font-semibold mb-4 flex items-center gap-2">
            <Badge variant="outline" className="text-xs">How it works</Badge>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {data.howItWorks.map((step) => (
              <div key={step.step} className="text-center">
                <div className={`w-8 h-8 rounded-full bg-primary/10 ${data.color} flex items-center justify-center mx-auto mb-2 text-sm font-bold`}>
                  {step.step}
                </div>
                <p className="text-sm font-semibold">{step.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{step.desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ProfessionalReviewBanner />
    </div>
  );
}
