"use client";

import React, { useEffect, useState, ChangeEvent, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { User } from "@/types";

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    organizationName: "",
    position: "",
  });
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) {
      router.push("/login");
      return;
    }
    const userObj = JSON.parse(userStr);
    setUser(userObj);
    setForm({
      name: userObj.name || "",
      organizationName: userObj.organizationName || "",
      position: userObj.position || "",
    });
    setIsLoading(false);
  }, [router]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const token = localStorage.getItem("token");
    if (!token) return;
    const res = await fetch("/api/user/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
      localStorage.setItem("user", JSON.stringify(data.user));
      toast.success("Profile updated");
    } else {
      toast.error("Failed to update profile");
    }
  };

  if (isLoading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto mt-10">
      <Card>
        <CardHeader>
          <CardTitle>Edit Profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
            <div>
              <Label htmlFor="organizationName">Organization Name</Label>
              <Input
                name="organizationName"
                value={form.organizationName}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="position">Position</Label>
              <Input
                name="position"
                value={form.position}
                onChange={handleChange}
              />
            </div>
            <Button type="submit" className="w-full">
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
