"use client"

import { ImageOff } from "lucide-react";
import type { ImgHTMLAttributes } from "react";
import type { Item } from "@/types";
import { useSessionMode } from "@/lib/sessionMode";
import { useClosetImageUrl } from "@/lib/closetImages";

type ClosetImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
    item: Pick<Item, "image_url" | "image_storage_path" | "image_bucket" | "is_demo">;
}

export function ClosetImage({ item, alt, ...props }: ClosetImageProps) {
    const scope = useSessionMode();
    const { imageUrl, imageError, setImageError } = useClosetImageUrl(item, scope);

    if (!imageUrl || imageError) {
        return (
            <div
                aria-label={typeof alt === "string" ? alt : undefined}
                className={`${props.className || ""} flex flex-col items-center justify-center gap-2 rounded-md border border-white/10 bg-zinc-950/80 p-4 text-center text-xs text-zinc-500`}
                role="img"
                title={imageError || "Image unavailable"}
            >
                <ImageOff className="h-6 w-6 text-zinc-600" />
                <span>Image unavailable</span>
            </div>
        );
    }

    return <img {...props} src={imageUrl} alt={alt} onError={() => setImageError("Image request failed.")} />;
}
