import { Injectable, Logger } from '@nestjs/common';

interface PublishResult {
  success: boolean;
  externalPostId?: string;
  error?: string;
}

@Injectable()
export class PublishingService {
  private readonly logger = new Logger(PublishingService.name);

  /**
   * Publish content to a specific platform
   */
  async publish(
    platform: string,
    accessToken: string,
    content: {
      caption: string;
      hashtags: string[];
      mediaUrl?: string;
      type: string;
    },
  ): Promise<PublishResult> {
    const fullCaption = [
      content.caption,
      '',
      content.hashtags.map((h) => `#${h}`).join(' '),
    ].join('\n');

    switch (platform) {
      case 'INSTAGRAM':
        return this.publishToInstagram(accessToken, fullCaption, content.mediaUrl);
      case 'FACEBOOK':
        return this.publishToFacebook(accessToken, fullCaption, content.mediaUrl);
      case 'LINKEDIN':
        return this.publishToLinkedIn(accessToken, fullCaption, content.mediaUrl);
      case 'X':
        return this.publishToX(accessToken, fullCaption, content.mediaUrl);
      default:
        return { success: false, error: `Platform ${platform} not yet supported` };
    }
  }

  /**
   * Instagram via Meta Graph API
   * https://developers.facebook.com/docs/instagram-platform/instagram-graph-api/content-publishing
   */
  private async publishToInstagram(
    accessToken: string,
    caption: string,
    mediaUrl?: string,
  ): Promise<PublishResult> {
    try {
      this.logger.log('Publishing to Instagram...');
      
      // Step 1: Create media container
      const igUserId = 'me'; // In a real scenario, this would be the specific IG User ID associated with the Page
      const containerResponse = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image_url: mediaUrl,
            caption,
            access_token: accessToken,
          }),
        },
      );
      const container = await containerResponse.json();

      if (container.error) {
        throw new Error(container.error.message);
      }

      // Step 2: Publish the container
      const publishResponse = await fetch(
        `https://graph.facebook.com/v19.0/${igUserId}/media_publish`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            creation_id: container.id,
            access_token: accessToken,
          }),
        },
      );
      const result = await publishResponse.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      return {
        success: true,
        externalPostId: result.id,
      };
    } catch (error: any) {
      this.logger.error(`Instagram publish error: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error publishing to Instagram' };
    }
  }

  private async publishToFacebook(
    accessToken: string,
    caption: string,
    mediaUrl?: string,
  ): Promise<PublishResult> {
    try {
      this.logger.log('Publishing to Facebook...');
      const endpoint = mediaUrl ? '/me/photos' : '/me/feed';
      const body: any = { access_token: accessToken };
      
      if (mediaUrl) {
        body.url = mediaUrl;
        body.message = caption;
      } else {
        body.message = caption;
      }

      const response = await fetch(`https://graph.facebook.com/v19.0${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const result = await response.json();

      if (result.error) {
        throw new Error(result.error.message);
      }

      return { success: true, externalPostId: result.id };
    } catch (error: any) {
      this.logger.error(`Facebook publish error: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error publishing to Facebook' };
    }
  }

  private async publishToLinkedIn(
    accessToken: string,
    caption: string,
    mediaUrl?: string,
  ): Promise<PublishResult> {
    try {
      this.logger.log('Publishing to LinkedIn...');
      
      // First get the user's URN
      const profileRes = await fetch('https://api.linkedin.com/v2/me', {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      const profile = await profileRes.json();
      
      if (!profile.id) {
        throw new Error('Could not fetch LinkedIn profile ID');
      }

      const authorUrn = `urn:li:person:${profile.id}`;

      // This is a simplified UGC post creation (text only logic, image requires asset upload first)
      const postBody = {
        author: authorUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: caption
            },
            shareMediaCategory: 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      const response = await fetch('https://api.linkedin.com/v2/ugcPosts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'X-Restli-Protocol-Version': '2.0.0',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(postBody)
      });
      
      const responseText = await response.text();
      let result;
      try { result = JSON.parse(responseText); } catch { result = responseText; }
      
      if (!response.ok) {
        throw new Error(`LinkedIn API error: ${response.status} - ${responseText}`);
      }

      return { success: true, externalPostId: result.id || 'linkedin_post_id' };
    } catch (error: any) {
      this.logger.error(`LinkedIn publish error: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error publishing to LinkedIn' };
    }
  }

  private async publishToX(
    accessToken: string,
    caption: string,
    mediaUrl?: string,
  ): Promise<PublishResult> {
    try {
      this.logger.log('Publishing to X...');
      
      // Using X API v2 standard tweet creation
      const response = await fetch('https://api.twitter.com/2/tweets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: caption
        })
      });
      
      const result = await response.json();
      
      if (result.errors || result.title === 'Unauthorized') {
         throw new Error(result.detail || result.title || 'Error accessing X API');
      }

      return { success: true, externalPostId: result.data?.id };
    } catch (error: any) {
      this.logger.error(`X publish error: ${error.message}`);
      return { success: false, error: error.message || 'Unknown error publishing to X' };
    }
  }
}
