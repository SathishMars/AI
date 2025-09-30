import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold mb-4">aime Workflow Builder</h1>
          <p className="text-lg mb-6">AI-powered workflow creation with intelligent guidance and streaming generation</p>
        </div>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <Link
            href="/configureMyWorkflow/new"
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
          >
            🚀 AI Workflow Creator
          </Link>
          
          <Link
            href="/configureMyWorkflow/new"
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5"
          >
            📝 Traditional Editor
          </Link>
          
          <Link
            href="/story4"
            className="rounded-full border border-solid border-blue-500 transition-colors flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900 hover:border-blue-600 font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 text-blue-600 dark:text-blue-400"
          >
            🤖 Story 4: Multi-LLM Backend
          </Link>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg max-w-3xl">
          <h2 className="text-lg font-semibold mb-3">✅ Story 6: AI Conversation Interface COMPLETE</h2>
          <ul className="text-sm space-y-2 mb-4">
            <li>✅ Enhanced autocomplete with @ # mrf. user. triggers</li>
            <li>✅ Multi-provider backend integration (MRF templates, user context)</li>
            <li>✅ Professional dropdown interface with keyboard navigation</li>
            <li>✅ Context-aware suggestions and conversation management</li>
          </ul>
          
          <h2 className="text-lg font-semibold mb-3">🚧 Story 7: Workflow Creation Flow IN PROGRESS</h2>
          <ul className="text-sm space-y-2 mb-4">
            <li>✅ Foundational architecture complete (2,227 lines)</li>
            <li>✅ Phase-based structured guidance system</li>
            <li>✅ Real-time streaming workflow generation</li>
            <li>✅ Auto-save system with AI update correlation</li>
            <li>✅ Complete creation flow orchestrator</li>
            <li>🚧 UI integration with WorkflowCreationPane</li>
            <li>⏳ End-to-end testing and validation</li>
          </ul>
          
          <h2 className="text-lg font-semibold mb-3">Previous Stories Completed:</h2>
          <ul className="text-sm space-y-1">
            <li>✅ Story 1: JSON Schema Foundation with Zod v4</li>
            <li>✅ Story 2: UI Components with Material-UI v7</li>
            <li>✅ Story 3: Conversation Interface with enhanced autocomplete</li>
            <li>✅ Story 5: Visualization & Pre-built Functions</li>
            <li>✅ Save-time validation with conversational error explanations</li>
            <li>✅ Dual-pane workflow configurator interface</li>
            <li>✅ TypeScript types and comprehensive validation</li>
          </ul>
        </div>
      </main>
      
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
