"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, getDoc, where } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navbar } from '@/components/navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts';
import { Users, LayoutDashboard, History, Settings, ShieldAlert, Loader2, PieChart } from 'lucide-react';
import { format } from 'date-fns';
import { UserProfile, VisitLog } from '@/lib/models';
import Link from 'next/link';

export default function AdminDashboard() {
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allVisits, setAllVisits] = useState<VisitLog[]>([]);
  const [stats, setStats] = useState<{ name: string; total: number }[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) router.push('/login');
  }, [user, loadingAuth, router]);

  useEffect(() => {
    async function fetchAdminData() {
      if (user) {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        const profileData = profileSnap.data() as UserProfile;
        if (profileData?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setProfile(profileData);

        // Fetch All visits (limited for overview)
        const q = query(collection(db, 'visits'), orderBy('timestamp', 'desc'), limit(10));
        const querySnapshot = await getDocs(q);
        setAllVisits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitLog)));

        // Basic Stats - Count visits per purpose for the chart
        const allQuery = query(collection(db, 'visits'));
        const allSnap = await getDocs(allQuery);
        const purposeCounts: Record<string, number> = {};
        allSnap.docs.forEach(d => {
          const data = d.data();
          purposeCounts[data.purposeOfVisit] = (purposeCounts[data.purposeOfVisit] || 0) + 1;
        });
        setStats(Object.keys(purposeCounts).map(key => ({ name: key, total: purposeCounts[key] })));

        // User count
        const userSnap = await getDocs(collection(db, 'users'));
        setTotalUsers(userSnap.size);
      }
    }
    fetchAdminData();
  }, [user, router]);

  if (loadingAuth || !profile) {
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
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">Admin Command Center</h1>
            <p className="text-muted-foreground">Comprehensive overview of library utilization</p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/users">
              <Card className="px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer border-accent/20">
                <Users className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Manage Users</span>
              </Card>
            </Link>
            <Link href="/admin/colleges">
              <Card className="px-4 py-2 hover:bg-accent transition-colors flex items-center gap-2 cursor-pointer border-accent/20">
                <Settings className="h-4 w-4 text-accent" />
                <span className="text-sm font-medium">Colleges</span>
              </Card>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary font-semibold text-xs uppercase">Total Visits</CardDescription>
              <CardTitle className="text-3xl font-bold">{allVisits.length > 0 ? "100+" : "0"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-accent/5 border-accent/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-accent font-semibold text-xs uppercase">Registered Users</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary font-semibold text-xs uppercase">Active Today</CardDescription>
              <CardTitle className="text-3xl font-bold">12</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-destructive/5 border-destructive/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-destructive font-semibold text-xs uppercase">Blocked Accounts</CardDescription>
              <CardTitle className="text-3xl font-bold">0</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Charts */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Visit Distribution
              </CardTitle>
              <CardDescription>Breakdown by visit purpose</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}>
                    <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {stats.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Recent Global Logs */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Global Entry Logs
              </CardTitle>
              <CardDescription>Latest system-wide activity</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>College</TableHead>
                    <TableHead>Purpose</TableHead>
                    <TableHead className="text-right">Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allVisits.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.userDisplayName}</TableCell>
                      <TableCell>{v.college}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">{v.purposeOfVisit}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {v.timestamp ? format(v.timestamp.toDate(), 'HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}