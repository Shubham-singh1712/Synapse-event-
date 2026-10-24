import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-page text-primary flex flex-col items-center justify-center p-6 text-center">
      <div className="max-w-md w-full space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-coral/10 text-coral flex items-center justify-center mx-auto text-xl font-bold font-serif">
          404
        </div>
        <h1 className="font-serif text-3xl font-bold tracking-tight text-primary">
          Celebration Not Found
        </h1>
        <p className="text-sm text-muted">
          The page or celebration workspace you are looking for does not exist or has been moved.
        </p>
        <div className="pt-2">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-coral hover:bg-coral-hover text-white text-sm font-semibold transition shadow-coral"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Home</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
