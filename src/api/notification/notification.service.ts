import { Injectable } from "@nestjs/common";
import {
    UserRepository
} from "@orm/repositories";

type NotificationSendDto = {
    type?: "default";
    userId: number;
    title: string;
    text: string;
}
@Injectable()
export class NotificationService {
    constructor() {}
}