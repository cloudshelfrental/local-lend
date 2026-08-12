import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Plus, Loader2, Package, Pencil, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import ImageUploadField from "@/components/ImageUploadField";

interface Item {
  id: string;
  name: string;
  description: string | null;
  owner_price: number;
  status: string;
  image_urls: string[] | null;
  video_url: string | null;
  category_id: string;
  payment_type: string;
  created_at: string;
}

interface Category {
  id: string;
  name: string;
  commission_rate: number;
}

const emptyForm = { name: "", description: "", owner_price: "", category_id: "", payment_type: "cash_on_delivery", image_url_1: "", image_url_2: "", image_url_3: "", video_url: "" };

const OwnerItems = () => {
  const { toast } = useToast();
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const [itemsRes, catRes] = await Promise.all([
      supabase.from("items").select("*").eq("owner_id", session.user.id).order("created_at", { ascending: false }),
      supabase.from("categories").select("*"),
    ]);

    setItems(itemsRes.data || []);
    setCategories(catRes.data || []);
    setLoading(false);
  };

  const openAddDialog = () => {
    setEditingItem(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEditDialog = (item: Item) => {
    setEditingItem(item);
    setForm({
      name: item.name,
      description: item.description || "",
      owner_price: String(item.owner_price),
      category_id: item.category_id,
      payment_type: item.payment_type || "cash_on_delivery",
      image_url_1: item.image_urls?.[0] || "",
      image_url_2: item.image_urls?.[1] || "",
      image_url_3: item.image_urls?.[2] || "",
      video_url: item.video_url || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    const urls = [form.image_url_1, form.image_url_2, form.image_url_3].filter(Boolean);
    if (urls.length < 3) {
      toast({ title: "Please upload 3 images", variant: "destructive" });
      return;
    }
    if (!form.name || !form.category_id || !form.owner_price) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const payload = {
      name: form.name,
      description: form.description || null,
      owner_price: parseFloat(form.owner_price),
      category_id: form.category_id,
      image_urls: urls,
      payment_type: form.payment_type,
      video_url: form.video_url.trim() || null,
    };

    let error;
    if (editingItem) {
      // Update — reset to pending approval so admin re-reviews
      ({ error } = await supabase.from("items").update({ ...payload, status: "pending_approval" as any }).eq("id", editingItem.id));
    } else {
      ({ error } = await supabase.from("items").insert({ ...payload, owner_id: session.user.id } as any));
    }

    setSubmitting(false);
    if (error) {
      toast({ title: editingItem ? "Failed to update item" : "Failed to add item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: editingItem ? "Item updated & resubmitted for approval" : "Item submitted for approval" });
      setForm(emptyForm);
      setEditingItem(null);
      setDialogOpen(false);
      fetchData();
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    // Set status to inactive instead of actual delete (no DELETE RLS policy)
    const { error } = await supabase.from("items").update({ status: "inactive" as any }).eq("id", deleteItem.id);
    if (error) {
      toast({ title: "Failed to remove item", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Item removed" });
      fetchData();
    }
    setDeleteItem(null);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "active": return "default";
      case "pending_approval": return "secondary";
      case "rejected": return "destructive";
      default: return "outline";
    }
  };

  if (loading) {
    return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-display font-semibold text-foreground">My Items</h2>
        <Button size="sm" onClick={openAddDialog}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) { setEditingItem(null); } setDialogOpen(open); }}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">{editingItem ? "Edit Item" : "Add New Item"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <Label>Category *</Label>
              <Select value={form.category_id} onValueChange={v => setForm(f => ({ ...f, category_id: v }))}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {categories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Rental Price (₹) *</Label>
              <Input type="number" value={form.owner_price} onChange={e => setForm(f => ({ ...f, owner_price: e.target.value }))} />
            </div>
            <div>
              <Label>Payment Type *</Label>
              <Select value={form.payment_type} onValueChange={v => setForm(f => ({ ...f, payment_type: v }))}>
                <SelectTrigger><SelectValue placeholder="Select payment type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                  <SelectItem value="prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <ImageUploadField label="Image 1 *" value={form.image_url_1} onChange={v => setForm(f => ({ ...f, image_url_1: v }))} />
            <ImageUploadField label="Image 2 *" value={form.image_url_2} onChange={v => setForm(f => ({ ...f, image_url_2: v }))} />
            <ImageUploadField label="Image 3 *" value={form.image_url_3} onChange={v => setForm(f => ({ ...f, image_url_3: v }))} />
            <div>
              <Label>YouTube Video Link (optional)</Label>
              <Input
                placeholder="https://www.youtube.com/watch?v=..."
                value={form.video_url}
                onChange={e => setForm(f => ({ ...f, video_url: e.target.value }))}
              />
            </div>
            <Button onClick={handleSubmit} disabled={submitting} className="w-full">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              {editingItem ? "Update & Resubmit" : "Submit for Approval"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteItem} onOpenChange={(open) => !open && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Item</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove "{deleteItem?.name}"? It will be marked as inactive.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Remove</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {items.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mb-3" />
            <p className="text-muted-foreground font-body">No items yet. Add your first item!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {items.map(item => (
            <Card key={item.id}>
              <CardContent className="p-4 flex items-center gap-4">
                {item.image_urls?.[0] && (
                  <img src={item.image_urls[0]} alt={item.name} className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-display font-medium text-foreground truncate">{item.name}</p>
                  <p className="text-sm text-muted-foreground font-body">₹{item.owner_price}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </Badge>
                  <Button size="sm" variant="ghost" onClick={() => openEditDialog(item)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setDeleteItem(item)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default OwnerItems;
