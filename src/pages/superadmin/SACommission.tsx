import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Percent, Plus, Loader2, ImageIcon, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const SACommission = () => {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newImage, setNewImage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editRate, setEditRate] = useState("");
  const [editImage, setEditImage] = useState("");
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase.from("categories").select("id, name, commission_rate, image_url").order("name");
    setCategories(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const addCategory = async () => {
    if (!newName.trim() || !newRate) return;
    const { error } = await supabase.from("categories").insert({
      name: newName.trim(),
      commission_rate: parseFloat(newRate),
      image_url: newImage.trim() || null,
    });
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category added" });
    setNewName(""); setNewRate(""); setNewImage("");
    setDialogOpen(false);
    fetchData();
  };

  const saveCategory = async (id: string) => {
    const { error } = await supabase.from("categories").update({
      name: editName.trim(),
      commission_rate: parseFloat(editRate),
      image_url: editImage.trim() || null,
    }).eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category updated" });
    setEditingId(null);
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    const { error } = await supabase.from("categories").delete().eq("id", id);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Category deleted" });
    fetchData();
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="shadow-card">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-lg flex items-center gap-2"><Percent className="h-5 w-5 text-primary" /> Categories & Commission ({categories.length})</CardTitle>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="h-4 w-4 mr-1" /> Add Category</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Category</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2"><Label>Category Name</Label><Input value={newName} onChange={e => setNewName(e.target.value)} placeholder="e.g. Electronics" /></div>
              <div className="space-y-2"><Label>Commission Rate (%)</Label><Input type="number" value={newRate} onChange={e => setNewRate(e.target.value)} placeholder="e.g. 10" /></div>
              <ImageUploadField label="Category Image" value={newImage} onChange={setNewImage} />
              <Button className="w-full" onClick={addCategory}>Add Category</Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">Image</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Commission Rate</TableHead>
              <TableHead className="w-40">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map(c => (
              <TableRow key={c.id}>
                <TableCell>
                  {editingId === c.id ? (
                    <div className="w-48"><ImageUploadField label="" value={editImage} onChange={setEditImage} /></div>
                  ) : c.image_url ? (
                    <img src={c.image_url} alt={c.name} className="h-10 w-10 rounded-lg object-cover border border-border" />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-muted grid place-items-center"><ImageIcon className="h-4 w-4 text-muted-foreground" /></div>
                  )}
                </TableCell>
                <TableCell className="font-display font-medium">
                  {editingId === c.id ? (
                    <Input value={editName} onChange={e => setEditName(e.target.value)} className="w-40" />
                  ) : c.name}
                </TableCell>
                <TableCell>
                  {editingId === c.id ? (
                    <Input type="number" value={editRate} onChange={e => setEditRate(e.target.value)} className="w-24" />
                  ) : (
                    <Badge variant="secondary" className="font-display font-semibold">{c.commission_rate}%</Badge>
                  )}
                </TableCell>
                <TableCell>
                  {editingId === c.id ? (
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => saveCategory(c.id)}>Save</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Cancel</Button>
                    </div>
                  ) : (
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => { setEditingId(c.id); setEditName(c.name); setEditRate(c.commission_rate.toString()); setEditImage(c.image_url || ""); }}>Edit</Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCategory(c.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {categories.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No categories added</TableCell></TableRow>}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

export default SACommission;
