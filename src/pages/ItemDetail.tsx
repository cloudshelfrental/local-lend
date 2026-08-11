import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2, ChevronLeft, ChevronRight, Play, CalendarIcon } from "lucide-react";
import { format, differenceInCalendarDays, startOfDay } from "date-fns";
import type { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const getYouTubeId = (url?: string | null) => {
  if (!url) return null;
  const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([\w-]{11})/);
  return match ? match[1] : null;
};


const ItemDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [item, setItem] = useState<any>(null);
  const [vendorName, setVendorName] = useState("—");
  const [deliveryCharge, setDeliveryCharge] = useState(50);
  const [loading, setLoading] = useState(true);
  const [currentImage, setCurrentImage] = useState(0);
  const [paused, setPaused] = useState(false);

  // Order dialog state
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [orderLoading, setOrderLoading] = useState(false);
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [panchayaths, setPanchayaths] = useState<any[]>([]);
  const [wards, setWards] = useState<any[]>([]);
  const [selectedPanchayath, setSelectedPanchayath] = useState("");
  const [selectedWard, setSelectedWard] = useState("");
  const [dateRange, setDateRange] = useState<DateRange | undefined>();

  const rentalDays =
    dateRange?.from && dateRange?.to
      ? differenceInCalendarDays(dateRange.to, dateRange.from) + 1
      : dateRange?.from
        ? 1
        : 0;

  useEffect(() => {
    const fetchItem = async () => {
      const [itemRes, delRes] = await Promise.all([
        supabase
          .from("items")
          .select("id, name, description, owner_price, status, image_urls, video_url, owner_id, category_id, payment_type, categories(name, commission_rate)")
          .eq("id", id!)
          .single(),
        supabase.from("delivery_config").select("fixed_charge").limit(1).maybeSingle(),
      ]);

      if (itemRes.data) {
        setItem(itemRes.data);
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", itemRes.data.owner_id)
          .maybeSingle();
        if (profile) setVendorName(profile.full_name);
      }
      if (delRes.data) setDeliveryCharge(Number(delRes.data.fixed_charge));
      setLoading(false);
    };
    fetchItem();
  }, [id]);

  // Auto-advancing carousel
  useEffect(() => {
    if (!item || paused) return;
    const count = (item.image_urls?.length || 0) + (getYouTubeId(item.video_url) ? 1 : 0);
    if (count < 2) return;
    const timer = setInterval(() => setCurrentImage((prev) => (prev + 1) % count), 3500);
    return () => clearInterval(timer);
  }, [item, paused]);


  const handleRentNow = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({ title: "Login required", description: "Please log in to rent this item.", variant: "destructive" });
      navigate("/login");
      return;
    }

    // Load panchayaths for ward selection
    const { data: pData } = await supabase.from("panchayaths").select("id, name").order("name");
    if (pData) setPanchayaths(pData);

    // Auto-fill saved address from profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("delivery_address, panchayath_id, ward_id")
      .eq("id", session.user.id)
      .single();

    if (profile) {
      if (profile.delivery_address) setDeliveryAddress(profile.delivery_address);
      if (profile.panchayath_id) {
        setSelectedPanchayath(profile.panchayath_id);
        // Load wards for saved panchayath
        const { data: wData } = await supabase
          .from("wards")
          .select("id, ward_number")
          .eq("panchayath_id", profile.panchayath_id)
          .order("ward_number");
        if (wData) setWards(wData);
        if (profile.ward_id) setSelectedWard(profile.ward_id);
      }
    }

    setShowOrderDialog(true);
  };

  const handlePanchayathChange = async (pId: string) => {
    setSelectedPanchayath(pId);
    setSelectedWard("");
    const { data } = await supabase.from("wards").select("id, ward_number").eq("panchayath_id", pId).order("ward_number");
    if (data) setWards(data);
  };

  const handlePlaceOrder = async () => {
    if (!dateRange?.from) {
      toast({ title: "Dates required", description: "Please pick your rental dates.", variant: "destructive" });
      return;
    }
    if (!deliveryAddress.trim()) {
      toast({ title: "Address required", description: "Please enter your delivery address.", variant: "destructive" });
      return;
    }
    if (!selectedWard) {
      toast({ title: "Ward required", description: "Please select your panchayath and ward.", variant: "destructive" });
      return;
    }

    setOrderLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const commissionRate = (item.categories as any)?.commission_rate || 0;
      const days = Math.max(rentalDays, 1);
      const ownerPrice = Number(item.owner_price) * days;
      const commissionAmount = ownerPrice * commissionRate / 100;
      const paymentMethod = item.payment_type || "cash_on_delivery";
      const totalAmount = ownerPrice + deliveryCharge;
      const orderNumber = `ORD-${Date.now()}`;

      // Save address to profile for future orders
      await supabase
        .from("profiles")
        .update({
          delivery_address: deliveryAddress,
          panchayath_id: selectedPanchayath,
          ward_id: selectedWard,
        })
        .eq("id", session.user.id);

      const { error } = await supabase.from("orders").insert({
        order_number: orderNumber,
        customer_id: session.user.id,
        item_id: item.id,
        owner_id: item.owner_id,
        owner_price: ownerPrice,
        delivery_charge: deliveryCharge,
        commission_amount: commissionAmount,
        total_amount: totalAmount,
        delivery_address: deliveryAddress,
        ward_id: selectedWard,
        payment_method: paymentMethod,
        start_date: format(dateRange.from, "yyyy-MM-dd"),
        end_date: format(dateRange.to ?? dateRange.from, "yyyy-MM-dd"),
        rental_days: days,
      });

      if (error) throw error;

      toast({ title: "Order placed!", description: `Order ${orderNumber} has been placed successfully.` });
      setShowOrderDialog(false);
      navigate("/customer");
    } catch (err: any) {
      toast({ title: "Order failed", description: err.message, variant: "destructive" });
    } finally {
      setOrderLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex justify-center items-center pt-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container pt-24 text-center">
          <p className="text-muted-foreground font-body text-lg">Item not found</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/browse")}>Back to Browse</Button>
        </div>
      </div>
    );
  }

  const images: string[] = item.image_urls || [];
  const videoId = getYouTubeId(item.video_url);
  const slides: { type: "image" | "video"; src: string }[] = [
    ...images.map((src) => ({ type: "image" as const, src })),
    ...(videoId ? [{ type: "video" as const, src: videoId }] : []),
  ];
  const total = Number(item.owner_price) + deliveryCharge;


  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main className="pt-20 pb-12">
        <div className="container max-w-4xl">
          <button
            onClick={() => navigate("/browse")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground font-body mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Browse
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Media carousel */}
            <div className="space-y-3">
              <div
                className="aspect-square bg-muted rounded-xl overflow-hidden relative group"
                onMouseEnter={() => setPaused(true)}
                onMouseLeave={() => setPaused(false)}
              >
                {slides.length === 0 ? (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground text-sm font-body">No image</div>
                ) : (
                  slides.map((slide, idx) => (
                    <div
                      key={idx}
                      className={`absolute inset-0 transition-opacity duration-700 ${idx === currentImage % slides.length ? "opacity-100" : "opacity-0 pointer-events-none"}`}
                    >
                      {slide.type === "image" ? (
                        <img src={slide.src} alt={`${item.name} photo ${idx + 1}`} className="w-full h-full object-cover" />
                      ) : (
                        <iframe
                          src={`https://www.youtube.com/embed/${slide.src}`}
                          title={`${item.name} video`}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="w-full h-full"
                        />
                      )}
                    </div>
                  ))
                )}

                {slides.length > 1 && (
                  <>
                    <button
                      aria-label="Previous"
                      onClick={() => setCurrentImage((prev) => (prev - 1 + slides.length) % slides.length)}
                      className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-card transition-colors"
                    >
                      <ChevronLeft className="h-5 w-5 text-foreground" />
                    </button>
                    <button
                      aria-label="Next"
                      onClick={() => setCurrentImage((prev) => (prev + 1) % slides.length)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-card/80 backdrop-blur-sm rounded-full p-1.5 hover:bg-card transition-colors"
                    >
                      <ChevronRight className="h-5 w-5 text-foreground" />
                    </button>
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                      {slides.map((_, idx) => (
                        <span
                          key={idx}
                          className={`h-1.5 rounded-full transition-all ${idx === currentImage % slides.length ? "w-4 bg-primary" : "w-1.5 bg-card/70"}`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {slides.length > 1 && (
                <div className="flex gap-2 overflow-x-auto">
                  {slides.map((slide, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentImage(idx)}
                      className={`w-16 h-16 rounded-lg overflow-hidden border-2 flex-shrink-0 transition-colors relative ${idx === currentImage % slides.length ? "border-primary" : "border-transparent"}`}
                    >
                      {slide.type === "image" ? (
                        <img src={slide.src} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <img src={`https://img.youtube.com/vi/${slide.src}/mqdefault.jpg`} alt="" className="w-full h-full object-cover" />
                          <span className="absolute inset-0 grid place-items-center bg-foreground/30">
                            <Play className="h-5 w-5 text-primary-foreground" />
                          </span>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Item Details */}
            <div className="space-y-5">
              <div>
                <Badge variant="outline" className="mb-2 text-xs">
                  {(item.categories as any)?.name || "—"}
                </Badge>
                <h1 className="text-2xl font-display font-bold text-foreground">{item.name}</h1>
                <p className="text-sm text-muted-foreground font-body mt-1">by {vendorName}</p>
              </div>

              {item.description && (
                <div>
                  <h3 className="text-sm font-display font-semibold text-foreground mb-1">Description</h3>
                  <p className="text-sm text-muted-foreground font-body">{item.description}</p>
                </div>
              )}

              {/* Pricing */}
              <div className="bg-muted/50 rounded-xl p-4 space-y-2">
                <h3 className="text-sm font-display font-semibold text-foreground mb-2">Pricing</h3>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Rental Price / day</span>
                  <span className="text-foreground font-medium">₹{Number(item.owner_price).toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between text-sm font-body">
                  <span className="text-muted-foreground">Delivery Charge</span>
                  <span className="text-foreground font-medium">₹{deliveryCharge}</span>
                </div>
                <div className="flex justify-between text-sm font-body border-t border-border pt-2 mt-2">
                  <span className="font-semibold text-foreground">Total</span>
                  <span className="font-bold text-primary text-lg">₹{total.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <Button size="lg" className="w-full font-display" onClick={handleRentNow}>
                Rent Now
              </Button>
            </div>
          </div>
        </div>
      </main>
      <Footer />

      {/* Order Dialog */}
      <Dialog open={showOrderDialog} onOpenChange={setShowOrderDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Place Order</DialogTitle>
            <DialogDescription>Fill in your delivery details to rent "{item?.name}"</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label className="font-body">Rental Dates</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn("w-full mt-1 justify-start text-left font-normal", !dateRange?.from && "text-muted-foreground")}
                  >
                    <CalendarIcon className="h-4 w-4 mr-2" />
                    {dateRange?.from
                      ? dateRange.to
                        ? `${format(dateRange.from, "dd MMM")} – ${format(dateRange.to, "dd MMM yyyy")}`
                        : format(dateRange.from, "dd MMM yyyy")
                      : "Pick rental dates"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={setDateRange}
                    numberOfMonths={1}
                    disabled={{ before: startOfDay(new Date()) }}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              {rentalDays > 0 && (
                <p className="text-xs text-muted-foreground font-body mt-1">
                  {rentalDays} {rentalDays === 1 ? "day" : "days"} selected
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="address" className="font-body">Delivery Address</Label>
              <Input
                id="address"
                placeholder="Enter your full delivery address"
                value={deliveryAddress}
                onChange={(e) => setDeliveryAddress(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label className="font-body">Panchayath</Label>
              <Select value={selectedPanchayath} onValueChange={handlePanchayathChange}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select panchayath" />
                </SelectTrigger>
                <SelectContent>
                  {panchayaths.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {wards.length > 0 && (
              <div>
                <Label className="font-body">Ward</Label>
                <Select value={selectedWard} onValueChange={setSelectedWard}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select ward" />
                  </SelectTrigger>
                  <SelectContent>
                    {wards.map((w) => (
                      <SelectItem key={w.id} value={w.id}>Ward {w.ward_number}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm font-body">
              <div className="flex justify-between mb-1"><span className="text-muted-foreground">Payment</span><span className="font-medium text-foreground">{item?.payment_type === "prepaid" ? "Prepaid" : "Cash on Delivery"}</span></div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm font-body">
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">
                  Rental (₹{Number(item?.owner_price || 0).toLocaleString("en-IN")} × {Math.max(rentalDays, 1)} {Math.max(rentalDays, 1) === 1 ? "day" : "days"})
                </span>
                <span className="text-foreground font-medium">₹{(Number(item?.owner_price || 0) * Math.max(rentalDays, 1)).toLocaleString("en-IN")}</span>
              </div>
              <div className="flex justify-between mb-1">
                <span className="text-muted-foreground">Delivery</span>
                <span className="text-foreground font-medium">₹{deliveryCharge}</span>
              </div>
              <div className="flex justify-between border-t border-border pt-1.5 mt-1.5">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold text-primary">₹{(Number(item?.owner_price || 0) * Math.max(rentalDays, 1) + deliveryCharge).toLocaleString("en-IN")}</span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowOrderDialog(false)}>Cancel</Button>
            <Button onClick={handlePlaceOrder} disabled={orderLoading}>
              {orderLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Place Order
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ItemDetail;
