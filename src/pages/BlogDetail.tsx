import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, ArrowLeft, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/integrations/supabase/types';
import { format } from 'date-fns';
// Simple markdown-like rendering (basic support)
const renderContent = (content: string) => {
  // Split by double newlines for paragraphs
  const paragraphs = content.split(/\n\n+/);
  return paragraphs.map((para, idx) => {
    // Handle headers
    if (para.startsWith('# ')) {
      return <h1 key={idx} className="text-3xl font-bold mb-4 mt-6">{para.substring(2)}</h1>;
    }
    if (para.startsWith('## ')) {
      return <h2 key={idx} className="text-2xl font-bold mb-3 mt-5">{para.substring(3)}</h2>;
    }
    if (para.startsWith('### ')) {
      return <h3 key={idx} className="text-xl font-bold mb-2 mt-4">{para.substring(4)}</h3>;
    }
    // Handle bold and italic
    let html = para
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code class="bg-muted px-1 py-0.5 rounded">$1</code>');
    // Handle links
    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-primary hover:underline">$1</a>');
    // Handle line breaks
    html = html.replace(/\n/g, '<br />');
    return <p key={idx} className="mb-4" dangerouslySetInnerHTML={{ __html: html }} />;
  });
};

type Blog = Tables<'blogs'>;

export default function BlogDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [blog, setBlog] = useState<Blog | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (slug) {
      fetchBlog(slug);
    }
  }, [slug]);

  const fetchBlog = async (blogSlug: string) => {
    try {
      const { data, error } = await supabase
        .from('blogs')
        .select('*')
        .eq('slug', blogSlug)
        .eq('status', 'published')
        .single();

      if (error) throw error;

      if (!data) {
        setError('Blog not found');
        return;
      }

      setBlog(data);

      // Increment view count
      await supabase.rpc('increment_blog_views', { blog_id: data.id }).catch(console.error);
    } catch (err: any) {
      console.error('Error fetching blog:', err);
      setError(err.message || 'Failed to load blog');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-serif text-2xl mb-4">Blog not found</h1>
          <Link to="/blogs" className="text-primary hover:underline">
            Return to blogs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <section className="border-b border-border/50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Link
            to="/blogs"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Blogs
          </Link>

          <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {blog.published_at
                ? format(new Date(blog.published_at), 'MMMM dd, yyyy')
                : 'Not published'}
            </div>
            {blog.author_name && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  {blog.author_name}
                </div>
              </>
            )}
            {blog.view_count && blog.view_count > 0 && (
              <>
                <span>•</span>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  {blog.view_count} views
                </div>
              </>
            )}
          </div>

          <h1 className="font-display text-4xl md:text-5xl font-bold mb-4">{blog.title}</h1>
          {blog.excerpt && (
            <p className="text-xl text-muted-foreground mb-6">{blog.excerpt}</p>
          )}

          {blog.tags && blog.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {blog.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Featured Image */}
      {blog.featured_image_url && (
        <section className="py-8">
          <div className="max-w-4xl mx-auto px-4">
            <img
              src={blog.featured_image_url}
              alt={blog.title}
              className="w-full h-auto rounded-lg"
            />
          </div>
        </section>
      )}

      {/* Content */}
      <section className="py-8">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="pt-6">
              <div className="prose prose-lg max-w-none">
                {renderContent(blog.content)}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  );
}
