import Link from "next/link"

export default function Home() {
  return (
    <main className="relative h-screen w-full overflow-hidden bg-background">
      {/* Title centered on the page */}
      <div className="pointer-events-none absolute inset-0 z-10 flex items-start mt-15 justify-center">
        <h1 className="text-balance text-start font-mono text-4xl font-bold tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Chip Design Platform
        </h1>
      </div>

      {/* Split screen navigation */}
      <div className="flex h-full w-full">
        {/* Visual Link - Left Half */}
        <Link
          href="https://visual.innochipdesign.ru"
          className="group relative flex flex-1 items-center justify-center border-r border-border bg-background transition-all duration-500 hover:flex-[1.1] hover:bg-secondary"
        >
          <div className="absolute inset-0 bg-accent opacity-0 transition-opacity duration-500 group-hover:opacity-5" />
          <span className="relative z-20 font-mono text-2xl font-semibold tracking-wide text-muted-foreground transition-all duration-300 group-hover:scale-110 group-hover:text-foreground md:text-3xl lg:text-4xl">
            Visual
          </span>
        </Link>

        {/* Auto-checker Link - Right Half */}
        <Link
          href="https://platform.innochipdesign.ru"
          className="group relative flex flex-1 items-center justify-center bg-background transition-all duration-500 hover:flex-[1.1] hover:bg-secondary"
        >
          <div className="absolute inset-0 bg-accent opacity-0 transition-opacity duration-500 group-hover:opacity-5" />
          <span className="relative z-20 font-mono text-2xl font-semibold tracking-wide text-muted-foreground transition-all duration-300 group-hover:scale-110 group-hover:text-foreground md:text-3xl lg:text-4xl">
            Task Checker
          </span>
        </Link>
      </div>
    </main>
  )
}
