import { rabbitMQService } from './rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from './constants';

/**
 * ✅ Producer Service
 * Handles publishing messages to RabbitMQ for background tasks
 * such as invoice and bill PDF generation.
 */
export class Producer {
  
 
  /**
   * 🔹 Trigger Create User
   * @param id - The unique ID of the user
   * @returns A user-friendly message
   */
  public static async SendEmail({to,subject,html,attachments=[],cc,bcc}:{to: string, subject: string, html: string, attachments?: Array<{filename: string,content:Buffer}>, cc?: string[], bcc?: string[]}): Promise<string> {
    try {
      const message = { to, subject, html, attachments, cc, bcc };

      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.Email,
        ROUTING_KEYS.Email.SEND,
        message
      );

      if (published) {
        return 'Email Send successfully.';
      } else {
        console.warn(`⚠️ Failed to queue Email Send message`);
        return 'We encountered an issue while processing your Email Send request. Please try again.';
      }
    } catch (error) {
      console.error('❌ Error while create user:', error);
      return 'An unexpected error occurred while creating user.';
    }
  }

 
}
