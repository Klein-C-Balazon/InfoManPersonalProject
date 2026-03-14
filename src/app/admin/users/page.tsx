"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, updateDoc, getDoc, query, where } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Shield, UserMinus, UserCheck, ShieldAlert, Loader2, ArrowLeft, Search } from 'lucide-react';
import { UserProfile } from '@/lib/models';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

export default function AdminUsersPage() {
  const { user, isUserLoading: loadingAuth } = useUser();
  const db = useFirestore();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchInitialUsers() {
      if (user) {
        // Auth check
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.data()?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        await performSearch('');
      }
    }
    if (!loadingAuth) {
      fetchInitialUsers();
    }
  }, [user, loadingAuth, router, db]);

  const performSearch = async (term: string) => {
    setLoading(true);
    try {
      let q;
      if (term.trim()) {
        // Simple Firestore prefix search
        q = query(
          collection(db, 'users'),
          where('displayName', '>=', term),
          where('displayName', '<=', term + '\uf8ff')
        );
      } else {
        q = query(collection(db, 'users'));
      }
      
      const querySnapshot = await getDocs(q);
      setUsers(querySnapshot.docs.map(d => ({ ...d.data() } as UserProfile)));
    } catch (e) {
      console.error(e);
      toast({ variant: 'destructive', title: "Search failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);
  };

  const toggleBlock = async (id: string, currentStatus: boolean) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        isBlocked: !currentStatus
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, isBlocked: !currentStatus } : u));
      toast({
        title: currentStatus ? "User Unblocked" : "User Blocked",
        description: `The user account access has been ${currentStatus ? 'restored' : 'revoked'}.`,
      });
    } catch (e) {
      toast({ variant: 'destructive', title: "Action Failed" });
    }
  };

  const promoteAdmin = async (id: string) => {
    try {
      await updateDoc(doc(db, 'users', id), {
        role: 'admin'
      });
      setUsers(prev => prev.map(u => u.id === id ? { ...u, role: 'admin' } : u));
      toast({ title: "Promoted to Admin" });
    } catch (e) {
       toast({ variant: 'destructive', title: "Action Failed" });
    }
  };

  if (loadingAuth || (!user && !loading)) {
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
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
           <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" asChild>
               <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
             </Button>
             <div>
              <h1 className="text-2xl font-bold font-headline">User Moderation</h1>
              <p className="text-muted-foreground">Manage roles and access permissions</p>
             </div>
           </div>

           <div className="relative w-full md:w-80">
             <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
             <Input 
                placeholder="Search users by name..." 
                className="pl-10" 
                value={searchTerm}
                onChange={handleSearchChange}
                onKeyDown={(e) => e.key === 'Enter' && performSearch(searchTerm)}
             />
             <Button 
               size="sm" 
               variant="ghost" 
               className="absolute right-1 top-1/2 -translate-y-1/2 h-8"
               onClick={() => performSearch(searchTerm)}
             >
               Find
             </Button>
           </div>
        </div>

        <Card className="shadow-lg">
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
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
                    <TableRow key={u.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{u.displayName}</span>
                          <span className="text-xs text-muted-foreground">{u.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{u.collegeId}</TableCell>
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
                        {u.id !== user?.uid && (
                          <>
                            {u.role !== 'admin' && (
                              <Button 
                                size="sm" 
                                variant="outline" 
                                title="Make Admin"
                                onClick={() => promoteAdmin(u.id)}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant={u.isBlocked ? 'outline' : 'destructive'} 
                              title={u.isBlocked ? "Unblock User" : "Block User"}
                              onClick={() => toggleBlock(u.id, u.isBlocked)}
                            >
                              {u.isBlocked ? <UserCheck className="h-4 w-4" /> : <ShieldAlert className="h-4 w-4" />}
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {users.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                        No users found matching your search.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}