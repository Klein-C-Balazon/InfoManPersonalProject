
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth, db, googleProvider } from '@/lib/firebase';
import { signInWithEmailAndPassword, signInWithPopup, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, AlertCircle, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email?.endsWith('@neu.edu.ph')) {
        await signOut(auth);
        setError('Access restricted. Only @neu.edu.ph email accounts are allowed.');
        setLoading(false);
        return;
      }

      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBlocked) {
          await signOut(auth);
          setError('Your account has been blocked. Please contact the administrator.');
          setLoading(false);
          return;
        }
      } else {
        await setDoc(userRef, {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          role: 'user',
          college: 'Not set',
          isBlocked: false,
          createdAt: Timestamp.now(),
        });
      }

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Institutional login failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 md:p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="font-headline font-bold text-4xl tracking-tight text-foreground">
            StudyHub <span className="text-primary">Tracker</span>
          </h1>
          <p className="text-muted-foreground text-lg">NEU Library Visitor Portal</p>
        </div>

        <Card className="shadow-2xl border-primary/5 overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary/5 pb-8 pt-10 text-center">
            <CardTitle className="text-2xl">Student Access</CardTitle>
            <CardDescription>Verify your identity to begin your session</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Restriction</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <Button 
              type="button" 
              size="lg"
              className="w-full h-16 text-lg font-semibold rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-[0.98]" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <GraduationCap className="h-6 w-6" />
              {loading ? 'Authenticating...' : 'Sign in with Institutional ID'}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Exclusively for @neu.edu.ph domain accounts
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-secondary/20 flex flex-col gap-2 py-6">
            <p className="text-sm text-muted-foreground">
              Technical issues? Contact IT Support
            </p>
            <Link href="/" className="text-sm text-primary font-medium hover:underline">
              Return to Homepage
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
