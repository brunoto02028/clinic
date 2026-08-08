// lib/social-publish.ts
// Publishes a single SocialPost record (campaign/calendar pipeline — see
// prisma SocialPost model) to its connected platform account, dispatching
// by postType. Shared by the manual "Publish" button
// (app/api/admin/social/posts/[id]/publish) and the daily scheduled-post
// cron (app/api/cron/social-post-publish), so both behave identically.
import { prisma } from '@/lib/db';
import { publishPhoto, publishCarousel, publishReel, publishStory, publishToFacebookPage } from '@/lib/instagram';

export async function publishSocialPost(postId: string): Promise<{
  success: boolean;
  platformPostId?: string;
  permalink?: string;
  facebookPostId?: string | null;
  facebookError?: string | null;
  error?: string;
}> {
  const post = await prisma.socialPost.findUnique({
    where: { id: postId },
    include: { account: true },
  });

  if (!post) return { success: false, error: 'Post not found' };
  if (!post.account) return { success: false, error: 'No social account linked to this post' };
  if (post.status === 'PUBLISHED') return { success: false, error: 'Post already published' };

  await prisma.socialPost.update({ where: { id: postId }, data: { status: 'PUBLISHING' } });

  const fullCaption = post.hashtags
    ? `${post.caption}\n\n${post.hashtags.split(',').map((h) => `#${h.trim().replace(/^#/, '')}`).join(' ')}`
    : post.caption;

  const absolute = (url: string) => (url.startsWith('http') ? url : `${process.env.NEXTAUTH_URL}${url}`);

  try {
    let result: { id: string; permalink?: string };

    if (post.postType === 'REEL') {
      const videoUrl = post.mediaUrls[0];
      if (!videoUrl) throw new Error('No video URL provided for Reel');
      result = await publishReel({
        igAccountId: post.account.accountId,
        accessToken: post.account.accessToken,
        videoUrl: absolute(videoUrl),
        caption: fullCaption,
        pageId: post.account.pageId,
      });
    } else if (post.postType === 'STORY') {
      const imageUrl = post.mediaUrls[0];
      if (!imageUrl) throw new Error('No image URL provided for Story');
      result = await publishStory({
        igAccountId: post.account.accountId,
        accessToken: post.account.accessToken,
        imageUrl: absolute(imageUrl),
        pageId: post.account.pageId,
      });
    } else if (post.postType === 'CAROUSEL' && post.mediaUrls.length > 1) {
      result = await publishCarousel({
        igAccountId: post.account.accountId,
        accessToken: post.account.accessToken,
        imageUrls: post.mediaUrls.map(absolute),
        caption: fullCaption,
        pageId: post.account.pageId,
      });
    } else {
      const imageUrl = post.mediaUrls[0];
      if (!imageUrl) throw new Error('No image URL provided');
      result = await publishPhoto({
        igAccountId: post.account.accountId,
        accessToken: post.account.accessToken,
        imageUrl: absolute(imageUrl),
        caption: fullCaption,
        pageId: post.account.pageId,
      });
    }

    // Cross-post to the connected Facebook Page too — only for feed-style
    // posts (a Reel/Story has no natural Facebook Page photo-post equivalent
    // via this simple endpoint). Best-effort: a Facebook failure doesn't fail
    // the overall (already-successful) Instagram publish.
    let facebookPostId: string | null = null;
    let facebookError: string | null = null;
    if ((post.postType === 'IMAGE' || post.postType === 'CAROUSEL') && post.mediaUrls[0]) {
      try {
        const fbResult = await publishToFacebookPage({
          clinicId: post.clinicId,
          imageUrl: absolute(post.mediaUrls[0]),
          caption: fullCaption,
        });
        if (fbResult) facebookPostId = fbResult.id;
      } catch (fbErr: any) {
        facebookError = fbErr?.message || 'Facebook publish failed';
        console.error(`[social-publish] Facebook cross-post failed for post ${postId}:`, facebookError);
      }
    }

    await prisma.socialPost.update({
      where: { id: postId },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
        platformPostId: result.id,
        publishError: facebookError ? `Facebook: ${facebookError}` : null,
      },
    });

    return { success: true, platformPostId: result.id, permalink: result.permalink, facebookPostId, facebookError };
  } catch (err: any) {
    const message = err?.message || 'Unknown publishing error';
    await prisma.socialPost.update({
      where: { id: postId },
      data: { status: 'FAILED', publishError: message },
    });
    return { success: false, error: message };
  }
}
