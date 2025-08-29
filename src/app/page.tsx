import VapiWidget from "./components/VapiWidget";
import { env } from "@/config/env";
export default async function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-900 to-black">
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-white mb-6 tracking-tight">
            Aven Support
          </h1>
          <div className="mx-auto max-w-3xl">
            <p className="text-xl text-gray-300 leading-relaxed mb-4">
              This application is aimed towards providing AI voice support for credit card company Aven. 
              Get instant help with your account, payments, rewards, and more through our intelligent voice assistant.
            </p>
            <p className="text-lg text-gray-400">
              Press the green button below to start talking and experience seamless customer support.
            </p>
          </div>
        </div>

        {/* Widget Section */}
        <VapiWidget
          apiKey={env.VAPI_PUBLIC_KEY}
          assistantId={env.VAPI_ASSISTANT_ID}
        />
      </div>
    </div>
  );
}
