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
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  Key,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
} from "lucide-react";
import { User } from "@/types";

export default function KeysPage() {
  const [user, setUser] = useState<User | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [keyInfo, setKeyInfo] = useState<any>(null);
  const [isLoadingKeys, setIsLoadingKeys] = useState(false);
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
    setUser(userData);

    if (userData.hasKeys) {
      loadKeyInfo(token);
    }
  }, [router]);

  const loadKeyInfo = async (token: string) => {
    setIsLoadingKeys(true);
    try {
      const response = await fetch("/api/user/keys", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setKeyInfo(data);
      }
    } catch (error) {
      console.error("Failed to load key info:", error);
    } finally {
      setIsLoadingKeys(false);
    }
  };

  const handleGenerateKeys = async () => {
    if (!password || !confirmPassword) {
      toast({
        title: "All fields required",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        title: "Passwords do not match",
        description: "Please make sure both passwords are identical",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 8) {
      toast({
        title: "Password too short",
        description: "Password must be at least 8 characters long",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/user/keys", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate keys");
      }

      toast({
        title: "Keys generated successfully",
        description: "Your RSA key pair and certificate have been created",
      });

      if (user) {
        const updatedUser = { ...user, hasKeys: true };
        localStorage.setItem("user", JSON.stringify(updatedUser));
        setUser(updatedUser);
      }

      setKeyInfo(data);
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      toast({
        title: "Key generation failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPublicKey = () => {
    if (!keyInfo?.publicKey) return;

    const blob = new Blob([keyInfo.publicKey], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "public_key.pem";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: "Public key downloaded successfully",
    });
  };

  const downloadCertificate = () => {
    if (!keyInfo?.certificate) return;

    const blob = new Blob([keyInfo.certificate], { type: "text/plain" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "certificate.pem";
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);

    toast({
      title: "Downloaded",
      description: "Certificate downloaded successfully",
    });
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
        <div className="max-w-4xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {user.role === "organization" ? "Manage Keys" : "View Keys"}
            </h1>
            <p className="text-muted-foreground">
              {user.role === "organization"
                ? "Generate and manage your cryptographic key pair"
                : "View your public key information"}
            </p>
          </div>

          {/* Status Card */}
          <Card
            className={
              user.hasKeys ? "border-green-500/50" : "border-orange-500/50"
            }
          >
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  {user.hasKeys ? (
                    <>
                      <CheckCircle2 className="h-5 w-5 mr-2 text-green-600" />
                      Keys Active
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
                      No Keys Generated
                    </>
                  )}
                </CardTitle>
                <Badge variant={user.hasKeys ? "default" : "destructive"}>
                  {user.hasKeys ? "ACTIVE" : "INACTIVE"}
                </Badge>
              </div>
              <CardDescription>
                {user.hasKeys
                  ? "Your cryptographic keys are generated and ready to use"
                  : "Generate your keys to start signing documents"}
              </CardDescription>
            </CardHeader>
          </Card>

          {!user.hasKeys && user.role === "organization" && (
            <Card>
              <CardHeader>
                <CardTitle>Generate Key Pair</CardTitle>
                <CardDescription>
                  Create your RSA-2048 key pair and self-signed X.509
                  certificate
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Encryption Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter a strong password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isGenerating}
                  />
                  <p className="text-sm text-muted-foreground">
                    This password will encrypt your private key. Keep it safe!
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isGenerating}
                  />
                </div>

                <Button
                  onClick={handleGenerateKeys}
                  disabled={isGenerating}
                  className="w-full"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Keys...
                    </>
                  ) : (
                    <>
                      <Key className="mr-2 h-4 w-4" />
                      Generate Key Pair
                    </>
                  )}
                </Button>

                <div className="mt-6 p-4 bg-muted rounded-lg">
                  <h4 className="text-sm font-semibold mb-2">
                    What will be generated?
                  </h4>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>RSA-2048 public/private key pair</li>
                    <li>Self-signed X.509 certificate (valid for 1 year)</li>
                    <li>Private key encrypted with AES-256-GCM</li>
                    <li>Certificate with your name and organization</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {user.hasKeys && keyInfo && (
            <>
              <Card>
                <CardHeader>
                  <CardTitle>Public Key</CardTitle>
                  <CardDescription>
                    Your public key can be shared with others
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-md font-mono text-xs break-all max-h-48 overflow-y-auto">
                    {keyInfo.publicKey}
                  </div>
                  <Button onClick={downloadPublicKey} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Public Key
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>X.509 Certificate</CardTitle>
                  <CardDescription>
                    Your digital certificate for signature verification
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="p-3 bg-muted rounded-md font-mono text-xs break-all max-h-48 overflow-y-auto">
                    {keyInfo.certificate}
                  </div>
                  <Button onClick={downloadCertificate} variant="outline">
                    <Download className="mr-2 h-4 w-4" />
                    Download Certificate
                  </Button>
                  {keyInfo.createdAt && (
                    <p className="text-sm text-muted-foreground">
                      Generated on:{" "}
                      {new Date(keyInfo.createdAt).toLocaleString("id-ID")}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Security Information</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="font-medium">Algorithm</span>
                      <span className="text-muted-foreground">RSA-2048</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="font-medium">Encryption</span>
                      <span className="text-muted-foreground">AES-256-GCM</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="font-medium">Hash Algorithm</span>
                      <span className="text-muted-foreground">SHA-256</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                      <span className="font-medium">Private Key Status</span>
                      <span className="text-green-600 font-medium">
                        Encrypted & Secure
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
