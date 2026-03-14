import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { BookOpen, BarChart3, Users, ShieldCheck } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function LandingPage() {
  const heroImage = PlaceHolderImages.find(img => img.id === 'library-hero');

  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <Link className="flex items-center justify-center gap-2" href="/">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-xl tracking-tight text-primary">StudyHub <span className="text-accent">Tracker</span></span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6 items-center">
          <Link className="text-sm font-medium hover:text-primary transition-colors" href="/login">
            Login
          </Link>
          <Button asChild variant="default" size="sm">
            <Link href="/signup">Sign Up</Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1">
        <section className="w-full py-12 md:py-24 lg:py-32 xl:py-48 bg-background overflow-hidden">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="grid gap-6 lg:grid-cols-[1fr_400px] lg:gap-12 xl:grid-cols-[1fr_600px] items-center">
              <div className="flex flex-col justify-center space-y-4">
                <div className="space-y-2">
                  <h1 className="text-3xl font-headline font-bold tracking-tighter sm:text-5xl xl:text-6xl/none text-foreground">
                    Modern Library Management <br />
                    <span className="text-primary">Starts with Insight.</span>
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Efficiently track library visits, analyze study patterns, and manage college affiliations with StudyHub Tracker.
                  </p>
                </div>
                <div className="flex flex-col gap-2 min-[400px]:flex-row">
                  <Button asChild size="lg" className="px-8 bg-primary hover:bg-primary/90">
                    <Link href="/signup">Get Started</Link>
                  </Button>
                  <Button asChild variant="outline" size="lg" className="px-8 border-primary text-primary hover:bg-primary/10">
                    <Link href="/login">Explore Analytics</Link>
                  </Button>
                </div>
              </div>
              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-accent rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                {heroImage && (
                  <Image
                    alt={heroImage.description}
                    className="relative mx-auto aspect-video overflow-hidden rounded-xl object-cover object-center shadow-2xl"
                    height={600}
                    src={heroImage.imageUrl}
                    width={800}
                    data-ai-hint={heroImage.imageHint}
                  />
                )}
              </div>
            </div>
          </div>
        </section>
        
        <section id="features" className="w-full py-12 md:py-24 lg:py-32 bg-secondary/30">
          <div className="container px-4 md:px-6 mx-auto">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-accent/20 px-3 py-1 text-sm text-accent font-semibold">Features</div>
                <h2 className="text-3xl font-headline font-bold tracking-tighter md:text-4xl text-foreground">Comprehensive Tracking Suite</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  Everything you need to monitor and optimize your academic resources in one place.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-center gap-6 py-12 lg:grid-cols-3 lg:gap-12">
              <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-card">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">User Logging</h3>
                  <p className="text-sm text-muted-foreground">Quick and secure entry logs for students and faculty across all associated colleges.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-card">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                  <div className="p-3 rounded-full bg-accent/10">
                    <BarChart3 className="h-8 w-8 text-accent" />
                  </div>
                  <h3 className="text-xl font-bold">Admin Analytics</h3>
                  <p className="text-sm text-muted-foreground">Deep dives into study trends, peak hours, and college-wise participation metrics.</p>
                </CardContent>
              </Card>
              <Card className="border-none shadow-md hover:shadow-xl transition-shadow bg-card">
                <CardContent className="pt-6 flex flex-col items-center text-center space-y-4">
                  <div className="p-3 rounded-full bg-primary/10">
                    <ShieldCheck className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-xl font-bold">Account Moderation</h3>
                  <p className="text-sm text-muted-foreground">Full control over roles and access levels with integrated blocking and role management.</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>
      <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-card">
        <p className="text-xs text-muted-foreground">© 2024 StudyHub Tracker. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Terms of Service
          </Link>
          <Link className="text-xs hover:underline underline-offset-4 text-muted-foreground" href="#">
            Privacy
          </Link>
        </nav>
      </footer>
    </div>
  );
}