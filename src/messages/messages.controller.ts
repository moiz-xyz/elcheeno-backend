import { Controller, Get, Post, Body, Param, Query, UseGuards, Request } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { StartConversationDto } from './dto/start-conversation.dto';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Get('conversations')
  async getUserConversations(@Request() req: any) {
    return this.messagesService.getUserConversations(req.user.id);
  }

  @Post('conversations')
  async startConversation(@Request() req: any, @Body() dto: StartConversationDto) {
    return this.messagesService.startOrCreateConversation(req.user.id, dto.recipientId);
  }

  @Get('conversations/:id/messages')
  async getConversationMessages(@Request() req: any, @Param('id') conversationId: string) {
    return this.messagesService.getConversationMessages(req.user.id, conversationId);
  }

  @Post('conversations/:id/messages')
  async sendMessage(
    @Request() req: any,
    @Param('id') conversationId: string,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.sendMessage(req.user.id, conversationId, dto.content);
  }

  @Get('users')
  async searchUsers(@Request() req: any, @Query('query') query?: string) {
    return this.messagesService.searchUsers(req.user.id, query);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req: any) {
    return this.messagesService.getUnreadCount(req.user.id);
  }

  @Post('upload')
  async uploadImage(@Body('image') image: string) {
    return this.messagesService.uploadImage(image);
  }
}
