package com.printforge.notification.listener;

import com.printforge.notification.config.RabbitMQConfig;
import com.printforge.notification.notificationservice.model.Notification;
import com.printforge.notification.notificationservice.repository.NotificationRepository;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class UserEventListener {

    private final NotificationRepository notificationRepository;

    public UserEventListener(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    @RabbitListener(queues = RabbitMQConfig.NOTIFICATION_USER_DELETED_QUEUE)
    public void handleUserDeleted(Long userId) {
        List<Notification> notifications = notificationRepository.findByUserId(userId);
        if (!notifications.isEmpty()) {
            notificationRepository.deleteAll(notifications);
        }
    }
}
