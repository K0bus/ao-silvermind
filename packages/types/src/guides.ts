export interface GuideCategory {
  id: string
  slug: string
  name: string
  description?: string | null
  sortOrder: number
  _count?: {
    guides: number
  }
  createdAt: string
  updatedAt: string
}

export interface Guide {
  id: string
  slug: string
  title: string
  content: string
  summary?: string | null
  published: boolean
  categoryId: string
  category?: GuideCategory
  authorId?: string | null
  author?: {
    id: string
    username: string
  } | null
  createdAt: string
  updatedAt: string
}
