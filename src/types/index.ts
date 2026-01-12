export type Item = {
    id: string
    created_at: string
    name: string
    category: string
    color: string
    style: string // Deprecated
    styles?: string[]
    weather?: string[]
    tags: string[]
    image_url: string
    description: string
}
