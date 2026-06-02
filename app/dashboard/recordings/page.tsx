"use client";

import { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Square, Play, Pause, Loader2, CheckCircle, Clock, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Recording {
  id: string;
  appointmentId?: string;
  duration?: number;
  language: string;
  transcript?: string;
  status: string;
  chiefComplaint?: string;
  symptoms?: string;
  createdAt: string;
}

export default function PatientRecordingsPage() {
  const { toast } = useToast();
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [uploading, setUploading] = useState(false);
  const [language, setLanguage] = useState("en");
  const [playingId, setPlayingId] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    fetchRecordings();
  }, []);

  const fetchRecordings = async () => {
    try {
      const res = await fetch("/api/patient/consultation-recording");
      const data = await res.json();
      if (res.ok) setRecordings(data.recordings || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
        stream.getTracks().forEach((t) => t.stop());
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    } catch (err: any) {
      toast({ title: "Microphone access denied", description: err.message, variant: "destructive" });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const uploadRecording = async () => {
    if (!audioBlob) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "pre-consultation.webm");
      formData.append("language", language);
      formData.append("duration", String(recordingTime));

      const res = await fetch("/api/patient/consultation-recording", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      toast({ title: "Recording sent!", description: "Your physiotherapist will review it before your appointment." });
      setAudioBlob(null);
      setRecordingTime(0);
      fetchRecordings();
    } catch (err: any) {
      toast({ title: "Upload failed", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const formatTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const statusBadge = (status: string) => {
    switch (status) {
      case "pending": return <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case "transcribed": return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"><CheckCircle className="h-3 w-3 mr-1" />Ready</Badge>;
      case "reviewed": return <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"><CheckCircle className="h-3 w-3 mr-1" />Reviewed</Badge>;
      case "used_in_soap": return <Badge variant="secondary" className="bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-400"><CheckCircle className="h-3 w-3 mr-1" />Used in Notes</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2 text-gray-900 dark:text-white">
          <Mic className="h-7 w-7 text-violet-600 dark:text-violet-400" />
          Pre-Consultation Recording
        </h1>
        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
          Record a message describing your symptoms before your appointment. Your physiotherapist will listen before your session.
        </p>
      </div>

      {/* Recording Card */}
      <Card className="border-violet-400/30 dark:border-violet-500/30 bg-violet-500/5 dark:bg-violet-500/10">
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Mic className="h-5 w-5 text-violet-600 dark:text-violet-400" />
            <h2 className="font-semibold text-gray-900 dark:text-white">Record Your Symptoms</h2>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            Tell us about your pain, symptoms, or concerns. Speak naturally — our AI will transcribe and summarise it for your physiotherapist.
          </p>

          <div className="flex items-center gap-3">
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="pt">Portuguese</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            {!isRecording && !audioBlob && (
              <Button onClick={startRecording} className="gap-2 bg-red-600 hover:bg-red-700 text-white">
                <Mic className="h-4 w-4" /> Start Recording
              </Button>
            )}

            {isRecording && (
              <>
                <Button onClick={stopRecording} variant="destructive" className="gap-2 animate-pulse">
                  <Square className="h-4 w-4" /> Stop ({formatTime(recordingTime)})
                </Button>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-medium text-red-600 dark:text-red-400">Recording...</span>
                </div>
              </>
            )}

            {audioBlob && !isRecording && (
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-sm px-3 py-1">
                  <Clock className="h-3 w-3 mr-1" /> {formatTime(recordingTime)}
                </Badge>
                <Button onClick={uploadRecording} disabled={uploading} className="gap-2 bg-violet-600 hover:bg-violet-700 text-white">
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {uploading ? "Sending..." : "Send to Physiotherapist"}
                </Button>
                <Button variant="ghost" size="sm" onClick={() => { setAudioBlob(null); setRecordingTime(0); }}>
                  <Trash2 className="h-4 w-4" /> Discard
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Previous Recordings */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">Your Recordings</h3>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-violet-600" />
          </div>
        ) : recordings.length === 0 ? (
          <Card className="py-12 text-center">
            <MicOff className="h-10 w-10 mx-auto text-gray-400 dark:text-gray-600 mb-3" />
            <p className="text-gray-600 dark:text-gray-400">No recordings yet</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Record your symptoms above before your next appointment</p>
          </Card>
        ) : (
          recordings.map((rec) => (
            <Card key={rec.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {statusBadge(rec.status)}
                      {rec.duration && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatTime(rec.duration)}
                        </span>
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(rec.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>

                    {rec.chiefComplaint && (
                      <p className="text-sm font-medium text-gray-900 dark:text-white mt-2">
                        {rec.chiefComplaint}
                      </p>
                    )}

                    {rec.transcript && (
                      <p className="text-sm text-gray-600 dark:text-gray-300 mt-1 line-clamp-3">
                        {rec.transcript}
                      </p>
                    )}

                    {rec.symptoms && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {JSON.parse(rec.symptoms).map((s: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
