"use client"

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { auth } from '@/lib/firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc, collection, query, orderBy, Timestamp } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { BookOpen, AlertCircle, Loader2, User, Shield } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { College, UserRole } from '@/lib/models';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function SignupPage() {
  const [email, setEmail] = useState('admin@neu.edu.ph');
  const [password, setPassword] = useState('123123');
  const [name, setName] = useState('System Admin');
  const [collegeId, setCollegeId] = useState('');
  const [selectedRole, setSelectedRole] = useState<UserRole>('admin');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const db = useFirestore();

  const collegesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'colleges'), orderBy('name', 'asc'));
  }, [db]);

  const { data: colleges, isLoading: loadingColleges } = useCollection<College>(collegesQuery);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!collegeId && colleges && colleges.length > 0) {
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
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      let role: UserRole = selectedRole;
      if (email.toLowerCase() === 'admin@neu.edu.ph') {
        role = 'admin';
      }

      const newUser = {
        id: user.uid,
        email: user.email,
        displayName: name,
        role: role,
        collegeId: collegeId || 'Institutional Admin',
        isBlocked: false,
        createdAt: Timestamp.now(),
      };

      const userRef = doc(db, 'users', user.uid);
      try {
        await setDoc(userRef, newUser);
      } catch (e: any) {
        const permissionError = new FirestorePermissionError({
          path: userRef.path,
          operation: 'create',
          requestResourceData: newUser,
        });
        errorEmitter.emit('permission-error', permissionError);
        throw e;
      }

      router.push('/dashboard');
    } catch (err: any) {
      if (!(err instanceof FirestorePermissionError)) {
        if (err.code === 'auth/email-already-in-use') {
          setError('This account already exists. Please log in instead.');
        } else {
          setError(err.message || 'Failed to create account.');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <Link href="/" className="inline-flex items-center gap-2 justify-center">
            <BookOpen className="h-10 w-10 text-primary" />
            <span className="font-headline font-bold text-3xl tracking-tight text-primary">StudyHub</span>
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Create Institutional Account</h2>
          <p className="text-muted-foreground">Register your visitor profile for NEU Library</p>
        </div>

        <Card className="shadow-lg border-primary/10 rounded-2xl overflow-hidden">
          <CardHeader className="bg-primary/5 pb-6">
            <CardTitle>Register</CardTitle>
            <CardDescription>All fields are required for institutional verification</CardDescription>
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

              <div className="space-y-3">
                <Label className="text-sm font-semibold">I am registering as:</Label>
                <RadioGroup 
                  defaultValue="user" 
                  value={selectedRole} 
                  onValueChange={(v) => setSelectedRole(v as UserRole)}
                  className="grid grid-cols-2 gap-4"
                >
                  <div>
                    <RadioGroupItem value="user" id="r-student" className="peer sr-only" />
                    <Label
                      htmlFor="r-student"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <User className="mb-2 h-6 w-6" />
                      <span className="text-xs font-bold uppercase">Student</span>
                    </Label>
                  </div>
                  <div>
                    <RadioGroupItem value="admin" id="r-admin" className="peer sr-only" />
                    <Label
                      htmlFor="r-admin"
                      className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                    >
                      <Shield className="mb-2 h-6 w-6" />
                      <span className="text-xs font-bold uppercase">Admin</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

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
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="college">Institutional Affiliation</Label>
                <Select onValueChange={setCollegeId} value={collegeId}>
                  <SelectTrigger className="rounded-xl h-11">
                    <SelectValue placeholder={loadingColleges ? "Loading colleges..." : (colleges?.length ? "Select your college" : "Institutional Admin")} />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    {colleges?.map((col) => (
                      <SelectItem key={col.id} value={col.id}>
                        {col.name}
                      </SelectItem>
                    ))}
                    {(!colleges || colleges.length === 0) && (
                       <SelectItem value="Institutional Admin">Institutional Admin</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>
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
              <Button type="submit" className="w-full h-12 rounded-xl text-md font-bold" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing Registration...
                  </>
                ) : 'Complete Signup'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center border-t py-6 bg-secondary/10">
            <p className="text-sm text-muted-foreground">
              Already registered?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Log in here
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
