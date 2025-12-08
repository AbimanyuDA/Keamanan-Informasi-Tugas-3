"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  Shield,
  Calendar,
  User,
} from "lucide-react";
import { SignatureInfo } from "@/types";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface SignatureStatusCardProps {
  signatureInfo: SignatureInfo | null;
  isVerifying?: boolean;
}

export function SignatureStatusCard({
  signatureInfo,
  isVerifying,
}: SignatureStatusCardProps) {
  if (isVerifying) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 animate-pulse" />
            Verifying Signature...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!signatureInfo) {
    return (
      <Card className="border-muted">
        <CardHeader>
          <CardTitle className="flex items-center text-muted-foreground">
            <Shield className="h-5 w-5 mr-2" />
            No Signature Information
          </CardTitle>
          <CardDescription>
            Upload and verify a signed PDF to see signature details
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const isValid = signatureInfo.valid;

  return (
    <Card
      className={cn(
        "border-2",
        isValid
          ? "border-green-500/50 bg-green-50/50 dark:bg-green-950/20"
          : "border-red-500/50 bg-red-50/50 dark:bg-red-950/20"
      )}
    >
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            {isValid ? (
              <CheckCircle2 className="h-6 w-6 mr-2 text-green-600" />
            ) : (
              <XCircle className="h-6 w-6 mr-2 text-red-600" />
            )}
            {isValid ? "Valid Signature" : "Invalid Signature"}
          </CardTitle>
          <Badge variant={isValid ? "default" : "destructive"}>
            {isValid ? "VERIFIED" : "UNVERIFIED"}
          </Badge>
        </div>
        <CardDescription>Digital signature verification result</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3">
          <div className="flex items-start">
            <User className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Signed By</p>
              <p className="text-sm text-muted-foreground">
                {signatureInfo.signedBy || "Unknown"}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <Calendar className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Signed At</p>
              <p className="text-sm text-muted-foreground">
                {new Date(signatureInfo.signingTime).toLocaleString("id-ID")}
              </p>
            </div>
          </div>

          <div className="flex items-start">
            <Shield className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
            <div className="flex-1">
              <p className="text-sm font-medium">Signature Type</p>
              <p className="text-sm text-muted-foreground">
                {signatureInfo.signatureType}
              </p>
            </div>
          </div>

          {signatureInfo.signingReason && (
            <div className="flex items-start">
              <AlertCircle className="h-4 w-4 mr-2 mt-0.5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Reason</p>
                <p className="text-sm text-muted-foreground">
                  {signatureInfo.signingReason}
                </p>
              </div>
            </div>
          )}
        </div>

        {signatureInfo.algorithm && (
          <div className="border-t pt-4 space-y-2">
            <h4 className="text-sm font-semibold">Certificate Details</h4>
            <div className="space-y-1">
              {signatureInfo.algorithm && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Algorithm
                  </p>
                  <p className="text-xs font-mono break-all">
                    {signatureInfo.algorithm}
                  </p>
                </div>
              )}
              {signatureInfo.subject && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Subject
                  </p>
                  <p className="text-xs font-mono break-all">
                    {signatureInfo.subject}
                  </p>
                </div>
              )}
              {signatureInfo.issuer && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Issuer
                  </p>
                  <p className="text-xs font-mono break-all">
                    {signatureInfo.issuer}
                  </p>
                </div>
              )}
              {signatureInfo.validFrom && signatureInfo.validTo && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Valid From
                    </p>
                    <p className="text-xs">
                      {new Date(signatureInfo.validFrom).toLocaleDateString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      Valid To
                    </p>
                    <p className="text-xs">
                      {new Date(signatureInfo.validTo).toLocaleDateString(
                        "id-ID"
                      )}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
