// "Seguí leyendo" — related articles rail (classic card variant).

import { BlogCard } from "./BlogCard";
import type { BlogCardVM } from "@/lib/blog/view";

export function RelatedPosts({ posts }: { posts: BlogCardVM[] }) {
  if (posts.length === 0) return null;
  return (
    <div className="grid grid-cols-1 gap-[22px] sm:grid-cols-2 lg:grid-cols-3">
      {posts.map((post) => (
        <BlogCard key={post.id} post={post} variant="classic" />
      ))}
    </div>
  );
}
