import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Eye, Filter, Loader2, CheckCircle, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const statusColors: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  confirmed: "bg-blue-100 text-blue-800",
  delivery_booked: "bg-violet-100 text-violet-800",
  picked_up: "bg-cyan-100 text-cyan-800",
  in_transit: "bg-indigo-100 text-indigo-800",
  delivered: "bg-emerald-100 text-emerald-800",
  return_pending: "bg-orange-100 text-orange-800",
  returned: "bg-gray-100 text-gray-800",
  cancelled: "bg-red-100 text-red-800",
};

const statusLabel = (s: string) => {
  const map: Record<string, string> = {
    pending: "Pending", confirmed: "Confirmed", delivery_booked: "Delivery Booked",
    picked_up: "Picked Up", in_transit: "In Transit",
    delivered: "Delivered", return_pending: "Return Pending", returned: "Returned", cancelled: "Cancelled",
  };
  return map[s] || s;
};


const allStatuses = ["pending", "confirmed", "delivery_booked", "picked_up", "in_transit", "delivered", "return_pending", "returned", "cancelled"] as const;

const AdminOrders = () => {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [staff, setStaff] = useState<any[]>([]);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from("orders")
      .select("id, order_number, status, total_amount, payment_method, delivery_charge, commission_amount, owner_price, delivery_address, created_at, customer_id, owner_id, delivery_staff_id, item_id, ward_id, items(name), profiles:customer_id(full_name)")
      .order("created_at", { ascending: false });

    if (!error && data) {
      // Fetch owner + delivery staff names
      const ids = [...new Set([...data.map(o => o.owner_id), ...data.map(o => o.delivery_staff_id)].filter(Boolean))] as string[];
      let nameMap: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", ids);
        nameMap = Object.fromEntries((profiles || []).map(p => [p.id, p.full_name]));
      }
      setOrders(data.map(o => ({
        ...o,
        owner_name: nameMap[o.owner_id] || "—",
        delivery_staff_name: o.delivery_staff_id ? (nameMap[o.delivery_staff_id] || "Assigned") : null,
      })));
    }
    setLoading(false);
  };

  const fetchStaff = async () => {
    const { data: roles } = await supabase.from("user_roles").select("user_id").eq("role", "delivery");
    const ids = (roles || []).map(r => r.user_id);
    if (!ids.length) { setStaff([]); return; }
    const { data: profiles } = await supabase.from("profiles").select("id, full_name, mobile").in("id", ids);
    setStaff(profiles || []);
  };

  useEffect(() => { fetchOrders(); fetchStaff(); }, []);

  const updateOrder = async (orderId: string, patch: Record<string, any>, message: string) => {
    setUpdating(orderId);
    const { error } = await supabase.from("orders").update(patch as any).eq("id", orderId);
    setUpdating(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: message });
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, ...patch } : o));
    setSelectedOrder((prev: any) => prev && prev.id === orderId ? { ...prev, ...patch } : prev);
    fetchOrders();
  };

  const changeStatus = (orderId: string, status: string) =>
    updateOrder(orderId, { status }, `Status changed to ${statusLabel(status)}`);

  const assignStaff = (orderId: string, value: string) => {
    const staffId = value === "unassigned" ? null : value;
    const order = orders.find(o => o.id === orderId);
    const patch: Record<string, any> = { delivery_staff_id: staffId };
    if (staffId && order && ["pending", "confirmed"].includes(order.status)) patch.status = "delivery_booked";
    updateOrder(orderId, patch, staffId ? "Delivery staff assigned" : "Delivery staff removed");
  };

  const verifyPayment = async (orderId: string) => {
    const { error } = await supabase.from("orders").update({ status: "confirmed" as any }).eq("id", orderId);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Payment verified", description: "Order confirmed and available for delivery staff." });
      fetchOrders();
      if (selectedOrder?.id === orderId) setSelectedOrder(null);
    }
  };

  const filtered = orders.filter(o => {
    const matchSearch = o.order_number?.toLowerCase().includes(search.toLowerCase()) ||
      (o.profiles as any)?.full_name?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || o.status === statusFilter;
    return matchSearch && matchStatus;
  });

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search by Order ID or Customer..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filter Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="confirmed">Confirmed</SelectItem>
            <SelectItem value="delivery_booked">Delivery Booked</SelectItem>
            <SelectItem value="picked_up">Picked Up</SelectItem>
            <SelectItem value="in_transit">In Transit</SelectItem>

            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="return_pending">Return Pending</SelectItem>
            <SelectItem value="returned">Returned</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="shadow-card">
        <CardHeader><CardTitle className="font-display text-lg">Orders ({filtered.length})</CardTitle></CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Item</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead className="hidden md:table-cell">Payment</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Delivery Staff</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">No orders found</TableCell></TableRow>
              )}
              {filtered.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-display font-medium">{o.order_number}</TableCell>
                  <TableCell className="font-body">{(o.profiles as any)?.full_name || "—"}</TableCell>
                  <TableCell className="hidden md:table-cell font-body text-muted-foreground">{(o.items as any)?.name || "—"}</TableCell>
                  <TableCell className="font-display font-semibold">₹{Number(o.total_amount).toLocaleString("en-IN")}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    <Badge variant={o.payment_method === "prepaid" ? "default" : "secondary"}>
                      {o.payment_method === "prepaid" ? "Prepaid" : "COD"}
                    </Badge>
                  </TableCell>
                  <TableCell><Badge className={statusColors[o.status] || ""}>{statusLabel(o.status)}</Badge></TableCell>
                  <TableCell>
                    <Select value={o.status} onValueChange={(v) => changeStatus(o.id, v)} disabled={updating === o.id}>
                      <SelectTrigger className={`h-8 w-[150px] border-0 ${statusColors[o.status] || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {allStatuses.map(s => <SelectItem key={s} value={s}>{statusLabel(s)}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Select value={o.delivery_staff_id || "unassigned"} onValueChange={(v) => assignStaff(o.id, v)} disabled={updating === o.id}>
                      <SelectTrigger className="h-8 w-[170px]"><SelectValue placeholder="Unassigned" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unassigned">Unassigned</SelectItem>
                        {staff.map(s => <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={() => setSelectedOrder(o)}>
                        {updating === o.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Eye className="h-4 w-4 text-primary" />}
                      </Button>
                      {o.payment_method === "prepaid" && o.status === "pending" && (
                        <Button size="sm" variant="ghost" onClick={() => verifyPayment(o.id)}>
                          <CheckCircle className="h-4 w-4 text-emerald-600" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Order Detail Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          {selectedOrder && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display">{selectedOrder.order_number}</DialogTitle>
              </DialogHeader>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Status:</span>
                  <Badge className={statusColors[selectedOrder.status]}>{statusLabel(selectedOrder.status)}</Badge>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><span className="text-muted-foreground">Customer:</span><p className="font-medium text-foreground">{(selectedOrder.profiles as any)?.full_name || "—"}</p></div>
                  <div><span className="text-muted-foreground">Vendor:</span><p className="font-medium text-foreground">{selectedOrder.owner_name}</p></div>
                </div>
                <div><span className="text-muted-foreground">Item:</span><p className="font-medium text-foreground">{(selectedOrder.items as any)?.name || "—"}</p></div>
                <div><span className="text-muted-foreground">Delivery Address:</span><p className="font-medium text-foreground">{selectedOrder.delivery_address || "—"}</p></div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Payment:</span>
                    <Badge variant={selectedOrder.payment_method === "prepaid" ? "default" : "secondary"}>
                      {selectedOrder.payment_method === "prepaid" ? "Prepaid" : "COD"}
                    </Badge>
                  </div>
                </div>

                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between"><span className="text-muted-foreground text-xs">Rental Price</span><span className="font-semibold text-foreground">₹{Number(selectedOrder.owner_price).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground text-xs">Commission</span><span className="font-semibold text-accent">₹{Number(selectedOrder.commission_amount).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between"><span className="text-muted-foreground text-xs">Delivery</span><span className="font-semibold text-foreground">₹{Number(selectedOrder.delivery_charge).toLocaleString("en-IN")}</span></div>
                  <div className="flex justify-between border-t border-border pt-1"><span className="font-semibold text-foreground">Total</span><span className="font-bold text-primary">₹{Number(selectedOrder.total_amount).toLocaleString("en-IN")}</span></div>
                </div>

                <p className="text-xs text-muted-foreground">
                  Placed on {new Date(selectedOrder.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </p>

                {selectedOrder.payment_method === "prepaid" && selectedOrder.status === "pending" && (
                  <Button className="w-full" onClick={() => verifyPayment(selectedOrder.id)}>
                    <CheckCircle className="h-4 w-4 mr-1" /> Verify Payment & Confirm
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminOrders;
