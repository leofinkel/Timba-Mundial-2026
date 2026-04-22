export interface NewsPost {
  id: string;
  title: string;
  body: string;
  imagePath: string | null;
  authorId: string;
  authorName: string;
  isVisible: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewsPostInput {
  title: string;
  body: string;
}
