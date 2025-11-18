import Image from "next/image";
import Link from "next/link";
import TemplatesGrid from './components/TemplatesGrid';
import { env } from '@/app/lib/env';

export default function Home() {
  return (
    <div className="font-sans grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src={`${env.basePath}/next.svg`}
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        
        <div className="text-center sm:text-left">
          <h1 className="text-2xl font-bold mb-4">aime Workflow Builder</h1>
          <p className="text-lg mb-6">AI-powered workflow creation with intelligent guidance and streaming generation</p>
          <Link
            href="/workflows/configure/new"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            Get Started
          </Link>
        </div>

        {/* Templates grid - shows available workflow templates */}
        <div className="w-full mt-6">
          <TemplatesGrid />
        </div>

 
      </main>
      
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">

      </footer>
    </div>
  );
}
