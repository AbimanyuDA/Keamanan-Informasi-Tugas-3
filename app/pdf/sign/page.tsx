"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { FileUploader } from "@/components/file-uploader";
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
import { FileSignature, Loader2, Download, AlertCircle } from "lucide-react";
import { User } from "@/types";

export default function SignPDFPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [isSigning, setIsSigning] = useState(false);
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
        description: "Only organizations can sign PDFs",
        variant: "destructive",
      });
      router.push("/dashboard");
      return;
    }

    setUser(userData);
  }, [router, toast]);

  const handleSign = async () => {
    if (!pdfFile) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file first",
        variant: "destructive",
      });
      return;
    }

    if (!password) {
      toast({
        title: "Password required",
        description: "Please enter your key password",
        variant: "destructive",
      });
      return;
    }

    setIsSigning(true);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("pdf", pdfFile);
      formData.append("password", password);

      const response = await fetch("/api/pdf/sign", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to sign PDF");
      }

      // Download signed PDF
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `signed_${pdfFile.name}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "PDF signed successfully",
        description: "Your signed PDF has been downloaded",
      });

      // Reset form
      setPdfFile(null);
      setPassword("");
    } catch (error) {
      toast({
        title: "Signing failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsSigning(false);
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
            <h1 className="text-3xl font-bold mb-2">Sign PDF Document</h1>
            <p className="text-muted-foreground">
              Digitally sign your PDF files with your private key
            </p>
          </div>

          {!user.hasKeys && (
            <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
              <CardHeader>
                <CardTitle className="flex items-center text-orange-600">
                  <AlertCircle className="h-5 w-5 mr-2" />
                  Keys Not Generated
                </CardTitle>
                <CardDescription>
                  You need to generate your cryptographic keys before you can
                  sign PDFs. Go to Settings → Manage Keys to generate your key
                  pair.
                </CardDescription>
              </CardHeader>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Upload PDF</CardTitle>
              <CardDescription>
                Select the PDF file you want to sign
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader
                accept=".pdf"
                onFileSelect={setPdfFile}
                currentFile={pdfFile}
                onClearFile={() => setPdfFile(null)}
                label="PDF Document"
                description="Upload the PDF file you want to sign"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Signing Password</CardTitle>
              <CardDescription>
                Enter the password you used to encrypt your private key
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="password">Key Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter your key password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSigning || !user.hasKeys}
                />
                <p className="text-sm text-muted-foreground">
                  This is the password you set when generating your keys
                </p>
              </div>

              <Button
                onClick={handleSign}
                disabled={isSigning || !pdfFile || !password || !user.hasKeys}
                className="w-full"
              >
                {isSigning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing PDF...
                  </>
                ) : (
                  <>
                    <FileSignature className="mr-2 h-4 w-4" />
                    Sign PDF Document
                  </>
                )}
              </Button>

              <div className="mt-6 p-4 bg-muted rounded-lg">
                <h4 className="text-sm font-semibold mb-2">
                  How PDF Signing Works
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                  <li>Your PDF is hashed using SHA-256</li>
                  <li>The hash is signed with your private key (RSA-2048)</li>
                  <li>The signature is embedded in the PDF (PKCS#7 format)</li>
                  <li>Your certificate is attached for verification</li>
                  <li>
                    The signed PDF is cryptographically secure and
                    tamper-evident
                  </li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
