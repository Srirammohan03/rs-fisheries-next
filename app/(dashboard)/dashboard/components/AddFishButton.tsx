"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Fish } from "lucide-react";
import FishVarietyDialog from "./FishVarietyDialog";

export default function AddFishButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-2xl bg-[#139BC3] text-white hover:bg-[#1088AA] shadow-sm focus-visible:ring-2 focus-visible:ring-[#139BC3]/40"
      >
        <Fish className="w-5 h-5" />
        Add Fish Variety
      </Button>

      <FishVarietyDialog open={open} setOpen={setOpen} />
    </>
  );
}
