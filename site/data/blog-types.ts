export type BlogSection = {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  /** ISO 8601 */
  publishedTime: string;
  modifiedTime?: string;
  author: string;
  tags: string[];
  /** لینک‌های ویدئوی مرتبط (آپارات و غیره) */
  relatedMedia?: { label: string; href: string }[];
  sections: BlogSection[];
};
