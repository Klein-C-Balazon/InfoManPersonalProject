"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { ShieldAlert, Lock, Loader2, ArrowLeft, BookOpen } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const ADMIN_EMAIL = 'admin@neu.edu.ph';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  
  const auth = useAuth();
  const db = useFirestore();

  const handleAdminAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      try {
        await signInWithEmailAndPassword(auth, ADMIN_EMAIL, password);
      } catch (signInError: any) {
        if (signInError.code === 'auth/user-not-found' || signInError.code === 'auth/invalid-credential') {
          try {
            const userCredential = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, password);
            const user = userCredential.user;
            
            await setDoc(doc(db, 'users', user.uid), {
              id: user.uid,
              email: ADMIN_EMAIL,
              displayName: 'Library Admin',
              role: 'admin',
              collegeId: 'administration',
              isBlocked: false,
              createdAt: Timestamp.now(),
            });
          } catch (createError) {
            throw signInError; 
          }
        } else {
          throw signInError;
        }
      }

      const user = auth.currentUser;
      if (user) {
        const userSnap = await getDoc(doc(db, 'users', user.uid));
        if (userSnap.exists() && userSnap.data().role === 'admin') {
          router.push('/admin');
        } else {
          await signOut(auth);
          setError('Access Denied: This account exists but does not have administrative privileges.');
          setLoading(false);
        }
      }
    } catch (err: any) {
      setError('Authentication failed. Ensure you are using the correct admin security key.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-900 p-4 md:p-6">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <div className="flex justify-center">
            <div className="p-4 bg-primary/20 rounded-2xl">
              <ShieldAlert className="h-12 w-12 text-primary" />
            </div>
          </div>
          <h1 className="font-headline font-bold text-3xl tracking-tight text-white">
            Admin Portal
          </h1>
          <p className="text-slate-400">Restricted Area for Library Administrators</p>
        </div>

        <Card className="shadow-2xl border-white/5 bg-slate-800/50 backdrop-blur-xl overflow-hidden rounded-3xl text-white">
          <CardHeader className="bg-white/5 pb-8 pt-10 text-center border-b border-white/5">
            <CardTitle className="text-2xl text-white">Security Check</CardTitle>
            <CardDescription className="text-slate-400">Enter admin security key to continue</CardDescription>
          </CardHeader>
          <CardContent className="pt-8 px-8 space-y-6">
            {error && (
              <Alert variant="destructive" className="rounded-xl border-destructive/50 bg-destructive/10 text-destructive-foreground">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Security Warning</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleAdminAuth} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="password">Admin Security Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    className="pl-10 h-12 rounded-xl bg-slate-900/50 border-white/10 text-white placeholder:text-slate-500 focus:ring-primary/50"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                className="w-full h-12 font-bold rounded-xl bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" 
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : 'Unlock Admin Dashboard'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="bg-slate-900/50 flex flex-col gap-2 py-6">
             <Button variant="ghost" asChild className="text-slate-400 hover:text-white">
               <Link href="/login">
                 <ArrowLeft className="mr-2 h-4 w-4" />
                 Return to Public Portal
               </Link>
             </Button>
          </CardFooter>
        </Card>
      </div>
      
      <div className="mt-8 flex items-center gap-2 text-slate-600">
        <BookOpen className="h-4 w-4" />
        <span className="text-xs uppercase tracking-widest font-bold">StudyHub Secure</span>
      </div>
    </div>
  );
}
