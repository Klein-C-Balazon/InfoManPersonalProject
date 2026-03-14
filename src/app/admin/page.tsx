"use client"

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, query, orderBy, getDocs, doc, getDoc, where, Timestamp } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navbar } from '@/components/navbar';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Users, History, Settings, Loader2, PieChart, CalendarDays } from 'lucide-react';
import { format, startOfDay, startOfWeek, startOfMonth } from 'date-fns';
import { UserProfile, VisitLog } from '@/lib/models';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type DateRange = 'today' | 'week' | 'month' | 'all';

export default function AdminDashboard() {
  const [user, loadingAuth] = useAuthState(auth);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [allVisits, setAllVisits] = useState<VisitLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [dateRange, setDateRange] = useState<DateRange>('week');
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) router.push('/login');
  }, [user, loadingAuth, router]);

  useEffect(() => {
    async function fetchAdminData() {
      if (!user) return;
      
      try {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        const profileData = profileSnap.data() as UserProfile;
        if (profileData?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        setProfile(profileData);

        // Fetch User count
        const userSnap = await getDocs(collection(db, 'users'));
        setTotalUsers(userSnap.size);

        // Fetch visits based on date range
        let q;
        const now = new Date();
        let startDate: Date | null = null;

        if (dateRange === 'today') startDate = startOfDay(now);
        else if (dateRange === 'week') startDate = startOfWeek(now, { weekStartsOn: 1 });
        else if (dateRange === 'month') startDate = startOfMonth(now);

        if (startDate && dateRange !== 'all') {
          q = query(
            collection(db, 'visits'),
            where('timestamp', '>=', Timestamp.fromDate(startDate)),
            orderBy('timestamp', 'desc')
          );
        } else {
          q = query(collection(db, 'visits'), orderBy('timestamp', 'desc'));
        }

        const querySnapshot = await getDocs(q);
        setAllVisits(querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VisitLog)));
      } catch (error) {
        console.error("Error fetching admin data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchAdminData();
  }, [user, router, dateRange]);

  // Aggregate visits by College
  const collegeStats = useMemo(() => {
    const counts: Record<string, number> = {};
    allVisits.forEach(v => {
      const collegeName = v.college || 'Unspecified';
      counts[collegeName] = (counts[collegeName] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);
  }, [allVisits]);

  if (loadingAuth || loading || !profile) {
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
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <CalendarDays className="h-4 w-4 text-muted-foreground" />
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as DateRange)}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                  <SelectItem value="all">All Time</SelectItem>
                </SelectContent>
              </Select>
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
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary font-semibold text-xs uppercase">Visits ({dateRange})</CardDescription>
              <CardTitle className="text-3xl font-bold">{allVisits.length}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-accent/5 border-accent/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-accent font-semibold text-xs uppercase">Total Users</CardDescription>
              <CardTitle className="text-3xl font-bold">{totalUsers}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-primary/5 border-primary/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-primary font-semibold text-xs uppercase">Avg per Day</CardDescription>
              <CardTitle className="text-3xl font-bold">
                {dateRange === 'week' ? (allVisits.length / 7).toFixed(1) : 
                 dateRange === 'month' ? (allVisits.length / 30).toFixed(1) : 
                 allVisits.length}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-destructive/5 border-destructive/10">
            <CardHeader className="pb-2">
              <CardDescription className="text-destructive font-semibold text-xs uppercase">Colleges Represented</CardDescription>
              <CardTitle className="text-3xl font-bold">{collegeStats.length}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-8 lg:grid-cols-2">
          {/* Charts */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5 text-primary" />
                Participation by College
              </CardTitle>
              <CardDescription>Visitor distribution across institutional affiliations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[350px] w-full">
                {collegeStats.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={collegeStats} layout="vertical" margin={{ left: 40, right: 20 }}>
                      <XAxis type="number" fontSize={12} tickLine={false} axisLine={false} />
                      <YAxis dataKey="name" type="category" width={100} fontSize={12} tickLine={false} axisLine={false} />
                      <Tooltip 
                        contentStyle={{ backgroundColor: 'hsl(var(--card))', borderRadius: '8px', border: '1px solid hsl(var(--border))' }}
                        itemStyle={{ color: 'hsl(var(--primary))' }}
                      />
                      <Bar dataKey="total" radius={[0, 4, 4, 0]} barSize={30}>
                        {collegeStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    No data available for this range
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Recent Global Logs */}
          <Card className="shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Recent Visitor Activity
              </CardTitle>
              <CardDescription>Latest system-wide library entries</CardDescription>
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
                  {allVisits.slice(0, 8).map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">{v.userDisplayName}</TableCell>
                      <TableCell>{v.college}</TableCell>
                      <TableCell>
                        <span className="text-xs bg-muted px-2 py-1 rounded-full">{v.purposeOfVisit}</span>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-xs">
                        {v.timestamp ? format(v.timestamp.toDate(), 'MMM dd HH:mm') : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {allVisits.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No visits recorded in this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
