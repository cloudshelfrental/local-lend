import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Search, CheckCircle, XCircle, Loader2, Eye, CreditCard, MapPin, Pencil, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusColor = (s: string) => {
  const map: Record<string, string> = {
    active: "bg-emerald-100 text-emerald-800",
    pending_approval: "bg-amber-100 text-amber-800",
    rejected: "bg-red-100 text-red-800",
    inactive: "bg-gray-100 text-gray-800",
  };
  return map[s] || "";
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    active: "Active", pending_approval: "Pending", rejected: "Rejected", inactive: "Inactive",
  };
  return map[s] || s;
};

const AdminItems = () => {
  const [search, setSearch] = useState("");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [editItem, setEditItem] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [allCategories, setAllCategories] = useState<any[]>([]);
  const [vendors, setVendors] = useState<any[]>([]);
  const [newItem, setNewItem] = useState<any>(null);
  const { toast } = useToast();

  const fetchItems = async () => {
    const { data } = await supabase
      .from("items")
      .select("id, name, owner_price, status, category_id, owner_id, description, image_urls, payment_type, area_id, created_at, categories(name, commission_rate), areas(name)")
      .order("created_at", { ascending: false });

    const ownerIds = [...new Set((data || []).map(i => i.owner_id))];
    let profileMap: Record<string, { name: string; mobile: string }> = {};
    if (ownerIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name, mobile")
        .in("id", ownerIds);
      profileMap = Object.fromEntries((profiles || []).map(p => [p.id, { name: p.full_name, mobile: p.mobile }]));
    }

    setItems((data || []).map(item => ({
      ...item,
      vendor_name: (profileMap[item.owner_id] as any)?.name || "—",
      vendor_mobile: (profileMap[item.owner_id] as any)?.mobile || "—",
    })));
    setLoading(false);
  };

  useEffect(() => {
    fetchItems();
    supabase.from("categories").select("id, name").order("name").then(({ data }) => setAllCategories(data || []));
    (async () => {
      const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "owner");
      const ids = [...new Set((roles || []).map(r => r.user_id))];
      if (ids.length === 0) return;
      const { data: profiles } = await supabase.from("profiles").select("id, full_name, mobile").in("id", ids);
      setVendors((profiles || []).sort((a, b) => (a.full_name || "").localeCompare(b.full_name || "")));
    })();
  }, []);

  const openCreate = () => {
    setNewItem({
      owner_id: "",
      name: "",
      description: "",
      owner_price: "",
      category_id: "",
      payment_type: "cash_on_delivery",
      status: "active",
      image_url_1: "",
      image_url_2: "",
      image_url_3: "",
    });
  };

  const createItem = async () => {
    if (!newItem) return;
    if (!newItem.owner_id) { toast({ title: "Vendor required", description: "Select a vendor for this item.", variant: "destructive" }); return; }
    if (!newItem.name.trim()) { toast({ title: "Name required", variant: "destructive" }); return; }
    if (!newItem.category_id) { toast({ title: "Category required", variant: "destructive" }); return; }

    setSaving(true);
    // Inherit the vendor's assigned area, if any
    const { data: oa } = await supabase.from("owner_areas").select("area_id").eq("owner_id", newItem.owner_id).limit(1).maybeSingle();
    const urls = [newItem.image_url_1, newItem.image_url_2, newItem.image_url_3].map((u: string) => u.trim()).filter(Boolean);

    const { error } = await supabase.from("items").insert({
      owner_id: newItem.owner_id,
      name: newItem.name.trim(),
      description: newItem.description.trim() || null,
      owner_price: parseFloat(newItem.owner_price) || 0,
      category_id: newItem.category_id,
      payment_type: newItem.payment_type,
      status: newItem.status,
      image_urls: urls,
      area_id: oa?.area_id ?? null,
    });
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item added" });
    setNewItem(null);
    fetchItems();
  };

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
      status: editItem.status,
      image_urls: urls,
    }).eq("id", editItem.id);
    setSaving(false);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Item updated" });
    setEditItem(null);
    setSelectedItem(null);
    fetchItems();
  };

  const updateStatus = async (id: string, status: "active" | "rejected") => {
    const { error } = await supabase.from("items").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Item ${status === "active" ? "approved" : "rejected"}.` });
      fetchItems();
      if (selectedItem?.id === id) setSelectedItem(null);
    }
  };

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.vendor_name?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items or vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">All Items ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Item Name</TableHead>
                <TableHead >Vendor</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead className="hidden md:table-cell">Commission</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={7} className="text-center text-muted-foreground py-8">No items found</TableCell></TableRow>
              )}
              {filtered.map((item) => {
                const commission = item.categories ? (Number(item.owner_price) * Number(item.categories.commission_rate) / 100) : 0;
                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-display font-medium">{item.name}</TableCell>
                    <TableCell className="font-body text-muted-foreground">{item.vendor_name}</TableCell>
                    <TableCell><Badge variant="secondary">{(item.categories as any)?.name || "—"}</Badge></TableCell>
                    <TableCell className="font-display font-semibold">₹{Number(item.owner_price).toLocaleString("en-IN")}</TableCell>
                    <TableCell className="hidden md:table-cell font-display text-accent font-semibold">₹{commission.toLocaleString("en-IN")}</TableCell>
                    <TableCell><Badge className={statusColor(item.status)}>{statusLabel(item.status)}</Badge></TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => setSelectedItem(item)}>
                          <Eye className="h-4 w-4 text-primary" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => openEdit(item)}>
                          <Pencil className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        {item.status === "pending_approval" && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(item.id, "active")}>
                              <CheckCircle className="h-4 w-4 text-emerald-600" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => updateStatus(item.id, "rejected")}>
                              <XCircle className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Item Detail Dialog */}
      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedItem && (() => {
            const commission = selectedItem.categories
              ? (Number(selectedItem.owner_price) * Number(selectedItem.categories.commission_rate) / 100)
              : 0;
            return (
              <>
                <DialogHeader>
                  <DialogTitle className="font-display text-xl">{selectedItem.name}</DialogTitle>
                </DialogHeader>

                {/* Images */}
                {selectedItem.image_urls?.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {selectedItem.image_urls.map((url: string, i: number) => (
                      <img key={i} src={url} alt={`${selectedItem.name} ${i + 1}`} className="h-28 w-28 rounded-lg object-cover border border-border flex-shrink-0" />
                    ))}
                  </div>
                )}

                <div className="space-y-3 text-sm">
                  {/* Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">Status:</span>
                    <Badge className={statusColor(selectedItem.status)}>{statusLabel(selectedItem.status)}</Badge>
                  </div>

                  {/* Description */}
                  {selectedItem.description && (
                    <div>
                      <span className="text-muted-foreground">Description:</span>
                      <p className="mt-1 text-foreground">{selectedItem.description}</p>
                    </div>
                  )}

                  {/* Vendor */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Vendor:</span>
                      <p className="font-medium text-foreground">{selectedItem.vendor_name}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Mobile:</span>
                      <p className="font-medium text-foreground">{selectedItem.vendor_mobile}</p>
                    </div>
                  </div>

                  {/* Category & Area */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-muted-foreground">Category:</span>
                      <p className="font-medium text-foreground">{(selectedItem.categories as any)?.name || "—"}</p>
                    </div>
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                      <div>
                        <span className="text-muted-foreground">Area:</span>
                        <p className="font-medium text-foreground">{(selectedItem.areas as any)?.name || "—"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div className="grid grid-cols-3 gap-2 bg-muted/50 rounded-lg p-3">
                    <div>
                      <span className="text-muted-foreground text-xs">Rental Price</span>
                      <p className="font-display font-semibold text-foreground">₹{Number(selectedItem.owner_price).toLocaleString("en-IN")}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground text-xs">Commission ({selectedItem.categories?.commission_rate || 0}%)</span>
                      <p className="font-display font-semibold text-accent">₹{commission.toLocaleString("en-IN")}</p>
                    </div>
                    <div className="flex items-start gap-1">
                      <CreditCard className="h-3.5 w-3.5 text-muted-foreground mt-3.5" />
                      <div>
                        <span className="text-muted-foreground text-xs">Payment</span>
                        <p className="font-medium text-foreground">{selectedItem.payment_type === "prepaid" ? "Prepaid" : "COD"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Date */}
                  <p className="text-xs text-muted-foreground">
                    Listed on {new Date(selectedItem.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </p>

                  {/* Actions */}
                  <div className="pt-2">
                    <Button variant="outline" className="w-full" onClick={() => openEdit(selectedItem)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit Item Details
                    </Button>
                  </div>
                  {selectedItem.status === "pending_approval" && (
                    <div className="flex gap-2 pt-2">
                      <Button className="flex-1" onClick={() => updateStatus(selectedItem.id, "active")}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button variant="destructive" className="flex-1" onClick={() => updateStatus(selectedItem.id, "rejected")}>
                        <XCircle className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* Edit Item Dialog */}
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
                      <SelectItem value="pending_approval">Pending</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select></div>
              </div>
              {[1, 2, 3].map(n => (
                <div key={n} className="space-y-1.5"><Label>Image URL {n}</Label>
                  <Input value={editItem[`image_url_${n}`]} onChange={e => setEditItem({ ...editItem, [`image_url_${n}`]: e.target.value })} placeholder="https://..." /></div>
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
    </div>
  );
};

export default AdminItems;
