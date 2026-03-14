"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, Timestamp } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { History, Loader2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { VisitLog } from '@/lib/models';

export default function HistoryPage() {
  const { user, isUserLoading: loadingAuth } = useUser();
  const db = useFirestore();
  const [visits, setVisits] = useState<VisitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) router.push('/login');
  }, [user, loadingAuth, router]);

  useEffect(() => {
    async function fetchVisits() {
      if (user) {
        const q = query(
          collection(db, 'visits'),
          where('userId', '==', user.uid),
          orderBy('timestamp', 'desc')
        );
        const querySnapshot = await getDocs(q);
        setVisits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitLog)));
        setLoading(false);
      }
    }
    if (!loadingAuth && user) {
      fetchVisits();
    }
  }, [user, loadingAuth, db]);

  if (loadingAuth || loading) {
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
        <div className="flex flex-col gap-2 mb-8">
           <h1 className="text-3xl font-headline font-bold text-foreground">Visit History</h1>
           <p className="text-muted-foreground">Comprehensive log of your past library access</p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardHeader className="bg-primary/5">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Your Activity Log
            </CardTitle>
            <CardDescription>Total visits recorded: {visits.length}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Date</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Affiliation</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visits.length > 0 ? (
                  visits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        {v.timestamp ? format(v.timestamp.toDate(), 'MMMM dd, yyyy') : '-'}
                      </TableCell>
                      <TableCell>
                        {v.timestamp ? format(v.timestamp.toDate(), 'HH:mm') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-accent/10 text-accent-foreground border border-accent/20">
                          {v.purposeOfVisit}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground">{v.collegeId}</TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                      No visits found in your records.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}