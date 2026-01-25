# Blogs System with Resend Email Notifications - Setup Guide

## Date: January 25, 2026

This guide will help you set up a complete blog system with automatic email notifications to newsletter subscribers when blogs are published.

---

## Overview

The blog system includes:
- ✅ Admin interface for creating/editing/publishing blogs
- ✅ Public blog listing page (`/blogs`)
- ✅ Public blog detail page (`/blog/:slug`)
- ✅ Newsletter subscription (stores emails in database)
- ✅ Resend integration for email notifications
- ✅ Automatic email sending when blog is published

---

## Step 1: Run Database Migration

### File: `supabase/migrations/20260125000004_create_blogs_system.sql`

Run this migration in Supabase SQL Editor. It creates:
- `blogs` table for blog posts
- `newsletter_subscribers` table for email subscribers
- RLS policies for security
- Triggers for auto-updating timestamps
- Function to increment blog view count

**Run the entire migration file in Supabase SQL Editor.**

---

## Step 2: Set Up Resend Account

### 2.1 Create Resend Account

1. Go to [https://resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2.2 Get API Key

1. Go to **API Keys** in Resend dashboard
2. Click **Create API Key**
3. Name it: `Sharma Coffee Blog Notifications`
4. Copy the API key (starts with `re_...`)
5. **Save it securely** - you'll need it in Step 3

### 2.3 Verify Domain (Optional but Recommended)

For production, verify your domain:
1. Go to **Domains** in Resend dashboard
2. Click **Add Domain**
3. Follow the DNS verification steps
4. Once verified, you can use emails like `noreply@yourdomain.com`

For testing, you can use Resend's test domain: `onboarding@resend.dev`

---

## Step 3: Configure Supabase Environment Variables

### 3.1 Add Resend API Key

1. Go to **Supabase Dashboard** → **Project Settings** → **Edge Functions** → **Secrets**
2. Click **Add New Secret**
3. Add these secrets:

   **Secret 1:**
   - Name: `RESEND_API_KEY`
   - Value: `re_xxxxxxxxxxxxx` (your Resend API key)

   **Secret 2:**
   - Name: `RESEND_FROM_EMAIL`
   - Value: `noreply@sharmacoffee.com` (or your verified domain email)

   **Secret 3:**
   - Name: `SITE_URL`
   - Value: `https://yourdomain.com` (your website URL)

### 3.2 Verify Secrets

Make sure all three secrets are added:
- ✅ `RESEND_API_KEY`
- ✅ `RESEND_FROM_EMAIL`
- ✅ `SITE_URL`

---

## Step 4: Deploy Edge Function

### File: `supabase/functions/send-blog-notification/index.ts`

This function sends email notifications to all newsletter subscribers when a blog is published.

### Option 1: Deploy via Supabase Dashboard (Recommended)

1. Go to **Supabase Dashboard** → **Edge Functions**
2. Click **Create Function** or find `send-blog-notification`
3. Name it: `send-blog-notification`
4. Copy the entire contents of `supabase/functions/send-blog-notification/index.ts`
5. Paste into the editor
6. Click **Deploy**

### Option 2: Deploy via Supabase CLI

```bash
cd "c:\Users\KB\OneDrive\Documents\GitHub\sharma-coffee-hub-clean"
supabase functions deploy send-blog-notification
```

---

## Step 5: Test Newsletter Subscription

1. Go to your website homepage
2. Scroll to the footer
3. Enter an email address in the newsletter subscription form
4. Click "Subscribe"
5. Verify the email is saved in the database:
   ```sql
   SELECT * FROM newsletter_subscribers WHERE is_active = true;
   ```

---

## Step 6: Test Blog Creation and Email Notification

### 6.1 Create a Test Blog

1. Log in as admin
2. Go to **Admin** → **Blogs**
3. Click **New Blog**
4. Fill in:
   - Title: "Test Blog Post"
   - Slug: (auto-generated)
   - Excerpt: "This is a test blog post"
   - Content: "This is the blog content..."
   - Status: **Published**
5. Click **Create Blog**

### 6.2 Verify Email Sent

1. Check your email inbox (the email you subscribed with)
2. You should receive an email about the new blog post
3. Check Resend dashboard → **Logs** to see email delivery status

### 6.3 Check Function Logs

1. Go to **Supabase Dashboard** → **Edge Functions** → **send-blog-notification**
2. Click **Logs** tab
3. Verify the function was called and emails were sent

---

## Step 7: Verify Public Blog Pages

1. Go to `/blogs` - Should show list of published blogs
2. Click on a blog - Should show blog detail page at `/blog/:slug`
3. Verify blog content displays correctly

---

## File Structure

### Database
- `supabase/migrations/20260125000004_create_blogs_system.sql` - Database schema

### Admin Pages
- `src/pages/admin/BlogsPage.tsx` - Admin blog management

### Public Pages
- `src/pages/Blogs.tsx` - Blog listing page
- `src/pages/BlogDetail.tsx` - Blog detail page

### Edge Functions
- `supabase/functions/send-blog-notification/index.ts` - Email notification function

### Updated Files
- `src/components/coffee/Footer.tsx` - Newsletter subscription now saves to database
- `src/components/admin/AdminLayout.tsx` - Added "Blogs" to sidebar
- `src/App.tsx` - Added blog routes
- `src/components/coffee/Navigation.tsx` - Added "Blog" link to navigation

---

## How It Works

### Blog Publishing Flow:

1. **Admin creates/publishes blog** → `BlogsPage.tsx`
2. **Blog saved to database** → `blogs` table
3. **If status = 'published'** → Frontend calls `send-blog-notification` edge function
4. **Edge function**:
   - Fetches blog details
   - Fetches all active newsletter subscribers
   - Sends email via Resend API to each subscriber
   - Returns success/failure count

### Newsletter Subscription Flow:

1. **User enters email** → Footer newsletter form
2. **Email saved** → `newsletter_subscribers` table
3. **User receives confirmation** → Toast notification

---

## Email Template

The email includes:
- ✅ Branded header with Sharma Coffee logo/colors
- ✅ Blog title and excerpt
- ✅ Featured image (if available)
- ✅ "Read Full Article" button linking to blog
- ✅ Unsubscribe link

---

## Troubleshooting

### Emails Not Sending

1. **Check Resend API Key**:
   - Verify `RESEND_API_KEY` is set in Supabase secrets
   - Verify the key is correct (starts with `re_`)

2. **Check From Email**:
   - Verify `RESEND_FROM_EMAIL` is set
   - For testing, use `onboarding@resend.dev`
   - For production, use verified domain email

3. **Check Function Logs**:
   - Go to Supabase Dashboard → Edge Functions → send-blog-notification → Logs
   - Look for error messages

4. **Check Resend Dashboard**:
   - Go to Resend dashboard → Logs
   - See delivery status and any errors

### Blog Not Showing

1. **Check blog status** - Must be `published`
2. **Check RLS policies** - Should allow public read for published blogs
3. **Check browser console** - Look for errors

### Newsletter Subscription Not Working

1. **Check database** - Verify email is saved in `newsletter_subscribers`
2. **Check for duplicates** - Email must be unique
3. **Check RLS policies** - Should allow public insert

---

## Next Steps

1. ✅ Run database migration
2. ✅ Set up Resend account and get API key
3. ✅ Add environment variables to Supabase
4. ✅ Deploy edge function
5. ✅ Test blog creation
6. ✅ Test email notification
7. ✅ Verify public blog pages work

---

## Customization

### Email Template

Edit `supabase/functions/send-blog-notification/index.ts` to customize:
- Email subject
- Email HTML template
- Email styling
- Brand colors

### Blog Content

The blog content field supports:
- Plain text
- Basic markdown (headers, bold, italic, links)
- HTML (if you want to add rich text editor later)

---

## Production Checklist

- [ ] Run database migration
- [ ] Set up Resend account
- [ ] Add Resend API key to Supabase secrets
- [ ] Verify domain in Resend (for production emails)
- [ ] Deploy edge function
- [ ] Test blog creation
- [ ] Test email notification
- [ ] Verify public blog pages
- [ ] Add blog link to navigation (already done)
- [ ] Test newsletter subscription
- [ ] Monitor email delivery rates

---

## Support

If you encounter issues:
1. Check Supabase Edge Function logs
2. Check Resend dashboard logs
3. Verify all environment variables are set
4. Test with a simple blog post first

---

Last Updated: January 25, 2026
