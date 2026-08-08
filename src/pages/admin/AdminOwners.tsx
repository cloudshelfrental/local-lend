import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Search, CheckCircle, XCircle, Loader2, Users, Eye, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const AdminOwners = () => {
  const [search, setSearch] = useState("");
  const [owners, setOwners] = useState<any[]>([]);
  const [pendingVendors, setPendingVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);
  const [editing, setEditing] = useState<any | null>(null);
  const [form, setForm] = useState({ full_name: "", mobile: "", date_of_birth: "", delivery_address: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const fetchData = async () => {
    const { data: ownerRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "owner");

    const ownerIds = (ownerRoles || []).map(r => r.user_id);

    const { data: applications } = await supabase
      .from("vendor_applications")
      .select("id, user_id, full_name, mobile, panchayath_id, created_at")
      .eq("status", "pending")
      .eq("requested_role", "owner")
      .order("created_at", { ascending: false });

    setPendingVendors(
      (applications || []).map(a => ({
        id: a.user_id,
        application_id: a.id,
        panchayath_id: a.panchayath_id,
        full_name: a.full_name,
        mobile: a.mobile,
        created_at: a.created_at,
      }))
    );

    if (ownerIds.length > 0) {
      const [profilesRes, itemsRes, areasRes, walletsRes, ordersRes, settlementsRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, full_name, mobile, date_of_birth, delivery_address, created_at, panchayath_id, ward_id, panchayaths(name), wards(ward_number)")
          .in("id", ownerIds),
        supabase.from("items").select("id, name, owner_id, status, owner_price").in("owner_id", ownerIds),
        supabase.from("owner_areas").select("owner_id, areas(name)").in("owner_id", ownerIds),
        supabase.from("wallets").select("user_id, balance").in("user_id", ownerIds),
        supabase.from("orders").select("id, owner_id, status, total_amount").in("owner_id", ownerIds),
        supabase.from("settlements").select("id, user_id, amount, status").in("user_id", ownerIds),
      ]);

      const ownerList = (profilesRes.data || []).map(p => {
        const myItems = (itemsRes.data || []).filter(i => i.owner_id === p.id);
        const myOrders = (ordersRes.data || []).filter((o: any) => o.owner_id === p.id);
        const myAreas = (areasRes.data || []).filter(a => a.owner_id === p.id).map(a => (a.areas as any)?.name).filter(Boolean);
        const wallet = (walletsRes.data || []).find(w => w.user_id === p.id);
        const pendingSettle = (settlementsRes.data || []).filter(s => s.user_id === p.id && s.status === "pending");
        return {
          id: p.id,
          name: p.full_name,
          mobile: p.mobile,
          dob: p.date_of_birth,
          address: p.delivery_address,
          panchayath: (p.panchayaths as any)?.name || "—",
          ward: (p.wards as any)?.ward_number ? `Ward ${(p.wards as any).ward_number}` : "—",
          items: myItems.length,
          activeItems: myItems.filter(i => i.status === "approved").length,
          itemList: myItems,
          orders: myOrders.length,
          revenue: myOrders.reduce((s: number, o: any) => s + Number(o.total_amount || 0), 0),
          areas: myAreas,
          area: myAreas[0] || "—",
          wallet: Number(wallet?.balance || 0),
          pendingSettlement: pendingSettle.reduce((s, x) => s + Number(x.amount), 0),
          createdAt: p.created_at,
          joined: new Date(p.created_at).toLocaleDateString("en-IN"),
        };
      });
      setOwners(ownerList);
    } else {
      setOwners([]);
    }

    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const approveVendor = async (vendor: any) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: vendor.id, role: "owner" });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }

    if (vendor.panchayath_id) {
      const { data: areaLink } = await supabase
        .from("area_panchayaths")
        .select("area_id")
        .eq("panchayath_id", vendor.panchayath_id)
        .maybeSingle();
      if (areaLink) {
        await supabase.from("owner_areas").insert({ owner_id: vendor.id, area_id: areaLink.area_id });
      }
    }

    await supabase.from("vendor_applications").update({ status: "approved" }).eq("id", vendor.application_id);

    toast({ title: "Vendor approved", description: "The vendor can now login and list items." });
    fetchData();
  };

  const rejectVendor = async (vendor: any) => {
    const { error } = await supabase
      .from("vendor_applications")
      .update({ status: "rejected" })
      .eq("id", vendor.application_id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Vendor rejected", description: "The vendor registration has been declined." });
    fetchData();
  };

  const openEdit = (o: any) => {
    setEditing(o);
    setForm({
      full_name: o.name || "",
      mobile: o.mobile || "",
      date_of_birth: o.dob || "",
      delivery_address: o.address || "",
    });
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    if (!form.full_name.trim() || form.mobile.length !== 10) {
      toast({ title: "Check details", description: "Name is required and mobile must be 10 digits.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: form.full_name.trim(),
        mobile: form.mobile,
        date_of_birth: form.date_of_birth || null,
        delivery_address: form.delivery_address || null,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) { toast({ title: "Could not save", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Vendor updated" });
    setEditing(null);
    fetchData();
  };

  const revokeVendor = async (o: any) => {
    const { error } = await supabase.from("user_roles").delete().eq("user_id", o.id).eq("role", "owner");
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    await supabase.from("owner_areas").delete().eq("owner_id", o.id);
    toast({ title: "Vendor access revoked" });
    setDetail(null);
    fetchData();
  };

  const filtered = owners.filter(o =>
    (o.name || "").toLowerCase().includes(search.toLowerCase()) || (o.mobile || "").includes(search)
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      {/* Pending Vendor Approvals */}
      {pendingVendors.length > 0 && (
        <Card className="shadow-card border-amber-200">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2 text-amber-700">
              <Users className="h-5 w-5" /> Pending Vendor Approvals ({pendingVendors.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead className="hidden md:table-cell">Registered</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingVendors.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-display font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="font-body">{u.mobile}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" onClick={() => approveVendor(u)}>
                          <CheckCircle className="h-4 w-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => rejectVendor(u)}>
                          <XCircle className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search vendors..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      {/* Active Vendors */}
      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Registered Vendors ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table className="min-w-[900px]">
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Area</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Orders</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No vendors found</TableCell></TableRow>
              )}
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-display font-medium">{o.name}</TableCell>
                  <TableCell className="font-body">{o.mobile}</TableCell>
                  <TableCell className="font-body text-muted-foreground text-sm">{o.panchayath} · {o.ward}</TableCell>
                  <TableCell className="font-body text-muted-foreground">{o.area}</TableCell>
                  <TableCell className="font-display font-semibold">{o.items} <span className="text-xs text-muted-foreground font-body">({o.activeItems} approved)</span></TableCell>
                  <TableCell className="font-display font-semibold">{o.orders}</TableCell>
                  <TableCell className="font-display font-semibold text-accent">₹{o.wallet.toLocaleString("en-IN")}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">{o.joined}</TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setDetail(o)}>
                        <Eye className="h-3.5 w-3.5 mr-1" /> View
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openEdit(o)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!detail} onOpenChange={(open) => { if (!open) setDetail(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="font-display">{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm font-body">
                <div><p className="text-muted-foreground text-xs">Mobile</p><p>{detail.mobile}</p></div>
                <div><p className="text-muted-foreground text-xs">Date of Birth</p><p>{detail.dob ? new Date(detail.dob).toLocaleDateString("en-IN") : "—"}</p></div>
                <div><p className="text-muted-foreground text-xs">Panchayath</p><p>{detail.panchayath}</p></div>
                <div><p className="text-muted-foreground text-xs">Ward</p><p>{detail.ward}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-xs">Address</p><p>{detail.address || "—"}</p></div>
                <div className="col-span-2">
                  <p className="text-muted-foreground text-xs mb-1">Service Areas</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.areas.length ? detail.areas.map((a: string) => <Badge key={a} variant="secondary">{a}</Badge>) : <span className="text-muted-foreground">—</span>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Items Listed", value: `${detail.items} (${detail.activeItems} approved)` },
                  { label: "Total Orders", value: detail.orders },
                  { label: "Order Value", value: `₹${detail.revenue.toLocaleString("en-IN")}` },
                  { label: "Wallet", value: `₹${detail.wallet.toLocaleString("en-IN")}` },
                  { label: "Pending Settlement", value: `₹${detail.pendingSettlement.toLocaleString("en-IN")}` },
                  { label: "Joined", value: detail.joined },
                ].map(s => (
                  <div key={s.label} className="rounded-lg bg-secondary p-3">
                    <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                    <p className="font-display font-semibold text-foreground">{s.value}</p>
                  </div>
                ))}
              </div>

              {detail.itemList.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-body mb-1">Items</p>
                  <div className="space-y-1 max-h-40 overflow-y-auto">
                    {detail.itemList.map((i: any) => (
                      <div key={i.id} className="flex items-center justify-between text-sm p-2 rounded bg-secondary">
                        <span className="font-body">{i.name}</span>
                        <span className="font-display font-medium">₹{Number(i.owner_price || 0).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => { openEdit(detail); setDetail(null); }}>
                  <Pencil className="h-4 w-4 mr-1" /> Edit Vendor
                </Button>
                <Button variant="outline" className="text-destructive" onClick={() => revokeVendor(detail)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Revoke
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editing} onOpenChange={(open) => { if (!open) setEditing(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle className="font-display">Edit Vendor</DialogTitle></DialogHeader>
          <form onSubmit={saveEdit} className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body font-medium">Full Name</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Mobile Number</Label>
              <Input type="tel" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Date of Birth</Label>
              <Input type="date" value={form.date_of_birth || ""} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Address</Label>
              <Input value={form.delivery_address} onChange={(e) => setForm({ ...form, delivery_address: e.target.value })} />
            </div>
            <DialogFooter>
              <Button type="submit" className="w-full font-display font-semibold" disabled={saving}>
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOwners;
