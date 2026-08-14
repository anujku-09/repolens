"use client";

import { useState, useTransition } from "react";
import { generateAIContextAction } from "@/app/repositories/actions";
import { AICodebasePromptContext } from "@/types";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bot,
  Sparkles,
  Copy,
  Check,
  Code2,
  Cpu,
  Layers,
  CheckCircle2,
  Loader2,
  FileCode,
} from "lucide-react";

interface AIIntelligenceCardProps {
  repositoryId: string;
  repositoryFullName: string;
}

export function AIIntelligenceCard({
  repositoryId,
  repositoryFullName,
}: AIIntelligenceCardProps) {
  const [contextPayload, setContextPayload] = useState<AICodebasePromptContext | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isCopied, setIsCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerateAIContext = () => {
    setError(null);
    startTransition(async () => {
      const res = await generateAIContextAction(repositoryId);
      if (!res.success || !res.context) {
        setError(res.error || "Failed to generate AI context payload.");
      } else {
        setContextPayload(res.context);
      }
    });
  };

  const handleCopyContext = () => {
    if (!contextPayload?.formattedMarkdownPrompt) return;
    navigator.clipboard.writeText(contextPayload.formattedMarkdownPrompt);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <Card className="border-cyan-500/30 bg-cyan-500/5 p-5 mb-8 font-sans">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-cyan-500/20">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 shrink-0">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              AI Codebase Intelligence & Context Payload Generator
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5 font-mono">
              Generates noise-free, AST-verified structural graph payloads for ChatGPT, Claude & Cursor.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Button
            onClick={handleGenerateAIContext}
            disabled={isPending}
            className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-semibold text-xs h-8 px-3 shadow-md gap-1.5 cursor-pointer font-mono"
          >
            {isPending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Building Payload...</span>
              </>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate AI Context</span>
              </>
            )}
          </Button>

          {contextPayload && (
            <Button
              onClick={handleCopyContext}
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs font-mono gap-1.5 text-zinc-200 hover:text-zinc-100 bg-zinc-900 border-zinc-700 cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-cyan-400" />
                  <span>Copy AI Context ({contextPayload.estimatedTokensCount} Tokens)</span>
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Generated AI Context Preview */}
      {contextPayload ? (
        <div className="mt-4 space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
              <span>AST Graph Context Ready ({contextPayload.estimatedTokensCount} tokens)</span>
            </span>
            <span>Paste directly into LLMs for zero-hallucination code changes.</span>
          </div>

          <div className="relative rounded-lg border border-zinc-800 bg-zinc-950 p-4 max-h-64 overflow-y-auto custom-scrollbar font-mono text-[11px] text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {contextPayload.formattedMarkdownPrompt}
          </div>
        </div>
      ) : (
        <div className="mt-3 text-center py-4 text-xs font-mono text-zinc-500">
          Click <strong>&quot;Generate AI Context&quot;</strong> to compile a noise-free AST + graph context payload for LLMs.
        </div>
      )}
    </Card>
  );
}
