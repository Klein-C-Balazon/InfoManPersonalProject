
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithPopup, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, AlertCircle, GraduationCap, Mail, Lock, Loader2, ShieldCheck, User } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ADMIN_EMAIL = 'admin@neu.edu.ph';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const auth = useAuth();
  const db = useFirestore();
  const { isUserLoading } = useUser();

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
        // If it's the admin email, auto-initialize
        if (firebaseUser.email === ADMIN_EMAIL) {
          await setDoc(userRef, {
            id: firebaseUser.uid,
            email: ADMIN_EMAIL,
            displayName: 'Library Admin',
            role: 'admin',
            collegeId: 'administration',
            isBlocked: false,
            createdAt: Timestamp.now(),
          });
          router.push('/admin');
          return;
        }

        // If it's a student (Google/Email) and no profile exists, redirect to complete profile
        const params = new URLSearchParams({
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
          googleId: firebaseUser.uid
        });
        router.push(`/signup?${params.toString()}`);
      }
    } catch (e: any) {
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
      setError('Account not found or password incorrect.');
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      try {
        const result = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, adminPassword);
        await handleInstitutionalRedirect(result.user);
      } catch (signInError: any) {
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, adminPassword);
            await handleInstitutionalRedirect(userCredential.user);
          } catch (createError: any) {
            throw signInError;
          }
        } else {
          throw signInError;
        }
      }
    } catch (err: any) {
      setError('Access Denied: Invalid admin security key.');
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
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Institutional login failed.');
      }
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
          <p className="text-muted-foreground text-lg">Welcome to NEU Library!</p>
        </div>

        <Card className="shadow-2xl border-primary/5 overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary/5 pb-8 pt-10 text-center">
            <CardTitle className="text-2xl">Access Portal</CardTitle>
            <CardDescription>Enter your credentials to continue</CardDescription>
          </CardHeader>
          <CardContent className="pt-4 px-8 space-y-6">
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl">
                <TabsTrigger value="user" className="rounded-lg flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Student/Faculty
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </TabsTrigger>
              </TabsList>

              {error && (
                <Alert variant="destructive" className="mb-6 rounded-xl border-destructive/20 bg-destructive/5">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Access Issue</AlertTitle>
                  <AlertDescription className="flex flex-col gap-2">
                    <span>{error}</span>
                  </AlertDescription>
                </Alert>
              )}

              <TabsContent value="user" className="space-y-6">
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

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or email access</span>
                  </div>
                </div>

                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Institutional Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input 
                        id="email" 
                        type="email" 
                        placeholder="name@neu.edu.ph" 
                        className="flex h-12 w-full rounded-xl border border-input bg-background px-10 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                      <input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="flex h-12 w-full rounded-xl border border-input bg-background px-10 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
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
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin" className="space-y-6">
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Admin Security Key</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <input 
                        id="adminPassword" 
                        type="password" 
                        placeholder="••••••••" 
                        className="flex h-12 w-full rounded-xl border border-input bg-background px-10 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-12 font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock Admin Dashboard'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-secondary/20 flex flex-col gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              New to the library? <Link href="/signup" className="text-primary font-bold hover:underline">Register student profile</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
