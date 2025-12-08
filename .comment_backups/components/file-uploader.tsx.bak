"use client";

import { useState, useRef } from "react";
import { Upload, File, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn, formatFileSize } from "@/lib/utils";

interface FileUploaderProps {
  accept?: string;
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => void;
  currentFile?: File | null;
  onClearFile?: () => void;
  label?: string;
  description?: string;
}

export function FileUploader({
  accept = ".pdf",
  maxSize = 10 * 1024 * 1024, // 10MB default
  onFileSelect,
  currentFile,
  onClearFile,
  label = "Upload PDF",
  description = "Click or drag and drop your PDF file here",
}: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File): boolean => {
    setError(null);

    if (!file.type.includes("pdf")) {
      setError("Please upload a PDF file");
      return false;
    }

    if (file.size > maxSize) {
      setError(`File size must be less than ${formatFileSize(maxSize)}`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (validateFile(file)) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleClear = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setError(null);
    onClearFile?.();
  };

  return (
    <div className="w-full space-y-2">
      <label className="text-sm font-medium">{label}</label>

      {!currentFile ? (
        <Card
          className={cn(
            "border-2 border-dashed transition-colors cursor-pointer hover:border-primary/50",
            isDragging && "border-primary bg-primary/5",
            error && "border-destructive"
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
        >
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <Upload
              className={cn(
                "h-12 w-12 mb-4 text-muted-foreground",
                isDragging && "text-primary"
              )}
            />
            <p className="text-sm font-medium mb-1">{description}</p>
            <p className="text-xs text-muted-foreground">
              Maximum file size: {formatFileSize(maxSize)}
            </p>
          </div>
        </Card>
      ) : (
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <File className="h-8 w-8 text-primary" />
              <div>
                <p className="text-sm font-medium">{currentFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(currentFile.size)}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </Card>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}
