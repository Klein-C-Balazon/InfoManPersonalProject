
"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithPopup, signOut, signInWithEmailAndPassword, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, AlertCircle, GraduationCap, Mail, Lock, Loader2, ShieldCheck, User, Sparkles } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
        // Handle admin account initialization
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

        // Student/Faculty profile completion
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
      // Admin is password-only from the user perspective, but uses a fixed email behind the scenes
      const result = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, adminPassword);
      await handleInstitutionalRedirect(result.user);
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
        setError('Access restricted. Only @neu.edu.ph institutional emails are allowed.');
        setLoading(false);
        return;
      }

      await handleInstitutionalRedirect(user);
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Login cancelled. Please try again or check your browser settings.');
      } else {
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
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/10 rounded-2xl">
              <BookOpen className="h-12 w-12 text-primary" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-bold mb-2">
              <Sparkles className="h-3 w-3" />
              Institutional Access
            </div>
            <h1 className="font-headline font-bold text-3xl tracking-tight text-foreground">
              Welcome to NEU Library!
            </h1>
            <p className="text-muted-foreground">StudyHub Visitor Management</p>
          </div>
        </div>

        <Card className="shadow-2xl border-primary/5 overflow-hidden rounded-3xl">
          <CardHeader className="bg-primary/5 pb-8 pt-10 text-center">
            <CardTitle className="text-2xl">Access Portal</CardTitle>
            <CardDescription>Select your affiliation to continue</CardDescription>
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
                  <AlertTitle>Login Issue</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <TabsContent value="user" className="space-y-6">
                <Button 
                  type="button" 
                  variant="default"
                  size="lg"
                  className="w-full h-14 text-md font-bold rounded-xl flex items-center justify-center gap-3 transition-all shadow-lg shadow-primary/20" 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <GraduationCap className="h-6 w-6" />
                  Sign in with Google Account
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">Or password access</span>
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
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Log In'}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="admin" className="space-y-6 text-center">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-amber-800 text-sm mb-4">
                  Admin portal is restricted to authorized staff only.
                </div>
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2 text-left">
                    <Label htmlFor="adminPassword">Security Key</Label>
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
                    className="w-full h-14 font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xl" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify Admin Key'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="bg-secondary/20 flex flex-col gap-3 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Need to register your profile? <Link href="/signup" className="text-primary font-bold hover:underline">Complete Registration →</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
