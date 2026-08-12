import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

interface Props {
  label: string;
  value: string;
  onChange: (url: string) => void;
}

const ImageUploadField = ({ label, value, onChange }: Props) => {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "Please select an image file", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Image must be under 5MB", variant: "destructive" });
      return;
    }
    setUploading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${session?.user.id || "anon"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error } = await supabase.storage.from("item-images").upload(path, file, { upsert: false });
    if (error) {
      setUploading(false);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
      return;
    }
    const { data: signed } = await supabase.storage.from("item-images").createSignedUrl(path, TEN_YEARS);
    setUploading(false);
    if (signed?.signedUrl) {
      onChange(signed.signedUrl);
      toast({ title: "Image uploaded" });
    } else {
      toast({ title: "Could not generate image link", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      {value ? (
        <div className="relative w-full h-32 rounded-lg overflow-hidden border border-border">
          <img src={value} alt={label} className="w-full h-full object-cover" />
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute top-1 right-1 h-7 w-7"
            onClick={() => onChange("")}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-full h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center gap-1 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Upload className="h-5 w-5" />}
          <span className="text-xs font-body">{uploading ? "Uploading..." : "Upload image"}</span>
        </button>
      )}
      <Input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={e => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageUploadField;