import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';
import type { Tables } from '@/integrations/supabase/types';

// Messages sent from the storefront's /contact form (table contact_messages).
// Only admins can read them (RLS); status is the one field that can be edited here.

type ContactMessage = Tables<'contact_messages'>;

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'handled', label: 'Handled' },
];

export default function EnquiriesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchMessages = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('contact_messages')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching enquiries:', error);
      toast.error('Failed to load enquiries');
    } else {
      setMessages(data || []);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchMessages();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const previous = messages;
    setMessages((list) => list.map((m) => (m.id === id ? { ...m, status } : m)));
    const { error } = await supabase.from('contact_messages').update({ status }).eq('id', id);
    if (error) {
      console.error('Error updating enquiry status:', error);
      setMessages(previous);
      toast.error('Could not update the status');
    } else {
      toast.success('Status updated');
    }
  };

  const newCount = messages.filter((m) => m.status === 'new').length;

  return (
    <SuperAdminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Enquiries</h1>
            <p className="text-muted-foreground">Messages sent from the Contact page</p>
          </div>
          <Button variant="outline" onClick={fetchMessages} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>All Enquiries</CardTitle>
            <CardDescription>
              {messages.length} {messages.length === 1 ? 'enquiry' : 'enquiries'}, {newCount} new · newest first
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : messages.length === 0 ? (
              <p className="text-center py-8 text-muted-foreground">No enquiries yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-40">Received</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>Subject &amp; message</TableHead>
                    <TableHead className="w-44">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {messages.map((m) => {
                    const isOpen = expanded === m.id;
                    return (
                      <TableRow key={m.id} className="align-top">
                        <TableCell className="whitespace-nowrap text-muted-foreground">
                          {format(new Date(m.created_at), 'd MMM yyyy, HH:mm')}
                          {m.status === 'new' && <Badge className="ml-2">New</Badge>}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{m.name}</div>
                          <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-primary hover:underline text-sm break-all">
                            {m.email}
                          </a>
                        </TableCell>
                        <TableCell className="max-w-xl">
                          <div className="font-medium">{m.subject}</div>
                          <p className={`text-sm text-muted-foreground whitespace-pre-wrap ${isOpen ? '' : 'line-clamp-2'}`}>
                            {m.message}
                          </p>
                          {m.message.length > 140 && (
                            <button
                              type="button"
                              className="text-xs text-primary hover:underline mt-1"
                              onClick={() => setExpanded(isOpen ? null : m.id)}
                              aria-expanded={isOpen}
                            >
                              {isOpen ? 'Show less' : 'Show full message'}
                            </button>
                          )}
                        </TableCell>
                        <TableCell>
                          <Select value={m.status} onValueChange={(value) => updateStatus(m.id, value)}>
                            <SelectTrigger aria-label={`Status of the enquiry from ${m.name}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUSES.map((s) => (
                                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SuperAdminOnly>
  );
}
