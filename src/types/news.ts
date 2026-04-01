export interface NewsPost {
  id: string;
  title: string;
  body: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt: string;
}

export interface NewsPostInput {
  title: string;
  body: string;
}
