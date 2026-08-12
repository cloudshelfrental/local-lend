import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, Settings, Percent, Cloud } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { clearStorageConfigCache } from "@/lib/imageUpload";

interface StorageForm {
  id: string | null;
  provider: string;
  cloudinary_cloud_name: string;
  cloudinary_upload_preset: string;
  folder: string;
  fallback_to_supabase: boolean;
}

const SASettings = () => {
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingStorage, setSavingStorage] = useState(false);
  const [storage, setStorage] = useState<StorageForm>({
    id: null,
    provider: "supabase",
    cloudinary_cloud_name: "",
    cloudinary_upload_preset: "",
    folder: "",
    fallback_to_supabase: true,
  });
  const [totals, setTotals] = useState({ orders: 0, items: 0, categories: 0 });
  const { toast } = useToast();

  useEffect(() => {
    const fetchConfig = async () => {
      const [{ data }, ordersRes, itemsRes, catsRes, storageRes] = await Promise.all([
        supabase.from("delivery_config").select("id, fixed_charge").limit(1).maybeSingle(),
        supabase.from("orders").select("id", { count: "exact", head: true }),
        supabase.from("items").select("id", { count: "exact", head: true }),
        supabase.from("categories").select("id", { count: "exact", head: true }),
        supabase.from("storage_config").select("*").limit(1).maybeSingle(),
      ]);
      if (data) setDeliveryCharge(data.fixed_charge.toString());
      if (storageRes.data) {
        const s = storageRes.data as any;
        setStorage({
          id: s.id,
          provider: s.provider || "supabase",
          cloudinary_cloud_name: s.cloudinary_cloud_name || "",
          cloudinary_upload_preset: s.cloudinary_upload_preset || "",
          folder: s.folder || "",
          fallback_to_supabase: s.fallback_to_supabase ?? true,
        });
      }
      setTotals({ orders: ordersRes.count || 0, items: itemsRes.count || 0, categories: catsRes.count || 0 });
      setLoading(false);
    };
    fetchConfig();
  }, []);

  const saveStorage = async () => {
    if (storage.provider === "cloudinary" && (!storage.cloudinary_cloud_name.trim() || !storage.cloudinary_upload_preset.trim())) {
      toast({ title: "Cloud name and unsigned upload preset are required", variant: "destructive" });
      return;
    }
    setSavingStorage(true);
    const payload = {
      provider: storage.provider,
      cloudinary_cloud_name: storage.cloudinary_cloud_name.trim() || null,
      cloudinary_upload_preset: storage.cloudinary_upload_preset.trim() || null,
      folder: storage.folder.trim() || null,
      fallback_to_supabase: storage.fallback_to_supabase,
    };
    let error;
    if (storage.id) {
      ({ error } = await supabase.from("storage_config").update(payload).eq("id", storage.id));
    } else {
      const res = await supabase.from("storage_config").insert(payload).select("id").maybeSingle();
      error = res.error;
      if (res.data) setStorage(s => ({ ...s, id: (res.data as any).id }));
    }
    setSavingStorage(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      clearStorageConfigCache();
      toast({ title: "Saved", description: "Image storage settings updated." });
    }
  };

  const saveCharge = async () => {
    setSaving(true);
    // Upsert delivery config
    const { data: existing } = await supabase.from("delivery_config").select("id").limit(1).maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase.from("delivery_config").update({ fixed_charge: parseFloat(deliveryCharge), updated_at: new Date().toISOString() }).eq("id", existing.id));
    } else {
      ({ error } = await supabase.from("delivery_config").insert({ fixed_charge: parseFloat(deliveryCharge) }));
    }
    if (error) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Saved", description: "Delivery charge updated." }); }
    setSaving(false);
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="max-w-lg space-y-4">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Orders", value: totals.orders },
          { label: "Items", value: totals.items },
          { label: "Categories", value: totals.categories },
        ].map(t => (
          <Card key={t.label} className="shadow-card">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground font-body">{t.label}</p>
              <p className="text-xl font-display font-bold text-foreground">{t.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2"><Settings className="h-5 w-5 text-primary" /> Platform Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Fixed Delivery Charge (₹)</Label>
            <Input type="number" value={deliveryCharge} onChange={e => setDeliveryCharge(e.target.value)} placeholder="e.g. 50" />
            <p className="text-xs text-muted-foreground">This charge is added to every order.</p>
          </div>
          <Button onClick={saveCharge} disabled={saving} className="w-full">
            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Settings
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link to="/superadmin/commission"><Percent className="h-4 w-4 mr-2" /> Manage categories & commission</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="font-display text-lg flex items-center gap-2"><Cloud className="h-5 w-5 text-primary" /> Image Storage</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Primary storage provider</Label>
            <Select value={storage.provider} onValueChange={v => setStorage(s => ({ ...s, provider: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="cloudinary">Cloudinary (external)</SelectItem>
                <SelectItem value="supabase">Built-in database storage</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Every image upload across the app (vendor items, admin items, categories) uses this provider first.</p>
          </div>

          {storage.provider === "cloudinary" && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <div className="space-y-2">
                <Label>Cloud name</Label>
                <Input value={storage.cloudinary_cloud_name} onChange={e => setStorage(s => ({ ...s, cloudinary_cloud_name: e.target.value }))} placeholder="e.g. dxyz1234" />
              </div>
              <div className="space-y-2">
                <Label>Unsigned upload preset</Label>
                <Input value={storage.cloudinary_upload_preset} onChange={e => setStorage(s => ({ ...s, cloudinary_upload_preset: e.target.value }))} placeholder="e.g. cloudshelf_unsigned" />
                <p className="text-xs text-muted-foreground">Create it in Cloudinary → Settings → Upload → Upload presets (signing mode: Unsigned).</p>
              </div>
              <div className="space-y-2">
                <Label>Folder (optional)</Label>
                <Input value={storage.folder} onChange={e => setStorage(s => ({ ...s, folder: e.target.value }))} placeholder="cloud-shelf" />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div className="pr-3">
              <p className="text-sm font-body font-medium text-foreground">Use database storage as backup</p>
              <p className="text-xs text-muted-foreground">If the external upload fails, the image is saved to the built-in storage instead.</p>
            </div>
            <Switch checked={storage.fallback_to_supabase} onCheckedChange={v => setStorage(s => ({ ...s, fallback_to_supabase: v }))} />
          </div>

          <Button onClick={saveStorage} disabled={savingStorage} className="w-full">
            {savingStorage ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Save Storage Settings
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SASettings;
