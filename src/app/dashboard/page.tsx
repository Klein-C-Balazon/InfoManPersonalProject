
"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, query, orderBy, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckCircle2, Loader2, Library, GraduationCap, ClipboardCheck, ArrowRight } from 'lucide-react';
import { College, UserProfile } from '@/lib/models';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const { user, isUserLoading: loadingAuth } = useUser();
  const db = useFirestore();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [purpose, setPurpose] = useState('');
  const [selectedCollegeId, setSelectedCollegeId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  // Memoize the colleges query
  const collegesQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'colleges'), orderBy('name', 'asc'));
  }, [db]);

  const { data: colleges, isLoading: loadingColleges } = useCollection<College>(collegesQuery);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    async function fetchProfile() {
      if (user && db) {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfile;
          if (profileData.isBlocked) {
            router.push('/login?blocked=true');
            return;
          }
          setProfile(profileData);
          if (profileData.collegeId) {
            setSelectedCollegeId(profileData.collegeId);
          }
        }
      }
    }
    if (!loadingAuth && user) {
      fetchProfile();
    }
  }, [user, loadingAuth, db, router]);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !selectedCollegeId || !user) return;
    setSubmitting(true);

    const collegeName = colleges?.find(c => c.id === selectedCollegeId)?.name || selectedCollegeId;

    try {
      const visitData = {
        userId: user.uid,
        userDisplayName: profile?.displayName || user.displayName || 'Unknown Student',
        timestamp: Timestamp.now(),
        purposeOfVisit: purpose,
        collegeId: selectedCollegeId, // Storing the ID for relational consistency
        collegeName: collegeName // Denormalizing name for easy display in logs
      };

      await addDoc(collection(db, 'visits'), visitData);
      setShowSuccess(true);
      setPurpose('');
      
      setTimeout(() => setShowSuccess(false), 5000);

    } catch (error) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Log Failed",
        description: "Could not record your visit. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingAuth || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="w-full max-w-lg border-none shadow-none bg-transparent">
            <div className="bg-green-500 text-white p-12 rounded-[2.5rem] shadow-2xl shadow-green-200 text-center space-y-6 animate-in zoom-in-90 duration-300">
              <div className="flex justify-center">
                <div className="bg-white/20 p-4 rounded-full">
                  <CheckCircle2 className="h-16 w-16 text-white" />
                </div>
              </div>
              <div className="space-y-2">
                <h1 className="text-4xl font-bold font-headline tracking-tight">Welcome to NEU Library!</h1>
                <p className="text-green-50 text-lg">Your visit has been successfully recorded.</p>
              </div>
              <div className="pt-6">
                <Button 
                  variant="secondary" 
                  size="lg" 
                  className="rounded-xl px-8 py-6 text-green-700 font-bold bg-white hover:bg-green-50"
                  onClick={() => setShowSuccess(false)}
                >
                  New Check-in
                </Button>
              </div>
            </div>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 container mx-auto px-4 py-8 md:py-16 flex flex-col items-center">
        <div className="w-full max-w-xl space-y-8">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Student Check-in</h1>
            <p className="text-slate-500">Please provide your visit details below</p>
          </div>

          <Card className="shadow-xl border-none rounded-3xl overflow-hidden">
            <CardHeader className="bg-white border-b border-slate-100 p-8">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <Library className="h-6 w-6" />
                </div>
                <div>
                  <CardTitle className="text-xl">Entry Log</CardTitle>
                  <CardDescription>All fields are required for tracking</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 bg-white">
              <form onSubmit={handleLogVisit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="purpose" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <ClipboardCheck className="h-4 w-4 text-primary" />
                      Purpose of Visit
                    </Label>
                    <Select onValueChange={setPurpose} value={purpose}>
                      <SelectTrigger className="h-14 rounded-xl border-slate-200 focus:ring-primary/20">
                        <SelectValue placeholder="What is your goal today?" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Study">Individual Study</SelectItem>
                        <SelectItem value="Research">Academic Research</SelectItem>
                        <SelectItem value="Book Loan/Return">Borrow or Return Books</SelectItem>
                        <SelectItem value="Group Meeting">Group Study / Meeting</SelectItem>
                        <SelectItem value="Print/Scan Services">Printing or Scanning</SelectItem>
                        <SelectItem value="Other">Other Services</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="college" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-primary" />
                      College Affiliation
                    </Label>
                    <Select onValueChange={setSelectedCollegeId} value={selectedCollegeId}>
                      <SelectTrigger className="h-14 rounded-xl border-slate-200 focus:ring-primary/20">
                        <SelectValue placeholder={loadingColleges ? "Loading colleges..." : "Select your college"} />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {colleges?.map((col) => (
                          <SelectItem key={col.id} value={col.id}>
                            {col.name}
                          </SelectItem>
                        ))}
                        {!loadingColleges && (!colleges || colleges.length === 0) && (
                          <SelectItem value="none" disabled>No colleges available</SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  type="submit" 
                  size="lg"
                  className="w-full h-16 rounded-2xl bg-primary hover:bg-primary/90 text-lg font-bold shadow-lg shadow-primary/20 transition-all flex items-center justify-center gap-2" 
                  disabled={submitting || !purpose || !selectedCollegeId}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Check In Now
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <div className="flex justify-center gap-8 text-slate-400">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Verified ID</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span className="text-sm font-medium">Real-time Log</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
