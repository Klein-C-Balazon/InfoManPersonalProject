"use client"

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, doc, setDoc, deleteDoc, query, orderBy, Timestamp, getDoc, writeBatch } from 'firebase/firestore';
import { useUser, useFirestore } from '@/firebase';
import { Navbar } from '@/components/navbar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, Plus, ArrowLeft, Loader2, School, DatabaseBackup } from 'lucide-react';
import { College } from '@/lib/models';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const DEFAULT_COLLEGES = [
  "College of Engineering and Architecture",
  "College of Nursing",
  "College of Business Administration",
  "College of Arts and Sciences",
  "College of Computer Studies",
  "College of Education",
  "College of Communication",
  "College of Criminology",
  "College of Medicine",
  "College of Law"
];

export default function AdminCollegesPage() {
  const { user, isUserLoading: loadingAuth } = useUser();
  const db = useFirestore();
  const [colleges, setColleges] = useState<College[]>([]);
  const [newCollegeName, setNewCollegeName] = useState('');
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const fetchColleges = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'colleges'), orderBy('name', 'asc'));
      const querySnapshot = await getDocs(q);
      setColleges(querySnapshot.docs.map(d => ({ id: d.id, ...d.data() } as College)));
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function checkAuthAndFetch() {
      if (user) {
        const profileSnap = await getDoc(doc(db, 'users', user.uid));
        if (profileSnap.data()?.role !== 'admin') {
          router.push('/dashboard');
          return;
        }
        await fetchColleges();
      }
    }
    if (!loadingAuth) {
      checkAuthAndFetch();
    }
  }, [user, loadingAuth, router, db]);

  const addCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollegeName) return;
    setAdding(true);
    try {
      const id = newCollegeName.toLowerCase().replace(/\s+/g, '-');
      const docRef = doc(db, 'colleges', id);
      await setDoc(docRef, {
        name: newCollegeName,
        addedAt: Timestamp.now()
      });
      await fetchColleges();
      setNewCollegeName('');
      toast({ title: "College Added" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to add college" });
    } finally {
      setAdding(false);
    }
  };

  const seedColleges = async () => {
    setSeeding(true);
    try {
      const batch = writeBatch(db);
      DEFAULT_COLLEGES.forEach(name => {
        const id = name.toLowerCase().replace(/\s+/g, '-');
        const docRef = doc(db, 'colleges', id);
        batch.set(docRef, {
          name: name,
          addedAt: Timestamp.now()
        });
      });
      await batch.commit();
      await fetchColleges();
      toast({ title: "Default Colleges Seeded", description: "Standard institutional departments have been added." });
    } catch (e) {
      toast({ variant: 'destructive', title: "Seeding Failed" });
    } finally {
      setSeeding(false);
    }
  };

  const removeCollege = async (id: string) => {
    if (!confirm('Are you sure you want to remove this college?')) return;
    try {
      await deleteDoc(doc(db, 'colleges', id));
      setColleges(prev => prev.filter(c => c.id !== id));
      toast({ title: "College Removed" });
    } catch (e) {
      toast({ variant: 'destructive', title: "Failed to remove college" });
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
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
             <Button variant="ghost" size="sm" asChild>
               <Link href="/admin"><ArrowLeft className="h-4 w-4 mr-1" /> Back</Link>
             </Button>
             <div>
              <h1 className="text-2xl font-bold font-headline">College Roster</h1>
              <p className="text-muted-foreground">Define institutional affiliations for users</p>
             </div>
          </div>
          {colleges.length === 0 && (
            <Button variant="outline" onClick={seedColleges} disabled={seeding} className="gap-2">
              <DatabaseBackup className="h-4 w-4" />
              {seeding ? 'Seeding...' : 'Seed Default Colleges'}
            </Button>
          )}
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          <Card className="shadow-md h-fit">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-primary" />
                Add College
              </CardTitle>
              <CardDescription>Register a new institutional name</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={addCollege} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="cname">College Name</Label>
                  <Input 
                    id="cname" 
                    placeholder="e.g. Science Faculty" 
                    value={newCollegeName}
                    onChange={(e) => setNewCollegeName(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={adding || !newCollegeName}>
                  {adding ? 'Adding...' : 'Register College'}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="md:col-span-2 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <School className="h-5 w-5 text-primary" />
                Active Colleges
              </CardTitle>
              <CardDescription>Full list of available institutional labels</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>College Name</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {colleges.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.name}</TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeCollege(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {colleges.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={2} className="text-center py-12">
                        <div className="flex flex-col items-center gap-4 text-muted-foreground">
                          <p>No colleges defined yet.</p>
                          <Button variant="secondary" onClick={seedColleges} disabled={seeding}>
                            Initialize with Defaults
                          </Button>
                        </div>
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