"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, addDoc, query, where, orderBy, limit, getDocs, doc, getDoc, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BookOpen, MapPin, History, PlusCircle, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { UserProfile, VisitLog } from '@/lib/models';
import { useToast } from '@/hooks/use-toast';

export default function DashboardPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    async function fetchData() {
      if (user) {
        // Fetch profile
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.exists()) {
          const profileData = profileSnap.data() as UserProfile;
          if (profileData.isBlocked) {
            await auth.signOut();
            router.push('/login?blocked=true');
            return;
          }
          setProfile(profileData);
        }

        // Fetch recent visits
        const q = query(
          collection(db, 'visits'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc'),
          limit(5)
        );
        const querySnapshot = await getDocs(q);
        const list = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitLog));
        setVisits(list);
      }
    }
    fetchData();
  }, [user, router]);

  const handleLogVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purpose || !profile) return;
    setSubmitting(true);

    try {
      const visitData = {
        userId: user!.uid,
        userDisplayName: profile.displayName || 'Unknown',
        timestamp: Timestamp.now(),
        purposeOfVisit: purpose,
        college: profile.college,
      };

      await addDoc(collection(db, 'visits'), visitData);
      
      toast({
        title: "Visit Logged",
        description: "Your library visit has been successfully recorded.",
      });

      setPurpose('');
      
      // Refresh recent visits
      const q = query(
        collection(db, 'visits'),
        where('userId', '==', user!.uid),
        orderBy('timestamp', 'desc'),
        limit(5)
      );
      const querySnapshot = await getDocs(q);
      setVisits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitLog)));

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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Sidebar / Profile Info */}
          <div className="space-y-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="bg-primary/5 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5 text-primary" />
                  Your Profile
                </CardTitle>
                <CardDescription>Official student record</CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Display Name</span>
                  <span className="text-lg font-medium">{profile?.displayName || user.email}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Institutional College</span>
                  <div className="flex items-center gap-1 text-primary">
                    <MapPin className="h-4 w-4" />
                    <span className="font-medium">{profile?.college || 'Not set'}</span>
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">User Role</span>
                  <span className="capitalize font-medium">{profile?.role || 'User'}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="shadow-md border-accent/10">
              <CardHeader className="bg-accent/5 rounded-t-lg">
                <CardTitle className="flex items-center gap-2">
                  <PlusCircle className="h-5 w-5 text-accent" />
                  Log New Visit
                </CardTitle>
                <CardDescription>Enter details for your entry log</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleLogVisit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose of Visit</Label>
                    <Select onValueChange={setPurpose} value={purpose}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select purpose" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Study">Study</SelectItem>
                        <SelectItem value="Research">Research</SelectItem>
                        <SelectItem value="Book Loan/Return">Book Loan/Return</SelectItem>
                        <SelectItem value="Group Meeting">Group Meeting</SelectItem>
                        <SelectItem value="Print/Scan Services">Print/Scan Services</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button type="submit" className="w-full bg-primary" disabled={submitting || !purpose}>
                    {submitting ? 'Recording...' : 'Check In'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Area */}
          <div className="lg:col-span-2 space-y-6">
            <Card className="shadow-md border-primary/10">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                  <CardDescription>Your last 5 recorded visits</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push('/history')}>View All</Button>
              </CardHeader>
              <CardContent>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50">
                        <TableHead>Date & Time</TableHead>
                        <TableHead>College</TableHead>
                        <TableHead>Purpose</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visits.length > 0 ? (
                        visits.map((v) => (
                          <TableRow key={v.id}>
                            <TableCell className="font-medium">
                              {v.timestamp ? format(v.timestamp.toDate(), 'MMM dd, yyyy HH:mm') : 'Pending...'}
                            </TableCell>
                            <TableCell>{v.college}</TableCell>
                            <TableCell>
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-primary/10 text-primary">
                                {v.purposeOfVisit}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                            No visits recorded yet.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}