import Link from "next/link";
import { Button } from "@/components/ui/button";
import { FileQuestion, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-zinc-950 px-4 text-center text-zinc-100 font-sans">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 border border-zinc-800 text-zinc-400 mb-6">
        <FileQuestion className="h-8 w-8" />
      </div>
      <h1 className="text-4xl font-extrabold tracking-tight font-mono">404</h1>
      <h2 className="text-xl font-semibold text-zinc-200 mt-2">Page Not Found</h2>
      <p className="mt-2 text-sm text-zinc-400 max-w-sm">
        The repository resource or route you requested does not exist or has been relocated.
      </p>
      <div className="mt-6">
        <Link href="/">
          <Button variant="outline" className="gap-2 border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800">
            <ArrowLeft className="h-4 w-4" />
            <span>Return to Landing Page</span>
          </Button>
        </Link>
      </div>
    </div>
  );
}
