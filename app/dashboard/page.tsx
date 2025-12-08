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
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  FileSignature,
  ShieldCheck,
  Key,
  TrendingUp,
} from "lucide-react";
import { User } from "@/types";

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");

    if (!token || !userStr) {
      router.push("/login");
      return;
    }

    setUser(JSON.parse(userStr));
    setIsLoading(false);
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    router.push("/login");
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const stats =
    user.role === "organization"
      ? [
          {
            title: "Generate Reports",
            description: "Create professional PDF reports",
            icon: FileText,
            value: "Create",
            color: "text-blue-600",
            href: "/pdf/generate",
          },
          {
            title: "Sign Documents",
            description: "Digitally sign your PDF files",
            icon: FileSignature,
            value: "Sign",
            color: "text-green-600",
            href: "/pdf/sign",
          },
          {
            title: "Verify Signatures",
            description: "Check digital signature validity",
            icon: ShieldCheck,
            value: "Verify",
            color: "text-purple-600",
            href: "/pdf/verify",
          },
          {
            title: "Manage Keys",
            description: "Your cryptographic key pairs",
            icon: Key,
            value: user.hasKeys ? "Active" : "Setup",
            color: "text-orange-600",
            href: "/settings/keys",
          },
        ]
      : [
          {
            title: "Verify Signatures",
            description: "Check digital signature validity",
            icon: ShieldCheck,
            value: "Verify",
            color: "text-purple-600",
            href: "/pdf/verify",
          },
          {
            title: "View Keys",
            description: "Your public key information",
            icon: Key,
            value: user.hasKeys ? "Active" : "Setup",
            color: "text-orange-600",
            href: "/settings/keys",
          },
        ];

  return (
    <div className="flex">
      <Sidebar
        userRole={user.role}
        userName={user.name}
        onLogout={handleLogout}
      />

      <main className="flex-1 lg:ml-64 p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header + Profile Button */}
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold mb-1">{user.name}</h1>
              {user.organizationName && (
                <div className="text-base text-muted-foreground">
                  {user.organizationName}
                </div>
              )}
              {user.position && (
                <div className="text-sm text-muted-foreground">
                  {user.position}
                </div>
              )}
            </div>
            <button
              className="inline-flex items-center px-3 py-1 rounded bg-primary text-primary-foreground text-xs hover:bg-primary/90 transition"
              onClick={() => router.push("/dashboard/profile")}
              title="Edit Profile"
            >
              <svg
                width="16"
                height="16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
              </svg>
              <span className="ml-1">Edit Profile</span>
            </button>
          </div>
          <div className="mb-2">
            <p className="text-muted-foreground">
              {user.role === "organization"
                ? "Manage your PDF documents with digital signatures"
                : "Verify PDF document signatures and authenticity"}
            </p>
          </div>

          {/* Role Badge */}
          <div className="flex items-center space-x-2">
            <Badge
              variant={user.role === "organization" ? "default" : "secondary"}
            >
              {user.role === "organization"
                ? "Organization Account"
                : "Consultant Account"}
            </Badge>
            {!user.hasKeys && (
              <Badge variant="destructive">Keys not generated</Badge>
            )}
          </div>

          {/* Quick Actions */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <Card
                  key={index}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(stat.href)}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {stat.title}
                    </CardTitle>
                    <Icon className={`h-4 w-4 ${stat.color}`} />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{stat.value}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {stat.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Information Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Getting Started
              </CardTitle>
              <CardDescription>
                Quick guide to using the PDF Signature System
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {user.role === "organization" ? (
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Generate Your Keys</p>
                      <p className="text-sm text-muted-foreground">
                        First, generate your RSA key pair and X.509 certificate
                        in Settings → Manage Keys
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Generate PDF Reports</p>
                      <p className="text-sm text-muted-foreground">
                        Create professional PDF reports from your organization
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Sign Documents</p>
                      <p className="text-sm text-muted-foreground">
                        Add digital signatures to PDF files using your private
                        key
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-medium">Verify Signatures</p>
                      <p className="text-sm text-muted-foreground">
                        Check the authenticity of signed PDF documents
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Verify Signatures</p>
                      <p className="text-sm text-muted-foreground">
                        Upload signed PDF files to verify their digital
                        signatures
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium">Check Authenticity</p>
                      <p className="text-sm text-muted-foreground">
                        Review signature details and certificate information
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
