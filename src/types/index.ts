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
    image_storage_path?: string | null
    image_bucket?: string | null
    is_demo?: boolean | null
    user_id?: string | null
    description: string
}
