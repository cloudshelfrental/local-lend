import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Search, Loader2, CheckCircle, XCircle, Users, Bell, Banknote, UserPlus, MapPin, ChevronDown } from "lucide-react";
import DeliveryLocationsDialog from "@/components/DeliveryLocationsDialog";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";


const flowStatuses = ["confirmed", "delivery_booked", "picked_up", "delivered"] as const;

const flowLabels: Record<string, string> = {
  confirmed: "Awaiting Delivery Staff",
  delivery_booked: "Delivery Booked",
  picked_up: "Picked Up",
  delivered: "Delivered",
};

const flowColors: Record<string, string> = {
  confirmed: "bg-blue-100 text-blue-800",
  delivery_booked: "bg-violet-100 text-violet-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  delivered: "bg-emerald-100 text-emerald-800",
};

const AdminDelivery = () => {
  const [search, setSearch] = useState("");
  const [staff, setStaff] = useState<any[]>([]);
  const [pendingUsers, setPendingUsers] = useState<any[]>([]);
  const [flowOrders, setFlowOrders] = useState<any[]>([]);
  const [collections, setCollections] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [expanded, setExpanded] = useState<string[]>([]);
  const [locStaff, setLocStaff] = useState<{ id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ full_name: "", mobile: "", password: "", date_of_birth: "" });

  const { toast } = useToast();

  const fetchData = async () => {
    // Get delivery role users
    const { data: deliveryRoles } = await supabase.from("user_roles").select("user_id").eq("role", "delivery");
    const deliveryIds = (deliveryRoles || []).map(r => r.user_id);

    // Get all roles to find pending users
    const { data: allRoles } = await supabase.from("user_roles").select("user_id");
    const usersWithRoles = new Set((allRoles || []).map(r => r.user_id));

    // Pending: delivery applications only (users who signed up on the delivery portal)
    const { data: applications } = await supabase
      .from("vendor_applications")
      .select("id, user_id, full_name, mobile, created_at")
      .eq("status", "pending")
      .eq("requested_role", "delivery")
      .order("created_at", { ascending: false });

    const pending = (applications || [])
      .filter(a => !usersWithRoles.has(a.user_id))
      .map(a => ({
        id: a.user_id,
        application_id: a.id,
        full_name: a.full_name,
        mobile: a.mobile,
        created_at: a.created_at,
      }));
    setPendingUsers(pending);

    // Live delivery pipeline
    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, status, total_amount, payment_method, delivery_address, delivery_staff_id, ward_id, created_at, items(name), wards(ward_number, panchayaths(name))")
      .in("status", [...flowStatuses])
      .order("created_at", { ascending: false })
      .limit(100);

    // Cash collections submitted by delivery staff
    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, status, collected_by, collected_at, submitted_at, orders(order_number)")
      .in("status", ["collected", "submitted"])
      .order("created_at", { ascending: false });

    // Active delivery staff
    let staffNames: Record<string, string> = {};
    let staffWards: any[] = [];
    if (deliveryIds.length > 0) {
      const [profilesRes, areasRes, ordersRes, walletsRes, wardsRes] = await Promise.all([
        supabase.from("profiles").select("id, full_name, mobile, date_of_birth").in("id", deliveryIds),
        supabase.from("delivery_staff_areas").select("staff_id, areas(name)").in("staff_id", deliveryIds),
        supabase.from("orders").select("id, delivery_staff_id").in("delivery_staff_id", deliveryIds),
        supabase.from("wallets").select("user_id, balance").in("user_id", deliveryIds),
        supabase.from("delivery_staff_wards").select("staff_id, ward_id, wards(ward_number, panchayaths(name))").in("staff_id", deliveryIds),
      ]);

      staffNames = Object.fromEntries((profilesRes.data || []).map(p => [p.id, p.full_name]));
      staffWards = wardsRes.data || [];

      const staffList = (profilesRes.data || []).map(p => {
        const area = (areasRes.data || []).find(a => a.staff_id === p.id);
        const deliveries = (ordersRes.data || []).filter(o => o.delivery_staff_id === p.id).length;
        const wallet = (walletsRes.data || []).find(w => w.user_id === p.id);
        const myWards = staffWards.filter(w => w.staff_id === p.id);
        return {
          id: p.id, name: p.full_name, mobile: p.mobile,
          dob: p.date_of_birth ? new Date(p.date_of_birth).toLocaleDateString("en-IN") : "—",
          area: (area?.areas as any)?.name || "—",
          wardIds: myWards.map(w => w.ward_id),
          locations: myWards.map(w => `${(w.wards as any)?.panchayaths?.name || "—"} · W${(w.wards as any)?.ward_number}`),
          deliveries,
          wallet: wallet ? `₹${Number(wallet.balance).toLocaleString("en-IN")}` : "₹0",
        };
      });
      setStaff(staffList);
    } else {
      setStaff([]);
    }

    setFlowOrders((orders || []).map(o => ({ ...o, staff_name: o.delivery_staff_id ? (staffNames[o.delivery_staff_id] || "Assigned") : "—" })));
    setCollections((payments || []).map(p => ({ ...p, staff_name: p.collected_by ? (staffNames[p.collected_by] || "Staff") : "—" })));


    setLoading(false);
  };

  useEffect(() => { fetchData(); }, []);

  const approveDelivery = async (userId: string) => {
    const { error } = await supabase.from("user_roles").insert({ user_id: userId, role: "delivery" });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
      return;
    }
    await supabase
      .from("vendor_applications")
      .update({ status: "approved" })
      .eq("user_id", userId)
      .eq("requested_role", "delivery");
    toast({ title: "Delivery staff approved" });
    fetchData();
  };

  const removeDelivery = async (userId: string) => {
    await supabase.from("delivery_staff_areas").delete().eq("staff_id", userId);
    const { error } = await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "delivery");
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Delivery staff removed" });
    fetchData();
  };

  const addStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.full_name || form.mobile.length !== 10 || form.password.length < 6) {
      toast({ title: "Missing details", description: "Enter a name, 10-digit mobile and a password of at least 6 characters.", variant: "destructive" });
      return;
    }
    setSaving(true);
    const { data, error } = await supabase.functions.invoke("admin-create-delivery", { body: form });
    setSaving(false);
    if (error || (data as any)?.error) {
      toast({ title: "Could not add staff", description: (data as any)?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Delivery staff added", description: `${form.full_name} can now log in with mobile ${form.mobile}.` });
    setForm({ full_name: "", mobile: "", password: "", date_of_birth: "" });
    setAddOpen(false);
    fetchData();
  };

  const verifyCash = async (paymentId: string) => {
    const { error } = await supabase
      .from("payments")
      .update({ status: "verified" as any, verified_by: (await supabase.auth.getUser()).data.user?.id })
      .eq("id", paymentId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Cash received at office" });
    setCollections(prev => prev.filter(c => c.id !== paymentId));
  };

  const assignStaff = async (orderId: string, staffId: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ delivery_staff_id: staffId, status: "delivery_booked" as any, booked_at: new Date().toISOString() })
      .eq("id", orderId);
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Delivery staff assigned" });
    fetchData();
  };


  const filtered = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) || s.mobile.includes(search)
  );

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const counts = Object.fromEntries(flowStatuses.map(s => [s, flowOrders.filter(o => o.status === s).length]));
  const submitted = collections.filter(c => c.status === "submitted");
  const inHand = collections.filter(c => c.status === "collected");

  return (
    <div className="space-y-6">
      {/* Delivery pipeline */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {flowStatuses.map(s => (
          <Card key={s} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-body">{flowLabels[s]}</p>
              <p className="text-2xl font-display font-bold text-foreground">{counts[s] || 0}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" /> Live Delivery Flow
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Item</TableHead>
                <TableHead className="hidden md:table-cell">Pickup Location</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead>Stage</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {flowOrders.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No orders in the delivery flow</TableCell></TableRow>
              )}
              {flowOrders.map(o => {
                const ward = (o.wards as any);
                const matching = staff.filter(s => s.wardIds?.includes(o.ward_id));
                const others = staff.filter(s => !s.wardIds?.includes(o.ward_id));
                return (
                <TableRow key={o.id}>
                  <TableCell className="font-display font-medium">{o.order_number}</TableCell>
                  <TableCell className="hidden md:table-cell font-body text-muted-foreground">{(o.items as any)?.name || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell font-body text-muted-foreground text-sm">
                    {ward ? `${ward.panchayaths?.name || "—"} · Ward ${ward.ward_number}` : "—"}
                  </TableCell>
                  <TableCell className="font-body">
                    {o.delivery_staff_id ? o.staff_name : (
                      <Select onValueChange={(v) => assignStaff(o.id, v)}>
                        <SelectTrigger className="h-8 w-[190px] text-xs">
                          <SelectValue placeholder={matching.length ? "Waiting for accept — assign" : "No staff in ward — assign"} />
                        </SelectTrigger>
                        <SelectContent>
                          {matching.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name} · in this ward</SelectItem>
                          ))}
                          {others.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                          {staff.length === 0 && <SelectItem value="none" disabled>No delivery staff</SelectItem>}
                        </SelectContent>
                      </Select>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={o.payment_method === "prepaid" ? "default" : "secondary"}>
                      {o.payment_method === "prepaid" ? "Prepaid" : `COD ₹${Number(o.total_amount).toLocaleString("en-IN")}`}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge className={flowColors[o.status] || ""}>{flowLabels[o.status] || o.status}</Badge></TableCell>
                </TableRow>
                );
              })}
            </TableBody>

          </Table>
        </CardContent>
      </Card>

      {/* Cash collections */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2">
            <Banknote className="h-5 w-5 text-accent" /> Cash Collections
          </CardTitle>
          <p className="text-xs text-muted-foreground font-body">
            With staff: ₹{inHand.reduce((s, c) => s + Number(c.amount), 0).toLocaleString("en-IN")} · Submitted to office: ₹{submitted.reduce((s, c) => s + Number(c.amount), 0).toLocaleString("en-IN")}
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.length === 0 && (
                <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">No cash pending</TableCell></TableRow>
              )}
              {collections.map(c => (
                <TableRow key={c.id}>
                  <TableCell className="font-display font-medium">{(c.orders as any)?.order_number || "—"}</TableCell>
                  <TableCell className="font-body">{c.staff_name}</TableCell>
                  <TableCell className="font-display font-semibold">₹{Number(c.amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell>
                    <Badge className={c.status === "submitted" ? "bg-blue-100 text-blue-800" : "bg-amber-100 text-amber-800"}>
                      {c.status === "submitted" ? "Submitted to Office" : "With Staff"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {c.status === "submitted" && (
                      <Button size="sm" onClick={() => verifyCash(c.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Confirm Received
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pending Approvals */}
      {pendingUsers.length > 0 && (
        <Card className="shadow-card border-amber-200">
          <CardHeader>
            <CardTitle className="font-display text-lg flex items-center gap-2 text-amber-700">
              <Users className="h-5 w-5" /> Pending Delivery Approvals ({pendingUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pendingUsers.map(u => (
                  <TableRow key={u.id}>
                    <TableCell className="font-display font-medium">{u.full_name || "—"}</TableCell>
                    <TableCell className="font-body">{u.mobile}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{new Date(u.created_at).toLocaleDateString("en-IN")}</TableCell>
                    <TableCell>
                      <Button size="sm" onClick={() => approveDelivery(u.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Approve
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Search + Add */}
      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <div className="relative w-full max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search delivery staff..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button className="font-display font-semibold"><UserPlus className="h-4 w-4 mr-2" /> Add Delivery Staff</Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader><DialogTitle className="font-display">Add Delivery Staff</DialogTitle></DialogHeader>
            <form onSubmit={addStaff} className="space-y-4">
              <div className="space-y-2">
                <Label className="font-body font-medium">Full Name</Label>
                <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="space-y-2">
                <Label className="font-body font-medium">Mobile Number</Label>
                <Input type="tel" maxLength={10} value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value.replace(/\D/g, "") })} placeholder="10-digit number" />
              </div>
              <div className="space-y-2">
                <Label className="font-body font-medium">Password</Label>
                <Input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Min 6 characters" />
              </div>
              <div className="space-y-2">
                <Label className="font-body font-medium">Date of Birth (optional)</Label>
                <Input type="date" value={form.date_of_birth} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} />
              </div>
              <DialogFooter>
                <Button type="submit" className="w-full font-display font-semibold" disabled={saving}>
                  {saving ? "Adding..." : "Add Staff"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Staff */}
      <Card className="shadow-card">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle className="font-display text-lg">Delivery Staff ({filtered.length})</CardTitle>
          {filtered.length > 0 && (
            <Button
              size="sm"
              variant="ghost"
              className="text-xs"
              onClick={() => setExpanded(expanded.length === filtered.length ? [] : filtered.map(s => s.id))}
            >
              {expanded.length === filtered.length ? "Collapse all" : "Expand all"}
            </Button>
          )}
        </CardHeader>
        <CardContent className="space-y-3">
          {filtered.length === 0 && (
            <p className="text-center text-muted-foreground py-8 font-body">No delivery staff found</p>
          )}
          {filtered.map((s) => {
            const open = expanded.includes(s.id);
            return (
              <Collapsible
                key={s.id}
                open={open}
                onOpenChange={() => setExpanded(prev => prev.includes(s.id) ? prev.filter(x => x !== s.id) : [...prev, s.id])}
                className="rounded-xl border border-border bg-card"
              >
                <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 text-left">
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-display font-semibold text-foreground shrink-0">
                    {(s.name || "?").charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-display font-semibold text-foreground truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground font-body">{s.mobile}</p>
                  </div>
                  <div className="hidden sm:flex items-center gap-2">
                    <Badge variant="secondary" className="text-[11px]">{s.deliveries} deliveries</Badge>
                    <Badge variant="outline" className="text-[11px] text-accent">{s.wallet}</Badge>
                  </div>
                  <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4 pt-0 space-y-4 border-t border-border/60">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3">
                      {[
                        { label: "Mobile", value: s.mobile },
                        { label: "Date of Birth", value: s.dob },
                        { label: "Deliveries", value: s.deliveries },
                        { label: "Wallet", value: s.wallet },
                      ].map(f => (
                        <div key={f.label} className="rounded-lg bg-secondary p-3">
                          <p className="text-[11px] text-muted-foreground font-body">{f.label}</p>
                          <p className="font-display font-semibold text-foreground text-sm">{f.value}</p>
                        </div>
                      ))}
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground font-body mb-1">Service Area</p>
                      <p className="font-body text-sm text-foreground">{s.area}</p>
                    </div>

                    <div>
                      <p className="text-[11px] text-muted-foreground font-body mb-1">Pickup Locations</p>
                      {s.locations?.length ? (
                        <div className="flex flex-wrap gap-1">
                          {s.locations.map((l: string) => <Badge key={l} variant="secondary" className="text-[10px]">{l}</Badge>)}
                        </div>
                      ) : <p className="text-sm text-muted-foreground font-body">Not assigned</p>}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="outline" className="text-xs" onClick={() => setLocStaff({ id: s.id, name: s.name })}>
                        <MapPin className="h-3.5 w-3.5 mr-1" /> Manage Locations
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs text-destructive" onClick={() => removeDelivery(s.id)}>
                        <XCircle className="h-4 w-4 mr-1" /> Remove Staff
                      </Button>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </CardContent>
      </Card>


      <DeliveryLocationsDialog
        staffId={locStaff?.id || null}
        staffName={locStaff?.name}
        onOpenChange={(open) => { if (!open) setLocStaff(null); }}
        onSaved={fetchData}
      />
    </div>

  );
};

export default AdminDelivery;
