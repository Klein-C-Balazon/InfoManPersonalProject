"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, updateDoc, getDoc } from 'firebase/firestore';
import { useAuthState } from 'react-firebase-hooks/auth';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Shield, UserMinus, UserCheck, ShieldAlert, Loader2, ArrowLeft } from 'lucide-react';
import { UserProfile } from '@/lib/models';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminUsersPage() {
  const [user, loadingAuth] = useAuthState(auth);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchUsers() {
      if (user) {
        // Auth check
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.data()?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }

        const querySnapshot = await getDocs(collection(db, 'users'));
        setUsers(querySnapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
        setLoading(false);
      }
    }
    fetchUsers();
  }, [user, router]);

  const toggleBlock = async (uid: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        isBlocked: !currentStatus
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, isBlocked: !currentStatus } : u));
      toast({
        title: currentStatus ? "User Unblocked" : "User Blocked",
        description: `The user account access has been ${currentStatus ? 'restored' : 'revoked'}.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: "Action Failed" });
    }
  };

  const promoteAdmin = async (uid: string) => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: 'admin'
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: 'admin' } : u));
      toast({ title: "Promoted to Admin" });
    } catch (e) {
       toast({ variant: 'destructive', title: "Action Failed" });
    }
  };

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
        <div className="mb-6 flex items-center gap-4">
           <Button variant="ghost" size="sm" asChild>
             <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
           </Button>
           <div>
            <h1 className="text-2xl font-bold font-headline">User Moderation</h1>
            <p className="text-muted-foreground">Manage roles and access permissions</p>
           </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>User</TableHead>
                  <TableHead>College</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.uid}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{u.displayName}</span>
                        <span className="text-xs text-muted-foreground">{u.email}</span>
                      </div>
                    </TableCell>
                    <TableCell>{u.college}</TableCell>
                    <TableCell>
                      <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>
                        {u.role}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={u.isBlocked ? 'destructive' : 'outline'} className={!u.isBlocked ? 'text-green-600 border-green-600' : ''}>
                        {u.isBlocked ? 'Blocked' : 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      {u.uid !== user?.uid && (
                        <>
                          {u.role !== 'admin' && (
                            <Button size="sm" variant="outline" onClick={() => promoteAdmin(u.uid)}>
                              <Shield className="h-4 w-4 mr-1" /> Admin
                            </Button>
                          )}
                          <Button size="sm" variant={u.isBlocked ? 'outline' : 'destructive'} onClick={() => toggleBlock(u.uid, u.isBlocked)}>
                            {u.isBlocked ? <UserCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}