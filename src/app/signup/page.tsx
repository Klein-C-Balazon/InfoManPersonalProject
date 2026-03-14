
"use client"

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { BookOpen, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { College, UserRole } from '@/lib/models';
import { DEFAULT_COLLEGES } from '@/lib/constants';
import { Separator } from '@/components/ui/separator';

function SignupForm() {
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [collegeId, setCollegeId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();

  useEffect(() => {
    const preEmail = searchParams.get('email');
    const preName = searchParams.get('name');
    if (preEmail) setEmail(preEmail);
    if (preName) setName(preName);
  }, [searchParams]);

  const collegesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'colleges'), orderBy('name', 'asc'));
  }, [db]);

  const { data: dbColleges, isLoading: loadingColleges } = useCollection<College>(collegesQuery);
  const displayColleges = (dbColleges && dbColleges.length > 0) ? dbColleges : DEFAULT_COLLEGES;

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId) {
      setError('Please select your college affiliation.');
      return;
    }
    if (!email.endsWith('@neu.edu.ph')) {
      setError('Only @neu.edu.ph institutional emails are permitted.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      let user = auth.currentUser;
      
      // If not already signed in via Google, create email account
      if (!user || user.email !== email) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        user = userCredential.user;
      }

      await updateProfile(user, { displayName: name });

      const newUser = {
        id: user.uid,
        email: user.email,
        displayName: name,
        role: 'user' as UserRole,
        collegeId: collegeId,
        isBlocked: false,
        createdAt: Timestamp.now(),
      };

      await setDoc(doc(db, 'users', user.uid), newUser);
      router.push('/dashboard');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This account already exists. Please log in instead.');
      } else {
        setError(err.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-primary/10 rounded-2xl overflow-hidden">
      <CardHeader className="bg-primary/5 pb-6 text-center">
        <CardTitle>Create Account</CardTitle>
        <CardDescription>Institutional credentials required</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleSignup} className="space-y-5">
          {error && (
            <Alert variant="destructive" className="rounded-xl">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Registration Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input 
              id="name" 
              placeholder="John Doe" 
              className="rounded-xl h-11"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required 
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Institutional Email (@neu.edu.ph)</Label>
            <Input 
              id="email" 
              type="email" 
              placeholder="name@neu.edu.ph" 
              className="rounded-xl h-11"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
              disabled={!!searchParams.get('email')}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="college">Institutional Affiliation</Label>
            <Select onValueChange={setCollegeId} value={collegeId}>
              <SelectTrigger className="rounded-xl h-11">
                <SelectValue placeholder={loadingColleges ? "Loading colleges..." : "Select your college"} />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {displayColleges.map((col) => (
                  <SelectItem key={col.id} value={col.id}>
                    {col.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {!searchParams.get('email') && (
            <div className="space-y-2">
              <Label htmlFor="password">Security Password</Label>
              <Input 
                id="password" 
                type="password" 
                className="rounded-xl h-11"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required 
                minLength={6}
              />
            </div>
          )}
          <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Complete Registration'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 justify-center border-t py-6 bg-secondary/10">
        <p className="text-sm text-muted-foreground">
          Already registered? <Link href="/login" className="text-primary font-bold hover:underline">Log in here</Link>
        </p>
      </CardFooter>
    </Card>
  );
}

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <BookOpen className="h-10 w-10 text-primary" />
            <span className="font-headline font-bold text-3xl tracking-tight text-primary">StudyHub</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Welcome to NEU Library!</h2>
          <p className="text-muted-foreground">Register your visitor profile below</p>
        </div>
        <Suspense fallback={<div className="flex justify-center p-12"><Loader2 className="animate-spin" /></div>}>
          <SignupForm />
        </Suspense>
      </div>
    </div>
  );
}
