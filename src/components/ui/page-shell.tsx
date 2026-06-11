import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

export function PageShell({
    children,
    className,
    size = "default"
}: {
    children: ReactNode
    className?: string
    size?: "default" | "wide" | "narrow"
}) {
    const maxWidth = {
        narrow: "max-w-3xl",
        default: "max-w-6xl",
        wide: "max-w-7xl"
    }[size]

    return (
        <div className={cn("mx-auto w-full px-6 py-10 md:px-10 md:py-12", maxWidth, className)}>
            {children}
        </div>
    )
}

export function PageHeader({
    eyebrow,
    title,
    description,
    children,
    centered = false
}: {
    eyebrow?: string
    title: string
    description?: string
    children?: ReactNode
    centered?: boolean
}) {
    return (
        <div className={cn("mb-8 space-y-3", centered && "mx-auto max-w-3xl text-center")}>
            {eyebrow && <p className="fashion-eyebrow">{eyebrow}</p>}
            <h1 className="text-4xl font-semibold tracking-tight text-white md:text-5xl">{title}</h1>
            {description && <p className="max-w-3xl text-sm leading-6 text-muted-foreground md:text-base">{description}</p>}
            {children}
        </div>
    )
}

export function AppPanel({
    children,
    className
}: {
    children: ReactNode
    className?: string
}) {
    return (
        <section className={cn("rounded-lg border border-white/10 bg-white/[0.035] shadow-[0_18px_70px_rgba(0,0,0,0.24)] backdrop-blur-sm", className)}>
            {children}
        </section>
    )
}

export function EmptyState({
    icon,
    title,
    description,
    children,
    className
}: {
    icon?: ReactNode
    title: string
    description?: string
    children?: ReactNode
    className?: string
}) {
    return (
        <div className={cn("flex min-h-64 flex-col items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center", className)}>
            {icon && <div className="mb-4 text-primary">{icon}</div>}
            <p className="text-lg font-medium text-white">{title}</p>
            {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
            {children && <div className="mt-5">{children}</div>}
        </div>
    )
}
