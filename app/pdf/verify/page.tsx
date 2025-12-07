"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { FileUploader } from "@/components/file-uploader";
import { SignatureStatusCard } from "@/components/signature-status-card";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { ShieldCheck, Loader2 } from "lucide-react";
import { User } from "@/types";
import { SignatureInfo } from "@/types";

export default function VerifyPDFPage() {
  const [user, setUser] = useState<User | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [signatureInfo, setSignatureInfo] = useState<SignatureInfo | null>(
    null
  );
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userStr));
  }, [router]);

  const handleVerify = async () => {
    if (!pdfFile) {
      toast({
        title: "No file selected",
        description: "Please upload a PDF file first",
        variant: "destructive",
      });
      return;
    }

    setIsVerifying(true);
    setSignatureInfo(null);

    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("pdf", pdfFile);

      const response = await fetch("/api/pdf/verify", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to verify PDF");
      }

      const data = await response.json();

      if (data.valid && data.signatureInfo) {
        setSignatureInfo(data.signatureInfo);
        toast({
          title: "Signature verified",
          description: "The PDF has a valid digital signature",
        });
      } else {
        toast({
          title: "No valid signature",
          description: data.message || "No valid signature found in this PDF",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Verification failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsVerifying(false);
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
            <h1 className="text-3xl font-bold mb-2">Verify PDF Signature</h1>
            <p className="text-muted-foreground">
              Check the digital signature and authenticity of PDF documents
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Upload Signed PDF</CardTitle>
              <CardDescription>
                Select a signed PDF file to verify its signature
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <FileUploader
                accept=".pdf"
                onFileSelect={(file) => {
                  setPdfFile(file);
                  setSignatureInfo(null);
                }}
                currentFile={pdfFile}
                onClearFile={() => {
                  setPdfFile(null);
                  setSignatureInfo(null);
                }}
                label="Signed PDF Document"
                description="Upload a PDF file to verify its digital signature"
              />

              <Button
                onClick={handleVerify}
                disabled={isVerifying || !pdfFile}
                className="w-full"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying Signature...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="mr-2 h-4 w-4" />
                    Verify PDF Signature
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          <SignatureStatusCard
            signatureInfo={signatureInfo}
            isVerifying={isVerifying}
          />

          <Card>
            <CardHeader>
              <CardTitle>About PDF Verification</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>When you verify a PDF signature, the system checks:</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>The authenticity of the digital signature</li>
                  <li>Whether the PDF has been modified since signing</li>
                  <li>The validity of the signer's certificate</li>
                  <li>The certificate's expiration date</li>
                  <li>The cryptographic algorithm used</li>
                </ul>
                <p className="mt-4">
                  A valid signature means the document is authentic and hasn't
                  been tampered with since it was signed by the certificate
                  holder.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
