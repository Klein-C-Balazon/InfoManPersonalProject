"use client"

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { BookOpen, LogOut, User, LayoutDashboard, Settings, History, Shield } from 'lucide-react';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useAuthState } from 'react-firebase-hooks/auth';
import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { UserProfile } from '@/lib/models';

export function Navbar() {
  const [user, loading] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    async function fetchProfile() {
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        }
      } else {
        setProfile(null);
      }
    }
    fetchProfile();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  const isAdmin = profile?.role === 'admin';

  return (
    <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50 px-4 h-16 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link className="flex items-center gap-2" href="/">
          <BookOpen className="h-6 w-6 text-primary" />
          <span className="font-headline font-bold text-lg tracking-tight text-primary hidden sm:inline">StudyHub</span>
        </Link>
        
        {user && !loading && (
          <div className="hidden md:flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className={`text-sm font-medium flex items-center gap-1 transition-colors ${pathname === '/dashboard' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <LayoutDashboard className="h-4 w-4" />
              Dashboard
            </Link>
            <Link 
              href="/history" 
              className={`text-sm font-medium flex items-center gap-1 transition-colors ${pathname === '/history' ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
            >
              <History className="h-4 w-4" />
              My Visits
            </Link>
            {isAdmin && (
              <>
                <div className="h-4 w-[1px] bg-border mx-1"></div>
                <Link 
                  href="/admin" 
                  className={`text-sm font-medium flex items-center gap-1 transition-colors ${pathname.startsWith('/admin') ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        {loading ? (
          <div className="h-8 w-8 animate-pulse bg-muted rounded-full"></div>
        ) : user ? (
          <div className="flex items-center gap-4">
             <div className="hidden sm:flex flex-col items-end text-xs">
                <span className="font-semibold">{profile?.displayName || user.email}</span>
                <span className="text-muted-foreground capitalize">{profile?.role}</span>
             </div>
             <Button variant="ghost" size="icon" onClick={handleLogout} className="text-muted-foreground hover:text-destructive">
                <LogOut className="h-5 w-5" />
             </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild size="sm">
              <Link href="/login">Login</Link>
            </Button>
            <Button variant="default" asChild size="sm">
              <Link href="/signup">Sign Up</Link>
            </Button>
          </div>
        )}
      </div>
    </nav>
  );
}