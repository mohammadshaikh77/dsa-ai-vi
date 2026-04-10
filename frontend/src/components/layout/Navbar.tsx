import { Link } from "wouter";
import { useUser, SignOutButton } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Hexagon, Activity, History } from "lucide-react";

export function Navbar() {
  const { isSignedIn, user } = useUser();
  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-white/10 bg-background/80 backdrop-blur-md">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="bg-primary/20 p-2 rounded-xl group-hover:bg-primary/30 transition-colors">
            <Hexagon className="h-5 w-5 text-primary" />
          </div>
          <span className="font-bold text-xl tracking-tight text-white">
            AlgoViz <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">AI</span>
          </span>
        </Link>

        <div className="flex items-center gap-6">
          <div className="hidden md:flex items-center gap-4 text-sm font-medium text-muted-foreground">
            <Link href="/" className="hover:text-white transition-colors flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Visualize
            </Link>
            {isSignedIn && (
              <Link href="/history" className="hover:text-white transition-colors flex items-center gap-2">
                <History className="h-4 w-4" />
                History
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 border-l border-white/10 pl-6">
            {isSignedIn ? (
              <div className="flex items-center gap-4">
                <SignOutButton>
                  <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-white">
                    Sign Out
                  </Button>
                </SignOutButton>
                <Avatar className="h-8 w-8 border border-primary/20">
                  <AvatarImage src={user.imageUrl} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {user.firstName?.charAt(0) || user.username?.charAt(0) || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <>
                <Link href="/sign-in" className="text-sm font-medium text-muted-foreground hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link href="/sign-up" className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-9 px-4 py-2 shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
