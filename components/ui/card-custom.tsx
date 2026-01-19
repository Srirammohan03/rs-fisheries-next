"use client";

import { ReactNode } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

interface CardCustomProps {
  title: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}

export function CardCustom({ title, actions, children }: CardCustomProps) {
  return (
    <Card className="rounded-2xl shadow-md">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg font-semibold">{title}</CardTitle>
        {actions}
      </CardHeader>

      <CardContent>{children}</CardContent>
    </Card>
  );
}
