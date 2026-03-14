"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithPopup, signOut, signInWithEmailAndPassword, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, AlertCircle, GraduationCap, Mail, Lock, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const auth = useAuth();
  const db = useFirestore();
  const { user, isUserLoading } = useUser();

  const handleInstitutionalRedirect = async (firebaseUser: any) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBlocked) {
          await signOut(auth);
          setError('Your account has been blocked. Please contact the administrator.');
          setLoading(false);
          return;
        }
        
        if (userData.role === 'admin') {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        await signOut(auth);
        setError('Profile not found. Please sign up first to register your institutional account.');
        setLoading(false);
      }
    } catch (e: any) {
      const permissionError = new FirestorePermissionError({
        path: userRef.path,
        operation: 'get',
      });
      errorEmitter.emit('permission-error', permissionError);
      setError('A security restriction prevented your profile access.');
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleInstitutionalRedirect(result.user);
    } catch (err: any) {
      if (
        err.code === 'auth/user-not-found' || 
        err.code === 'auth/wrong-password' || 
        err.code === 'auth/invalid-credential'
      ) {
        setError('Account not found or password incorrect. Please sign up first if you are new.');
      } else {
        setError('Login failed. Ensure you have registered your account.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');
    const googleProvider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      if (!user.email?.endsWith('@neu.edu.ph')) {
        await signOut(auth);
        setError('Access restricted. Only @neu.edu.ph email accounts are allowed.');
        setLoading(false);
        return;
      }

      await handleInstitutionalRedirect(user);
    } catch (err: any) {
      setError(err.message || 'Institutional login failed.');
      setLoading(false);
    }
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

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
            <CardTitle className="text-2xl">Access Portal</CardTitle>
            <CardDescription>Enter your institutional credentials</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-destructive/20 bg-destructive/5">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Login Restriction</AlertTitle>
                <AlertDescription className="flex flex-col gap-2">
                  <span>{error}</span>
                  {error.includes('sign up') && (
                    <Button variant="link" asChild className="p-0 h-auto text-destructive font-bold justify-start">
                      <Link href="/signup">Click here to Sign Up →</Link>
                    </Button>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Institutional Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@neu.edu.ph" 
                    className="pl-10 h-12 rounded-xl"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 rounded-xl"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 font-semibold rounded-xl" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : 'Sign In'}
              </Button>
            </form>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
              </div>
            </div>

            <Button 
              type="button" 
              variant="outline"
              size="lg"
              className="w-full h-14 text-md font-semibold rounded-xl flex items-center justify-center gap-3 transition-all hover:bg-secondary/50" 
              onClick={handleGoogleLogin}
              disabled={loading}
            >
              <GraduationCap className="h-5 w-5" />
              Sign in with Google Account
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground">
                Exclusively for @neu.edu.ph domain accounts
              </p>
            </div>
          </CardContent>
          <CardFooter className="bg-secondary/20 flex flex-col gap-2 py-6">
            <p className="text-sm text-muted-foreground">
              New here? <Link href="/signup" className="text-primary font-bold hover:underline">Create an account</Link>
            </p>
            <Link href="/" className="text-sm text-muted-foreground hover:underline">
              Return to Homepage
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
