"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useUser } from '@/firebase';
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, AlertCircle, Loader2, Lock, User, Mail, GraduationCap } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';

const ADMIN_EMAIL = 'administrator@neu.edu.ph';

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

  useEffect(() => {
    const checkRedirect = async () => {
      try {
        const result = await getRedirectResult(auth);
        if (result?.user) {
          if (!result.user.email?.endsWith('@neu.edu.ph')) {
            await signOut(auth);
            setError('Access restricted. Only @neu.edu.ph institutional emails are allowed.');
            return;
          }
          await handleInstitutionalRedirect(result.user);
        }
      } catch (err: any) {
        // Handle redirect errors silently
      }
    };
    checkRedirect();
  }, [auth]);

  const handleInstitutionalRedirect = async (firebaseUser: any) => {
    const userRef = doc(db, 'users', firebaseUser.uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const userData = userSnap.data();
        if (userData.isBlocked) {
          await signOut(auth);
          setError('Your account has been blocked. Please contact the administrator.');
          return;
        }
        router.push(userData.role === 'admin' ? '/admin' : '/dashboard');
      } else {
        // Auto-initialize admin if it's the admin identity
        if (firebaseUser.email === ADMIN_EMAIL) {
          await setDoc(userRef, {
            id: firebaseUser.uid,
            email: ADMIN_EMAIL,
            displayName: 'Admin',
            role: 'admin',
            collegeId: 'admin',
            isBlocked: false,
            createdAt: Timestamp.now(),
          });
          router.push('/admin');
          return;
        }
        const params = new URLSearchParams({
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || '',
          googleId: firebaseUser.uid
        });
        router.push(`/signup?${params.toString()}`);
      }
    } catch (e: any) {
      setError('A security restriction prevented your profile access.');
    }
  };

  const handleStudentLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (!email.endsWith('@neu.edu.ph')) {
        setError('Only @neu.edu.ph accounts are permitted.');
        setLoading(false);
        return;
      }
      const result = await signInWithEmailAndPassword(auth, email, password);
      await handleInstitutionalRedirect(result.user);
    } catch (err: any) {
      setError('Invalid institutional credentials.');
      setLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const result = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, adminPassword);
      await handleInstitutionalRedirect(result.user);
    } catch (err: any) {
      // Auto-initialize admin on first login attempt if it fails due to account not existing
      if (err.code === 'auth/user-not-found' && adminPassword === 'Admin123') {
        try {
          // This would typically involve creating the user first, but for MVP we assume 
          // the user manages Auth accounts or uses Google. 
          // For a seamless "Admin123" experience, we'd need createUserWithEmailAndPassword.
          setError('Admin account requires manual initialization or previous registration.');
        } catch (initErr) {
          setError('Access Denied: Administrative initialization failed.');
        }
      } else {
        setError('Access Denied: Invalid admin security key.');
      }
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setLoading(true);
    setError('');
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    signInWithRedirect(auth, provider);
  };

  if (isUserLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#f8fafc] p-4 md:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white border shadow-sm rounded-2xl">
              <BookOpen className="h-10 w-10 text-primary" />
            </div>
          </div>
          <h1 className="font-headline font-bold text-4xl tracking-tight">
            StudyHub <span className="text-[#3b82f6]">Tracker</span>
          </h1>
          <p className="text-slate-400 font-medium">NEU Library Visitor Portal</p>
        </div>

        <Card className="shadow-xl border-none overflow-hidden rounded-[2rem]">
          <CardHeader className="bg-white pb-6 pt-10 text-center">
            <CardTitle className="text-2xl font-bold">Access Portal</CardTitle>
            <CardDescription className="text-slate-400">Select your access mode</CardDescription>
          </CardHeader>
          <CardContent className="px-8">
            <Tabs defaultValue="user" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8 h-12 rounded-xl bg-slate-100 p-1">
                <TabsTrigger value="user" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Student/Faculty
                </TabsTrigger>
                <TabsTrigger value="admin" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm flex items-center gap-2">
                  <Lock className="h-4 w-4" />
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
                <form onSubmit={handleStudentLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Institutional Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="klein.balazon@neu.edu.ph" 
                        className="pl-10 h-14 rounded-xl bg-slate-50 border-slate-200"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••••••••••" 
                        className="pl-10 h-14 rounded-xl bg-slate-50 border-slate-200"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-md font-bold rounded-xl bg-[#2b5a9e] hover:bg-[#1e3f6e] text-white transition-all shadow-md" 
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Sign In'}
                  </Button>
                </form>

                <div className="relative py-4">
                  <div className="absolute inset-0 flex items-center">
                    <Separator className="w-full" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-slate-400 font-bold">OR CONTINUE WITH</span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline"
                  size="lg"
                  className="w-full h-14 text-md font-bold rounded-xl border-slate-200 hover:bg-slate-50 flex items-center justify-center gap-3 transition-all" 
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  <GraduationCap className="h-6 w-6 text-slate-600" />
                  Sign in with Google Account
                </Button>
              </TabsContent>

              <TabsContent value="admin" className="space-y-6">
                <form onSubmit={handleAdminLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="adminPassword">Security Key</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                      <Input 
                        id="adminPassword" 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 h-14 rounded-xl bg-slate-50 border-slate-200"
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
                    {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log In as Admin'}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 justify-center pb-10 pt-6">
            <p className="text-sm text-slate-400">
              New to the library? <Link href="/signup" className="text-[#2b5a9e] font-bold hover:underline">Create a student profile</Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
