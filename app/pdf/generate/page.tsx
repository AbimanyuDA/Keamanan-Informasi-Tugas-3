"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { FileDown, Loader2 } from "lucide-react";
import { User } from "@/types";

export default function GeneratePDFPage() {
  const [user, setUser] = useState<User | null>(null);
  const [title, setTitle] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
      return;
    }

    const userData = JSON.parse(userStr);
    if (userData.role !== "organization") {
      toast({
        title: "Access denied",
        description: "Only organizations can generate PDFs",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    setUser(userData);
  }, [router, toast]);

  const handleGenerate = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a report title",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/pdf/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to generate PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${title.replace(/[^a-z0-9]/gi, "_")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF generated",
        description: "Your PDF report has been generated and downloaded",
      });

      setTitle("");
    } catch (error) {
      toast({
        title: "Generation failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex">
      <Sidebar
        userRole={user.role}
        userName={user.name}
        onLogout={handleLogout}
      />

      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">Generate PDF Report</h1>
            <p className="text-muted-foreground">
              Create a professional PDF report for your organization
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Report Details</CardTitle>
              <CardDescription>
                Enter the details for your PDF report
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Report Title</Label>
                <Input
                  id="title"
                  placeholder="e.g., Security Assessment Report 2024"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-sm text-muted-foreground">
                  This will be the title of your PDF document
                </p>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating PDF...
                  </>
                ) : (
                  <>
                    <FileDown className="mr-2 h-4 w-4" />
                    Generate PDF Report
                  </>
                )}
              </Button>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-semibold mb-2">
                  Sample Report Content
                </h4>
                <p className="text-xs text-muted-foreground">
                  The generated PDF will include sample security assessment
                  content with:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside mt-2 space-y-1">
                  <li>Report header with your organization name</li>
                  <li>Generated date and time</li>
                  <li>Security assessment findings</li>
                  <li>Recommendations and conclusions</li>
                </ul>
                <p className="text-xs text-muted-foreground mt-2">
                  After generation, you can sign the PDF in the Sign PDF page.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
