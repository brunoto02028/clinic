"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Footprints, Plus, Search, Eye, FileText, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface FootScanAssessment {
  id: string;
  patientId: string;
  patientName: string;
  date: string;
  status: "pending" | "analyzed" | "completed";
  leftFootScan?: string;
  rightFootScan?: string;
  hasPhotos: boolean;
  hasInsoles: boolean;
  hasReport: boolean;
}

export default function FootScansPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [assessments, setAssessments] = useState<FootScanAssessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchAssessments();
  }, []);

  const fetchAssessments = async () => {
    try {
      const res = await fetch("/api/foot-scans");
      if (!res.ok) throw new Error("Failed to fetch assessments");
      const data = await res.json();
      setAssessments(data.assessments || []);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast({
        title: "Error",
        description: "Failed to load assessments",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this assessment?")) return;

    try {
      const res = await fetch(`/api/foot-scans/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");

      toast({
        title: "Success",
        description: "Assessment deleted successfully",
      });

      fetchAssessments();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete assessment",
        variant: "destructive",
      });
    }
  };

  const filteredAssessments = assessments.filter((assessment) =>
    assessment.patientName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500";
      case "analyzed":
        return "bg-blue-500";
      case "pending":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-teal-100 rounded-lg">
            <Footprints className="h-6 w-6 text-teal-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Foot Scans</h1>
            <p className="text-sm text-muted-foreground">
              3D foot analysis and custom insole generation
            </p>
          </div>
        </div>
        <Button onClick={() => router.push("/admin/foot-scans/new")} className="gap-2">
          <Plus className="h-4 w-4" />
          New Assessment
        </Button>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by patient name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Assessments List */}
      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
          <CardDescription>
            {filteredAssessments.length} assessment{filteredAssessments.length !== 1 ? "s" : ""} found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredAssessments.length === 0 ? (
            <div className="text-center py-12">
              <Footprints className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">
                {searchTerm ? "No assessments found" : "No assessments yet"}
              </p>
              {!searchTerm && (
                <Button onClick={() => router.push("/admin/foot-scans/new")} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Assessment
                </Button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredAssessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="p-2 bg-teal-50 rounded-lg">
                      <Footprints className="h-5 w-5 text-teal-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{assessment.patientName}</h3>
                        <Badge className={getStatusColor(assessment.status)}>
                          {assessment.status}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span>{new Date(assessment.date).toLocaleDateString("en-GB")}</span>
                        <span>•</span>
                        <div className="flex items-center gap-2">
                          {assessment.hasPhotos && <span>📸 Photos</span>}
                          {assessment.leftFootScan && <span>🦶 L-Scan</span>}
                          {assessment.rightFootScan && <span>🦶 R-Scan</span>}
                          {assessment.hasInsoles && <span>👟 Insoles</span>}
                          {assessment.hasReport && <span>📄 Report</span>}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/admin/foot-scans/${assessment.id}`)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                    {assessment.hasReport && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(`/api/foot-scans/${assessment.id}/report`, "_blank")}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Report
                      </Button>
                    )}
                    {assessment.hasInsoles && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.push(`/admin/foot-scans/${assessment.id}/insoles`)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        STL
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(assessment.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
