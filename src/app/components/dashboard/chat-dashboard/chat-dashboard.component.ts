import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ChatService } from 'src/app/services/chat/chat.service';
import { WebSocketService } from 'src/app/services/web-socket/websocket.service';
import { Message } from 'src/app/components/home/user-chat-box/user-chat-box.component'; // Adjust this path based on your project structure
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat-dashboard',
  templateUrl: './chat-dashboard.component.html',
  styleUrls: ['./chat-dashboard.component.css']
})
export class ChatDashboardComponent implements OnInit, OnDestroy {
  userId!: string;
  adminId: string = '3';
  messages: Message[] = [];
  newMessageContent: string = '';
  newMessageSubscription: Subscription | undefined;
  private isSubscribed: boolean = false; // Flag to check if the subscription is active
 user: any;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    // Subscribe to route parameters
    this.route.paramMap.subscribe(params => {
      this.userId = params.get('id')!;
      this.loadMessages();
      
      // Connect to WebSocket
      this.webSocketService.connect();

      // Subscribe to new messages if not already subscribed
      if (!this.isSubscribed) {
        this.newMessageSubscription = this.webSocketService.receiveNewMessage().subscribe((message: Message) => {
          console.log("Received message:", message); // Log received message
            // Check if the message already exists to prevent duplicates
            if (!this.isMessageDuplicate(message)) {
              this.messages.push(message); // Add the message to the list
          }
        });
        this.isSubscribed = true; // Mark as subscribed
      }
    });
  }

  ngOnDestroy(): void {
    // Unsubscribe from new messages on component destruction
    if (this.newMessageSubscription) {
      this.newMessageSubscription.unsubscribe();
      this.newMessageSubscription = undefined; // Prevent memory leaks
    }
  }

  loadMessages(): void {
    const userIdNum = Number(this.userId);
    const adminIdNum = Number(this.adminId);
    this.chatService.getUserMessages(userIdNum, adminIdNum).subscribe((data: Message[]) => {
      this.messages = data; // Store the messages
    });
  }

  sendMessage(): void {
    if (this.newMessageContent.trim() !== '') {
      const message: Message = {
        content: this.newMessageContent,
        senderId: this.adminId, // Now senderId is the admin ID
        receiverId: this.userId, // Now receiverId is the user ID
        senderType: 'admin', // The sender type is now admin
        receiverType: 'user', // The receiver type is now user
        createdAt: new Date().toISOString(), // Ensure correct timestamp
      };
  
      // Check if the message is a duplicate
      if (!this.isMessageDuplicate(message)) {
        this.webSocketService.sendMessage(message); // Use Socket.IO to send message
  
        // Send the message to the backend
        this.chatService.sendMessage(message).subscribe(
          response => {
            console.log('Message saved to backend:', response);
            // Only push the message if it was successfully sent and not already added
            if (!this.isMessageDuplicate(message)) {
              this.messages.push(message); // Push the newly sent message into the messages array
            }
            this.newMessageContent = ''; // Clear the input field
          },
          error => {
            console.error('Error sending message to backend:', error);
          }
        );
      }
    }
  }
  

  private isMessageDuplicate(newMessage: Message): boolean {
    // Check if the message already exists in the messages array
    return this.messages.some(msg => 
      msg.content === newMessage.content &&
      msg.senderId === newMessage.senderId &&
      msg.receiverId === newMessage.receiverId &&
      Math.abs(new Date(msg.createdAt).getTime() - new Date(newMessage.createdAt).getTime()) < 1000 // Check if the messages were sent within 1 second
    );
  }
}
