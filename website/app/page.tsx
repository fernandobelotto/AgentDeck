import { Link } from "lib/transition"
import { PageRoutes } from "@/lib/pageroutes"
import { buttonVariants } from "@/components/ui/button"
import {
  LuZap,
  LuLayers,
  LuTerminal,
  LuMousePointerClick,
  LuActivity,
  LuShield,
} from "react-icons/lu"

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 py-16 text-center">
        {/* Background gradient - Claude orange and Gemini blue */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#D97757]/5 via-transparent to-[#4285F4]/5" />

        {/* Floating orbs with brand colors */}
        <div className="pointer-events-none absolute left-1/4 top-1/4 h-72 w-72 rounded-full bg-[#D97757]/10 blur-3xl" />
        <div className="pointer-events-none absolute right-1/4 top-1/3 h-72 w-72 rounded-full bg-[#4285F4]/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-1/4 right-1/4 h-48 w-48 rounded-full bg-[#8E75B2]/10 blur-3xl" />

        <div className="relative z-10">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#D97757]/30 bg-[#D97757]/10 px-4 py-2 text-sm font-medium text-[#D97757] dark:text-[#E8A089]">
            <LuZap className="h-4 w-4" />
            Elgato Stream Deck Plugin
          </div>

          <h1 className="mb-6 text-5xl font-extrabold tracking-tight sm:text-6xl md:text-7xl">
            <span className="text-foreground">Your AI Assistants</span>
            <br />
            <span className="bg-gradient-to-r from-[#D97757] via-[#8E75B2] to-[#4285F4] bg-clip-text text-transparent">
              On Your Stream Deck
            </span>
          </h1>

          <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
            Monitor Claude Code and Gemini CLI with real-time animated status icons.
            Focus windows, approve permissions, and control your AI — all from your Stream Deck.
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href={`/docs${PageRoutes[0].href}`}
              className={buttonVariants({
                className: "bg-[#D97757] px-8 text-base font-semibold hover:bg-[#C86747]",
                size: "lg",
              })}
            >
              Get Started
            </Link>
            <Link
              href="/docs/features"
              className={buttonVariants({
                variant: "outline",
                className: "border-[#4285F4]/50 px-8 text-base hover:bg-[#4285F4]/10",
                size: "lg",
              })}
            >
              View Features
            </Link>
          </div>
        </div>

        {/* Stream Deck Device Visual */}
        <div className="relative z-10 mt-16">
          <StreamDeckVisual />
        </div>
      </section>

      {/* Features Section */}
      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
              Powerful Features for AI-Powered Development
            </h2>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              AgentDeck brings your AI coding assistants to your fingertips
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={<LuActivity className="h-6 w-6" />}
              title="Real-time Status"
              description="Animated icons show exactly what your AI is doing: idle, thinking, editing, or waiting for input."
              color="claude"
            />
            <FeatureCard
              icon={<LuMousePointerClick className="h-6 w-6" />}
              title="Gesture Controls"
              description="Single press to focus, double press to cancel, long press to approve. Intuitive interactions."
              color="gemini"
            />
            <FeatureCard
              icon={<LuLayers className="h-6 w-6" />}
              title="Multi-Instance"
              description="Monitor multiple AI sessions simultaneously. Each Stream Deck key tracks a different session."
              color="purple"
            />
            <FeatureCard
              icon={<LuTerminal className="h-6 w-6" />}
              title="Terminal Integration"
              description="Deep Kitty terminal integration with remote control. Launch new instances with one press."
              color="claude"
            />
            <FeatureCard
              icon={<LuShield className="h-6 w-6" />}
              title="Permission Control"
              description="Approve or deny permission requests directly from your Stream Deck without context switching."
              color="gemini"
            />
            <FeatureCard
              icon={<LuZap className="h-6 w-6" />}
              title="Instant Feedback"
              description="WebSocket-powered updates ensure you see status changes the moment they happen."
              color="purple"
            />
          </div>
        </div>
      </section>

      {/* Supported Assistants */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Works With Your Favorite AI Assistants
          </h2>
          <p className="mb-12 text-muted-foreground">
            Native support for the leading AI coding assistants
          </p>

          <div className="grid gap-8 sm:grid-cols-2">
            {/* Claude Card */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-[#D97757]/30 bg-gradient-to-br from-[#D97757]/5 to-[#D97757]/10 p-8 transition-all hover:border-[#D97757]/50 hover:shadow-xl hover:shadow-[#D97757]/10">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[#D97757]/20 blur-2xl transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#D97757] to-[#C86747] text-2xl font-bold text-white shadow-lg">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <h3 className="mb-2 text-2xl font-bold text-[#D97757]">Claude Code</h3>
                <p className="mb-4 text-sm text-muted-foreground">by Anthropic</p>
                <ul className="space-y-2 text-left text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D97757]" />
                    Full hooks integration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D97757]" />
                    Real-time status updates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#D97757]" />
                    Permission approvals
                  </li>
                </ul>
              </div>
            </div>

            {/* Gemini Card */}
            <div className="group relative overflow-hidden rounded-2xl border-2 border-[#4285F4]/30 bg-gradient-to-br from-[#4285F4]/5 to-[#8E75B2]/10 p-8 transition-all hover:border-[#4285F4]/50 hover:shadow-xl hover:shadow-[#4285F4]/10">
              <div className="absolute right-0 top-0 h-32 w-32 translate-x-8 -translate-y-8 rounded-full bg-[#4285F4]/20 blur-2xl transition-transform group-hover:scale-150" />
              <div className="relative">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#4285F4] to-[#8E75B2] text-2xl font-bold text-white shadow-lg">
                  <svg viewBox="0 0 24 24" className="h-8 w-8" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="currentColor" strokeWidth="2" fill="none"/>
                  </svg>
                </div>
                <h3 className="mb-2 text-2xl font-bold text-[#4285F4]">Gemini CLI</h3>
                <p className="mb-4 text-sm text-muted-foreground">by Google</p>
                <ul className="space-y-2 text-left text-sm text-muted-foreground">
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                    Full hooks integration
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                    Real-time status updates
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#4285F4]" />
                    Permission approvals
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t bg-muted/30 px-4 py-20">
        <div className="mx-auto max-w-4xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            How It Works
          </h2>
          <p className="mb-12 text-muted-foreground">
            AgentDeck connects your AI assistants to your Stream Deck in real-time
          </p>

          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row sm:gap-8">
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#D97757]/10 text-[#D97757]">
                <span className="text-xl font-bold">1</span>
              </div>
              <p className="text-sm font-medium">AI sends status via hooks</p>
            </div>
            <div className="hidden h-0.5 w-16 bg-gradient-to-r from-[#D97757] to-[#8E75B2] sm:block" />
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#8E75B2]/10 text-[#8E75B2]">
                <span className="text-xl font-bold">2</span>
              </div>
              <p className="text-sm font-medium">AgentDeck server receives it</p>
            </div>
            <div className="hidden h-0.5 w-16 bg-gradient-to-r from-[#8E75B2] to-[#4285F4] sm:block" />
            <div className="flex flex-col items-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#4285F4]/10 text-[#4285F4]">
                <span className="text-xl font-bold">3</span>
              </div>
              <p className="text-sm font-medium">Stream Deck updates instantly</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-4 py-20">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="mb-4 text-3xl font-bold sm:text-4xl">
            Ready to Supercharge Your Workflow?
          </h2>
          <p className="mb-8 text-lg text-muted-foreground">
            Get started with AgentDeck in minutes. Check the requirements and follow our installation guide.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/docs/introduction/requirements"
              className={buttonVariants({
                className: "bg-[#D97757] px-8 text-base font-semibold hover:bg-[#C86747]",
                size: "lg",
              })}
            >
              Check Requirements
            </Link>
            <Link
              href="/docs/introduction/installation"
              className={buttonVariants({
                variant: "outline",
                className: "border-[#4285F4]/50 px-8 text-base hover:bg-[#4285F4]/10",
                size: "lg",
              })}
            >
              Installation Guide
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}

function StreamDeckVisual() {
  return (
    <div className="flex flex-col items-center">
      {/* Stream Deck Device Frame */}
      <div className="relative rounded-3xl bg-gradient-to-b from-neutral-800 to-neutral-900 p-4 shadow-2xl sm:p-6">
        {/* Device bezel */}
        <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-neutral-700/50 to-transparent opacity-50" />

        {/* Screen area */}
        <div className="relative rounded-2xl bg-black p-3 sm:p-4">
          {/* Button grid - 3x2 like Stream Deck MK.2 */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            {/* Row 1 */}
            <StreamDeckButton state="idle" icon="✓" label="Claude" color="claude" />
            <StreamDeckButton state="running" icon="◐" label="Working" color="claude" />
            <StreamDeckButton state="tool" icon="⚙" label="Editing" color="claude" />
            {/* Row 2 */}
            <StreamDeckButton state="idle" icon="✓" label="Gemini" color="gemini" />
            <StreamDeckButton state="question" icon="?" label="Input" color="gemini" />
            <StreamDeckButton state="permission" icon="⚠" label="Approve" color="permission" />
          </div>
        </div>

        {/* Elgato branding */}
        <div className="mt-3 text-center">
          <span className="text-[10px] font-medium tracking-widest text-neutral-500 sm:text-xs">
            STREAM DECK
          </span>
        </div>
      </div>

      {/* Label */}
      <p className="mt-6 text-sm text-muted-foreground">
        Real-time status for all your AI sessions
      </p>
    </div>
  )
}

function StreamDeckButton({
  state,
  icon,
  label,
  color,
}: {
  state: string
  icon: string
  label: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    claude: "from-[#D97757] to-[#C86747]",
    gemini: "from-[#4285F4] to-[#8E75B2]",
    permission: "from-red-500 to-red-600",
    green: "from-green-500 to-green-600",
  }

  const stateAnimations: Record<string, string> = {
    running: "animate-pulse",
    question: "animate-pulse",
    permission: "animate-pulse",
    idle: "",
    tool: "",
  }

  return (
    <div className="flex flex-col items-center">
      <div
        className={`flex h-14 w-14 flex-col items-center justify-center rounded-lg bg-gradient-to-br ${colorClasses[color]} text-white shadow-lg transition-transform hover:scale-105 sm:h-[72px] sm:w-[72px] ${stateAnimations[state]}`}
      >
        <span className="text-lg sm:text-2xl">{icon}</span>
        <span className="mt-0.5 text-[8px] font-medium sm:text-[10px]">{label}</span>
      </div>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode
  title: string
  description: string
  color: string
}) {
  const colorClasses: Record<string, string> = {
    claude: "bg-[#D97757]/10 text-[#D97757]",
    gemini: "bg-[#4285F4]/10 text-[#4285F4]",
    purple: "bg-[#8E75B2]/10 text-[#8E75B2]",
  }

  const borderClasses: Record<string, string> = {
    claude: "hover:border-[#D97757]/50",
    gemini: "hover:border-[#4285F4]/50",
    purple: "hover:border-[#8E75B2]/50",
  }

  return (
    <div className={`group rounded-xl border bg-card p-6 transition-all hover:shadow-lg ${borderClasses[color]}`}>
      <div className={`mb-4 inline-flex rounded-lg p-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="mb-2 text-lg font-semibold">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  )
}
