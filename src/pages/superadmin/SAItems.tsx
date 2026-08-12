import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Package, Loader2, Pencil } from "lucide-react";
import ImageUploadField from "@/components/ImageUploadField";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending_approval: "bg-amber-100 text-amber-800",
  active: "bg-emerald-100 text-emerald-800",
  inactive: "bg-gray-100 text-gray-800",
  rejected: "bg-red-100 text-red-800",
};
const statusLabel = (s: string) => ({ pending_approval: "Pending", active: "Active", inactive: "Inactive", rejected: "Rejected" }[s] || s);

const SAItems = () => {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data } = await supabase
      .from("items")
      .select("id, name, description, owner_price, status, created_at, owner_id, category_id, payment_type, image_urls, categories(name), areas(name)")
      .order("created_at", { ascending: false });
    const rows = data || [];
    const ownerIds = [...new Set(rows.map(r => r.owner_id))];
    let nameMap: Record<string, string> = {};
    if (ownerIds.length) {
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ownerIds);
      nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
    }
    setItems(rows.map(r => ({ ...r, vendor_name: nameMap[r.owner_id] || "—" })));
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
    supabase.from("categories").select("id, name").order("name").then(({ data }) => setAllCategories(data || []));
  }, []);

  const openEdit = (item: any) => {
    setEditItem({
      id: item.id,
      name: item.name,
      description: item.description || "",
      owner_price: String(item.owner_price ?? ""),
      category_id: item.category_id,
      payment_type: item.payment_type,
      status: item.status,
      image_url_1: item.image_urls?.[0] || "",
      image_url_2: item.image_urls?.[1] || "",
      image_url_3: item.image_urls?.[2] || "",
    });
  };

  const saveEdit = async () => {
    if (!editItem) return;
    setSaving(true);
    const urls = [editItem.image_url_1, editItem.image_url_2, editItem.image_url_3].map((u: string) => u.trim()).filter(Boolean);
    const { error } = await supabase.from("items").update({
      name: editItem.name.trim(),
      description: editItem.description.trim() || null,
      owner_price: parseFloat(editItem.owner_price) || 0,
      category_id: editItem.category_id,
      payment_type: editItem.payment_type,
      status: editItem.status as any,
      image_urls: urls,
    }).eq("id", editItem.id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item updated" });
    setEditItem(null);
    fetchData();
  };

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("items").update({ status: status as any }).eq("id", id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: `Item ${statusLabel(status).toLowerCase()}` }); fetchData(); }
  };

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = !q || i.name?.toLowerCase().includes(q) || i.vendor_name?.toLowerCase().includes(q);
    return matchSearch && (statusFilter === "all" || i.status === statusFilter);
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <Card className="shadow-card">
      <CardHeader>
        <CardTitle className="font-display text-lg flex items-center gap-2"><Package className="h-5 w-5 text-primary" /> All Items ({filtered.length})</CardTitle>
        <div className="flex flex-col sm:flex-row gap-2 pt-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input className="pl-9" placeholder="Search item or vendor" value={search} onChange={e => setSearch(e.target.value)} />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Area</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map(i => (
              <TableRow key={i.id}>
                <TableCell className="font-medium">{i.name}</TableCell>
                <TableCell>{i.vendor_name}</TableCell>
                <TableCell>{(i.categories as any)?.name || "—"}</TableCell>
                <TableCell>{(i.areas as any)?.name || "—"}</TableCell>
                <TableCell>₹{Number(i.owner_price).toLocaleString("en-IN")}</TableCell>
                <TableCell><Badge className={statusColors[i.status]} variant="secondary">{statusLabel(i.status)}</Badge></TableCell>
                <TableCell className="text-right space-x-2 whitespace-nowrap">
                  <Button size="sm" variant="ghost" onClick={() => openEdit(i)}><Pencil className="h-4 w-4" /></Button>
                  {i.status !== "active" && <Button size="sm" onClick={() => setStatus(i.id, "active")}>Approve</Button>}
                  {i.status !== "rejected" && <Button size="sm" variant="outline" onClick={() => setStatus(i.id, "rejected")}>Reject</Button>}
                  {i.status === "active" && <Button size="sm" variant="ghost" onClick={() => setStatus(i.id, "inactive")}>Deactivate</Button>}
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-6">No items found</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={!!editItem} onOpenChange={(open) => !open && setEditItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display text-xl">Edit Item</DialogTitle></DialogHeader>
          {editItem && (
            <div className="space-y-3">
              <div className="space-y-1.5"><Label>Name</Label>
                <Input value={editItem.name} onChange={e => setEditItem({ ...editItem, name: e.target.value })} /></div>
              <div className="space-y-1.5"><Label>Description</Label>
                <Textarea value={editItem.description} onChange={e => setEditItem({ ...editItem, description: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Rental Price (₹)</Label>
                  <Input type="number" value={editItem.owner_price} onChange={e => setEditItem({ ...editItem, owner_price: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>Category</Label>
                  <Select value={editItem.category_id} onValueChange={v => setEditItem({ ...editItem, category_id: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{allCategories.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>Payment Type</Label>
                  <Select value={editItem.payment_type} onValueChange={v => setEditItem({ ...editItem, payment_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prepaid">Prepaid</SelectItem>
                      <SelectItem value="cash_on_delivery">Cash on Delivery</SelectItem>
                    </SelectContent>
                  </Select></div>
                <div className="space-y-1.5"><Label>Status</Label>
                  <Select value={editItem.status} onValueChange={v => setEditItem({ ...editItem, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.keys(statusColors).map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                    </SelectContent>
                  </Select></div>
              </div>
              {[1, 2, 3].map(n => (
                <ImageUploadField key={n} label={`Image ${n}`} value={editItem[`image_url_${n}`]} onChange={v => setEditItem({ ...editItem, [`image_url_${n}`]: v })} />
              ))}
              <div className="flex gap-2 pt-2">
                <Button className="flex-1" onClick={saveEdit} disabled={saving}>
                  {saving && <Loader2 className="h-4 w-4 mr-1 animate-spin" />} Save Changes
                </Button>
                <Button variant="outline" onClick={() => setEditItem(null)}>Cancel</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
};

export default SAItems;