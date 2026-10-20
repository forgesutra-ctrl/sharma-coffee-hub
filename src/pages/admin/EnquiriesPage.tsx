import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, RefreshCw } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import SuperAdminOnly from '@/components/admin/SuperAdminOnly';
import type { Tables } from '@/integrations/supabase/types';

// Enquiries from the storefront: the /contact form (contact_messages) and the /wholesale
// form (wholesale_inquiries). Only admins can read them (RLS); status is the one field
// that can be edited here.

type ContactMessage = Tables<'contact_messages'>;
type WholesaleInquiry = Tables<'wholesale_inquiries'>;
type EnquiryTable = 'contact_messages' | 'wholesale_inquiries';

const STATUSES = [
  { value: 'new', label: 'New' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'handled', label: 'Handled' },
];

/** wa.me wants digits with the country code; a bare 10-digit number is taken as Indian. */
function whatsappUrl(phone: string) {
  let digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  if (digits.length === 10) digits = `91${digits}`;
  return `https://wa.me/${digits}`;
}

function PhoneLink({ phone }: { phone: string | null }) {
  if (!phone) return null;
  return (
    <a
      href={whatsappUrl(phone)}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 text-sm text-green-400 hover:underline"
      title="Open a WhatsApp chat"
    >
      <MessageCircle className="w-3.5 h-3.5" aria-hidden /> {phone}
    </a>
  );
}

function StatusSelect({ value, label, onChange }: { value: string; label: string; onChange: (v: string) => void }) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {STATUSES.map((s) => (
          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function Received({ at, status }: { at: string; status: string }) {
  return (
    <TableCell className="whitespace-nowrap text-muted-foreground">
      {format(new Date(at), 'd MMM yyyy, HH:mm')}
      {status === 'new' && <Badge className="ml-2">New</Badge>}
    </TableCell>
  );
}

export default function EnquiriesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [wholesale, setWholesale] = useState<WholesaleInquiry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchAll = async () => {
    setIsLoading(true);
    const [contact, trade] = await Promise.all([
      supabase.from('contact_messages').select('*').order('created_at', { ascending: false }),
      supabase.from('wholesale_inquiries').select('*').order('created_at', { ascending: false }),
    ]);
    if (contact.error || trade.error) {
      console.error('Error fetching enquiries:', contact.error ?? trade.error);
      toast.error('Failed to load enquiries');
    }
    setMessages(contact.data || []);
    setWholesale(trade.data || []);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const updateStatus = async (table: EnquiryTable, id: string, status: string) => {
    const prevMessages = messages;
    const prevWholesale = wholesale;
    if (table === 'contact_messages') setMessages((l) => l.map((m) => (m.id === id ? { ...m, status } : m)));
    else setWholesale((l) => l.map((w) => (w.id === id ? { ...w, status } : w)));
    const { error } = await supabase.from(table).update({ status }).eq('id', id);
    if (error) {
      console.error('Error updating enquiry status:', error);
      setMessages(prevMessages);
      setWholesale(prevWholesale);
      toast.error('Could not update the status');
    } else {
      toast.success('Status updated');
    }
  };

  const newCount = (list: { status: string }[]) => list.filter((m) => m.status === 'new').length;

  const spinner = (
    <div className="flex justify-center py-8">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
    </div>
  );

  return (
    <SuperAdminOnly>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold">Enquiries</h1>
            <p className="text-muted-foreground">Messages from the Contact and Wholesale pages</p>
          </div>
          <Button variant="outline" onClick={fetchAll} disabled={isLoading}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh
          </Button>
        </div>

        <Tabs defaultValue="contact">
          <TabsList>
            <TabsTrigger value="contact">Contact ({newCount(messages)} new)</TabsTrigger>
            <TabsTrigger value="wholesale">Wholesale ({newCount(wholesale)} new)</TabsTrigger>
          </TabsList>

          <TabsContent value="contact">
            <Card>
              <CardHeader>
                <CardTitle>Contact enquiries</CardTitle>
                <CardDescription>
                  {messages.length} {messages.length === 1 ? 'enquiry' : 'enquiries'}, {newCount(messages)} new · newest first
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? spinner : messages.length === 0 ? (
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
                            <Received at={m.created_at} status={m.status} />
                            <TableCell>
                              <div className="font-medium">{m.name}</div>
                              <a href={`mailto:${m.email}?subject=${encodeURIComponent(`Re: ${m.subject}`)}`} className="text-primary hover:underline text-sm break-all">
                                {m.email}
                              </a>
                              <div><PhoneLink phone={m.phone} /></div>
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
                              <StatusSelect
                                value={m.status}
                                label={`Status of the enquiry from ${m.name}`}
                                onChange={(v) => updateStatus('contact_messages', m.id, v)}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="wholesale">
            <Card>
              <CardHeader>
                <CardTitle>Wholesale enquiries</CardTitle>
                <CardDescription>
                  {wholesale.length} {wholesale.length === 1 ? 'enquiry' : 'enquiries'}, {newCount(wholesale)} new · newest first
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? spinner : wholesale.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No wholesale enquiries yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-40">Received</TableHead>
                        <TableHead>Business</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Requirements</TableHead>
                        <TableHead className="w-44">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {wholesale.map((w) => (
                        <TableRow key={w.id} className="align-top">
                          <Received at={w.created_at} status={w.status} />
                          <TableCell>
                            <div className="font-medium">{w.business_name}</div>
                            <div className="text-sm text-muted-foreground">{w.business_type}</div>
                            {w.delivery_location && <div className="text-sm text-muted-foreground">{w.delivery_location}</div>}
                          </TableCell>
                          <TableCell>
                            <div className="font-medium">{w.contact_person}</div>
                            <a href={`mailto:${w.email}`} className="text-primary hover:underline text-sm break-all">{w.email}</a>
                            <div><PhoneLink phone={w.phone} /></div>
                          </TableCell>
                          <TableCell className="max-w-md text-sm">
                            {w.products_interested && w.products_interested.length > 0 && (
                              <div>{w.products_interested.join(', ')}</div>
                            )}
                            {w.estimated_volume && <div className="text-muted-foreground">{w.estimated_volume}</div>}
                            {w.message && <p className="text-muted-foreground whitespace-pre-wrap mt-1">{w.message}</p>}
                          </TableCell>
                          <TableCell>
                            <StatusSelect
                              value={w.status}
                              label={`Status of the wholesale enquiry from ${w.business_name}`}
                              onChange={(v) => updateStatus('wholesale_inquiries', w.id, v)}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SuperAdminOnly>
  );
}
