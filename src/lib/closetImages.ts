import { useEffect, useState } from "react";
import type { ActiveUserScope } from "@/lib/sessionMode";
import { supabase } from "@/lib/supabase";
import type { Item } from "@/types";
import { getScopeKey } from "@/lib/dataScope";

export const CLOSET_BUCKET = "closet";
export const DEMO_IMAGE_PREFIX = "demo/";
const SIGNED_IMAGE_TTL_SECONDS = 60 * 60;
const SIGNED_IMAGE_REFRESH_MS = (SIGNED_IMAGE_TTL_SECONDS - 5 * 60) * 1000;

type ImageSource = Pick<Item, "image_url" | "image_storage_path" | "image_bucket" | "is_demo">;

export function getClosetObjectPath(imageValue?: string | null) {
    const value = (imageValue || "").trim();
    if (!value || value.startsWith("blob:") || value.startsWith("data:")) return null;

    if (!/^https?:\/\//i.test(value)) {
        return value.replace(/^closet\//, "").replace(/^\/+/, "") || null;
    }

    try {
        const url = new URL(value);
        const publicMarker = `/object/public/${CLOSET_BUCKET}/`;
        const signedMarker = `/object/sign/${CLOSET_BUCKET}/`;
        const marker = url.pathname.includes(publicMarker) ? publicMarker : signedMarker;
        const markerIndex = url.pathname.indexOf(marker);
        if (markerIndex === -1) return null;
        return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
    } catch {
        return null;
    }
}

export function getPreferredImageValue(item: ImageSource) {
    return item.image_storage_path || item.image_url;
}

export function isDemoImagePath(path: string | null) {
    return Boolean(path?.startsWith(DEMO_IMAGE_PREFIX));
}

export async function getDisplayImageUrl(item: ImageSource, scope: ActiveUserScope) {
    const imageValue = getPreferredImageValue(item);
    const path = getClosetObjectPath(imageValue);

    if (!path) {
        return { url: imageValue || "", refreshes: false, error: null };
    }

    const canReadDemoImage = isDemoImagePath(path);
    const canReadLegacyDemoImage = Boolean(item.is_demo);
    const canReadPersonalImage = scope.canWritePersonalData;
    if (!canReadDemoImage && !canReadLegacyDemoImage && !canReadPersonalImage) {
        return { url: "", refreshes: false, error: "This image is not available in the current closet scope." };
    }

    if (canReadLegacyDemoImage && !canReadDemoImage) {
        return {
            url: supabase.storage.from(CLOSET_BUCKET).getPublicUrl(path).data.publicUrl,
            refreshes: false,
            error: null
        };
    }

    const { data, error } = await supabase.storage
        .from(CLOSET_BUCKET)
        .createSignedUrl(path, SIGNED_IMAGE_TTL_SECONDS);

    if (error) throw error;
    return { url: data.signedUrl, refreshes: true, error: null };
}

export function useClosetImageUrl(item: ImageSource | null, scope: ActiveUserScope) {
    const [imageUrl, setImageUrl] = useState("");
    const [imageError, setImageError] = useState<string | null>(null);
    const scopeKey = getScopeKey(scope);
    const imageValue = item ? getPreferredImageValue(item) : "";

    useEffect(() => {
        let cancelled = false;
        let refreshTimer: ReturnType<typeof setTimeout> | null = null;

        if (!item || !imageValue) {
            queueMicrotask(() => {
                if (!cancelled) setImageUrl("");
                if (!cancelled) setImageError("Missing image URL.");
            });
            return;
        }

        const activeItem = item;
        const loadImage = () => {
            getDisplayImageUrl(activeItem, scope)
                .then(result => {
                    if (cancelled) return;
                    setImageUrl(result.url);
                    setImageError(result.error);
                    if (result.refreshes) {
                        refreshTimer = setTimeout(loadImage, SIGNED_IMAGE_REFRESH_MS);
                    }
                })
                .catch(err => {
                    if (!cancelled) {
                        console.error("Unable to load closet image:", err);
                        setImageUrl("");
                        setImageError(err instanceof Error ? err.message : "Unable to load image.");
                    }
                });
        };

        loadImage();

        return () => {
            cancelled = true;
            if (refreshTimer) clearTimeout(refreshTimer);
        };
    }, [imageValue, item?.is_demo, scopeKey]);

    return { imageUrl, imageError, setImageError };
}
